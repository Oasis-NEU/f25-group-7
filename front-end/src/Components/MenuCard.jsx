import React, { useState } from 'react';

export const MenuCard = ({ food }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`relative rounded-2xl overflow-hidden transform transition-all duration-300 cursor-pointer shadow-lg hover:scale-105`}
        >
            <div className="absolute inset-0 bg-linear-to-br from-indigo-700 via-pink-600 to-red-500 opacity-20 -z-10" />
            <div className="bg-linear-to-tr from-white/6 to-white/3 backdrop-blur-sm border border-white/6 rounded-2xl p-5 h-full flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white leading-tight mb-2">{food.name}</h3>
                    {food.description && <p className="text-sm text-gray-300 mb-3">{food.description}</p>}
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-2 items-center flex-wrap">
                        <div className="px-3 py-1 rounded-full bg-white/6 text-white text-xs font-medium">{food.calories ?? 'N/A'} cal</div>
                        {food.is_high_protein ? (
                            <div className="px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 text-xs font-semibold">🥚 High Protein</div>
                        ) : (
                            <div className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-xs font-medium">Standard</div>
                        )}
                    </div>

                    <div className="text-sm text-gray-200">{food.portion ?? 'Portion N/A'}</div>
                </div>

                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/6 text-sm text-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-gray-300 uppercase">Calories</div>
                                <div className="font-semibold text-white">{food.calories ?? 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-300 uppercase">Portion</div>
                                <div className="font-semibold text-white">{food.portion ?? 'N/A'}</div>
                            </div>
                        </div>

                        {/* Station info if available */}
                        {food.station && (
                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Station</p>
                                <p className="text-sm text-gray-700">{food.station}</p>
                            </div>
                        )}

                        {/* Additional details if available */}
                        {food.description && (
                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600 leading-relaxed">{food.description}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuCard;

