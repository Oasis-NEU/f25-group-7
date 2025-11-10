import FoodBackground from "../Components/background";
import RotatingText from "../Components/Rotating text";

export const Home = () => {
    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-white">Welcome To React bits</h1>
                    <div className="flex items-baseline justify-center gap-3 text-4xl">
                        <p className="text-2xl text-gray-300 mt-4 text-5xl">Eating is </p>
                        <RotatingText
                            texts={['React', 'Bits', 'Is', 'Cool!']}
                            mainClassName="px-2 sm:px-2 md:px-3 bg-cyan-300 text-black overflow-hidden py-0.0 sm:py-0 md:py-0 justify-center rounded-lg text-4xl"
                            staggerFrom={"last"}
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "-120%" }}
                            staggerDuration={0.025}
                            splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                            rotationInterval={2000}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};