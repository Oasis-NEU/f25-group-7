import React from 'react';
import FoodBackground from '../Components/background';

// Hours pulled live from DineOnCampus weekly_schedule API — week of Apr 12 2026
// Campus Roots (60 Belv) has TWO windows per day with no lunch gap
const halls = [
  {
    name: 'Stetson East',
    subtitle: 'The Eatery at Stetson East',
    description:
      'The largest residential dining hall on campus. Open all day every day of the week with the widest variety of stations.',
    week: [
      { day: 'Mon – Thu', slots: ['7:00 AM – 10:00 PM'] },
      { day: 'Fri',       slots: ['7:00 AM – 9:00 PM']  },
      { day: 'Sat',       slots: ['8:00 AM – 9:00 PM']  },
      { day: 'Sun',       slots: ['8:00 AM – 10:00 PM'] },
    ],
  },
  {
    name: 'International Village',
    subtitle: 'United Table at International Village',
    description:
      'Global cuisines and rotating menus — Latin Kitchen, Spice Bowl, Sushi, Pomodoro, and more. Open every day.',
    week: [
      { day: 'Mon – Thu', slots: ['8:00 AM – 10:00 PM'] },
      { day: 'Fri',       slots: ['8:00 AM – 9:00 PM']  },
      { day: 'Sat – Sun', slots: ['8:00 AM – 9:00 PM']  },
    ],
  },
  {
    name: '60 Belvidere',
    subtitle: 'Campus Roots at 60 Belvidere',
    description:
      'Smaller neighbourhood hall near Symphony Hall. Serves breakfast and dinner only — no lunch service. Closed Friday and Saturday.',
    week: [
      { day: 'Mon – Thu', slots: ['8:00 AM – 10:00 AM', '4:00 PM – 8:00 PM'], note: 'No lunch service' },
      { day: 'Fri – Sat', slots: [],                                           closed: true },
      { day: 'Sun',       slots: ['10:00 AM – 2:00 PM', '4:00 PM – 8:00 PM'] },
    ],
  },
];

const dietaryInfo = [
  {
    icon: '🌱',
    label: 'Vegan',
    def: 'No animal products of any kind — no meat, dairy, or eggs.',
  },
  {
    icon: '🥦',
    label: 'Vegetarian',
    def: 'No meat, poultry, fish, or seafood. May contain eggs or dairy.',
  },
  {
    icon: '💪',
    label: 'High Protein',
    def: 'Flagged "Good Source of Protein" by the dining team — typically 15 g+ per serving.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <FoodBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">
            Northeastern Dining
          </h1>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Live hours and dietary info for the three residential dining halls.
          </p>
        </div>

        {/* ── Hall cards ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {halls.map(hall => (
            <div
              key={hall.name}
              className="bg-white/4 backdrop-blur-sm border border-white/8 rounded-2xl p-6 flex flex-col gap-5"
            >
              {/* Title */}
              <div>
                <h2 className="text-xl font-bold text-white">{hall.name}</h2>
                <p className="text-[11px] text-red-400/70 mt-0.5 leading-snug">{hall.subtitle}</p>
              </div>

              <p className="text-sm text-white/45 leading-relaxed">{hall.description}</p>

              {/* Weekly schedule */}
              <div className="space-y-2.5">
                {hall.week.map(row => (
                  <div key={row.day} className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-white/25">{row.day}</span>
                    {row.closed ? (
                      <span className="text-sm font-semibold text-red-400/60">Closed</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {row.slots.map(s => (
                          <span key={s} className="text-sm font-semibold text-white">{s}</span>
                        ))}
                        {row.note && (
                          <span className="text-[11px] text-white/30 italic">{row.note}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Dietary labels ── */}
        <div className="bg-white/4 backdrop-blur-sm border border-white/8 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-1 text-center">Dietary Labels</h2>
          <p className="text-white/35 text-sm text-center mb-8">
            All labels come directly from the DineOnCampus API — not estimated.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {dietaryInfo.map(item => (
              <div key={item.label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white font-semibold">{item.label}</span>
                </div>
                <p className="text-sm text-white/45 leading-relaxed">{item.def}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 pt-5 border-t border-white/6 text-[11px] text-white/20 text-center">
            Hours sourced from DineOnCampus live API · Week of Apr 12, 2026 · Subject to change during finals, breaks &amp; holidays
          </p>
        </div>

      </div>
    </div>
  );
}
