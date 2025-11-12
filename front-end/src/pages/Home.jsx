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
    }
    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            <div className=' absolute top-10 left-1/2 transform -translate-x-1/2 flex flex-row items-center mb-8 text-center '>
        <img
        src="/logo__7_-removebg-preview.png"
        alt='NU Rate-ON Logo'
        className='w-50 h-50 mb-4 drop-shadow-md'/> 
      </div>
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-3xl  gap-3">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-red-400">Welcome To NU RATE-ON</h1>
                <div className="flex items-baseline justify-center gap-3 text-4xl mt-4">
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

            <div className="flex flex-col items-center justify-center gap-10 mt-16">
            <div className="flex flex-col items-center gap-4 w-full">
                <p className="text-white text-xl font-semibold">Select Time</p>
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

            <div className="flex flex-col items-center gap-4 w-full">
                <p className="text-white text-xl font-semibold">Select Location</p>
                 < div className="flex gap-4 flex-wrap justify-center">
                {["Stetson East", "International Village","60 Belvidere"].map((location)=>(
                    <button 
                    key={location}
                    onClick={() => setSelectedLocation(location.toLowerCase())}
                    className={`px-6 py-2 rounded-full text-lg font-semibold transition-colors ${
                    selectedLocation === location.toLowerCase()
                    ? "bg-red-500 text-white" : "bg-white text-black hover:bg-gray-800 hover:text-white cursor-pointer"
                    }`}
                    >
                        {location}
                    </button>
                ))}
                </div>
            </div>

            <button className="w-[60%] sm:w-[40%] md:w-[30%] px-8 py-3 bg-white text-black font-semibold text-lg rounded-full hover:bg-gray-800 transition-colors cursor-pointer">
                Find the Menu
            </button>
            </div>
        </div>
        </div>
    </div>
    );
};