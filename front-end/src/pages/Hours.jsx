import { useEffect, useState } from 'react';
import FoodBackground from '../Components/background';
import { campusNow } from '../functions/campusTime';
import {
  FALLBACK_UPDATED,
  formatSlot,
  formatTime,
  groupWeek,
  mergeHours,
  openState,
} from '../functions/hours';

const dietaryInfo = [
  {
    icon: '🌱',
    label: 'Vegan',
    def: 'No animal products of any kind: no meat, dairy, or eggs.',
  },
  {
    icon: '🥦',
    label: 'Vegetarian',
    def: 'No meat, poultry, fish, or seafood. May contain eggs or dairy.',
  },
  {
    icon: '💪',
    label: 'High Protein',
    def: 'Flagged "Good Source of Protein" by the dining team, typically 15 g or more per serving.',
  },
];

function OpenBadge({ state }) {
  if (state.open) {
    return (
      <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-500/15 text-green-300 border border-green-500/25">
        Open until {formatTime(state.closesAt)}
      </span>
    );
  }
  return (
    <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/6 text-white/40 border border-white/10">
      {state.opensAt ? `Opens ${formatTime(state.opensAt)}` : 'Closed'}
    </span>
  );
}

// Hours are stable within a semester, so only flag them once a sync is old
// enough that a semester boundary has probably been missed.
const STALE_AFTER_DAYS = 30;

export default function Hours() {
  const [halls, setHalls] = useState(() => mergeHours([]));
  const [status, setStatus] = useState('loading');
  const [ageDays, setAgeDays] = useState(null);
  const [now, setNow] = useState(() => campusNow());

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch('/api/hours');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!active) return;
        const merged = mergeHours(json.halls);
        setHalls(merged);
        setAgeDays(json.ageDays ?? null);
        setStatus(merged.some(hall => hall.live) ? 'live' : 'fallback');
      } catch {
        // The endpoint is unavailable in local dev and whenever the scraper
        // has not run, so the bundled schedule is the expected outcome here.
        if (active) setStatus('fallback');
      }
    }

    load();
    const clock = setInterval(() => setNow(campusNow()), 60_000);
    return () => { active = false; clearInterval(clock); };
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <FoodBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">

        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">
            Dining Hall Hours
          </h1>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Opening times and dietary labels for the three residential halls.
          </p>
        </div>

        {status === 'live' && ageDays !== null && ageDays > STALE_AFTER_DAYS && (
          <div className="mb-8 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center">
            <p className="text-amber-200/90 text-sm">
              These hours were last synced {ageDays} days ago, so they may be from a previous semester.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {halls.map(hall => {
            const state = openState(hall.days, now);
            return (
              <div
                key={hall.name}
                className="bg-white/4 backdrop-blur-sm border border-white/8 rounded-2xl p-6 flex flex-col gap-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">{hall.name}</h2>
                    <p className="text-[11px] text-red-400/70 mt-0.5 leading-snug">{hall.locationName}</p>
                  </div>
                  <OpenBadge state={state} />
                </div>

                <p className="text-sm text-white/45 leading-relaxed">{hall.description}</p>

                <div className="space-y-2.5">
                  {groupWeek(hall.days).map(row => (
                    <div key={row.label} className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-widest text-white/25">{row.label}</span>
                      {row.closed ? (
                        <span className="text-sm font-semibold text-red-400/60">Closed</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {row.slots.map(slot => (
                            <span key={`${slot.opens}-${slot.closes}`} className="text-sm font-semibold text-white">
                              {formatSlot(slot)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {hall.note && (
                    <span className="block text-[11px] text-white/30 italic pt-1">{hall.note}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white/4 backdrop-blur-sm border border-white/8 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-1 text-center">Dietary Labels</h2>
          <p className="text-white/35 text-sm text-center mb-8">
            Every label comes straight from the DineOnCampus data. None of them are estimated.
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
            {status === 'loading' && 'Checking for the latest hours.'}
            {status === 'live' && (
              ageDays === null
                ? 'Hours synced from DineOnCampus. Times can change during finals, breaks and holidays.'
                : ageDays === 0
                  ? 'Hours synced from DineOnCampus today. Times can change during finals, breaks and holidays.'
                  : `Hours synced from DineOnCampus ${ageDays} ${ageDays === 1 ? 'day' : 'days'} ago. Times can change during finals, breaks and holidays.`
            )}
            {status === 'fallback' && `No synced hours are stored yet, so this is the schedule last checked on ${FALLBACK_UPDATED}. Times can change during finals, breaks and holidays.`}
          </p>
        </div>

      </div>
    </div>
  );
}
