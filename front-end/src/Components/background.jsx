import { Pizza, Coffee, Cookie, IceCream, Sandwich, Apple } from 'lucide-react';

const FoodBackground = () => {
    return (
        <>
            <style>{`
                @keyframes fade {
                    0%, 100% { 
                        opacity: 0.3;
                    }
                    50% { 
                        opacity: 0.7;
                    }
                }
                .fade-1 { animation: fade 4s ease-in-out infinite; animation-delay: 0s; }
                .fade-2 { animation: fade 4s ease-in-out infinite; animation-delay: 0.5s; }
                .fade-3 { animation: fade 4s ease-in-out infinite; animation-delay: 1s; }
                .fade-4 { animation: fade 4s ease-in-out infinite; animation-delay: 1.5s; }
                .fade-5 { animation: fade 4s ease-in-out infinite; animation-delay: 2s; }
                .fade-6 { animation: fade 4s ease-in-out infinite; animation-delay: 2.5s; }
            `}</style>
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Top left */}
                <div className="absolute top-[10%] left-[15%] fade-1">
                    <Pizza size={40} className="text-orange-500" />
                </div>
                
                {/* Top right */}
                <div className="absolute top-[20%] left-[85%] fade-2">
                    <Coffee size={40} className="text-orange-500" />
                </div>
                
                {/* Middle left */}
                <div className="absolute top-[40%] left-[10%] fade-3">
                    <Cookie size={40} className="text-orange-500" />
                </div>
                
                {/* Middle right */}
                <div className="absolute top-[50%] left-[90%] fade-4">
                    <IceCream size={40} className="text-orange-500" />
                </div>
                
                {/* Bottom left */}
                <div className="absolute top-[70%] left-[20%] fade-5">
                    <Sandwich size={40} className="text-orange-500" />
                </div>
                
                {/* Bottom right */}
                <div className="absolute top-[80%] left-[80%] fade-6">
                    <Apple size={40} className="text-orange-500" />
                </div>
            </div>
        </>
    );
};

export default FoodBackground;