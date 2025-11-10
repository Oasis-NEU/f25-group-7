import { Building,Building2 } from 'lucide-react';
import { castVote } from '../functions/send_vote';
import FoodBackground from "../Components/background";

export const Vote = () => {
  const handleVote = async (option) => {
    await castVote(option);
    alert(`Vote for ${option} cast!`);
  };

    return (
        <div className="min-h-screen bg-black">
            <FoodBackground />
            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-white">Steast or IV?</h1>
                    <div className="flex gap-4 mt-6">
                        <button
                            className="flex items-center gap-2 px-6 py-3 bg-red-900 text-white rounded-lg hover:bg-red-600 transition"
                            onClick={() => handleVote("steast")}
                        >
                            <Building className="w-5 h-5" />
                            <span>Vote for Steast</span>
                        </button>
                        <button
                            className="flex items-center gap-2 px-6 py-3 bg-red-900 text-white rounded-lg hover:bg-red-600 transition"
                            onClick={() => handleVote("iv")}
                        >
                            <span>Vote for IV</span>
                            <Building2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};