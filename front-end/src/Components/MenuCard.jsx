import React, { useState } from 'react';

const badgeStyle = {
    backgroundColor: 'rgba(255,255,255,0.09)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.82)',
};
const badgeClass = "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap";

export const MenuCard = ({ food }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative rounded-2xl overflow-hidden transform transition-all duration-300 cursor-pointer shadow-lg hover:scale-[1.03] hover:shadow-xl"
        >
            {/* subtle card glow */}
            <div className="absolute inset-0 bg-linear-to-br from-white via-white to-white opacity-15 -z-10" />
            <div className="bg-white/4 backdrop-blur-sm border border-white/6 rounded-2xl p-5 h-full flex flex-col justify-between gap-3">

                {/* Name + station */}
                <div>
                    <h3 className="text-base font-semibold text-white leading-snug">
                        {food.name}
                    </h3>
                    {food.station && (
                        <p className="text-[11px] text-white/35 uppercase tracking-widest mt-1">
                            {food.station}
                        </p>
                    )}
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-1.5 items-center">
                    <span className={badgeClass} style={badgeStyle}>
                        {food.calories != null ? `${food.calories} cal` : '— cal'}
                    </span>

                    {food.is_vegan && (
                        <span className={badgeClass} style={badgeStyle}>🌱 Vegan</span>
                    )}
                    {!food.is_vegan && food.is_vegetarian && (
                        <span className={badgeClass} style={badgeStyle}>🥦 Vegetarian</span>
                    )}
                    {food.is_high_protein && (
                        <span className={badgeClass} style={badgeStyle}>💪 High Protein</span>
                    )}
                </div>

                {/* Portion + expand hint */}
                <div className="flex items-center justify-between text-[11px] text-white/35">
                    <span>{food.portion ?? ''}</span>
                    <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▾
                    </span>
                </div>

                {/* Expanded nutrition panel */}
                {isExpanded && (
                    <div className="pt-3 border-t border-white/8 space-y-3 animate-[fadeIn_0.15s_ease]">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Calories</p>
                                <p className="text-sm font-semibold text-white">{food.calories ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Portion</p>
                                <p className="text-sm font-semibold text-white">{food.portion ?? '—'}</p>
                            </div>
                            {food.protein && (
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Protein</p>
                                    <p className="text-sm font-semibold text-white">{food.protein}</p>
                                </div>
                            )}
                            {food.station && (
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Station</p>
                                    <p className="text-sm font-semibold text-white">{food.station}</p>
                                </div>
                            )}
                        </div>

                        {/* Full badge row in expanded state */}
                        <div className="flex flex-wrap gap-1.5">
                            {food.is_vegan && <span className={badgeClass} style={badgeStyle}>🌱 Vegan</span>}
                            {!food.is_vegan && food.is_vegetarian && <span className={badgeClass} style={badgeStyle}>🥦 Vegetarian</span>}
                            {food.is_high_protein && <span className={badgeClass} style={badgeStyle}>💪 High Protein</span>}
                        </div>

                        {food.description && (
                            <p className="text-xs text-white/50 leading-relaxed">{food.description}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuCard;
