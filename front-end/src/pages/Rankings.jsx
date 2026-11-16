import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListOrdered, MessageSquareText } from 'lucide-react';
import { useRanks, useCampusScores } from '../state/ranks';
import { BUCKETS } from '../data/ranking';
import { hallBySlug } from '../data/halls';
import { stationLabel } from '../data/curate';
import { EmptyState, Notice, PageHeader } from '../ui/primitives';
import { ButtonLink } from '../ui/Button';
import { PageSpinner } from '../ui/Spinner';
import { RankSheet } from '../ui/rank/RankSheet';
import { ScoreBadge } from '../ui/menu/DishList';
import { usePageTitle } from '../lib/usePageTitle';
import { useAuth } from '../state/auth';
import { VerifyGate } from '../ui/VerifyGate';
import { getRecentNotes } from '../backend/notes';
import { NoteItem } from '../ui/community/Notes';

const SECTION = { loved: 'Loved', fine: 'Fine', disliked: 'Didn’t like' };

function RankedRow({ dish, place, campus, onRerank, onRemove, busy }) {
  const hall = hallBySlug(dish.hall);
  const where = [hall?.shortName ?? hall?.name ?? dish.hall, dish.station && stationLabel(dish.station)].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span className="w-6 shrink-0 text-sm font-semibold text-ink-muted tabular"><span className="sr-only">Number </span>{place}</span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-snug">{dish.name ?? 'Unnamed dish'}</p>
        <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
          {where}{campus?.score != null && <> · Campus <span className="tabular">{campus.score.toFixed(1)}</span></>}
        </p>
        <div className="mt-1 flex gap-4 text-sm font-semibold">
          <button type="button" onClick={onRerank} className="min-h-11 text-brand-text">Rank again</button>
          <button type="button" onClick={onRemove} disabled={busy} className="min-h-11 text-ink-muted hover:text-ink disabled:opacity-60">{busy ? 'Removing…' : 'Remove'}</button>
        </div>
      </div>
      <ScoreBadge score={dish.score} label="Your score" />
    </li>
  );
}

/**
 * Your ranked dishes, best first, in the three buckets you placed them in.
 * Scores are relative to your own list, so they move as you rank more.
 */
function YourList() {
  const { user, canPost, ready } = useAuth();
  const { status, list, ranks, remove } = useRanks();
  const [rerank, setRerank] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [failure, setFailure] = useState(null);
  const campus = useCampusScores(useMemo(() => list.map(d => d.id), [list]));

  if (!ready) return <PageSpinner label="Checking your account" />;
  if (!user) {
    return (
      <EmptyState icon={ListOrdered} title="Your own list" action={<ButtonLink to="/login?next=/rankings?tab=yours">Sign in</ButtonLink>}>
        Sign in with your Northeastern email to rank dishes and keep them here, best first.
      </EmptyState>
    );
  }
  if (!canPost) return <VerifyGate feature="Your list" />;
  if (status === 'loading' || status === 'idle') return <PageSpinner label="Loading your list" />;

  async function onRemove(dish) {
    setRemoving(dish.id);
    setFailure(null);
    try { await remove(dish); } catch (err) { console.error(err); setFailure('That dish could not be removed. Try again.'); }
    finally { setRemoving(null); }
  }

  const total = list.length;
  return (
    <div>
      {total > 0 && <p className="mb-5 px-1 text-sm text-ink-muted">{total} {total === 1 ? 'dish' : 'dishes'}, best first. Only you see this order.</p>}

      {status === 'error' && (
        <Notice tone="warn" title="Your list did not load" className="mb-8">Check your connection and reload the page.</Notice>
      )}
      {failure && <Notice tone="warn" role="alert" className="mb-8">{failure}</Notice>}

      {status === 'ready' && total === 0 && (
        <EmptyState icon={ListOrdered} title="Nothing ranked yet" action={<ButtonLink to="/home">Open today’s menus</ButtonLink>}>
          Open a dish on any menu and choose Rank this dish. After a few, you will see where each one lands against the others.
        </EmptyState>
      )}

      <div className="space-y-7">
        {BUCKETS.map(bucket => {
          const dishes = list.filter(d => d.bucket === bucket.key);
          if (!dishes.length) return null;
          const offset = list.findIndex(d => d.bucket === bucket.key);
          return (
            <section key={bucket.key} aria-labelledby={`bucket-${bucket.key}`}>
              <h2 id={`bucket-${bucket.key}`} className="mb-2 flex items-baseline justify-between gap-3 px-1">
                <span className="text-lg font-semibold">{SECTION[bucket.key]}</span>
                <span className="text-sm text-ink-muted tabular">{ranks[bucket.key].length}</span>
              </h2>
              <ul className="overflow-hidden rounded-card border border-card-line bg-surface shadow-card">
                {dishes.map((dish, i) => (
                  <RankedRow
                    key={dish.id}
                    dish={dish}
                    place={offset + i + 1}
                    campus={campus[dish.id]}
                    busy={removing === dish.id}
                    onRerank={() => setRerank({ id: dish.id, name: dish.name, hall: dish.hall, station: dish.station ?? '', stationLabel: dish.station, course: dish.course ?? 'main' })}
                    onRemove={() => onRemove(dish)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>


      <RankSheet dish={rerank} open={Boolean(rerank)} onClose={() => setRerank(null)} />
    </div>
  );
}

/** The campus log: everyone's newest notes on any dish. */
function CampusFeed() {
  const [notes, setNotes] = useState(null);
  const [failed, setFailed] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
    let alive = true;
    getRecentNotes(40).then(n => alive && setNotes(n)).catch(err => { console.error(err); if (alive) { setFailed(true); setNotes([]); } });
    return () => { alive = false; };
  }, []);
  if (notes == null) return <PageSpinner label="Loading what people said" />;
  if (failed) return <Notice tone="warn" title="The campus log did not load">Check your connection and reload the page.</Notice>;
  if (!notes.length) {
    return (
      <EmptyState icon={MessageSquareText} title="No notes yet" action={<ButtonLink to="/home">Open today’s menus</ButtonLink>}>
        Rank a dish, then say what you liked or didn’t. Notes show here for everyone.
      </EmptyState>
    );
  }
  return (
    <ul className="overflow-hidden rounded-card border border-card-line bg-surface shadow-card">
      {notes.map(n => <NoteItem key={n.id} note={n} showDish mine={user?.id === n.uid} />)}
    </ul>
  );
}

const TABS = [['campus', 'Campus'], ['yours', 'Yours']];

/**
 * Ratings: the community log of what campus thinks of each dish, and your own
 * ranked list. Anyone can read the campus side; yours needs an account.
 */
export default function Rankings() {
  usePageTitle('Ratings', 'What Northeastern students say about dining hall dishes, and your own ranked list.');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'yours' ? 'yours' : 'campus';
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ratings">{tab === 'campus' ? 'What students said about dining hall dishes, newest first.' : 'Every dish you ranked.'}</PageHeader>
      <div role="tablist" aria-label="Ratings" className="mb-6 flex rounded-full bg-surface-2 p-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'campus' ? {} : { tab: key }, { replace: true })}
            className={`min-h-11 flex-1 rounded-full text-sm transition-colors ${tab === key ? 'bg-surface font-semibold text-ink shadow-card ring-1 ring-card-line' : 'font-medium text-ink-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab === 'campus' ? 'Campus' : 'Yours'}>
        {tab === 'campus' ? <CampusFeed /> : <YourList />}
      </div>
    </div>
  );
}
