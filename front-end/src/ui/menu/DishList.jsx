import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { useAuth } from '../../state/auth';
import { insertLog, logEntryFor, logMealFor } from '../../data/foodLog';
import { campusNow } from '../../functions/campusTime';
import { dietWords, sectionId } from './filters';
import { hasRealDescription } from '../../data/curate';
import { dishId } from '../../data/ranking';
import { useMenuContext } from './menuContext';

/*
 * The menu, built like a food app: a shelf of top picks you can swipe, each
 * station as one grouped card of tappable rows, and every dish opening the
 * same bottom sheet (nutrition, allergens, rank it, add to log). Scores sit
 * in Beli-style badges; the number carries the meaning, colour echoes it.
 */

/** Scores for a dish from context: yours, and the campus score once it has enough rankings. */
function useScores(item, hallProp) {
  const ctx = useMenuContext();
  const hall = hallProp ?? ctx.hall;
  const id = hall ? dishId(hall, item.name) : null;
  return { campus: id ? ctx.scores[id] ?? null : null, yours: id ? ctx.mine(id) : null };
}

const tone = score => (score >= 6.8 ? 'text-score-high border-score-high' : score >= 3.4 ? 'text-score-mid border-score-mid' : 'text-score-low border-score-low');

/** A Beli-style score badge: the number in a ring tinted by how good it is. */
export function ScoreBadge({ score, label, size = 'md' }) {
  if (score == null) return null;
  // A perfect 10.0 has four characters, so it steps the text down rather than crowd the ring.
  const long = score >= 10;
  const box = size === 'lg'
    ? `size-28 border-[3px] ${long ? 'text-[2.25rem]' : 'text-[2.75rem]'}`
    : size === 'sm'
      ? `size-10 border-2 ${long ? 'text-[0.6875rem]' : 'text-[0.8125rem]'}`
      : `size-12 border-2 ${long ? 'text-[0.8125rem]' : 'text-[0.9375rem]'}`;
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold tabular ${box} ${tone(score)}`}>
      <span aria-hidden="true">{score.toFixed(1)}</span>
      <span className="sr-only">{label ?? 'Score'} {score.toFixed(1)} out of 10</span>
    </span>
  );
}

/** "New" as a small muted word that rides in the name's own line: many dishes can be new at once. */
const NewTag = () => <span className="ml-1.5 whitespace-nowrap align-[0.1em] text-xs font-semibold text-ink-subtle">New</span>;

/** Join phrases with " · ", keeping each phrase ("760 cal", "24 g protein") on one line. */
const joinFacts = parts => parts.filter(Boolean).map(p => p.replace(/ /g, '\u00a0')).join(' · ');

/** The second line under a dish name: station, diet words, protein. */
function metaLine(item, { showStation = false } = {}) {
  return [showStation ? item.stationLabel : null, dietWords(item) || null].filter(Boolean).join(' · ');
}

function AddToLog({ item, periodSlug }) {
  const { user } = useAuth();
  const [state, setState] = useState('idle');
  if (!user) return null;

  async function add() {
    setState('saving');
    try {
      await insertLog(logEntryFor(user.id, item, logMealFor(periodSlug, campusNow().minutes)));
      setState('done');
    } catch (err) {
      console.error(err);
      setState('error');
    }
  }

  return (
    <div>
      <Button block variant="secondary" onClick={add} loading={state === 'saving'} disabled={state === 'done'}>
        {state === 'done' ? <Check className="size-4" aria-hidden="true" /> : state !== 'saving' && <Plus className="size-4" aria-hidden="true" />}
        {state === 'done' ? 'Added to today' : 'Add to my log'}
      </Button>
      <span role="status" className="mt-1 block text-center text-sm empty:hidden">
        {state === 'done' && <Link to="/tracker" className="font-semibold text-brand-text underline underline-offset-4">Open tracker</Link>}
        {state === 'error' && <span className="text-danger">Not saved. Try again.</span>}
      </span>
    </div>
  );
}

const FACTS = [
  ['Calories', 'calories', ''],
  ['Protein', 'protein', ' g'],
  ['Carbs', 'carbs', ' g'],
  ['Fat', 'fat', ' g'],
  ['Sat. fat', 'saturatedFat', ' g'],
  ['Fiber', 'fiber', ' g'],
  ['Sugars', 'sugar', ' g'],
  ['Sodium', 'sodium', ' mg'],
];

/**
 * One dish, in a bottom sheet: what it is, its scores, nutrition, allergens,
 * and the two things you can do with it.
 */
export function DishSheet({ item, open, onClose, periodSlug }) {
  const ctx = useMenuContext();
  // Keep the last dish on screen while the sheet animates closed.
  const [shown, setShown] = useState(item);
  if (item && item !== shown) setShown(item);
  const dish = shown;
  const id = dish && ctx.hall ? dishId(ctx.hall, dish.name) : null;
  const campus = id ? ctx.scores[id] : null;
  const yours = id ? ctx.mine(id) : null;
  if (!dish) return null;
  const meta = metaLine(dish, { showStation: true });

  return (
    <Dialog open={open} onClose={onClose} title={dish.name} description={[dish.isNew ? 'New today' : null, meta || null].filter(Boolean).join(' · ') || undefined} size="lg">
      <div className="space-y-6">
        {hasRealDescription(dish) && <p className="text-base text-ink-muted">{dish.description}</p>}

        {(campus?.score != null || yours?.score != null) && (
          <div className="flex flex-wrap items-center gap-5">
            {campus?.score != null && (
              <div className="flex items-center gap-3">
                <ScoreBadge score={campus.score} label="Campus score" />
                <div className="text-sm"><p className="font-semibold">Campus</p><p className="text-ink-muted tabular">{campus.count} rankings</p></div>
              </div>
            )}
            {yours?.score != null && (
              <div className="flex items-center gap-3">
                <ScoreBadge score={yours.score} label="Your score" />
                <p className="text-sm font-semibold">You</p>
              </div>
            )}
          </div>
        )}

        <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-line bg-line tabular">
          {FACTS.map(([label, key, unit]) => (
            <div key={key} className="bg-surface px-2.5 py-2.5">
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="mt-0.5 whitespace-nowrap text-sm font-semibold">
                {dish[key] == null ? <span className="text-ink-subtle" aria-label="not listed">–</span> : `${Math.round(dish[key] * 10) / 10}${unit}`}
              </dd>
            </div>
          ))}
        </dl>
        {dish.portion && <p className="-mt-3 text-sm text-ink-muted">Portion: {dish.portion}</p>}

        {dish.allergens.length > 0 && (
          <p className="text-sm">
            <span className="font-semibold">Contains</span> <span className="text-ink-muted">{dish.allergens.join(', ')}. Ask staff if an allergy is serious.</span>
          </p>
        )}
        {dish.ingredients && (
          <details className="group text-sm">
            <summary className="inline-flex min-h-11 items-center gap-1 font-semibold">
              Ingredients <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="text-ink-muted">{dish.ingredients.replace(/\^/g, '')}</p>
          </details>
        )}

        <div className="grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
          {ctx.rank && ctx.hall && <Button block onClick={() => ctx.rank(dish)}>{yours ? 'Rank again' : 'Rank this dish'}</Button>}
          <AddToLog item={dish} periodSlug={periodSlug} />
        </div>
      </div>
    </Dialog>
  );
}

/**
 * A dish as a list row: name, one quiet line under it, and on the right the
 * campus score badge when there is one, else the calories.
 */
export function DishRow({ item, showStation = false, hall = null, to = null }) {
  const ctx = useMenuContext();
  const { campus, yours } = useScores(item, hall);
  const sub = joinFacts([
    yours?.score != null ? `You ${yours.score.toFixed(1)}` : null,
    showStation ? item.stationLabel : null,
    ...dietWords(item).split(' · '),
    campus?.score != null && item.calories != null ? `${item.calories} cal` : null,
  ]);
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium leading-snug">{item.name}{item.isNew && <NewTag />}</span>
        {sub && <span className="mt-0.5 block text-[0.8125rem] text-ink-muted">{sub}</span>}
      </span>
      {campus?.score != null
        ? <ScoreBadge score={campus.score} label="Campus score" size="sm" />
        : <span className="shrink-0 text-sm text-ink-muted tabular">{item.calories != null ? `${item.calories} cal` : ''}</span>}
      <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
    </>
  );
  const cls = 'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-3';
  return (
    <li className="border-b border-line last:border-b-0">
      {to
        ? <Link to={to} className={cls}>{body}</Link>
        : <button type="button" onClick={() => ctx.show?.(item)} className={cls}>{body}</button>}
    </li>
  );
}

/** A top pick as a tile on the shelf. */
function PickTile({ item }) {
  const ctx = useMenuContext();
  const { campus, yours } = useScores(item);
  const firstDiet = dietWords(item).split(' · ')[0] || null;
  return (
    <li className="w-[15.5rem] shrink-0 snap-start sm:w-[14rem]">
      <button
        type="button"
        onClick={() => ctx.show?.(item)}
        className="flex h-full min-h-40 w-full flex-col rounded-card border border-card-line bg-surface p-4 text-left shadow-card transition-transform duration-150 ease-apple active:scale-[0.98]"
      >
        <span className="block truncate text-[0.8125rem] text-ink-muted">{item.stationLabel}{item.isNew && <NewTag />}</span>
        <span className="mt-2 line-clamp-2 text-[1.0625rem] font-semibold leading-snug">{item.name}</span>
        {/* The dining team's own words, when they wrote any, fill the tile; nothing is invented. */}
        {hasRealDescription(item) && <span className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-snug text-ink-muted">{item.description}</span>}
        <span className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span className="text-[0.8125rem] text-ink-muted">
            {joinFacts([item.calories != null ? `${item.calories} cal` : null, yours?.score != null ? `You ${yours.score.toFixed(1)}` : firstDiet])}
          </span>
          <ScoreBadge score={campus?.score} label="Campus score" size="sm" />
        </span>
      </button>
    </li>
  );
}

/** The swipeable row of picks at the top of a menu. */
export function PicksShelf({ title, note, noteDetail, onNote, items }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="picks-heading" className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="picks-heading" className="text-xl font-semibold">{title}</h2>
        {/* "New" is inferred by comparing neighbouring days; the detail says which. */}
        {note && (
          <button type="button" onClick={onNote} title={noteDetail || undefined} className="min-h-11 text-sm font-semibold text-brand-text">
            {note}{noteDetail && <span className="sr-only">. {noteDetail}</span>}
          </button>
        )}
      </div>
      {/* Keyed by its dishes: when scores reorder the shelf it starts again from the first tile. */}
      <ul key={items.map(i => i.id).join('|')} className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:scroll-px-0 sm:px-0">
        {items.map(item => <PickTile key={item.id} item={item} />)}
      </ul>
    </section>
  );
}

/** Sides, sauces and bar ingredients: a compact list inside a card. */
export function PartList({ items }) {
  return (
    <ul className="px-4 pb-2 text-sm">
      {items.map(item => (
        <li key={item.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
          <span className="min-w-0">{item.name}</span>
          <span className="shrink-0 text-ink-muted tabular">{item.calories != null ? `${item.calories} cal` : ''}</span>
        </li>
      ))}
    </ul>
  );
}

/** A row inside a card that opens to show what it holds. */
function FoldRow({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <span className="flex-1">{label}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div id={id}>{children}</div>}
    </li>
  );
}

const SHOWN = 4;

/** A station: its name, and its dishes as one grouped card. */
export function StationCard({ station, expanded = false }) {
  const [all, setAll] = useState(expanded);
  const headingId = useId();
  const dishes = all ? station.dishes : station.dishes.slice(0, SHOWN);
  const hidden = station.dishes.length - dishes.length;
  return (
    <section id={sectionId(station.name)} aria-labelledby={headingId} className="scroll-mt-36">
      <h2 id={headingId} className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <span className="text-lg font-semibold">{station.label}</span>
        {station.dishes.length > 0 && <span className="text-sm text-ink-muted tabular">{station.dishes.length}</span>}
      </h2>
      <ul className="overflow-hidden rounded-card border border-card-line bg-surface shadow-card">
        {dishes.map(item => <DishRow key={item.id} item={item} />)}
        {hidden > 0 && (
          <li className="border-b border-line last:border-b-0">
            <button type="button" onClick={() => setAll(true)} className="flex min-h-12 w-full items-center px-4 text-left text-sm font-semibold text-brand-text hover:bg-surface-2">
              Show {hidden} more
            </button>
          </li>
        )}
        {station.extras.length > 0 && (
          <FoldRow label={`${station.extras.length} ${station.extras.length === 1 ? 'side or sauce' : 'sides and sauces'}`} defaultOpen={expanded && !station.dishes.length}>
            <PartList items={station.extras} />
          </FoldRow>
        )}
      </ul>
    </section>
  );
}

/** Build-your-own bars: ingredients, not dishes, one fold each. */
export function BuildBars({ bars, expanded = false }) {
  if (!bars.length) return null;
  return (
    <section id={sectionId('build-your-own')} aria-labelledby="build-heading" className="scroll-mt-36">
      <h2 id="build-heading" className="mb-2 px-1 text-lg font-semibold">Build your own</h2>
      <ul className="overflow-hidden rounded-card border border-card-line bg-surface shadow-card">
        {bars.map(bar => (
          <FoldRow key={bar.name} defaultOpen={expanded} label={`${bar.label} · ${bar.extras.length} ${bar.extras.length === 1 ? 'ingredient' : 'ingredients'}`}>
            <PartList items={bar.extras} />
          </FoldRow>
        ))}
      </ul>
    </section>
  );
}

/** Jump links to every station, as a scrolling row of pills. */
export function StationRail({ stations }) {
  if (stations.length < 2) return null;
  return (
    <nav aria-label="Stations" className="sticky top-16 z-30 -mx-4 mb-6 bg-bg py-2 sm:mx-0">
      <ul className="relative flex gap-2 overflow-x-auto px-4 scrollbar-none sm:flex-wrap sm:overflow-visible sm:px-0">
        {stations.map(s => (
          <li key={s.name} className="shrink-0">
            <a href={`#${sectionId(s.name)}`} className="inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
