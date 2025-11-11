import FoodBackground from "../Components/background";
import RotatingText from "../Components/Rotating text";
import PillNav from "../Components/Pill-Selection";

export const Home = () => {
    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-white">Welcome To React bits</h1>
                <div className="flex items-baseline justify-center gap-3 text-4xl mt-4">
                <p className="text-5xl text-gray-300">Eating is </p>
                <RotatingText
                    texts={["React", "Bits", "Is", "Cool!"]}
                    mainClassName="px-2 sm:px-2 md:px-3 bg-cyan-300 text-black overflow-hidden py-0.0 sm:py-0 md:py-0 justify-center rounded-lg text-4xl"
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
                <PillNav
                    logoAlt="Company Logo"
                    items={[
                    { label: "Breakfast", href: "/" },
                    { label: "Lunch", href: "/about" },
                    { label: "Dinner", href: "/services" },]}
                    activeHref="/"
                    className="custom-nav"
                    ease="power2.easeOut"
                    baseColor="#000000"
                    pillColor="#ffffff"
                    hoveredPillTextColor="#ffffff"
                    pillTextColor="#000000"
                    initialLoadAnimation={false}/>
            </div>

            <div className="flex flex-col items-center gap-4 w-full">
                <p className="text-white text-xl font-semibold">Select Location</p>
                <PillNav
                    logoAlt="Company Logo"
                    items={[
                        { label: "Stetson East", href: "/" },
                        { label: "International Village", href: "/about" },
                        { label: "60 Belvadere", href: "/services" },]}
                    activeHref="/"
                    className="custom-nav"
                    ease="power2.easeOut"
                    baseColor="#000000"
                    pillColor="#ffffff"
                    hoveredPillTextColor="#ffffff"
                    pillTextColor="#000000"
                    initialLoadAnimation={false}
                />
            </div>

            <button className="w-[60%] sm:w-[40%] md:w-[30%] px-8 py-3 bg-white text-black font-semibold text-lg rounded-full hover:bg-gray-200 transition-colors">
                Find the Menu
            </button>
            </div>
        </div>
        </div>
    </div>
    );
};