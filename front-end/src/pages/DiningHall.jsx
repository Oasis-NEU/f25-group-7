import React, { useState, useEffect, useMemo } from "react";
import FoodBackground from "../Components/background";
import MenuCard from "../Components/MenuCard";
import { useParams } from "react-router-dom";

export function DiningHall() {
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [displayDate, setDisplayDate] = useState(null);
    const [selectedDietaryRestriction, setSelectedDietaryRestriction] = useState(null);
    const { hall = "stetson-east", meal = "breakfast" } = useParams();

    const dietaryRestrictions = [
        { label: "Vegan", value: "vegan" },
        { label: "Vegetarian", value: "vegetarian" },
        { label: "High Protein", value: "high-protein" },
    ];

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

    const fetchMenu = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/menu/${hall}/${meal}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            // backend returns { location, period, date, items }
            // Normalize items and compute high-protein when missing
            const normalized = (json.items || []).map(i => {
                const name = i.name || i.title || '';
                const calories = i.calories || 0;
                const portion = (i.portion || '').toLowerCase();
                let isHigh = i.isHighProtein || i.is_high_protein || false;

                // heuristic when backend doesn't provide it
                if (!isHigh) {
                    const meatKeywords = ['chicken','turkey','beef','pork','salmon','tuna','shrimp','steak','ham','bacon','sausage','egg','tofu','tempeh'];
                    const nameLower = name.toLowerCase();
                    if (meatKeywords.some(k => nameLower.includes(k))) isHigh = true;
                    if (!isHigh && calories >= 400) isHigh = true;
                }

                return {
                    id: i.id,
                    name,
                    calories: i.calories || null,
                    portion: i.portion || null,
                    is_high_protein: Boolean(isHigh),
                    description: i.description || null,
                    raw: i
                };
            });
            setMenuItems(normalized || []);
            setDisplayDate(json.date || null);
        } catch (err) {
            console.error('fetchMenu error', err);
            setMenuItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchMenu(); }, [hall, meal]);

    return (
        <div className="min-h-screen bg-linear-to-br from-black via-gray-900 to-black relative overflow-hidden">
            <FoodBackground />
            <div className="relative z-10 flex flex-col min-h-screen">
                <main className="flex-1 flex flex-col items-center justify-start pt-28 px-6 pb-20 w-full">
                    <div className="w-full max-w-6xl">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                                    {(hall || "").split("-").map((s) => s[0]?.toUpperCase() + s.slice(1)).join(" ")}
                                    <span className="text-red-400"> — {meal && meal[0]?.toUpperCase() + meal.slice(1)}</span>
                                </h1>
                                <p className="text-sm text-gray-300 mt-2"></p>
                                {displayDate && (
                                    <p className="text-xs text-gray-400 mt-1">Showing menu for <span className="font-medium text-white">{displayDate}</span>.</p>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-white/6 text-white px-3 py-2 rounded-full text-sm font-medium">{menuItems.length} Items</div>

                                <div className="flex items-center gap-2">
                                    {dietaryRestrictions.map(d => (
                                        <button
                                            key={d.value}
                                            onClick={() => setSelectedDietaryRestriction(selectedDietaryRestriction === d.value ? null : d.value)}
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition ${selectedDietaryRestriction === d.value ? 'bg-red-500 text-white' : 'bg-white/6 text-white'}`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={fetchMenu}
                                    disabled={isLoading}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition transform ${isLoading ? 'bg-red-600 opacity-75 scale-95' : 'bg-red-500 hover:bg-red-600 hover:brightness-95 active:scale-95'}`}
                                >
                                    {isLoading ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                        </div>

                        {/** Filter items in-memory for a clean UI */}
                        <ItemGrid menuItems={menuItems} selectedDietaryRestriction={selectedDietaryRestriction} />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default DiningHall;

function ItemGrid({ menuItems, selectedDietaryRestriction }) {
    const filteredMenuItems = useMemo(() => {
        if (!selectedDietaryRestriction) return menuItems;
        return menuItems.filter(item => {
            const name = (item.name || '').toLowerCase();
            if (selectedDietaryRestriction === 'high-protein') return Boolean(item.is_high_protein);
            if (selectedDietaryRestriction === 'vegan') {
                const raw = item.raw || {};
                if (raw.is_vegan) return true;
                const veganKeywords = ['vegan','plant-based','tofu','seitan','tempeh','salad','fruit','vegetable'];
                return veganKeywords.some(k => name.includes(k));
            }
            if (selectedDietaryRestriction === 'vegetarian') {
                const raw = item.raw || {};
                if (raw.is_vegetarian) return true;
                const vegKeywords = ['cheese','egg','vegetarian','paneer','tofu','salad','mushroom'];
                return vegKeywords.some(k => name.includes(k));
            }
            return true;
        });
    }, [menuItems, selectedDietaryRestriction]);

    return (
        <div>
            <div className="text-sm text-gray-300 mb-3">Showing <span className="text-white font-medium">{filteredMenuItems.length}</span> of <span className="text-white font-medium">{menuItems.length}</span> items</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenuItems.length === 0 ? (
                    <div className="col-span-full bg-white/5 rounded-lg p-8 text-center border border-white/5">
                        <p className="text-white text-lg">No menu items found.</p>
                        <p className="text-gray-300 mt-2 text-sm">Try refreshing or choose a different filter.</p>
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
                            }}
                        />
                    ))
                )}
            </div>
        </div>
    );
}