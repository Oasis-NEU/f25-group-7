import React, { useState, useEffect } from "react";
import FoodBackground from "../Components/background";
import PillNav from "../Components/Pill-Selection";
import MenuCard from "../Components/MenuCard";
import { useParams } from "react-router-dom";
import { supabase } from "../config/supabaseClient"; // replace with your backend

export const Steast = () => {
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedDietaryRestriction, setSelectedDietaryRestriction] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
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

    // Fetch menu data from backend
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                let query = supabase
                    .from("menu")
                    .select("*")
                    .eq("hall", hall)
                    .eq("meal", meal);

                if (selectedStation) query = query.eq("station", selectedStation.value);
                if (selectedDietaryRestriction) query = query.eq("dietary", selectedDietaryRestriction.value);

                const { data, error } = await query;
                if (error) throw error;

                setMenuItems(data || []);
            } catch (err) {
                console.error("Error fetching menu:", err.message);
            }
        };

        fetchMenu();
    }, [hall, meal, selectedStation, selectedDietaryRestriction]);

    return (
        <div className="min-h-screen bg-black relative">
            <FoodBackground />
            {/* Main content container */}
            <div className="relative z-10 flex flex-col md:flex-row min-h-screen">

                {/* Left nav filters */}
                <div className="w-full md:w-64 px-6 pt-24 md:pt-32 flex flex-col gap-6 bg-black md:fixed h-full">
                    {/* Station selection */}
                    <div className="flex flex-col gap-2">
                        <p className="text-white font-semibold text-sm">Select Your Station</p>
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

                    {/* Dietary restriction selection */}
                    <div className="flex flex-col gap-2">
                        <p className="text-white font-semibold text-sm">Any Dietary restriction?</p>
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

                {/* Right content: header + menu */}
                <div className="flex-1 flex flex-col items-center justify-start pt-32 px-6 md:ml-64">
                    {/* Page header */}
                    <h1 className="text-3xl font-bold text-white mb-8 text-center">
                        {hall.charAt(0).toUpperCase() + hall.slice(1)} - {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </h1>

                    {/* Menu cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
                        {menuItems.length === 0 ? (
                            <p className="text-white text-lg col-span-full text-center">
                                No menu items found for this selection.
                            </p>
                        ) : (
                            menuItems.map((food) => (
                                <MenuCard
                                    key={food.id}
                                    food={{
                                        name: food.name,
                                        calories: food.calories,
                                        protein: food.protein,
                                        portion: food.portion,
                                    }}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
