import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog } from '../Dialog';
import { Button, ButtonLink } from '../Button';
import { useAuth } from '../../state/auth';
import { useRanks } from '../../state/ranks';
import { resendVerification } from '../../backend/account';
import { stationLabel } from '../../data/curate';
import { ScoreBadge } from '../menu/DishList';
import { BUCKETS, answer, nextComparison, scoreAt, startPlacement } from '../../data/ranking';

const RANGE_TONE = { loved: 'border-score-high text-score-high', fine: 'border-score-mid text-score-mid', disliked: 'border-score-low text-score-low' };
const HINTS = { loved: 'Would get it again', fine: 'Fine, not memorable', disliked: 'Would skip it' };

/** The most questions a placement can need for a bucket of n dishes. */
const maxQuestions = n => (n <= 0 ? 0 : Math.ceil(Math.log2(n + 1)));

function VerifyFirst() {
  const { refresh } = useAuth();
  const [state, setState] = useState('idle');
  return (
    <div className="space-y-4">
      <p className="text-base">Verify your <b>@northeastern.edu</b> email to rank dishes. We sent a link when you signed up.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={async () => { setState('checking'); const u = await refresh(); setState(u?.verified ? 'ok' : 'not-yet'); }} loading={state === 'checking'}>
          I’ve verified it
        </Button>
        <Button variant="secondary" onClick={async () => { try { await resendVerification(); setState('sent'); } catch { setState('error'); } }}>
          Send the link again
        </Button>
      </div>
      <p role="status" className="text-sm text-ink-muted">
        {state === 'not-yet' && 'Not verified yet. Open the link in your inbox, then try again.'}
        {state === 'sent' && 'Sent. Check your Northeastern inbox.'}
        {state === 'error' && 'The link could not be sent. Try again in a minute.'}
      </p>
    </div>
  );
}

/**
 * Rank a dish the Beli way, in three short steps:
 *   1. How was it? Loved it / It was fine / Didn't like it.
 *   2. A few "which did you like more?" questions against dishes you ranked in
 *      the same bucket and course (desserts only face desserts).
 *   3. The result: your score and its place on your list.
 */
export function RankSheet({ dish: dishProp, open, onClose }) {
  // Keep showing the last dish while the sheet animates closed; the parent
  // clears it the moment the sheet is dismissed.
  const [dish, setDish] = useState(dishProp);
  if (dishProp && dishProp !== dish) setDish(dishProp);
  const { user, canPost } = useAuth();
  const { ranks, details, save } = useRanks();
  const [step, setStep] = useState('bucket');
  const [bucket, setBucket] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('bucket'); setBucket(null); setPlacement(null); setResult(null); setError(null); setSaving(false);
  }, [open, dish?.id]);

  const previous = dish ? details[dish.id]?.bucket ?? null : null;

  async function commit(chosenBucket, insertAt) {
    setSaving(true);
    setError(null);
    try {
      const next = await save({ dish, bucket: chosenBucket, insertAt });
      const list = next[chosenBucket];
      const index = list.indexOf(dish.id);
      setResult({ bucket: chosenBucket, index, length: list.length, score: scoreAt(chosenBucket, index, list.length) });
      setStep('done');
    } catch (err) {
      console.error(err);
      setError(err?.code === 'permission-denied' ? 'Only verified Northeastern accounts can rank. Verify your email and try again.' : 'Your ranking was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function chooseBucket(key) {
    setBucket(key);
    const others = (ranks[key] ?? []).filter(id => id !== dish.id);
    const sameCourse = others.filter(id => (details[id]?.course ?? 'main') === (dish.course ?? 'main'));
    const state = startPlacement({ bucketIds: others, candidateIds: sameCourse });
    if (state.done) { commit(key, state.insertAt); return; }
    setPlacement(state);
    setStep('compare');
  }

  function choose(choice) {
    const next = answer(placement, choice);
    setPlacement(next);
    if (next.done) commit(bucket, next.insertAt);
  }

  const otherId = placement && !placement.done ? nextComparison(placement) : null;
  const other = otherId ? details[otherId] : null;
  const total = useMemo(() => (placement ? maxQuestions(placement.pool.length) : 0), [placement]);

  const title = step === 'done' ? 'Ranked' : step === 'compare' ? 'Which did you like more?' : previous ? 'Rank it again' : 'How was it?';

  return (
    <Dialog open={open} onClose={onClose} title={title} description={step === 'bucket' && dish ? dish.name : undefined}>
      {!user ? (
        <div className="space-y-4">
          <p className="text-base">Rank dishes to build your own list and help campus find the good stuff. Sign in with your Northeastern email to start.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/login?next=${encodeURIComponent(window.location.pathname)}`}>Sign in</ButtonLink>
            <ButtonLink to="/signup" variant="secondary">Create an account</ButtonLink>
          </div>
        </div>
      ) : !canPost ? (
        <VerifyFirst />
      ) : step === 'bucket' ? (
        <div className="animate-step">
          <ul className="overflow-hidden rounded-card border border-card-line bg-surface-2/40">
            {BUCKETS.map(b => (
              <li key={b.key} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => chooseBucket(b.key)}
                  disabled={saving}
                  className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block text-[1.0625rem] font-semibold">{b.label}</span>
                    <span className="block text-sm text-ink-muted">{HINTS[b.key]}{previous === b.key ? ' · where it is now' : ''}</span>
                  </span>
                  <span className={`shrink-0 rounded-full border-2 px-2.5 py-1 text-xs font-bold tabular ${RANGE_TONE[b.key]}`}>{b.range[0].toFixed(1)}–{b.range[1].toFixed(1)}</span>
                </button>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="pt-3 text-sm font-medium text-danger">{error}</p>}
        </div>
      ) : step === 'compare' && other ? (
        <div key={otherId} className="space-y-3 animate-step">
          <p className="text-sm text-ink-muted tabular" aria-live="polite">
            {total <= 1 ? 'One question' : `Question ${placement.asked + 1} of at most ${total}`} · {BUCKETS.find(b => b.key === bucket)?.label}
          </p>
          <div className="grid gap-2">
            {[
              { choice: 'new', name: dish.name, where: dish.stationLabel ?? dish.station, note: 'ranking now' },
              { choice: 'old', name: other.name, where: other.station && stationLabel(other.station), note: null },
            ].map(opt => (
              <button
                key={opt.choice}
                type="button"
                disabled={saving}
                onClick={() => choose(opt.choice)}
                className="min-h-20 w-full rounded-card border border-card-line bg-surface-2 px-4 py-3 text-left transition-[transform,background-color] duration-150 ease-apple hover:bg-surface-3 active:scale-[0.98] disabled:opacity-60"
              >
                <span className="block text-[1.0625rem] font-semibold leading-snug">{opt.name}</span>
                {(opt.where || opt.note) && <span className="mt-1 block text-sm text-ink-muted">{[opt.where, opt.note].filter(Boolean).join(' · ')}</span>}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => choose('tie')} disabled={saving} className="min-h-11 text-sm font-semibold text-ink-muted hover:text-ink">
            Too tough to say
          </button>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        </div>
      ) : step === 'done' && result ? (
        <div className="text-center">
          <div className="flex justify-center animate-pop"><ScoreBadge score={result.score} label="Your score" size="lg" /></div>
          <p className="mt-4 text-lg font-semibold">{dish.name}</p>
          <p className="mt-1 text-sm text-ink-muted tabular">
            #{result.index + 1} of {result.length} {result.length === 1 ? 'dish' : 'dishes'} you {result.bucket === 'loved' ? 'loved' : result.bucket === 'fine' ? 'found fine' : 'didn’t like'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={onClose}>Done</Button>
            <ButtonLink to="/rankings" variant="secondary" onClick={onClose}>See your list</ButtonLink>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted" role="status">Saving…</p>
      )}
      {saving && step !== 'done' && <p className="sr-only" role="status">Saving your ranking</p>}
      {step === 'bucket' && user && canPost && (
        <p className="mt-4 text-xs text-ink-muted">
          Your list is private. Campus scores count each person once, and need three rankings before they show. <Link to="/rankings" className="underline">Your list</Link>
        </p>
      )}
    </Dialog>
  );
}
