import { useState, useEffect, useMemo, useCallback } from "react";
import FoodBackground from "../Components/background";
import MenuCard from "../Components/MenuCard";
import { useParams } from "react-router-dom";

export function DiningHall() {
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [displayDate, setDisplayDate] = useState(null);
    const [ageDays, setAgeDays] = useState(0);
    const [activeFilters, setActiveFilters] = useState(new Set());
    // null | 'not-served' | 'no-data'
    const [emptyReason, setEmptyReason] = useState(null);
    const [error, setError] = useState(null);
    const { hall = "stetson-east", meal = "breakfast" } = useParams();

    const dietaryRestrictions = [
        { label: "Vegan", value: "vegan" },
        { label: "Vegetarian", value: "vegetarian" },
        { label: "Non-Veg", value: "non-veg" },
        { label: "High Protein", value: "high-protein" },
    ];

    const toggleFilter = (value) => {
        setActiveFilters(prev => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    };

    const fetchMenu = useCallback(async () => {
        setIsLoading(true);
        setEmptyReason(null);
        setError(null);
        try {
            const res = await fetch(`/api/menu/${hall}/${meal}`);

            if (!res.ok) {
                // Read the body before deciding. A 404 only means "this hall
                // does not serve this meal" when it carries our own code; a
                // bare 404 comes from a dead route or a proxy in front of the
                // API, and claiming the meal is not served would be a lie.
                const body = await res.json().catch(() => null);

                if (body?.code === 'PERIOD_NOT_SERVED' || body?.code === 'NO_MENU_DATA') {
                    setEmptyReason(body.code === 'PERIOD_NOT_SERVED' ? 'not-served' : 'no-data');
                    setMenuItems([]);
                    setDisplayDate(null);
                    setAgeDays(body.ageDays ?? 0);
                    return;
                }
                throw new Error(body?.message || `The menu service returned HTTP ${res.status}.`);
            }

            const json = await res.json();
            const normalized = (json.items || []).map(i => {
                // Parse protein grams from the nutrient string the API returns (e.g. "15 g" → 15)
                let proteinGrams = null;
                if (i.protein) {
                    const match = String(i.protein).match(/(\d+(?:\.\d+)?)/);
                    if (match) proteinGrams = parseFloat(match[1]);
                }

                // High protein: use DineOnCampus's own "Good Source of Protein" flag,
                // or fall back to ≥15 g per serving (FDA threshold for a "good source")
                const isHigh = Boolean(i.isHighProtein || i.is_high_protein)
                    || (proteinGrams !== null && proteinGrams >= 15);

                return {
                    id: i.id,
                    name: i.name || i.title || '',
                    calories: i.calories ?? null,
                    portion: i.portion ?? null,
                    station: i.station ?? null,
                    protein: i.protein ?? null,
                    fat: i.fat ?? null,
                    carbs: i.carbs ?? null,
                    fiber: i.fiber ?? null,
                    sodium: i.sodium ?? null,
                    sugar: i.sugar ?? null,
                    is_high_protein: isHigh,
                    is_vegetarian: Boolean(i.isVegetarian || i.is_vegetarian),
                    is_vegan: Boolean(i.isVegan || i.is_vegan),
                    description: i.description ?? null,
                };
            });
            setMenuItems(normalized);
            setDisplayDate(json.date || null);
            setAgeDays(json.ageDays ?? 0);
        } catch (err) {
            console.error('fetchMenu error', err);
            setError(err.message || 'Could not reach the menu service.');
            setMenuItems([]);
            setDisplayDate(null);
            setAgeDays(0);
        } finally {
            setIsLoading(false);
        }
    }, [hall, meal]);

    useEffect(() => { fetchMenu(); }, [fetchMenu]);

    return (
        <div className="min-h-screen bg-linear-to-br from-black via-gray-900 to-black relative overflow-hidden">
            <FoodBackground />
            <div className="relative z-10 flex flex-col min-h-screen">
                <main className="flex-1 flex flex-col items-center justify-start pt-28 px-6 pb-20 w-full">
                    <div className="w-full max-w-6xl">
                        <div className="flex flex-col gap-3 mb-6">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white leading-tight">
                                    {(hall || "").split("-").map((s) => s[0]?.toUpperCase() + s.slice(1)).join(" ")}
                                    <span className="text-red-400"> {meal && meal[0]?.toUpperCase() + meal.slice(1)}</span>
                                </h1>
                                {displayDate && ageDays === 0 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Today's menu (<span className="font-medium text-white">{displayDate}</span>).
                                    </p>
                                )}
                                {displayDate && ageDays > 0 && (
                                    <p className="text-xs mt-1 text-amber-300/90">
                                        Today's menu has not been posted. Showing{' '}
                                        <span className="font-medium">{displayDate}</span>, {ageDays}{' '}
                                        {ageDays === 1 ? 'day' : 'days'} old.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="bg-white/6 text-white px-3 py-1.5 rounded-full text-sm font-medium shrink-0">{menuItems.length} Items</div>
                                {dietaryRestrictions.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => toggleFilter(d.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${activeFilters.has(d.value) ? 'bg-red-500 text-white' : 'bg-white/6 text-white'}`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                                <button
                                    onClick={fetchMenu}
                                    disabled={isLoading}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition transform shrink-0 ${isLoading ? 'bg-red-600 opacity-75 scale-95' : 'bg-red-500 hover:bg-red-600 active:scale-95'}`}
                                >
                                    {isLoading ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                        </div>

                        {/* Filtering happens in memory so the buttons respond instantly */}
                        <ItemGrid menuItems={menuItems} activeFilters={activeFilters} isLoading={isLoading} emptyReason={emptyReason} ageDays={ageDays} error={error} onRetry={fetchMenu} meal={meal} hall={hall} />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default DiningHall;

function ItemGrid({ menuItems, activeFilters, isLoading, emptyReason, ageDays, error, onRetry, meal, hall }) {
    const filteredMenuItems = useMemo(() => {
        if (activeFilters.size === 0) return menuItems;
        return menuItems.filter(item => {
            const name = (item.name || '').toLowerCase();
            // Item must pass ALL active filters (AND logic)
            for (const filter of activeFilters) {
                if (filter === 'high-protein') {
                    if (!item.is_high_protein) return false;
                } else if (filter === 'vegan') {
                    const veganKeywords = ['vegan','plant-based','tofu','seitan','tempeh'];
                    if (!item.is_vegan && !veganKeywords.some(k => name.includes(k))) return false;
                } else if (filter === 'vegetarian') {
                    const vegKeywords = ['cheese','egg','vegetarian','paneer','tofu','mushroom'];
                    if (!item.is_vegetarian && !item.is_vegan && !vegKeywords.some(k => name.includes(k))) return false;
                } else if (filter === 'non-veg') {
                    const nonVegKeywords = ['chicken','turkey','beef','pork','salmon','tuna','shrimp','steak','ham','bacon','sausage','lamb','fish','crab','lobster','clam','oyster','anchovy','pepperoni'];
                    const isNonVeg = !item.is_vegan && !item.is_vegetarian && nonVegKeywords.some(k => name.includes(k));
                    if (!isNonVeg) return false;
                }
            }
            return true;
        });
    }, [menuItems, activeFilters]);

    const hallName = (hall || "").split("-").map(s => s[0]?.toUpperCase() + s.slice(1)).join(" ");
    const mealName = meal ? meal[0].toUpperCase() + meal.slice(1) : "";

    // Suggest the meals the user is not already looking at, so we never tell
    // someone to try breakfast when breakfast is the thing not being served.
    const otherMeals = ["breakfast", "lunch", "dinner"].filter(m => m !== (meal || "").toLowerCase());
    const otherMealsText = otherMeals.length === 2
        ? `${otherMeals[0]} or ${otherMeals[1]}`
        : otherMeals.join(" or ");

    const emptyState = (() => {
        if (isLoading) return null;
        if (error) return (
            <div className="col-span-full bg-white/5 rounded-2xl p-10 text-center border border-red-500/20">
                <p className="text-white text-xl font-semibold">Could not load the menu</p>
                <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto">{error}</p>
                <button
                    onClick={onRetry}
                    className="mt-5 px-5 py-2 rounded-full text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition"
                >
                    Try again
                </button>
            </div>
        );
        if (emptyReason === 'not-served') return (
            <div className="col-span-full bg-white/5 rounded-2xl p-10 text-center border border-white/8">
                <p className="text-4xl mb-4">🍽️</p>
                <p className="text-white text-xl font-semibold">{mealName} isn't served here today</p>
                <p className="text-gray-400 mt-2 text-sm">
                    {hallName} doesn't offer {mealName.toLowerCase()} today.
                    {otherMealsText ? ` Try ${otherMealsText} instead.` : ''}
                </p>
            </div>
        );
        if (menuItems.length > 0 && filteredMenuItems.length === 0) return (
            <div className="col-span-full bg-white/5 rounded-2xl p-10 text-center border border-white/8">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-white text-xl font-semibold">No items match your filters</p>
                <p className="text-gray-400 mt-2 text-sm">Try removing a filter or two to see more options.</p>
            </div>
        );
        if (menuItems.length === 0) return (
            <div className="col-span-full bg-white/5 rounded-2xl p-10 text-center border border-white/8">
                <p className="text-4xl mb-4">⏳</p>
                <p className="text-white text-xl font-semibold">Menu not available yet</p>
                <p className="text-gray-400 mt-2 text-sm">
                    {emptyReason !== 'no-data'
                        ? `The ${mealName.toLowerCase()} menu hasn't been posted yet. Check back soon or try refreshing.`
                        : ageDays > 0
                            ? `The newest stored menu for ${hallName} is ${ageDays} days old, so it is not being shown. The scraper needs to run.`
                            : `No menu has been stored for ${hallName} yet. It appears once the scraper has run.`}
                </p>
            </div>
        );
        return null;
    })();

    return (
        <div>
            <div className="text-sm text-gray-300 mb-3">Showing <span className="text-white font-medium">{filteredMenuItems.length}</span> of <span className="text-white font-medium">{menuItems.length}</span> items</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {emptyState ? emptyState : (
                    filteredMenuItems.map((food) => (
                        <MenuCard
                            key={food.id}
                            food={{
                                name: food.name,
                                calories: food.calories,
                                portion: food.portion,
                                station: food.station,
                                protein: food.protein,
                                fat: food.fat,
                                carbs: food.carbs,
                                fiber: food.fiber,
                                sodium: food.sodium,
                                sugar: food.sugar,
                                is_high_protein: food.is_high_protein,
                                is_vegetarian: food.is_vegetarian,
                                is_vegan: food.is_vegan,
                                description: food.description,
                            }}
                        />
                    ))
                )}
            </div>
        </div>
    );
}