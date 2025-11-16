import React, { useState, useEffect, useMemo } from "react";
import FoodBackground from "../Components/background";
import PillNav from "../Components/Pill-Selection";
import MenuCard from "../Components/MenuCard";
import { useParams } from "react-router-dom";
import { supabase } from "../config/supabaseClient";

// Helper function to check if any keyword is in the text
const containsAny = (text, keywords) => {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
};

// Vegan heuristic: no animal products
const isVeganHeuristic = (item) => {
    const name = item.name || "";
    const description = item.description || "";

    // Keywords that indicate non-vegan
    const nonVeganKeywords = [
        'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'lamb', 'duck', 'ham', 'bacon', 'sausage',
        'meat', 'steak', 'pepperoni', 'meatball', 'egg', 'eggs', 'cheese', 'milk', 'cream', 'butter', 'yogurt', 'honey',
        'gelatin', 'whey', 'casein', 'lactose', 'dairy', 'mayo', 'mayonnaise'
    ];

    // If it contains any non-vegan keyword, it's not vegan
    if (containsAny(name + " " + description, nonVeganKeywords)) {
        return false;
    }

    // Additional check: if it's explicitly marked as vegan in DB
    return item.is_vegan || false;
};

// Vegetarian heuristic: no meat, but dairy/eggs ok
const isVegetarianHeuristic = (item) => {
    const name = item.name || "";
    const description = item.description || "";

    // Meat keywords
    const meatKeywords = [
        'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'lamb', 'duck', 'ham', 'bacon', 'sausage',
        'meat', 'steak', 'pepperoni', 'meatball', 'grilled meat', 'herb roasted', 'braised', 'roasted chicken', 'turkey breast', 'ground beef'
    ];

    // If it contains meat, it's not vegetarian
    if (containsAny(name + " " + description, meatKeywords)) {
        return false;
    }

    // Additional check: if it's explicitly marked as vegetarian in DB
    return item.is_vegetarian || false;
};

export function Steast() {
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedDietaryRestriction, setSelectedDietaryRestriction] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [stations, setStations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { hall = "stetson-east", meal = "breakfast" } = useParams();

    const dietaryRestrictions = [
        { label: "Vegan", value: "vegan" },
        { label: "Vegetarian", value: "vegetarian" },
        { label: "High Protein", value: "high-protein" },
    ];

    const fetchMenu = async () => {
        setIsLoading(true);
        try {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

            // Try today's data first, fall back to most recent date if empty
            let dateToUse = today;
            let { data: locations, error: locError } = await supabase
                .from("locations")
                .select("*")
                .eq("date", dateToUse);

            console.debug("Steast.fetchMenu: locations result (initial):", { dateToUse, locations, locError });

            if (locError) throw locError;
            if (!locations || locations.length === 0) {
                const { data: latestLocs, error: latestErr } = await supabase
                    .from("locations")
                    .select("*")
                    .order("date", { ascending: false })
                    .limit(1);
                console.debug("Steast.fetchMenu: locations fallback (latest):", { latestLocs, latestErr });
                if (latestErr) throw latestErr;
                if (!latestLocs || latestLocs.length === 0) {
                    setMenuItems([]);
                    setStations([]);
                    return;
                }
                dateToUse = latestLocs[0].date;
                const res = await supabase.from("locations").select("*").eq("date", dateToUse);
                locations = res.data;
                locError = res.error;
                console.debug("Steast.fetchMenu: locations after fallback fetch:", { dateToUse, locations, locError });
                if (locError) throw locError;
            }

            const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, "-");
            const targetLocation = locations.find((l) => {
                const n = normalize(l.name);
                return (
                    n === hall ||
                    n.includes(hall) ||
                    hall.includes(n) ||
                    l.name.toLowerCase().includes(hall.replace("-", " "))
                );
            });
            if (!targetLocation) {
                setMenuItems([]);
                setStations([]);
                return;
            }

            const { data: periods, error: periodError } = await supabase
                .from("periods")
                .select("*")
                .eq("location_id", targetLocation.id)
                .eq("date", dateToUse);

            console.debug("Steast.fetchMenu: periods result:", { targetLocationId: targetLocation.id, dateToUse, periods, periodError });

            if (periodError) throw periodError;

            const targetPeriod = (periods || []).find((p) => p.name.toLowerCase().includes(meal.toLowerCase()));
            if (!targetPeriod) {
                setMenuItems([]);
                setStations([]);
                return;
            }

            const { data: stationsRows, error: stationsError } = await supabase
                .from("stations")
                .select("*")
                .eq("period_id", targetPeriod.id)
                .eq("date", dateToUse);

            console.debug("Steast.fetchMenu: stations result:", { targetPeriodId: targetPeriod.id, dateToUse, stationsRows, stationsError });

            if (stationsError) throw stationsError;

            const stationOptions = (stationsRows || []).map((s) => ({ label: s.name, value: s.id }));
            setStations(stationOptions);

            let stationIds = (stationsRows || []).map((s) => s.id);
            if (selectedStation) {
                const matched = stationsRows.find((s) => s.id === selectedStation.value);
                if (matched) stationIds = [matched.id];
                else stationIds = [];
            }

            if (stationIds.length === 0) {
                setMenuItems([]);
                return;
            }

            let query = supabase.from("menu_items").select("*").in("station_id", stationIds).eq("date", dateToUse);

            const { data: items, error: itemsError } = await query;
            console.debug("Steast.fetchMenu: menu_items result:", { dateToUse, stationIds, items, itemsError });
            if (itemsError) throw itemsError;

            if (!items || items.length === 0) {
                setMenuItems([]);
                return;
            }

            const normalizedItems = items.map((i) => {
                let isHighProteinByName = false;
                let isHighProteinByCalories = false;

                const itemNameLower = (i.name || '').toLowerCase();
                const calories = i.calories || 0;
                const portion = (i.portion || '').toLowerCase();

                const meatKeywords = ['chicken', 'turkey', 'beef', 'pork', 'pepperoni', 'fish', 'salmon', 'tuna', 'shrimp', 'steak', 'lamb', 'duck', 'ham', 'bacon', 'sausage', 'meatball'];
                const plantProteinKeywords = ['egg', 'tofu', 'tempeh', 'seitan', 'lentil', 'chickpea', 'black bean', 'kidney bean', 'pinto bean', 'edamame'];
                const lowProteinExclusions = ['veggie pizza', 'cheese pizza', 'bread', 'rice', 'pasta', 'noodle', 'salad', 'sides', 'garnish', 'spice', 'sauce', 'dressing'];

                const isExcluded = lowProteinExclusions.some(exclusion => itemNameLower.includes(exclusion));

                if (!isExcluded) {
                    isHighProteinByName = meatKeywords.some(keyword => itemNameLower.includes(keyword));
                    if (!isHighProteinByName) isHighProteinByName = plantProteinKeywords.some(keyword => itemNameLower.includes(keyword));

                    if (!isHighProteinByName && itemNameLower.includes('pizza') && calories >= 300) isHighProteinByCalories = true;

                    const largePortions = ['1 pie', 'whole', 'large', 'serving'];
                    const hasLargePortion = largePortions.some(p => portion.includes(p));
                    if (!isHighProteinByName && !isHighProteinByCalories && hasLargePortion && calories >= 800) isHighProteinByCalories = true;
                }

                return {
                    id: i.id,
                    name: i.name,
                    calories: i.calories,
                    portion: i.portion,
                    is_high_protein: i.is_high_protein || isHighProteinByName || isHighProteinByCalories,
                    is_vegan: i.is_vegan || false,
                    is_vegetarian: i.is_vegetarian || false,
                    description: i.description || null,
                };
            });

            const veganKeywords = ['vegan', 'plant-based', 'tofu', 'tempeh', 'seitan', 'edamame', 'chickpea', 'lentil', 'black bean', 'hummus', 'falafel', 'veggie', 'vegetable', 'salad', 'grilled vegetable'];
            const vegetarianKeywords = ['vegetarian', 'cheese', 'egg', 'paneer', 'omelet', 'omelette', 'quiche', 'ricotta', 'mozzarella', 'feta', 'caprese', 'vegetable', 'veggie', 'salad', 'pasta', 'rice', 'beans'];
            const meatKeywords = ['chicken', 'turkey', 'beef', 'pork', 'pepperoni', 'fish', 'salmon', 'tuna', 'shrimp', 'steak', 'lamb', 'duck', 'ham', 'bacon', 'sausage', 'meatball', 'ground beef'];
            const dairyKeywords = ['cheese', 'milk', 'butter', 'yogurt', 'cream', 'mozzarella', 'cheddar', 'feta', 'parmesan', 'ricotta'];
            const eggKeywords = ['egg', 'omelet', 'omelette', 'scrambled', 'fried egg'];

            const containsAny = (text, list) => list.some(k => text.includes(k));

            const isVeganHeuristic = (item) => {
                const name = (item.name || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                if (containsAny(name, veganKeywords) || containsAny(desc, veganKeywords)) return true;
                const combined = name + ' ' + desc;
                return !containsAny(combined, meatKeywords) && !containsAny(combined, dairyKeywords) && !containsAny(combined, eggKeywords);
            };

            const isVegetarianHeuristic = (item) => {
                const name = (item.name || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                const combined = name + ' ' + desc;
                if (containsAny(name, vegetarianKeywords) || containsAny(desc, vegetarianKeywords)) return true;
                return !containsAny(combined, meatKeywords);
            };

            let finalItems = normalizedItems || [];
            if (selectedDietaryRestriction) {
                const val = selectedDietaryRestriction.value;
                if (val === 'vegan') {
                    finalItems = finalItems.filter(i => i.is_vegan || isVeganHeuristic(i));
                }
                if (val === 'vegetarian') {
                    finalItems = finalItems.filter(i => i.is_vegetarian || isVegetarianHeuristic(i) || i.is_vegan);
                }
                if (val === 'high_protein') {
                    finalItems = finalItems.filter((i) => i.is_high_protein);
                }
            }

            console.debug('Steast.fetchMenu: items before/after dietary filter', { total: normalizedItems.length, finalCount: finalItems.length, selectedDietaryRestriction: selectedDietaryRestriction?.value });

            setMenuItems(finalItems);
        } catch (err) {
            console.error("Error fetching menu:", err.message || err);
            setMenuItems([]);
            setStations([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, [hall, meal, selectedStation?.value]);

    const filteredMenuItems = useMemo(() => {
        let items = menuItems;

        // Filter by station
        if (selectedStation) {
            // Assuming menuItems have station info, but since we don't, perhaps filter by station name or something.
            // For now, skip station filter as it's not implemented in normalization.
        }

        // Filter by dietary restriction
        if (selectedDietaryRestriction) {
            if (selectedDietaryRestriction.value === 'vegan') {
                items = items.filter(item => isVeganHeuristic(item));
            } else if (selectedDietaryRestriction.value === 'vegetarian') {
                items = items.filter(item => isVegetarianHeuristic(item));
            } else if (selectedDietaryRestriction.value === 'high-protein') {
                items = items.filter(item => item.is_high_protein);
            }
        }

        return items;
    }, [menuItems, selectedStation, selectedDietaryRestriction]);

    return (
        <div className="min-h-screen bg-linear-to-br from-black via-gray-900 to-black relative overflow-hidden">
            <FoodBackground />

            {/* decorative abstract shapes */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute -left-20 -top-20 w-96 h-96 bg-linear-to-tr from-purple-700 via-pink-500 to-indigo-400 opacity-20 rounded-full blur-3xl transform rotate-45" />
                <div className="absolute right-10 top-40 w-72 h-72 bg-linear-to-br from-yellow-400 via-orange-500 to-red-500 opacity-15 rounded-full blur-2xl" />
                <svg className="absolute left-1/2 top-10 -translate-x-1/2 opacity-10" width="800" height="160" viewBox="0 0 800 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="g1" x1="0" x2="1">
                            <stop offset="0%" stopColor="#ff8a00" />
                            <stop offset="100%" stopColor="#da1b60" />
                        </linearGradient>
                    </defs>
                    <path d="M0 80 C200 0, 600 160, 800 80" stroke="url(#g1)" strokeWidth="2" fill="none" />
                </svg>
            </div>

            {/* content */}
            <div className="relative z-10 flex flex-col min-h-screen">

                {/* Main content */}
                <main className="flex-1 flex flex-col items-center justify-start pt-28 px-6 pb-20 w-full">
                    <div className="w-full max-w-6xl">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                                    {(hall || "").split("-").map((s) => s[0]?.toUpperCase() + s.slice(1)).join(" ")}
                                    <span className="text-red-400"> — {meal && meal[0]?.toUpperCase() + meal.slice(1)}</span>
                                </h1>
                                <p className="text-sm text-gray-300 mt-2">Curated menu for today — elegant, simple, and easy to scan.</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-white/6 text-white px-3 py-2 rounded-full text-sm font-medium">{filteredMenuItems.length} Items</div>
                                <button 
                                    onClick={fetchMenu}
                                    disabled={isLoading}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition transform ${isLoading ? 'bg-red-600 opacity-75 scale-95' : 'bg-red-500 hover:bg-red-600 hover:brightness-95 active:scale-95'}`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        'Refresh'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Stations filter row */}
                        <div className="w-full mb-6">
                            <p className="text-white font-semibold text-xs mb-2 opacity-70 uppercase tracking-wide">Station</p>
                            <div className="flex gap-3 flex-wrap">
                                {stations.map((s) => (
                                    <button 
                                        key={s.value} 
                                        onClick={() => setSelectedStation(selectedStation?.value === s.value ? null : s)} 
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedStation?.value === s.value ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-gray-200 hover:bg-white/20'}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dietary filter row */}
                        <div className="w-full mb-8">
                            <p className="text-white font-semibold text-xs mb-2 opacity-70 uppercase tracking-wide">Dietary</p>
                            <div className="flex gap-3 flex-wrap">
                                {dietaryRestrictions.map((d) => (
                                    <button 
                                        key={d.value} 
                                        onClick={() => setSelectedDietaryRestriction(selectedDietaryRestriction?.value === d.value ? null : d)} 
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedDietaryRestriction?.value === d.value ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-gray-200 hover:bg-white/20'}`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Menu cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMenuItems.length === 0 ? (
                                <div className="col-span-full bg-white/5 rounded-lg p-8 text-center border border-white/5">
                                    <p className="text-white text-lg">No menu items found for this selection.</p>
                                    <p className="text-gray-300 mt-2 text-sm">Try changing station or dietary filters, or run the scraper to populate today's data.</p>
                                </div>
                            ) : (
                                filteredMenuItems.map((food) => (
                                    <MenuCard
                                        key={food.id}
                                        food={{
                                            name: food.name,
                                            calories: food.calories,
                                            is_high_protein: food.is_high_protein,
                                            portion: food.portion,
                                            description: food.description || null,
                                            station: food.station || null,
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Steast;