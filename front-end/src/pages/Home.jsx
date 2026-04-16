import { useState, useEffect } from "react";
import FoodBackground from "../Components/background";
import RotatingText from "../Components/Rotating text";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../config/supabaseClient";

export const Home = () => {
    const navigate = useNavigate();
    const [selectedTime, setSelectedTime] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription?.unsubscribe();
    }, []);

    const handleFindMenu = () => {
        if (!selectedTime || !selectedLocation) {
            setError("Please select both a dining hall and a meal time.");
            return;
        }
        setError('');
        const locationSlug = selectedLocation.replace(/\s+/g, "-").toLowerCase();
        const timeSlug = selectedTime.toLowerCase();
        navigate(`/menu/${locationSlug}/${timeSlug}`);
    };

    const diningHalls = [
        {
            name: "Stetson East",
            des: "The largest dining hall on campus. Open all day with the widest variety of stations and comfort foods.",
        },
        {
            name: "International Village",
            des: "Global cuisines and rotating menus; Latin Kitchen, Spice Bowl, Sushi, Pomodoro, and more.",
        },
        {
            name: "60 Belvidere",
            des: "A smaller neighbourhood hall near Symphony Hall. Serves breakfast and dinner only.",
        },
    ];

    return (
        <div className="min-h-screen overflow-y-auto relative bg-black">
            <FoodBackground />

            {/* Hero */}
            <section className="relative flex flex-col items-center text-center pt-20 px-4 z-50">
                <img
                    src="/logo__7_-removebg-preview.png"
                    alt="NU Rate-ON Logo"
                    className="w-28 h-28 sm:w-40 sm:h-40 md:w-56 md:h-56 mb-4 mx-auto drop-shadow-lg"
                />
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-red-400 mb-4">
                    Welcome To NU Dining
                </h1>
                <div className="flex items-baseline justify-center gap-3 flex-wrap mt-2">
                    <p className="text-2xl sm:text-3xl md:text-5xl text-gray-300">Eating is</p>
                    <RotatingText
                        texts={["Delicious!", "Nutritious!", "Energizing!", "Comforting!", "Flavorful!", "Wholesome!", "Satisfying!"]}
                        mainClassName="px-2 sm:px-3 bg-white/40 bg-blur text-black overflow-hidden py-0.5 justify-center rounded-lg text-2xl sm:text-3xl md:text-4xl"
                        staggerFrom="last"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "-120%" }}
                        staggerDuration={0.025}
                        splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1"
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        rotationInterval={2000}
                    />
                </div>
            </section>

            {/* Dining hall cards */}
            <section className="flex flex-col items-center py-16 md:py-28 px-4 sm:px-6 mt-10 md:mt-20 relative z-10 bg-black">
                <FoodBackground />
                <p className="text-white text-3xl sm:text-4xl md:text-5xl font-bold mb-8 md:mb-10 text-center">
                    Explore Our Dining Halls
                </p>
                <div className="flex gap-6 max-w-6xl flex-wrap justify-center w-full">
                    {diningHalls.map((hall, index) => (
                        <div
                            key={index}
                            onClick={() => { setSelectedLocation(hall.name.toLowerCase()); setError(''); }}
                            className={`w-full sm:w-[300px] md:w-[340px] p-5 sm:p-6 border-4 font-semibold transition-colors duration-300 text-center rounded-2xl cursor-pointer ${
                                selectedLocation === hall.name.toLowerCase()
                                    ? "bg-red-800 border-red-400 text-white"
                                    : "bg-white/20 text-black border-gray-700 hover:bg-gray-800 hover:text-white hover:border-red-400"
                            }`}
                        >
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400 mb-3">{hall.name}</h3>
                            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{hall.des}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Meal time */}
            <div className="relative z-10 flex flex-col items-center gap-6 py-12 md:py-20 px-4 bg-black">
                <FoodBackground />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white text-center">
                    Select Meal Time
                </h2>
                <div className="flex gap-3 flex-wrap justify-center">
                    {["Breakfast", "Lunch", "Dinner"].map((time) => (
                        <button
                            key={time}
                            onClick={() => { setSelectedTime(time.toLowerCase()); setError(''); }}
                            className={`px-6 py-2.5 rounded-full text-base sm:text-lg font-semibold transition-colors ${
                                selectedTime === time.toLowerCase()
                                    ? "bg-red-500 text-white"
                                    : "bg-white text-black hover:bg-gray-800 hover:text-white cursor-pointer"
                            }`}
                        >
                            {time}
                        </button>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3 px-4 pb-16">
                {error && (
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                )}
                <button
                    className="w-full max-w-xs sm:max-w-sm px-8 py-3 bg-white text-black font-semibold text-lg rounded-full hover:bg-gray-800 transition-colors cursor-pointer hover:text-white"
                    onClick={handleFindMenu}
                >
                    Find the Menu
                </button>
            </div>

            {/* Unauthenticated upsell */}
            {!user && (
                <section className="relative z-10 bg-linear-to-b from-black to-red-950/30 border-t border-white/10 px-4 py-16 flex flex-col items-center text-center">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-3 font-semibold">Members only</p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">There's more waiting for you</h2>
                    <p className="text-white/60 text-base sm:text-lg max-w-xl mb-10">
                        Create a free account to unlock calorie tracking, meal voting, and personalised nutrition insights.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-5 mb-12 w-full max-w-2xl justify-center">
                        {[
                            {
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                ),
                                title: "Calorie Tracker",
                                desc: "Log every meal and monitor your daily nutrition goals.",
                            },
                            {
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M5 13l4 4L19 7" />
                                ),
                                title: "Vote on Meals",
                                desc: "Rate dishes and help shape what gets served on campus.",
                            },
                            {
                                icon: (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
                                ),
                                title: "Nutrition Insights",
                                desc: "See protein, carbs, fats and more for every item on the menu.",
                            },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 text-left relative overflow-hidden">
                                <div className="absolute top-3 right-3 bg-red-500/20 border border-red-500/30 rounded-full p-1">
                                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <svg className="w-7 h-7 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {icon}
                                </svg>
                                <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
                                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/signup"
                            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold text-lg rounded-full transition-colors shadow-lg shadow-red-500/25"
                        >
                            Create free account
                        </Link>
                        <Link
                            to="/login"
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-full transition-colors border border-white/15"
                        >
                            Sign in
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
};
