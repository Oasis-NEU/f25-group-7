import React, { useState } from 'react';

export const MenuCard = ({ food }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div 
            className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 cursor-pointer border border-gray-200 ${
                isExpanded ? 'shadow-xl border-gray-300' : 'hover:shadow-lg hover:border-gray-300'
            }`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Card Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-semibold text-gray-800">
                    {food.name}
                </h3>
            </div>

            {/* Card Body - Expandable */}
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                {isExpanded && (
                    <div className="p-4 bg-gray-50">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {/* Calories */}
                            <div className="text-center">
                                <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                                    Calories
                                </div>
                                <div className="text-xl font-bold text-gray-800">
                                    {food.calories || 'N/A'}
                                </div>
                            </div>

                            {/* Protein */}
                            <div className="text-center">
                                <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                                    Protein
                                </div>
                                <div className="text-xl font-bold text-gray-800">
                                    {food.protein || 'N/A'}
                                </div>
                            </div>

                            {/* Portion */}
                            <div className="text-center">
                                <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                                    Portion
                                </div>
                                <div className="text-xl font-bold text-gray-800">
                                    {food.portion || 'N/A'}
                                </div>
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

