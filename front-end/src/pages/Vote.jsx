import { useCallback, useEffect, useState } from 'react';
import { Check, Circle, CircleDot, Clock, RefreshCw, X } from 'lucide-react';
import { castVote, getMyMeals, getTotals, undoVote } from '../backend/votes';
import { campusDate, campusNow } from '../functions/campusTime';
import { useAuth } from '../state/auth';
import { Button } from '../ui/Button';
import { Card, Notice, PageHeader } from '../ui/primitives';
import { PageSpinner } from '../ui/Spinner';
import { usePageTitle } from '../lib/usePageTitle';

const MEAL_PERIODS = [
  { name: 'breakfast', label: 'Breakfast', start: 7 * 60,  end: 11 * 60 },
  { name: 'lunch',     label: 'Lunch',     start: 11 * 60, end: 15 * 60 },
  { name: 'dinner',    label: 'Dinner',    start: 16 * 60, end: 21 * 60 },
];

const OPTIONS = [
  { key: 'steast', name: 'Stetson East', short: 'Steast' },
  { key: 'iv', name: 'International Village', short: 'IV' },
];

// Meal windows are campus opening times, so compare against Boston rather
// than whatever timezone the visitor's laptop is set to.
const minutesNow = () => campusNow().minutes;
const getStartedPeriods = () => MEAL_PERIODS.filter(p => minutesNow() >= p.start);
const getCurrentPeriod = () => MEAL_PERIODS.find(p => minutesNow() >= p.start && minutesNow() < p.end) || null;
const getNextPeriod = () => MEAL_PERIODS.find(p => p.start > minutesNow()) || null;

function fmtTime(minutes) {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}${min > 0 ? ':' + String(min).padStart(2, '0') : ''} ${ampm}`;
}

export const Vote = () => {
  usePageTitle('Steast or IV?', 'Vote once per meal between Stetson East and International Village and see the campus totals.');
  const { user, canPost } = useAuth();
  const [votes, setVotes] = useState({ steast: 0, iv: 0 });
  // votedPeriods comes from Supabase so the lock follows the user across devices
  const [votedPeriods, setVotedPeriods] = useState([]);
  const [startedPeriods, setStartedPeriods] = useState(getStartedPeriods);
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod);
  const [status, setStatus] = useState('loading');
  const [failure, setFailure] = useState(null);
  const [toast, setToast] = useState(null);
  const today = campusDate();

  // Slots the user is allowed to vote in right now
  const unvotedSlots = startedPeriods.filter(p => !votedPeriods.includes(p.name));
  const canVote = status === 'ready' && unvotedSlots.length > 0;
  const nextPeriod = getNextPeriod();

  // All-time cumulative totals, refetched on any Realtime event
  const fetchTotals = useCallback(async () => {
    setVotes(await getTotals());
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setFailure(null);
    try {
      setVotedPeriods(await getMyMeals(user.id, today));
      await fetchTotals();
      setStatus('ready');
    } catch (err) {
      console.error('Loading votes failed', err);
      setStatus('error');
    }
  }, [user, today, fetchTotals]);

  useEffect(() => {
    if (!user) return undefined;
    load();

    // Campus totals refresh every 30 seconds while the page is visible. Count
    // queries cost one read per thousand votes, so this stays cheap; your own
    // votes update instantly through the optimistic state below.
    const refreshTotals = () => { if (document.visibilityState === 'visible') fetchTotals().catch(() => {}); };
    const poll = setInterval(refreshTotals, 30_000);

    // Keep meal period state fresh every minute
    const clock = setInterval(() => {
      setStartedPeriods(getStartedPeriods());
      setCurrentPeriod(getCurrentPeriod());
    }, 60_000);

    return () => { clearInterval(poll); clearInterval(clock); };
  }, [user, load, fetchTotals]);

  const handleVote = async (option) => {
    if (!canVote || !user) return;
    const label = OPTIONS.find(o => o.key === option).name;

    // Prefer the currently-active period; otherwise use the earliest unvoted slot
    const slotToMark = (currentPeriod && unvotedSlots.find(p => p.name === currentPeriod.name))
      ? currentPeriod
      : unvotedSlots[0];

    // Optimistic update
    setFailure(null);
    setVotedPeriods(prev => [...prev, slotToMark.name]);
    setVotes(prev => ({ ...prev, [option]: prev[option] + 1 }));

    const error = await castVote(user.id, today, slotToMark.name, option).then(() => null, err => err);

    if (error) {
      // Roll back: the database rejected it, most likely a duplicate from another tab
      setVotedPeriods(prev => prev.filter(p => p !== slotToMark.name));
      setVotes(prev => ({ ...prev, [option]: Math.max(0, prev[option] - 1) }));
      setFailure(error?.code === 'permission-denied' && !canPost
        ? 'Verify your @northeastern.edu email to vote. Check your inbox for the link.'
        : 'Your vote was not saved. You may already have voted for this meal in another tab.');
      return;
    }

    // The undo stays until it is used or dismissed: the HIG asks to avoid
    // controls that disappear on a timer (accessibility.md, Cognitive).
    setToast({ option, label, slot: slotToMark.name });
  };

  const handleUndo = async () => {
    if (!toast || !user) return;
    const undone = toast;
    setVotes(prev => ({ ...prev, [undone.option]: Math.max(0, prev[undone.option] - 1) }));
    setVotedPeriods(prev => prev.filter(p => p !== undone.slot));
    setToast(null);

    const error = await undoVote(user.id, today, undone.slot).then(() => null, err => err);
    if (error) {
      setFailure('The vote could not be undone. Refresh to see the current totals.');
      load();
    }
  };

  const statusText = () => {
    if (unvotedSlots.length > 0) {
      const names = unvotedSlots.map(p => p.label).join(' and ');
      return `You have ${unvotedSlots.length} vote${unvotedSlots.length > 1 ? 's' : ''} for ${names}.`;
    }
    if (nextPeriod) return `Next vote opens at ${fmtTime(nextPeriod.start)} for ${nextPeriod.label.toLowerCase()}.`;
    return "You've used all three votes today. See you tomorrow.";
  };

  if (status === 'loading') return <PageSpinner label="Loading votes" />;

  const total = votes.steast + votes.iv;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Steast or IV?">
        One vote per meal. Totals refresh every 30 seconds.
      </PageHeader>

      {status === 'error' && (
        <Notice tone="error" className="mb-5" title="Votes couldn't be loaded"
          action={<Button size="sm" variant="secondary" onClick={load}><RefreshCw className="size-4" aria-hidden="true" /> Try again</Button>}>
          The voting service did not respond. Your previous votes are safe.
        </Notice>
      )}

      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Today's meals">
        {MEAL_PERIODS.map(p => {
          const started = startedPeriods.some(s => s.name === p.name);
          const voted = votedPeriods.includes(p.name);
          const active = currentPeriod?.name === p.name;
          const Icon = voted ? Check : active ? CircleDot : started ? Circle : Clock;
          const state = voted ? 'voted' : started ? 'open to vote' : `opens ${fmtTime(p.start)}`;
          return (
            <li key={p.name}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold
                ${voted ? 'border-transparent bg-open-soft text-open'
                  : active ? 'border-brand bg-brand-soft text-brand-text'
                    : started ? 'border-line bg-surface text-ink' : 'border-line bg-surface text-ink-muted'}`}>
              <Icon className="size-4" aria-hidden="true" />
              {p.label}
              <span className="sr-only">, {state}</span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map(option => {
          const count = votes[option.key];
          const share = total ? Math.round((count / total) * 100) : 0;
          return (
            <Card key={option.key} className="flex flex-col p-5 sm:p-6">
              <h2 className="text-xl font-semibold">{option.name}</h2>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tabular">{count.toLocaleString()}</span>
                <span className="text-ink-muted">vote{count === 1 ? '' : 's'} · {share}%</span>
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${share}%` }} />
              </div>
              <Button className="mt-6" size="lg" block disabled={!canVote} onClick={() => handleVote(option.key)}>
                Vote {option.short}
              </Button>
            </Card>
          );
        })}
      </div>

      <p className="mt-5 text-sm text-ink-muted" role="status">{status === 'ready' && statusText()}</p>
      {failure && <Notice tone="error" className="mt-4" role="alert" title={failure} />}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:bottom-8">
        {toast && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink py-1 pl-5 pr-1 text-bg shadow-card animate-rise">
            <span className="text-sm font-semibold">Voted for {toast.label}</span>
            <button type="button" onClick={handleUndo} className="min-h-11 rounded-full px-3 text-sm font-semibold text-bg underline-offset-4 hover:underline">
              Undo
            </button>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss"
              className="grid size-11 place-items-center rounded-full text-bg/80 hover:text-bg">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vote;
