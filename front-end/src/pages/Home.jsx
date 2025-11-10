import FoodBackground from "../Components/background";

export const Home = () => {
    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            
            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-white">Welcome Home</h1>
                    <p className="text-2xl text-gray-300 mt-4">Check out the background!</p>
                </div>
            </div>
        </div>
    );
};