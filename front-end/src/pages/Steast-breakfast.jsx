import FoodBackground from "../Components/background";
import PillNav from "../Components/Pill-Selection";

export const Steast = () => {
    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-white">Welcome To React bits</h1>

            <div className="flex flex-col items-center justify-center gap-10 mt-16">
            <div className="flex flex-col items-center gap-4 w-full">
                <p className="text-white text-xl font-semibold">Select Your Station</p>
                <PillNav
                    logoAlt="Company Logo"
                    items={[
                        { label: "Cucina", href: "/" },
                        { label: "Rice station", href: "/about" },
                        { label: "HomeStyle", href: "/services" },
                        { label: "MenuTainment", href: "/about" },
                        ]}
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
                <p className="text-white text-xl font-semibold">Any Dietary restriction?</p>
                <PillNav
                    logoAlt="Company Logo"
                    items={[
                        { label: "Vegan", href: "/" },
                        { label: "Vegetarian", href: "/about" },
                        ]}
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

            </div>
        </div>
        </div>
    </div>
    );
};
