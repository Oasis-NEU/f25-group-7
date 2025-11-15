import React, {useState} from "react";
import FoodBackground from "../Components/background";
import RotatingText from "../Components/Rotating text";
import { useNavigate } from "react-router-dom";

export const Home = () => {
    const navigate = useNavigate();
    const [selectedTime, setSelectedTime] = useState(null);
    const [selectedLocation,setSelectedLocation] = useState(null);

    const handleFindMenu = () => {
        if(!selectedTime || !selectedLocation){
            alert("Please select both a time and a location before continuing!")
            return;
        }
        const locationSlug = selectedLocation.replace(/\s+/g,"-").toLowerCase();
        const timeSlug = selectedTime.toLowerCase();
        navigate(`/menu/${locationSlug}/${timeSlug}`);
    }
     const diningHalls = [{
       name: "Stetson East",
        des: "Stetson East offers classic comfort foods and a cozy atmosphere — perfect for starting your day with pancakes, omelets, and smiles.",},
       {
        name: "International Village",
        des: "International Village features global flavors and modern vibes, offering a mix of vegan, vegetarian, and international cuisines.",},{
       name: "60 Belvidere",
        des: "60 Belvidere is a hidden gem known for its fresh ingredients, creative dishes, and relaxed, café-style environment near Symphony Hall.",},
    ];
    return (
        
        <div className="min-h-screen overflow-y-auto relative bg-black">
            <FoodBackground />
           <section className='relative flex flex-col items-center text-center pt-20 z-50'>
            <img
        src="/logo__7_-removebg-preview.png"
        alt='NU Rate-ON Logo'
        className='w-56 h-56 mb-6 mx-auto drop-shadow-lg'/> 
            <div>
                <h1 className="text-6xl font-bold text-red-400 mb-4">Welcome To NU RATE-ON</h1>
                <div className="flex items-baseline justify-center gap-5 text-4xl mt-2">
                <p className="text-5xl text-gray-300">Eating is </p>
                <RotatingText
                    texts={["Delicious!", "Nutritious!", "Energizing!", "Comforting!", "Flavorful!", "Wholesome!", "Satisfying!"]}
                    mainClassName="px-2 sm:px-2 md:px-3 bg-white/40 bg-blur text-black overflow-hidden py-0.0 sm:py-0 md:py-0 justify-center rounded-lg text-4xl"
                    staggerFrom={"last"}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-120%" }}
                    staggerDuration={0.025}
                    splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    rotationInterval={2000}/>
            </div>
            <p className="text-white font-semibold mt-20">Scroll Down for Exploration/Selection!</p>
            </div>
                </section>
             //hall section
             
            <section className="flex flex-col items-center py-28 px-6 mt-42 relative z-10 bg-black">
                 <FoodBackground />
                <p className="text-white text-5xl font-bold mb-10">Explore Our Dining Halls</p>
                 <div className="flex gap-8 max-w-6xl flex-wrap justify-center w-full">
                {diningHalls.map((hall,index)=>(
                    <div
                    key={index}
                    onClick={() => setSelectedLocation(hall.name.toLowerCase())}
                    className={`w-[320px] md:w-[350px] p-8  border-4 px-6 py-2 text-md font-semibold transition-colors duration-300 text-center rounded-2xl cursor-pointer ${
                    selectedLocation === hall.name.toLowerCase()
                    ? "bg-red-800 border-red-400 text-white" : "bg-white/20 text-black border-gray-700 hover:bg-gray-800 hover:text-white hover:border-red-400"
                    }`}
                    >
                        <h3 className="text-3xl font-bold text-red-400 mb-3">{hall.name}</h3>
                        <p className="text-gray-300 text-lg leading-relaxed">{hall.des}</p>
                    </div>
                ))}
                </div>
                </section>
            <div className="relative z-10 flex flex-col items-center gap-16 py-20 bg-black">
                 <FoodBackground />
            <h2 className="text-4xl font-semibold text-white mb-10">Select Meal Time</h2>
                < div className="flex gap-4 flex-wrap justify-center">
                {["Breakfast", "Lunch","Dinner"].map((time)=>(
                    <button 
                    key={time}
                    onClick={() => setSelectedTime(time.toLowerCase())}
                    className={`px-6 py-2 rounded-full text-lg font-semibold transition-colors ${
                    selectedTime === time.toLowerCase()
                    ? "bg-red-500 text-white" : "bg-white text-black hover:bg-gray-800 hover:text-white cursor-pointer"
                    }`}
                    >
                        {time}
                    </button>
                ))}
                </div>
            </div>

            <div className="flex justify-center mb-10">
            <button className="w-[60%] sm:w-[40%] md:w-[30%] px-8 py-3 bg-white text-black font-semibold text-lg rounded-full hover:bg-gray-800 transition-colors cursor-pointer hover:text-white"
            onClick={handleFindMenu}>
                Find the Menu
            </button>
            </div>
            </div>
    );
};