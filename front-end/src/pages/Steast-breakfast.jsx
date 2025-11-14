import React, { useState, useEffect } from "react";
import FoodBackground from "../Components/background";
import PillNav from "../Components/Pill-Selection";
import MenuCard from "../Components/MenuCard";
import { useParams } from "react-router-dom";
import { fetchMenu } from "../functions/fetchMenu";

export const Steast = () => {
    // Track selected station and dietary restriction
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedDietaryRestriction, setSelectedDietaryRestriction] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuInfo, setMenuInfo] = useState(null);
    const { hall, meal } = useParams();

    const stations = [
        { label: "Cucina", value: "cucina" },
        { label: "Rice station", value: "rice_station" },
        { label: "HomeStyle", value: "homestyle" },
        { label: "MenuTainment", value: "menutainment" }
    ];

    const dietaryRestrictions = [
        { label: "Vegan", value: "vegan" },
        { label: "Vegetarian", value: "vegetarian" }
    ];

    // Fetch menu data when hall, meal, station, or dietary restriction changes
    useEffect(() => {
        const loadMenu = async () => {
            if (!hall || !meal) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const data = await fetchMenu(
                    hall, 
                    meal, 
                    selectedStation, 
                    selectedDietaryRestriction
                );
                setMenuItems(data.items || []);
                setMenuInfo({
                    location: data.location,
                    period: data.period,
                    date: data.date,
                    totalItems: data.totalItems
                });
            } catch (err) {
                console.error('Error loading menu:', err);
                setError(err.message || 'Failed to load menu data');
                setMenuItems([]);
            } finally {
                setLoading(false);
            }
        };

        loadMenu();
    }, [hall, meal, selectedStation, selectedDietaryRestriction]);

    // Format location and meal names for display
    const formatName = (name) => {
        if (!name) return '';
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            <div className="relative z-10 min-h-screen">
                {/* Page header */}
                <div className="pt-6 px-8 pb-4">
                    <h1 className="text-2xl font-bold text-white">
                        {menuInfo ? `${menuInfo.location} - ${menuInfo.period}` : `${formatName(hall)} - ${formatName(meal)}`}
                    </h1>
                    {menuInfo && (
                        <p className="text-sm text-gray-300 mt-1">
                            {menuInfo.totalItems} items available
                        </p>
                    )}
                </div>

                {/* Filter pills on the left */}
                <div className="absolute top-24 left-8 flex flex-col gap-3 max-w-xs z-20">
                    {/* Station selection */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-white text-xs font-semibold">Select Your Station</p>
                        <div className="transform scale-75 origin-top-left -ml-2">
                            <PillNav
                                items={stations}
                                selectionMode={true}
                                selectedItem={selectedStation}
                                onItemClick={setSelectedStation}
                                className="custom-nav"
                                ease="power2.easeOut"
                                baseColor="#000000"
                                pillColor="#ffffff"
                                hoveredPillTextColor="#ffffff"
                                pillTextColor="#000000"
                                selectedPillColor="#ef4444"
                                selectedPillTextColor="#ffffff"
                                showLogo={false}
                                initialLoadAnimation={false}
                            />
                        </div>
                    </div>

                    {/* Dietary restriction selection */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-white text-xs font-semibold">Any Dietary restriction?</p>
                        <div className="transform scale-75 origin-top-left -ml-2">
                            <PillNav
                                items={dietaryRestrictions}
                                selectionMode={true}
                                selectedItem={selectedDietaryRestriction}
                                onItemClick={setSelectedDietaryRestriction}
                                className="custom-nav"
                                ease="power2.easeOut"
                                baseColor="#000000"
                                pillColor="#ffffff"
                                hoveredPillTextColor="#ffffff"
                                pillTextColor="#000000"
                                selectedPillColor="#ef4444"
                                selectedPillTextColor="#ffffff"
                                showLogo={false}
                                initialLoadAnimation={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Menu items display */}
                <div className="flex items-start justify-center min-h-screen pt-24 pb-8 px-4 md:px-8">
                    {loading ? (
                        <div className="text-center mt-20">
                            <div className="text-white text-xl">Loading menu...</div>
                            <div className="text-gray-400 text-sm mt-2">Please wait</div>
                        </div>
                    ) : error ? (
                        <div className="text-center mt-20 max-w-md">
                            <div className="text-red-400 text-xl mb-2">Error loading menu</div>
                            <div className="text-gray-300 text-sm">{error}</div>
                            <div className="text-gray-400 text-xs mt-4">
                                Make sure the backend server is running on port 3000
                            </div>
                        </div>
                    ) : menuItems.length === 0 ? (
                        <div className="text-center mt-20">
                            <div className="text-white text-xl">No menu items found</div>
                            <div className="text-gray-400 text-sm mt-2">
                                Try selecting different filters or check back later
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {menuItems.map((item) => (
                                <MenuCard 
                                    key={item.id}
                                    food={{
                                        name: item.name,
                                        calories: item.calories,
                                        protein: item.protein,
                                        portion: item.portion,
                                        description: item.description,
                                        station: item.station
                                    }} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
