import React, { useState } from "react";
import FoodBackground from "../Components/background";
import PillNav from "../Components/Pill-Selection";
import MenuCard from "../Components/MenuCard";
import { useParams } from "react-router-dom";

export const Steast = () => {
    // Track selected station and dietary restriction
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedDietaryRestriction, setSelectedDietaryRestriction] = useState(null);
    const { hall, meal } = useParams();
    console.log(hall, meal);

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

    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            <div className="relative z-10 min-h-screen">
                {/* Page header */}
                <div className="pt-6 px-8 pb-4">
                    <h1 className="text-2xl font-bold text-white">Welcome To React bits</h1>
                </div>

                {/* Filter pills on the left */}
                <div className="absolute top-24 left-8 flex flex-col gap-3 max-w-xs">
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

                {/* Menu card in the center */}
                <div className="flex items-center justify-center min-h-screen pt-24 pb-8 px-4 md:px-8">
                    <div className="w-full max-w-60">
                        <MenuCard 
                            food={{
                                name: "Food Item",
                                calories: "",
                                protein: "",
                                portion: ""
                            }} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
