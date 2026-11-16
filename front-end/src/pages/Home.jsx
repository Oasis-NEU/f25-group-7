import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useHours } from '../state/hours';
import { useAuth } from '../state/auth';
import { StatusText } from '../ui/HallStatus';
import { describeStatus, shortTime } from '../ui/status';
import { Notice, PageHeader, Skeleton } from '../ui/primitives';
import { addDays, campusDate, formatCampusDate } from '../functions/campusTime';
import { mergeSlots, nextOpening, openState, toMinutes } from '../functions/hours';
import { NoHoursNotice } from './Hours';
import { loadMenu, peekCachedMenu } from '../data/menu';
import { curateMenu, stablePicks } from '../data/curate';
import { hallBySlug, pickCurrentPeriod } from '../data/halls';
import { useNewToday } from '../lib/useNewToday';
import { DishRow } from '../ui/menu/DishList';
import { DirectionsLink } from '../ui/Directions';
import { MenuContext } from '../ui/menu/menuContext';
import { useCampusScores, useRanks } from '../state/ranks';
import { dishId } from '../data/ranking';
import { usePageTitle } from '../lib/usePageTitle';

/**
 * The meal worth previewing for a hall: the one being served now, or, when
 * the hall is closed, the next one it serves today. Null when it serves
 * nothing more today.
 */
function previewTarget(days, now) {
  const state = openState(days, now);
  if (state.open) return { minutes: now.minutes, upcoming: null };
  const next = nextOpening(days, now);
  if (!next || next.dayOffset !== 0) return null;
  return { minutes: toMinutes(next.opens), upcoming: next.opens };
}

/** Typical meals, for guessing which one to ask for before the hall's own list is known. */
// Brunch is left out: it is rarer, and a wrong guess costs one extra request.
const USUAL_MEALS = [{ slug: 'breakfast' }, { slug: 'lunch' }, { slug: 'dinner' }];

/**
 * The menu to preview for a hall's next meal today.
 *
 * Asks for the likely meal directly (one round trip), and shows this
 * browser's saved copy of it at once while the live copy loads, so a repeat
 * visit paints immediately. Only when the guess is wrong (a weekend brunch,
 * say) does it ask again, for the meal the hall actually serves then.
 */
function useHallPicks(hallSlug, target) {
  const minutes = target?.minutes ?? null;
  const guess = minutes == null ? null : pickCurrentPeriod(USUAL_MEALS, minutes)?.slug ?? null;
  const [state, setState] = useState(() => {
    const saved = guess ? peekCachedMenu(hallSlug, campusDate(), guess) : null;
    return { loading: Boolean(guess) && !saved, result: saved?.status === 'ok' ? saved : null };
  });

  useEffect(() => {
    if (!guess) { setState({ loading: false, result: null }); return undefined; }
    const controller = new AbortController();
    const saved = peekCachedMenu(hallSlug, campusDate(), guess);
    setState({ loading: !saved, result: saved?.status === 'ok' ? saved : null });
    (async () => {
      let result = await loadMenu({ hallSlug, mealSlug: guess, signal: controller.signal });
      const wanted = result.periods?.length ? pickCurrentPeriod(result.periods, minutes) : null;
      if (wanted && wanted.slug !== result.period?.slug) {
        result = await loadMenu({ hallSlug, mealSlug: wanted.slug, signal: controller.signal });
      }
      if (controller.signal.aborted) return;
      // Keep a good saved copy on screen rather than blanking it if the live load failed.
      setState(prev => ({ loading: false, result: result.status === 'ok' ? result : prev.result }));
    })().catch(() => { if (!controller.signal.aborted) setState(prev => ({ ...prev, loading: false })); });
    return () => controller.abort();
  }, [hallSlug, guess, minutes]);
  return state;
}

function HallColumn({ hall, now }) {
  const today = hall.days[0];
  const status = describeStatus(hall.days, now);
  const slots = today && !today.closed ? mergeSlots(today.slots) : [];
  const target = previewTarget(hall.days, now);
  const { loading, result } = useHallPicks(hall.slug, target);
  const fresh = useNewToday(result);

  const curated = useMemo(() => (result ? curateMenu(result.stations, { newKeys: fresh.keys }) : null), [result, fresh.keys]);
  const { mine } = useRanks();
  const scores = useCampusScores(useMemo(
    () => (curated ? curated.stations.flatMap(st => st.dishes.map(d => dishId(hall.slug, d.name))) : []),
    [curated, hall.slug],
  ));

  // The top campus-ranked dish on this meal headlines, when there is one;
  // otherwise the usual picks. Its "Campus 8.4 (12)" line says why.
  const picks = useMemo(() => {
    if (!result || !curated) return [];
    const labels = new Map(curated.stations.map(st => [st.name, st.label]));
    const base = stablePicks(result.stations, fresh.keys);
    let best = null;
    for (const st of curated.stations) for (const d of st.dishes) {
      const sc = scores[dishId(hall.slug, d.name)];
      if (sc?.score != null && sc.score >= 6.8 && (!best || sc.score > best.s.score)) best = { d, s: sc };
    }
    const ordered = best ? [best.d, ...base.filter(d => d.id !== best.d.id)] : base;
    return ordered.slice(0, 3).map(item => ({ ...item, stationLabel: labels.get(item.station) ?? item.station }));
  }, [result, curated, fresh.keys, scores, hall.slug]);
  const menuContext = useMemo(() => ({ hall: hall.slug, scores, mine, rank: null }), [hall.slug, scores, mine]);

  const meal = result?.period?.name ?? null;
  const menuLink = `/menu/${hall.slug}${result?.period?.slug ? `/${result.period.slug}` : ''}`;
  const tomorrowLink = `/menu/${hall.slug}?date=${addDays(campusDate(), 1)}`;
  const hours = slots.length
    ? <>Today {slots.map((sl, i) => <span key={sl.opens} className="whitespace-nowrap">{i > 0 && ', '}{shortTime(sl.opens)}–{shortTime(sl.closes)}</span>)}</>
    : 'Closed today';
  const mealLine = meal ? (target?.upcoming ? `${meal} from ${shortTime(target.upcoming)}` : meal) : null;

  return (
    <MenuContext.Provider value={menuContext}>
      <section aria-labelledby={`hall-${hall.slug}`} className="flex flex-col overflow-hidden rounded-card border border-card-line bg-surface shadow-card">
        <div className="px-4 pb-3 pt-4">
          <h2 id={`hall-${hall.slug}`} className="text-xl font-semibold">
            <Link to={menuLink} className="hover:underline">{hall.name}</Link>
          </h2>
          <p className="mt-1 text-sm">
            <StatusText status={status} />
            <span className="text-ink-muted tabular">{' · '}{hours}{today?.estimated && ' (usual hours)'}</span>
          </p>
          {mealLine && <p className="mt-3 text-sm font-semibold text-ink-muted">{mealLine}</p>}
        </div>

        {loading ? (
          <div className="space-y-3 px-4 pb-4" aria-hidden="true">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : picks.length ? (
          <ul className="border-t border-line">
            {picks.map(item => <DishRow key={item.id} item={item} showStation to={menuLink} />)}
          </ul>
        ) : (
          <p className="border-t border-line px-4 py-4 text-sm text-ink-muted">{target ? hall.description : 'No more meals today.'}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 border-t border-line px-4">
          <Link to={target ? menuLink : tomorrowLink} className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-brand-text hover:underline">
            {target ? (meal ? `Full ${meal.toLowerCase()} menu` : 'Menus') : 'Tomorrow’s menu'} <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
          <DirectionsLink hall={hallBySlug(hall.slug) ?? hall} className="-mr-2.5" />
        </div>
      </section>
    </MenuContext.Provider>
  );
}

function AccountLine() {
  const { user, available, ready } = useAuth();
  if (!available || !ready || user) return null;
  return (
    <p className="mt-10 text-sm text-ink-muted">
      <Link to="/login" className="font-semibold text-brand-text">Sign in</Link> to rank dishes, log meals and vote.
    </p>
  );
}

export function Home() {
  const { halls, now, source } = useHours();
  const isOpen = h => describeStatus(h.days, now).tone !== 'closed';
  const openCount = halls.filter(isOpen).length;
  const ordered = [...halls.filter(isOpen), ...halls.filter(h => !isOpen(h))];
  usePageTitle('Today’s menus');

  return (
    <>
      <PageHeader title="Today’s menus">
        {formatCampusDate({ weekday: 'long', month: 'long', day: 'numeric' })}.{' '}
        {openCount === 0
          ? 'All three dining halls are closed right now.'
          : openCount === halls.length
            ? 'All three dining halls are open right now.'
            : `${openCount} of the ${halls.length} dining halls are open right now.`}
      </PageHeader>

      {(source === 'bundled' || source === 'server') && (
        <Notice tone="warn" className="mb-6" title="Showing usual hours">
          Live hours could not be loaded, so these are the regular hours and may differ on holidays.
        </Notice>
      )}

      <NoHoursNotice className="mb-6" />

      {/* Open halls first, so the one worth walking to now leads. */}
      <div className="grid gap-4 md:grid-cols-3">
        {ordered.map(hall => <HallColumn key={hall.slug} hall={hall} now={now} />)}
      </div>

      <AccountLine />
    </>
  );
}

export default Home;
