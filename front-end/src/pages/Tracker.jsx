import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FoodBackground from '../Components/background';
import { supabase } from '../config/supabaseClient';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Plus, Trash2, Target, TrendingUp } from 'lucide-react';

// ── SVG Macro Ring ─────────────────────────────────────────────────────────────
function MacroRing({ label, value, goal, color, unit = 'g', size = 110 }) {
  const stroke = 9;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const offset = circ * (1 - pct);
  const cx = size / 2;
  const over = goal > 0 && value > goal;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke={over ? '#f87171' : color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-sm leading-none">{Math.round(value)}</span>
          <span className="text-white/30 text-[10px]">/{goal}{unit}</span>
        </div>
      </div>
      <span className="text-white/55 text-xs font-medium">{label}</span>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseNum(str) {
  if (!str && str !== 0) return 0;
  const m = String(str).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const HALLS = [
  { slug: 'stetson-east',          label: 'Stetson East' },
  { slug: 'international-village', label: "Int'l Village" },
  { slug: '60-belvidere',          label: '60 Belvidere' },
];
const MEALS_LIST = ['breakfast', 'lunch', 'dinner'];

const DEFAULT_GOALS = { calories_goal: 2000, protein_goal: 150, carbs_goal: 250, fat_goal: 65, fiber_goal: 25 };

// ── Confetti celebration ───────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#14b8a6','#f43f5e','#84cc16'];

function ConfettiCelebration({ onDone }) {
  const pieces = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i,
    left:     Math.random() * 100,
    delay:    Math.random() * 2.8,
    duration: 2.8 + Math.random() * 2,
    color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    width:    5 + Math.random() * 9,
    height:   3 + Math.random() * 6,
    radius:   Math.random() > 0.45 ? '50%' : '2px',
    r0:       Math.random() * 360,
    drift:    (Math.random() - 0.5) * 280,
  })), []);

  useEffect(() => {
    const t = setTimeout(onDone, 5500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-200 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-24px) translateX(0) rotate(var(--r0)); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--drift)) rotate(calc(var(--r0) + 800deg)); opacity: 0; }
        }
        @keyframes goal-badge {
          0%   { opacity: 0; transform: scale(0.7) translateY(20px); }
          18%  { opacity: 1; transform: scale(1.05) translateY(0); }
          25%  { transform: scale(1); }
          72%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9) translateY(-12px); }
        }
      `}</style>

      {/* Falling pieces */}
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: 0, left: `${p.left}%`,
          width: `${p.width}px`, height: `${p.height}px`,
          backgroundColor: p.color, borderRadius: p.radius,
          '--r0': `${p.r0}deg`, '--drift': `${p.drift}px`,
          animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in both`,
        }} />
      ))}

      {/* Centre badge */}
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ animation: 'goal-badge 5.5s ease forwards' }}>
        <div className="text-center px-10 py-7 rounded-3xl shadow-2xl"
          style={{ backgroundColor: 'rgba(5,5,8,0.92)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)' }}>
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mb-1">Daily Goal Reached!</p>
          <p className="text-white/45 text-sm mt-1">You hit your calorie target — great work 🔥</p>
        </div>
      </div>
    </div>
  );
}

// ── Custom chart tooltip ───────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: 'rgba(15,15,20,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}{p.name === 'calories' ? ' kcal' : 'g'}</p>
      ))}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Tracker() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [logs, setLogs] = useState([]);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showConfetti, setShowConfetti]   = useState(false);
  const celebratedRef    = useRef(false);
  const initializedRef   = useRef(false);
  const prevAboveGoalRef = useRef(false);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [addTab, setAddTab]               = useState('dining');
  const [chartMetric, setChartMetric]     = useState('calories');

  // Dining picker
  const [diningHall, setDiningHall]     = useState('stetson-east');
  const [diningMeal, setDiningMeal]     = useState('lunch');
  const [diningItems, setDiningItems]   = useState([]);
  const [diningBusy, setDiningBusy]     = useState(false);
  const [diningSearch, setDiningSearch] = useState('');
  const [mealTag, setMealTag]           = useState('Lunch');
  const [quantities, setQuantities]     = useState({});
  const logBasesRef = useRef({});   // id → original 1× values (set on load/insert)
  const [logQtys, setLogQtys]       = useState({});   // id → current multiplier

  // Manual entry
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sodium: '', sugar: '', portion: '' });

  // Goal draft
  const [goalDraft, setGoalDraft] = useState(null);

  const today = new Date().toISOString().substring(0, 10);

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { navigate('/login'); return; }
      setUser(data.user);
    });
  }, [navigate]);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    Promise.all([fetchGoals(), fetchTodayLogs(), fetchWeekData()]);
  }, [user]);

  async function fetchGoals() {
    const { data } = await supabase.from('nutrition_goals').select('*').eq('user_id', user.id).single();
    if (data) { setGoals(data); }
    else { setGoalDraft({ ...DEFAULT_GOALS }); setShowGoalModal(true); }
    setLoading(false);
  }

  async function fetchTodayLogs() {
    const { data } = await supabase
      .from('food_logs').select('*').eq('user_id', user.id).eq('logged_at', today)
      .order('created_at', { ascending: true });
    setLogs(data || []);
    // Seed base values (1× baseline) for qty scaling — only for freshly loaded entries
    const bases = {};
    (data || []).forEach(e => {
      if (!logBasesRef.current[e.id])
        bases[e.id] = { calories: e.calories, protein_g: e.protein_g, carbs_g: e.carbs_g, fat_g: e.fat_g, fiber_g: e.fiber_g };
    });
    logBasesRef.current = { ...logBasesRef.current, ...bases };
  }

  async function fetchWeekData() {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().substring(0, 10);
    });
    const { data } = await supabase
      .from('food_logs').select('logged_at, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id).in('logged_at', days);
    setWeekData(days.map(date => {
      const entries = (data || []).filter(e => e.logged_at === date);
      return {
        day: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        calories: Math.round(entries.reduce((s, e) => s + (e.calories || 0), 0)),
        protein:  Math.round(entries.reduce((s, e) => s + (e.protein_g || 0), 0)),
        carbs:    Math.round(entries.reduce((s, e) => s + (e.carbs_g || 0), 0)),
        fat:      Math.round(entries.reduce((s, e) => s + (e.fat_g || 0), 0)),
      };
    }));
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totals = useMemo(() => logs.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories  || 0),
      protein:  acc.protein  + (e.protein_g || 0),
      carbs:    acc.carbs    + (e.carbs_g   || 0),
      fat:      acc.fat      + (e.fat_g     || 0),
      fiber:    acc.fiber    + (e.fiber_g   || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  ), [logs]);

  // ── Confetti trigger — fires once when calories first cross the goal ──────
  useEffect(() => {
    if (!user || goals.calories_goal <= 0) return;
    const isAbove = totals.calories >= goals.calories_goal;
    if (!initializedRef.current) {
      // Set baseline on first load — don't celebrate if already over goal
      prevAboveGoalRef.current = isAbove;
      initializedRef.current = true;
      return;
    }
    if (isAbove && !prevAboveGoalRef.current && !celebratedRef.current) {
      setShowConfetti(true);
      celebratedRef.current = true;
    }
    prevAboveGoalRef.current = isAbove;
  }, [totals.calories, goals.calories_goal, user]);

  // ── Save goals ─────────────────────────────────────────────────────────────
  async function saveGoals() {
    const payload = { user_id: user.id, ...goalDraft, updated_at: new Date().toISOString() };
    await supabase.from('nutrition_goals').upsert(payload, { onConflict: 'user_id' });
    setGoals(goalDraft);
    setShowGoalModal(false);
  }

  // ── Adjust quantity of a logged entry ─────────────────────────────────────
  async function updateLogQty(id, newQty) {
    const base = logBasesRef.current[id];
    if (!base) return;
    const updates = {
      calories:  base.calories  != null ? Math.round(base.calories  * newQty) : null,
      protein_g: base.protein_g != null ? Math.round(base.protein_g * newQty * 10) / 10 : null,
      carbs_g:   base.carbs_g   != null ? Math.round(base.carbs_g   * newQty * 10) / 10 : null,
      fat_g:     base.fat_g     != null ? Math.round(base.fat_g     * newQty * 10) / 10 : null,
      fiber_g:   base.fiber_g   != null ? Math.round(base.fiber_g   * newQty * 10) / 10 : null,
    };
    setLogQtys(prev => ({ ...prev, [id]: newQty }));
    setLogs(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    await supabase.from('food_logs').update(updates).eq('id', id);
    fetchWeekData();
  }

  // ── Delete log ─────────────────────────────────────────────────────────────
  async function deleteLog(id) {
    delete logBasesRef.current[id];
    setLogQtys(prev => { const n = { ...prev }; delete n[id]; return n; });
    await supabase.from('food_logs').delete().eq('id', id);
    setLogs(prev => prev.filter(e => e.id !== id));
    fetchWeekData();
  }

  // ── Dining menu fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!showAddModal || addTab !== 'dining') return;
    let cancelled = false;
    setDiningBusy(true);
    setDiningItems([]);
    setQuantities({});
    fetch(`/api/menu/${diningHall}/${diningMeal}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(json => { if (!cancelled) setDiningItems(json.items || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDiningBusy(false); });
    return () => { cancelled = true; };
  }, [showAddModal, addTab, diningHall, diningMeal]);

  // ── Log from dining menu ───────────────────────────────────────────────────
  async function logDiningItem(item, qty = 1) {
    const entry = {
      user_id: user.id, logged_at: today,
      meal_type: mealTag.toLowerCase(),
      food_name: qty !== 1 ? `${item.name} ×${qty}` : item.name,
      calories:  item.calories != null ? Math.round(item.calories * qty) : null,
      protein_g: parseNum(item.protein) ? parseNum(item.protein) * qty : null,
      carbs_g:   parseNum(item.carbs)   ? parseNum(item.carbs)   * qty : null,
      fat_g:     parseNum(item.fat)     ? parseNum(item.fat)     * qty : null,
      fiber_g:   parseNum(item.fiber)   ? parseNum(item.fiber)   * qty : null,
      sodium_mg: parseNum(item.sodium)  ? parseNum(item.sodium)  * qty : null,
      sugar_g:   parseNum(item.sugar)   ? parseNum(item.sugar)   * qty : null,
      portion:   item.portion ?? null,
    };
    const { data } = await supabase.from('food_logs').insert(entry).select().single();
    if (data) {
      logBasesRef.current[data.id] = { calories: data.calories, protein_g: data.protein_g, carbs_g: data.carbs_g, fat_g: data.fat_g, fiber_g: data.fiber_g };
      setLogs(prev => [...prev, data]);
    }
    setShowAddModal(false);
    fetchWeekData();
  }

  // ── Log manual ─────────────────────────────────────────────────────────────
  async function logManual(e) {
    e.preventDefault();
    if (!manual.name.trim()) return;
    const entry = {
      user_id: user.id, logged_at: today,
      meal_type: mealTag.toLowerCase(),
      food_name: manual.name.trim(),
      calories:  manual.calories ? Number(manual.calories) : null,
      protein_g: manual.protein  ? Number(manual.protein)  : null,
      carbs_g:   manual.carbs    ? Number(manual.carbs)    : null,
      fat_g:     manual.fat      ? Number(manual.fat)      : null,
      fiber_g:   manual.fiber    ? Number(manual.fiber)    : null,
      sodium_mg: manual.sodium   ? Number(manual.sodium)   : null,
      sugar_g:   manual.sugar    ? Number(manual.sugar)    : null,
      portion:   manual.portion  || null,
    };
    const { data } = await supabase.from('food_logs').insert(entry).select().single();
    if (data) {
      logBasesRef.current[data.id] = { calories: data.calories, protein_g: data.protein_g, carbs_g: data.carbs_g, fat_g: data.fat_g, fiber_g: data.fiber_g };
      setLogs(prev => [...prev, data]);
    }
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sodium: '', sugar: '', portion: '' });
    setShowAddModal(false);
    fetchWeekData();
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/30 text-sm">Loading tracker…</p>
    </div>
  );

  const calRemain  = Math.max(0, goals.calories_goal - Math.round(totals.calories));
  const calPct     = goals.calories_goal > 0 ? Math.min(totals.calories / goals.calories_goal, 1) : 0;
  const logsByMeal = MEAL_TYPES.reduce((acc, m) => {
    acc[m.toLowerCase()] = logs.filter(e => e.meal_type === m.toLowerCase()); return acc;
  }, {});
  const filteredDining = diningItems.filter(i =>
    (i.name || '').toLowerCase().includes(diningSearch.toLowerCase())
  );

  // chart reference line value
  const chartGoal = { calories: goals.calories_goal, protein: goals.protein_goal, carbs: goals.carbs_goal, fat: goals.fat_goal }[chartMetric];
  const chartColor = { calories: '#ef4444', protein: '#60a5fa', carbs: '#a78bfa', fat: '#fb923c' }[chartMetric];

  return (
    <div className="min-h-screen bg-black relative">
      {showConfetti && <ConfettiCelebration onDone={() => setShowConfetti(false)} />}
      <FoodBackground />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Nutrition Tracker</h1>
            <p className="text-white/35 text-xs sm:text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => { setGoalDraft({ ...goals }); setShowGoalModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white transition"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Target className="w-3.5 h-3.5" /> Edit Goals
          </button>
        </div>

        {/* ── Daily summary card ── */}
        <div className="rounded-2xl p-5 sm:p-6" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Calorie ring + remaining */}
            <div className="flex items-center gap-5">
              <MacroRing label="Calories" value={Math.round(totals.calories)} goal={goals.calories_goal} color="#ef4444" unit="" size={120} />
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-white leading-none">{calRemain}</p>
                <p className="text-white/35 text-xs mt-1">kcal remaining</p>
                <div className="mt-2 w-32 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${calPct * 100}%` }} />
                </div>
                <p className="text-white/25 text-[10px] mt-1">{Math.round(totals.calories)} eaten · {goals.calories_goal} goal</p>
              </div>
            </div>

            {/* Macro rings */}
            <div className="flex gap-4 sm:gap-5 sm:ml-auto flex-wrap">
              <MacroRing label="Protein" value={Math.round(totals.protein)} goal={goals.protein_goal} color="#60a5fa" />
              <MacroRing label="Carbs"   value={Math.round(totals.carbs)}   goal={goals.carbs_goal}   color="#a78bfa" />
              <MacroRing label="Fat"     value={Math.round(totals.fat)}     goal={goals.fat_goal}     color="#fb923c" />
              <MacroRing label="Fiber"   value={Math.round(totals.fiber)}   goal={goals.fiber_goal}   color="#34d399" />
            </div>
          </div>

          {/* Macro progress bars */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Protein', value: totals.protein, goal: goals.protein_goal, color: '#60a5fa' },
              { label: 'Carbs',   value: totals.carbs,   goal: goals.carbs_goal,   color: '#a78bfa' },
              { label: 'Fat',     value: totals.fat,     goal: goals.fat_goal,     color: '#fb923c' },
              { label: 'Fiber',   value: totals.fiber,   goal: goals.fiber_goal,   color: '#34d399' },
            ].map(({ label, value, goal, color }) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-white/50">{label}</span>
                  <span className="text-white/30">{Math.round(value)}/{goal}g</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${goal > 0 ? Math.min(value / goal, 1) * 100 : 0}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7-day chart ── */}
        <div className="rounded-2xl p-5 sm:p-6" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-white/40" />
              <p className="text-white/70 text-sm font-semibold">7-Day History</p>
            </div>
            <div className="flex gap-1">
              {['calories','protein','carbs','fat'].map(m => (
                <button key={m} onClick={() => setChartMetric(m)}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium transition capitalize ${chartMetric === m ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={weekData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {chartGoal > 0 && (
                <ReferenceLine y={chartGoal} stroke={chartColor} strokeOpacity={0.25} strokeDasharray="4 4" />
              )}
              <Area type="monotone" dataKey={chartMetric} stroke={chartColor} fill="url(#areaGrad)"
                strokeWidth={2} dot={{ fill: chartColor, r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Today's food log ── */}
        <div className="rounded-2xl p-5 sm:p-6" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/70 text-sm font-semibold">Today's Log</p>
            <button
              onClick={() => { setShowAddModal(true); setAddTab('dining'); setDiningSearch(''); }}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Log Food
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-8">No food logged today. Tap "Log Food" to start.</p>
          ) : (
            <div className="space-y-5">
              {MEAL_TYPES.map(meal => {
                const entries = logsByMeal[meal.toLowerCase()] || [];
                if (!entries.length) return null;
                const mealCals = entries.reduce((s, e) => s + (e.calories || 0), 0);
                return (
                  <div key={meal}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] uppercase tracking-widest text-white/25">{meal}</p>
                      {mealCals > 0 && <p className="text-[11px] text-white/25">{Math.round(mealCals)} kcal</p>}
                    </div>
                    <div className="space-y-1.5">
                      {entries.map(entry => {
                        const qty = logQtys[entry.id] ?? 1;
                        return (
                          <div key={entry.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{entry.food_name}</p>
                              <p className="text-[11px] text-white/30 mt-0.5 flex flex-wrap gap-x-2">
                                {entry.calories  && <span>{entry.calories} kcal</span>}
                                {entry.protein_g && <span>{Math.round(entry.protein_g)}g protein</span>}
                                {entry.carbs_g   && <span>{Math.round(entry.carbs_g)}g carbs</span>}
                                {entry.fat_g     && <span>{Math.round(entry.fat_g)}g fat</span>}
                                {entry.portion   && <span>{entry.portion}</span>}
                              </p>
                            </div>
                            {/* Qty stepper */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => updateLogQty(entry.id, Math.max(0.5, qty - 0.5))}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition text-base leading-none"
                              >−</button>
                              <span className="text-xs text-white/60 w-6 text-center">{qty}×</span>
                              <button
                                onClick={() => updateLogQty(entry.id, Math.min(10, qty + 0.5))}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition text-base leading-none"
                              >+</button>
                            </div>
                            <button onClick={() => deleteLog(entry.id)}
                              className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-white/5 transition shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ Goal Modal ════════════════════════════════════════════════════════════ */}
      {showGoalModal && goalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: 'rgba(15,15,20,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold text-white mb-1">Daily Nutrition Goals</h2>
            <p className="text-white/35 text-xs mb-5">Set your daily targets — we'll track your progress against these.</p>
            <div className="space-y-3">
              {[
                { key: 'calories_goal', label: 'Calories', unit: 'kcal', placeholder: '2000' },
                { key: 'protein_goal',  label: 'Protein',  unit: 'g',    placeholder: '150' },
                { key: 'carbs_goal',    label: 'Carbs',    unit: 'g',    placeholder: '250' },
                { key: 'fat_goal',      label: 'Fat',      unit: 'g',    placeholder: '65'  },
                { key: 'fiber_goal',    label: 'Fiber',    unit: 'g',    placeholder: '25'  },
              ].map(({ key, label, unit, placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-white/55 w-16 shrink-0">{label}</label>
                  <input type="number" placeholder={placeholder} value={goalDraft[key] || ''}
                    onChange={e => setGoalDraft(p => ({ ...p, [key]: Number(e.target.value) }))}
                    className="flex-1 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <span className="text-white/25 text-xs w-8 shrink-0">{unit}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              {goals.calories_goal > 0 && (
                <button onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white transition"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  Cancel
                </button>
              )}
              <button onClick={saveGoals}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition">
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Add Food Modal ════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col"
            style={{ maxHeight: '88vh', backgroundColor: 'rgba(15,15,20,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
              <h2 className="text-base font-bold text-white">Log Food</h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/35 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Source tabs */}
            <div className="flex gap-1 px-5 mb-2 shrink-0">
              {[['dining','Dining Menu'],['manual','Manual Entry']].map(([t, l]) => (
                <button key={t} onClick={() => setAddTab(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${addTab === t ? 'bg-red-500 text-white' : 'text-white/45 hover:text-white'}`}
                  style={addTab !== t ? { backgroundColor: 'rgba(255,255,255,0.06)' } : {}}
                >{l}</button>
              ))}
            </div>

            {/* Meal tag */}
            <div className="flex gap-1.5 px-5 mb-3 flex-wrap shrink-0">
              {MEAL_TYPES.map(m => (
                <button key={m} onClick={() => setMealTag(m)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${mealTag === m ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}
                >{m}</button>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 pb-6">

              {/* Dining tab */}
              {addTab === 'dining' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select value={diningHall} onChange={e => setDiningHall(e.target.value)}
                      className="flex-1 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {HALLS.map(h => <option key={h.slug} value={h.slug} className="bg-zinc-900">{h.label}</option>)}
                    </select>
                    <select value={diningMeal} onChange={e => {
                        const v = e.target.value;
                        setDiningMeal(v);
                        setMealTag(v.charAt(0).toUpperCase() + v.slice(1));
                      }}
                      className="flex-1 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {MEALS_LIST.map(m => <option key={m} value={m} className="bg-zinc-900">{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                    </select>
                  </div>
                  <input placeholder="Search menu…" value={diningSearch}
                    onChange={e => setDiningSearch(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  {diningBusy ? (
                    <p className="text-white/25 text-sm text-center py-6">Loading menu…</p>
                  ) : filteredDining.length === 0 ? (
                    <p className="text-white/25 text-sm text-center py-6">No items found.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredDining.map((item, i) => {
                        const qty = quantities[i] ?? 1;
                        return (
                          <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Item info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-sm font-medium text-white leading-snug">{item.name}</span>
                                <span className="text-xs text-white/30 shrink-0">
                                  {item.calories ? `${Math.round(item.calories * qty)} kcal` : ''}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/25 mt-0.5">
                                {[
                                  item.protein && `${Math.round(parseNum(item.protein) * qty)}g P`,
                                  item.carbs   && `${Math.round(parseNum(item.carbs)   * qty)}g C`,
                                  item.fat     && `${Math.round(parseNum(item.fat)     * qty)}g F`,
                                ].filter(Boolean).join(' · ')}
                                {item.station ? ` · ${item.station}` : ''}
                              </p>
                            </div>
                            {/* Portion stepper */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setQuantities(prev => ({ ...prev, [i]: Math.max(0.5, (prev[i] ?? 1) - 0.5) }))}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition text-base leading-none"
                              >−</button>
                              <span className="text-xs text-white w-6 text-center">{qty}</span>
                              <button
                                onClick={() => setQuantities(prev => ({ ...prev, [i]: Math.min(10, (prev[i] ?? 1) + 0.5) }))}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition text-base leading-none"
                              >+</button>
                            </div>
                            {/* Log button */}
                            <button
                              onClick={() => logDiningItem(item, qty)}
                              className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition"
                            >Log</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Manual tab */}
              {addTab === 'manual' && (
                <form onSubmit={logManual} className="space-y-3">
                  <input required placeholder="Food name *" value={manual.name}
                    onChange={e => setManual(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { k: 'calories', p: 'Calories (kcal)' },
                      { k: 'protein',  p: 'Protein (g)'     },
                      { k: 'carbs',    p: 'Carbs (g)'       },
                      { k: 'fat',      p: 'Fat (g)'         },
                      { k: 'fiber',    p: 'Fiber (g)'       },
                      { k: 'sodium',   p: 'Sodium (mg)'     },
                    ].map(({ k, p }) => (
                      <input key={k} type="number" min="0" placeholder={p} value={manual[k]}
                        onChange={e => setManual(prev => ({ ...prev, [k]: e.target.value }))}
                        className="rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    ))}
                  </div>
                  <input placeholder="Portion (e.g. 1 cup, 200g)" value={manual.portion}
                    onChange={e => setManual(p => ({ ...p, portion: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button type="submit"
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition"
                    disabled={!manual.name.trim()}>
                    Log Food
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
