import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Minus, PartyPopper, Plus, RefreshCw, Search, Target, Trash2 } from 'lucide-react';
import { deleteLog as removeLog, getGoals, getLogs, saveGoals as storeGoals, updateLog } from '../backend/tracker';
import { useAuth } from '../state/auth';
import { loadMenu } from '../data/menu';
import { HALLS } from '../data/halls';
import { insertLog, LOG_MEALS, logEntryFor } from '../data/foodLog';
import { campusDate, campusDateOffset, campusNow, formatCampusDate, formatIsoDate } from '../functions/campusTime';
import { Button } from '../ui/Button';
import { Card, EmptyState, Notice, PageHeader, Skeleton } from '../ui/primitives';
import { Dialog } from '../ui/Dialog';
import { Field, inputClass } from '../ui/Field';
import { PageSpinner } from '../ui/Spinner';
import { useTokens } from '../ui/useTokens';
import { usePageTitle } from '../lib/usePageTitle';

const DEFAULT_GOALS = { calories_goal: 2000, protein_goal: 150, carbs_goal: 250, fat_goal: 65, fiber_goal: 25 };

const MACROS = [
  { key: 'protein', label: 'Protein', goalKey: 'protein_goal', column: 'protein_g' },
  { key: 'carbs', label: 'Carbs', goalKey: 'carbs_goal', column: 'carbs_g' },
  { key: 'fat', label: 'Fat', goalKey: 'fat_goal', column: 'fat_g' },
  { key: 'fiber', label: 'Fiber', goalKey: 'fiber_goal', column: 'fiber_g' },
];

const METRICS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', goalKey: 'calories_goal' },
  { key: 'protein', label: 'Protein', unit: 'g', goalKey: 'protein_goal' },
  { key: 'carbs', label: 'Carbs', unit: 'g', goalKey: 'carbs_goal' },
  { key: 'fat', label: 'Fat', unit: 'g', goalKey: 'fat_goal' },
];

const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1);
const round = n => Math.round(n || 0);

/* Progress against a goal --------------------------------------------------
 * A labelled bar per goal. The value and target are written out, so the bar
 * only adds proportion; going over the goal changes colour and says so.
 */
function GoalBar({ label, value, goal, unit = 'g', large = false }) {
  const over = goal > 0 && value > goal;
  const pct = goal > 0 ? Math.min(value / goal, 1) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={large ? 'font-semibold' : 'text-sm font-medium text-ink-muted'}>{label}</span>
        <span className="tabular text-sm">
          <span className="font-semibold text-ink">{round(value).toLocaleString()}</span>
          <span className="text-ink-muted"> / {goal.toLocaleString()}{unit === 'kcal' ? ' kcal' : unit}</span>
        </span>
      </div>
      <div className={`mt-2 overflow-hidden rounded-full bg-surface-2 ${large ? 'h-3' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-apple ${over ? 'bg-warn' : 'bg-series-1'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && <p className="mt-1 text-xs font-medium text-warn">{round(value - goal).toLocaleString()}{unit === 'kcal' ? ' kcal' : unit} over goal</p>}
    </div>
  );
}

/* History chart ---------------------------------------------------------------
 * Daily totals are discrete, so bars rather than an area. One series, so no
 * legend: the selected metric names it. The goal is a labelled reference line.
 */
function HistoryChart({ data, metric, goal }) {
  const t = useTokens(['--series-1', '--ink-muted', '--line', '--surface', '--ink']);
  const unit = metric.unit;

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={t['--line']} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t['--ink-muted'], fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: t['--ink-muted'], fontSize: 12 }} allowDecimals={false}
            tickFormatter={v => v.toLocaleString()} />
          <Tooltip
            cursor={{ fill: t['--line'], opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload;
              return (
                <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-card">
                  <p className="text-ink-muted">{row.fullLabel}</p>
                  <p className="font-bold text-ink tabular">{row[metric.key].toLocaleString()} {unit}</p>
                </div>
              );
            }}
          />
          {goal > 0 && (
            <ReferenceLine y={goal} stroke={t['--ink']} strokeOpacity={0.55} strokeDasharray="4 4" />
          )}
          <Bar dataKey={metric.key} fill={t['--series-1']} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stepper({ value, onChange, label, min = 0.5, max = 10 }) {
  return (
    <div className="flex shrink-0 items-center rounded-xl border border-line" role="group" aria-label={`${label} servings`}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 0.5))} disabled={value <= min}
        className="grid size-10 place-items-center rounded-l-xl text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40" aria-label="Fewer servings">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="w-9 text-center text-sm font-bold tabular" aria-live="polite">{value}×</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 0.5))} disabled={value >= max}
        className="grid size-10 place-items-center rounded-r-xl text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40" aria-label="More servings">
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* Page ------------------------------------------------------------------------ */

export default function Tracker() {
  usePageTitle('Nutrition tracker');
  const { user } = useAuth();
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [logs, setLogs] = useState([]);
  const [weekRows, setWeekRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [saveError, setSaveError] = useState(null);

  const [goalDraft, setGoalDraft] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [metricKey, setMetricKey] = useState('calories');
  const [celebrate, setCelebrate] = useState(false);

  const logBases = useRef({});
  const [logQtys, setLogQtys] = useState({});
  const today = campusDate();

  const rememberBase = row => {
    logBases.current[row.id] = { calories: row.calories, protein_g: row.protein_g, carbs_g: row.carbs_g, fat_g: row.fat_g, fiber_g: row.fiber_g };
  };

  const fetchWeek = useCallback(async () => {
    const days = Array.from({ length: 7 }, (_, i) => campusDateOffset(i - 6));
    const data = await getLogs(user.id, days);
    setWeekRows(days.map(date => {
      const entries = (data || []).filter(e => e.logged_at === date);
      const sum = col => round(entries.reduce((s, e) => s + (Number(e[col]) || 0), 0));
      return {
        date,
        label: date === today ? 'Today' : formatIsoDate(date, { weekday: 'short' }),
        fullLabel: formatIsoDate(date, { weekday: 'long', month: 'short', day: 'numeric' }),
        calories: sum('calories'), protein: sum('protein_g'), carbs: sum('carbs_g'), fat: sum('fat_g'),
      };
    }));
  }, [user, today]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [savedGoals, todayLogs] = await Promise.all([getGoals(user.id), getLogs(user.id, [today]), fetchWeek()]);
      if (savedGoals) setGoals(savedGoals);
      else setGoalDraft({ ...DEFAULT_GOALS });
      setLogs(todayLogs);
      todayLogs.forEach(row => { if (!logBases.current[row.id]) rememberBase(row); });
      setStatus('ready');
    } catch (err) {
      console.error('Loading the tracker failed', err);
      setStatus('error');
    }
  }, [user, today, fetchWeek]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const totals = useMemo(() => logs.reduce((acc, e) => ({
    calories: acc.calories + (Number(e.calories) || 0),
    protein: acc.protein + (Number(e.protein_g) || 0),
    carbs: acc.carbs + (Number(e.carbs_g) || 0),
    fat: acc.fat + (Number(e.fat_g) || 0),
    fiber: acc.fiber + (Number(e.fiber_g) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [logs]);

  // Celebrate once, when calories first cross the goal during this visit.
  const wasAbove = useRef(null);
  useEffect(() => {
    if (status !== 'ready' || goals.calories_goal <= 0) return;
    const above = totals.calories >= goals.calories_goal;
    if (wasAbove.current === false && above) setCelebrate(true);
    wasAbove.current = above;
  }, [totals.calories, goals.calories_goal, status]);

  async function saveGoals(event) {
    event?.preventDefault();
    const cleaned = Object.fromEntries(Object.keys(DEFAULT_GOALS).map(k => [k, Math.max(0, Math.round(Number(goalDraft[k]) || 0))]));
    try { await storeGoals(user.id, cleaned); } catch { setSaveError('Your goals could not be saved. Try again.'); return; }
    setGoals(cleaned);
    setGoalDraft(null);
    setSaveError(null);
  }

  async function updateQty(id, qty) {
    const base = logBases.current[id];
    if (!base) return;
    const scale = (v, digits) => (v == null ? null : Math.round(v * qty * digits) / digits);
    const updates = {
      calories: scale(base.calories, 1),
      protein_g: scale(base.protein_g, 10), carbs_g: scale(base.carbs_g, 10),
      fat_g: scale(base.fat_g, 10), fiber_g: scale(base.fiber_g, 10),
    };
    const previous = logs;
    setLogQtys(q => ({ ...q, [id]: qty }));
    setLogs(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)));
    try { await updateLog(user.id, id, updates); } catch { setLogs(previous); setSaveError('That change was not saved.'); return; }
    fetchWeek().catch(() => {});
  }

  async function deleteLog(id) {
    const previous = logs;
    setLogs(prev => prev.filter(e => e.id !== id));
    try { await removeLog(user.id, id); } catch { setLogs(previous); setSaveError('That entry could not be removed.'); return; }
    delete logBases.current[id];
    fetchWeek().catch(() => {});
  }

  function onLogged(row) {
    rememberBase(row);
    setLogs(prev => [...prev, row]);
    setAddOpen(false);
    fetchWeek().catch(() => {});
  }

  if (status === 'loading') return <PageSpinner label="Loading your tracker" />;
  if (status === 'error') {
    return (
      <EmptyState icon={RefreshCw} title="Your tracker couldn't be loaded"
        action={<Button onClick={load}><RefreshCw className="size-4" aria-hidden="true" /> Try again</Button>}>
        The account service did not respond. Your logged meals are safe; try again in a moment.
      </EmptyState>
    );
  }

  const remaining = Math.max(0, goals.calories_goal - round(totals.calories));
  const metric = METRICS.find(m => m.key === metricKey);

  return (
    <>
      <PageHeader
        title="Nutrition tracker"
        actions={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setGoalDraft({ ...goals })}>
              <Target className="size-4" aria-hidden="true" /> Goals
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" aria-hidden="true" /> Log food
            </Button>
          </>
        )}
      >
        {formatCampusDate({ weekday: 'long', month: 'long', day: 'numeric' })}
      </PageHeader>

      {saveError && <Notice tone="error" role="alert" className="mb-4" title={saveError} />}
      {celebrate && (
        <Notice tone="success" role="status" className="mb-4" title="Daily calorie goal reached"
          action={<Button size="sm" variant="secondary" onClick={() => setCelebrate(false)}><PartyPopper className="size-4" aria-hidden="true" /> Nice</Button>}>
          You hit {goals.calories_goal.toLocaleString()} kcal today.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="sr-only">Today's totals</h2>
          <p className="text-hero font-semibold leading-none tabular">{remaining.toLocaleString()}</p>
          <p className="mt-2 text-ink-muted">kcal left of {goals.calories_goal.toLocaleString()} today</p>
          <div className="mt-5">
            <GoalBar label="Calories" value={totals.calories} goal={goals.calories_goal} unit="kcal" large />
          </div>
          <div className="mt-6 grid gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-2">
            {MACROS.map(m => <GoalBar key={m.key} label={m.label} value={totals[m.key]} goal={goals[m.goalKey]} />)}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Last 7 days · {metric.label}</h2>
            <div role="group" aria-label="Chart metric" className="flex rounded-xl bg-surface-2 p-1">
              {METRICS.map(m => (
                <button key={m.key} type="button" aria-pressed={m.key === metricKey} onClick={() => setMetricKey(m.key)}
                  className={`min-h-9 rounded-lg px-2.5 text-sm font-semibold transition-colors ${m.key === metricKey ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {goals[metric.goalKey] > 0 && (
            <p className="mb-1 flex items-center gap-2 text-sm text-ink-muted">
              <span className="inline-block w-5 border-t-2 border-dashed border-ink/55" aria-hidden="true" />
              Goal {goals[metric.goalKey].toLocaleString()} {metric.unit}
            </p>
          )}
          <HistoryChart data={weekRows} metric={metric} goal={goals[metric.goalKey]} />
          <details className="mt-2 text-sm">
            <summary className="inline-flex min-h-10 items-center font-semibold text-brand-text">View as table</summary>
            <table className="mt-2 w-full text-left tabular">
              <thead className="text-ink-muted"><tr><th className="py-1 font-semibold">Day</th>{METRICS.map(m => <th key={m.key} className="py-1 text-right font-semibold">{m.label}</th>)}</tr></thead>
              <tbody>
                {weekRows.map(row => (
                  <tr key={row.date} className="border-t border-line">
                    <td className="py-1.5">{row.fullLabel}</td>
                    {METRICS.map(m => <td key={m.key} className="py-1.5 text-right">{row[m.key].toLocaleString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
      </div>

      <section aria-labelledby="log-heading" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="log-heading" className="text-xl font-semibold">Today's log</h2>
        </div>
        {logs.length === 0 ? (
          <Card>
            <EmptyState icon={Plus} title="Nothing logged yet"
              action={<Button onClick={() => setAddOpen(true)}><Plus className="size-4" aria-hidden="true" /> Log food</Button>}>
              Add items straight from today's dining hall menus, or enter something yourself.
            </EmptyState>
          </Card>
        ) : (
          <div className="space-y-5">
            {[...LOG_MEALS, 'other'].map(meal => {
              const entries = logs.filter(e => (LOG_MEALS.includes(e.meal_type) ? e.meal_type : 'other') === meal);
              if (!entries.length) return null;
              const kcal = round(entries.reduce((s, e) => s + (Number(e.calories) || 0), 0));
              return (
                <div key={meal}>
                  <h3 className="mb-2 flex items-baseline justify-between px-1">
                    <span className="text-base font-semibold">{titleCase(meal)}</span>
                    <span className="text-sm text-ink-muted tabular">{kcal.toLocaleString()} kcal</span>
                  </h3>
                  <Card as="ul" className="divide-y divide-line">
                    {entries.map(entry => (
                      <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5">
                        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                          <p className="font-semibold leading-snug">{entry.food_name}</p>
                          <p className="mt-0.5 text-sm text-ink-muted tabular">
                            {[
                              entry.calories != null && `${round(entry.calories)} kcal`,
                              entry.protein_g != null && `${round(entry.protein_g)} g protein`,
                              entry.carbs_g != null && `${round(entry.carbs_g)} g carbs`,
                              entry.fat_g != null && `${round(entry.fat_g)} g fat`,
                            ].filter(Boolean).join(' · ') || 'No nutrition recorded'}
                          </p>
                        </div>
                        <span className="flex-1 sm:hidden" aria-hidden="true" />
                        {logBases.current[entry.id] && (
                          <Stepper label={entry.food_name} value={logQtys[entry.id] ?? 1} onChange={qty => updateQty(entry.id, qty)} />
                        )}
                        <button type="button" onClick={() => deleteLog(entry.id)} aria-label={`Remove ${entry.food_name}`}
                          className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-brand-soft hover:text-brand-text">
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <GoalsDialog draft={goalDraft} setDraft={setGoalDraft} onSave={saveGoals} canCancel={Boolean(goals)} error={saveError} />
      <AddFoodDialog open={addOpen} onClose={() => setAddOpen(false)} userId={user.id} onLogged={onLogged} />
    </>
  );
}

/* Goals --------------------------------------------------------------------- */

const GOAL_FIELDS = [
  ['calories_goal', 'Calories', 'kcal'],
  ['protein_goal', 'Protein', 'g'],
  ['carbs_goal', 'Carbs', 'g'],
  ['fat_goal', 'Fat', 'g'],
  ['fiber_goal', 'Fiber', 'g'],
];

function GoalsDialog({ draft, setDraft, onSave, error }) {
  return (
    <Dialog
      open={Boolean(draft)}
      onClose={() => setDraft(null)}
      title="Daily goals"
      description="Your progress each day is measured against these."
      footer={(
        <>
          <Button variant="secondary" block onClick={() => setDraft(null)}>Cancel</Button>
          <Button block type="submit" form="goals-form">Save goals</Button>
        </>
      )}
    >
      {draft && (
        <form id="goals-form" onSubmit={onSave} className="grid grid-cols-2 gap-4">
          {GOAL_FIELDS.map(([key, label, unit]) => (
            <Field key={key} label={`${label} (${unit})`} type="number" inputMode="numeric" min="0" step="1"
              value={draft[key] ?? ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
              className={key === 'calories_goal' ? 'col-span-2' : ''} />
          ))}
          {error && <p className="col-span-2 text-sm font-medium text-danger" role="alert">{error}</p>}
        </form>
      )}
    </Dialog>
  );
}

/* Add food ------------------------------------------------------------------ */

function defaultMeal() {
  const m = campusNow().minutes;
  return m < 10 * 60 + 30 ? 'breakfast' : m < 16 * 60 ? 'lunch' : 'dinner';
}

function AddFoodDialog({ open, onClose, userId, onLogged }) {
  const [tab, setTab] = useState('dining');
  const [mealTag, setMealTag] = useState(defaultMeal);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setMealTag(defaultMeal()); setError(null); } }, [open]);

  async function save(entry) {
    setBusy(true);
    setError(null);
    try {
      onLogged(await insertLog(entry));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Log food" size="lg">
      <div role="group" aria-label="Source" className="mb-4 flex rounded-xl bg-surface-2 p-1">
        {[['dining', 'Dining menu'], ['manual', 'Enter manually']].map(([key, label]) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}
            className={`min-h-10 flex-1 rounded-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-semibold">Meal</legend>
        <div className="flex gap-2">
          {LOG_MEALS.map(m => (
            <button key={m} type="button" aria-pressed={mealTag === m} onClick={() => setMealTag(m)}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${mealTag === m ? 'border-ink bg-ink text-bg' : 'border-line text-ink-muted hover:text-ink'}`}>
              {titleCase(m)}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <Notice tone="error" role="alert" className="mb-4" title="Not saved">{error}</Notice>}

      {tab === 'dining'
        ? <DiningPicker mealTag={mealTag} onPick={(item, qty) => save(logEntryFor(userId, item, mealTag, qty))} busy={busy} />
        : <ManualForm onSubmit={values => save({ user_id: userId, logged_at: campusDate(), meal_type: mealTag, ...values })} busy={busy} />}
    </Dialog>
  );
}

function DiningPicker({ mealTag, onPick, busy }) {
  const [hall, setHall] = useState(HALLS[0].slug);
  const [meal, setMeal] = useState(mealTag);
  const [state, setState] = useState({ loading: true, result: null });
  const [search, setSearch] = useState('');
  const [qtys, setQtys] = useState({});

  useEffect(() => setMeal(mealTag), [mealTag]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, result: null });
    setQtys({});
    loadMenu({ hallSlug: hall, mealSlug: meal, signal: controller.signal })
      .then(result => !controller.signal.aborted && setState({ loading: false, result }))
      .catch(() => !controller.signal.aborted && setState({ loading: false, result: { status: 'unavailable', stations: [] } }));
    return () => controller.abort();
  }, [hall, meal]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.result?.stations ?? [])
      .flatMap(s => s.items)
      .filter(item => !q || item.name.toLowerCase().includes(q) || (item.station ?? '').toLowerCase().includes(q));
  }, [state.result, search]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-semibold">Hall
          <select value={hall} onChange={e => setHall(e.target.value)} className={`${inputClass} mt-1.5`}>
            {HALLS.map(h => <option key={h.slug} value={h.slug}>{h.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Menu
          <select value={meal} onChange={e => setMeal(e.target.value)} className={`${inputClass} mt-1.5`}>
            {(state.result?.periods?.length ? state.result.periods : LOG_MEALS.map(m => ({ slug: m, name: titleCase(m) })))
              .map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <div className="relative">
        <label htmlFor="picker-search" className="sr-only">Search the menu</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
        <input id="picker-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items"
          className={`${inputClass} pl-11`} autoComplete="off" />
      </div>

      {state.loading ? (
        <div className="space-y-2" role="status" aria-label="Loading the menu">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          {state.result?.status === 'ok' ? 'No items match.' : state.result?.status === 'not-served'
            ? 'That meal is not served at this hall today.' : 'No menu is available for this hall and meal right now.'}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {items.map(item => {
            const qty = qtys[item.id] ?? 1;
            return (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{item.name}</p>
                  <p className="text-xs text-ink-muted tabular">
                    {[item.calories != null && `${round(item.calories * qty)} kcal`, item.protein != null && `${round(item.protein * qty)} g protein`, item.station]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Stepper label={item.name} value={qty} onChange={v => setQtys(p => ({ ...p, [item.id]: v }))} />
                <Button size="sm" onClick={() => onPick(item, qty)} disabled={busy} aria-label={`Log ${item.name}`}>Log</Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const MANUAL_FIELDS = [
  ['calories', 'Calories (kcal)'],
  ['protein_g', 'Protein (g)'],
  ['carbs_g', 'Carbs (g)'],
  ['fat_g', 'Fat (g)'],
  ['fiber_g', 'Fiber (g)'],
  ['sodium_mg', 'Sodium (mg)'],
];

function ManualForm({ onSubmit, busy }) {
  const [values, setValues] = useState({ food_name: '', portion: '' });
  const set = key => e => setValues(v => ({ ...v, [key]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    if (!values.food_name.trim()) return;
    const numbers = Object.fromEntries(MANUAL_FIELDS.map(([key]) => [key, values[key] === '' || values[key] == null ? null : Number(values[key])]));
    onSubmit({ food_name: values.food_name.trim(), portion: values.portion.trim() || null, sugar_g: null, ...numbers });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Food" required value={values.food_name} onChange={set('food_name')} placeholder="e.g. Greek yogurt" autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        {MANUAL_FIELDS.map(([key, label]) => (
          <Field key={key} label={label} type="number" inputMode="decimal" min="0" step="any" value={values[key] ?? ''} onChange={set(key)} />
        ))}
      </div>
      <Field label="Portion" hint="Optional, for your own reference." value={values.portion} onChange={set('portion')} placeholder="e.g. 1 cup" />
      <Button type="submit" block loading={busy} disabled={!values.food_name.trim()}>Log food</Button>
    </form>
  );
}
