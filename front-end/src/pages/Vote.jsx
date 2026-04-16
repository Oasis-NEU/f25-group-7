import { Building, Building2 } from 'lucide-react';
import FoodBackground from "../Components/background";
import TextType from '../Components/TextType';
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../config/supabaseClient";
import { useNavigate } from 'react-router-dom';

const MEAL_PERIODS = [
  { name: 'breakfast', label: 'Breakfast', start: 7 * 60,  end: 11 * 60 },
  { name: 'lunch',     label: 'Lunch',     start: 11 * 60, end: 15 * 60 },
  { name: 'dinner',    label: 'Dinner',    start: 16 * 60, end: 21 * 60 },
];

function minutesNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
function getStartedPeriods() {
  const m = minutesNow();
  return MEAL_PERIODS.filter(p => m >= p.start);
}
function getCurrentPeriod() {
  const m = minutesNow();
  return MEAL_PERIODS.find(p => m >= p.start && m < p.end) || null;
}
function getNextPeriod() {
  const m = minutesNow();
  return MEAL_PERIODS.find(p => p.start > m) || null;
}
function fmtTime(minutes) {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}${min > 0 ? ':' + String(min).padStart(2, '0') : ''} ${ampm}`;
}

export const Vote = () => {
  const navigate = useNavigate();
  const [user, setUser]                 = useState(null);
  const [votes, setVotes]               = useState({ steast: 0, iv: 0 });
  // votedPeriods is now loaded from Supabase — works across devices/browsers
  const [votedPeriods, setVotedPeriods] = useState([]);
  const [startedPeriods, setStartedPeriods] = useState(getStartedPeriods());
  const [currentPeriod, setCurrentPeriod]   = useState(getCurrentPeriod());
  const [toast, setToast]   = useState(null);
  const toastTimer = useRef(null);
  const today = new Date().toISOString().substring(0, 10);

  // Slots the user is allowed to vote in right now
  const unvotedSlots = startedPeriods.filter(p => !votedPeriods.includes(p.name));
  const canVote      = unvotedSlots.length > 0;
  const nextPeriod   = getNextPeriod();

  // ── Auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { navigate('/login'); return; }
      setUser(data.user);
    });
  }, [navigate]);

  // ── All-time cumulative totals (re-fetched on any Realtime event) ─────────────
  const fetchTotals = useCallback(async () => {
    const { data } = await supabase.from("votes").select("location");
    if (data) {
      setVotes({
        steast: data.filter(r => r.location === 'steast').length,
        iv:     data.filter(r => r.location === 'iv').length,
      });
    }
  }, []);

  // ── Load user's voted periods for today + subscribe to Realtime ───────────────
  useEffect(() => {
    if (!user) return;

    // Which periods has this user already voted today?
    supabase
      .from("votes")
      .select("meal_period")
      .eq("user_id",   user.id)
      .eq("vote_date", today)
      .then(({ data }) => setVotedPeriods((data || []).map(r => r.meal_period)));

    // Community totals
    fetchTotals();

    // Live updates: re-fetch totals on any INSERT or DELETE in the votes table.
    // My own votes are covered by optimistic updates; fetchTotals handles other users.
    const channel = supabase
      .channel("votes-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, fetchTotals)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "votes" }, fetchTotals)
      .subscribe();

    // Keep meal period state fresh every minute
    const clock = setInterval(() => {
      setStartedPeriods(getStartedPeriods());
      setCurrentPeriod(getCurrentPeriod());
    }, 60_000);

    return () => { supabase.removeChannel(channel); clearInterval(clock); };
  }, [user, fetchTotals, today]);

  // ── Cast vote ────────────────────────────────────────────────────────────────
  const handleVote = async (option) => {
    if (!canVote || !user) return;
    const label = option === "steast" ? "Stetson East" : "International Village";

    // Prefer the currently-active period; otherwise use the earliest unvoted slot
    const slotToMark = (currentPeriod && unvotedSlots.find(p => p.name === currentPeriod.name))
      ? currentPeriod
      : unvotedSlots[0];

    // Optimistic update
    setVotedPeriods(prev => [...prev, slotToMark.name]);
    setVotes(prev => ({ ...prev, [option]: prev[option] + 1 }));

    const { error } = await supabase.from("votes").insert({
      user_id:     user.id,
      vote_date:   today,
      meal_period: slotToMark.name,
      location:    option,
    });

    if (error) {
      // Roll back — DB rejected (e.g. duplicate vote from another tab)
      setVotedPeriods(prev => prev.filter(p => p !== slotToMark.name));
      setVotes(prev => ({ ...prev, [option]: Math.max(0, prev[option] - 1) }));
      return;
    }

    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ option, label, slot: slotToMark.name });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  // ── Undo ─────────────────────────────────────────────────────────────────────
  const handleUndo = async () => {
    if (!toast || !user) return;

    // Optimistic update
    setVotes(prev => ({ ...prev, [toast.option]: Math.max(0, prev[toast.option] - 1) }));
    setVotedPeriods(prev => prev.filter(p => p !== toast.slot));
    clearTimeout(toastTimer.current);
    setToast(null);

    await supabase
      .from("votes")
      .delete()
      .eq("user_id",     user.id)
      .eq("vote_date",   today)
      .eq("meal_period", toast.slot);
  };

  const statusText = () => {
    if (unvotedSlots.length > 0) {
      const names = unvotedSlots.map(p => p.label).join(' & ');
      return `${unvotedSlots.length} vote${unvotedSlots.length > 1 ? 's' : ''} available — ${names}`;
    }
    if (nextPeriod) return `All caught up · next vote opens at ${fmtTime(nextPeriod.start)} for ${nextPeriod.label}`;
    return 'All 3 votes used for today · see you tomorrow';
  };

  return (
    <div className="min-h-screen bg-black">
      <FoodBackground />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-6 sm:gap-8 px-4">

        <div className="text-center">
          <div className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-2">
            <TextType
              text={["Steast or IV?", "Vote your choice"]}
              typingSpeed={100}
              pauseDuration={3500}
              showCursor={true}
              cursorCharacter="|"
              textColors={["#FFFFFF", "#FFFFFF"]}
            />
          </div>
        </div>

        {/* Meal period pills */}
        <div className="flex gap-2 flex-wrap justify-center">
          {MEAL_PERIODS.map(p => {
            const started   = startedPeriods.some(s => s.name === p.name);
            const voted     = votedPeriods.includes(p.name);
            const active    = currentPeriod?.name === p.name;
            const available = started && !voted;
            return (
              <div
                key={p.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: active
                    ? 'rgba(239,68,68,0.15)'
                    : available
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${
                    active    ? 'rgba(239,68,68,0.4)'    :
                    available ? 'rgba(255,255,255,0.15)' :
                                'rgba(255,255,255,0.06)'
                  }`,
                  color: voted
                    ? 'rgba(134,239,172,0.85)'
                    : active
                      ? 'rgba(239,68,68,0.9)'
                      : available
                        ? 'rgba(255,255,255,0.7)'
                        : 'rgba(255,255,255,0.2)',
                }}
              >
                {voted ? '✓' : active ? '●' : started ? '○' : '·'} {p.label}
              </div>
            );
          })}
        </div>

        {/* Vote buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-lg">
          <button
            disabled={!canVote}
            onClick={() => handleVote("steast")}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg transition font-medium w-full sm:w-auto ${
              canVote
                ? 'bg-red-900 hover:bg-red-600 text-white cursor-pointer'
                : 'bg-white/5 text-white/25 cursor-not-allowed'
            }`}
          >
            <Building className="w-5 h-5 shrink-0" />
            <span>Vote for Stetson East</span>
            <span className="font-bold">{votes.steast}</span>
          </button>
          <button
            disabled={!canVote}
            onClick={() => handleVote("iv")}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg transition font-medium w-full sm:w-auto ${
              canVote
                ? 'bg-red-900 hover:bg-red-600 text-white cursor-pointer'
                : 'bg-white/5 text-white/25 cursor-not-allowed'
            }`}
          >
            <span>Vote for Int'l Village</span>
            <span className="font-bold">{votes.iv}</span>
            <Building2 className="w-5 h-5 shrink-0" />
          </button>
        </div>

        <p className="text-sm text-white/35 text-center px-4">{statusText()}</p>
      </div>

      {/* Undo toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-50 flex items-center justify-between sm:justify-start gap-3 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-2xl"
          style={{ backgroundColor: 'rgba(30,30,35,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span>Voted for <span className="text-red-400">{toast.label}</span></span>
          <button
            onClick={handleUndo}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 transition shrink-0"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

export default Vote;
