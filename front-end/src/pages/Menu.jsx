import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, RefreshCw, Search, UtensilsCrossed, WifiOff, X } from 'lucide-react';
import { loadMenu, menuNotice, peekLikelyMenu } from '../data/menu';
import { curateMenu, stablePicks } from '../data/curate';
import { useNewToday } from '../lib/useNewToday';
import { HALLS, hallBySlug, slugify } from '../data/halls';
import { OFFICIAL_SITE } from '../data/dineoncampus';
import { useHours } from '../state/hours';
import { StatusText } from '../ui/HallStatus';
import { describeStatus } from '../ui/status';
import { Button, ButtonLink } from '../ui/Button';
import { buttonClass } from '../ui/buttonClass';
import { Chip, EmptyState, Notice, Skeleton } from '../ui/primitives';
import { BuildBars, DishSheet, PicksShelf, StationCard, StationRail } from '../ui/menu/DishList';
import { ALLERGENS, DIET_FILTERS, itemMatches, newProof } from '../ui/menu/filters';
import { usePageTitle } from '../lib/usePageTitle';
import { useCampusScores, useRanks } from '../state/ranks';
import { dishId } from '../data/ranking';
import { MenuContext } from '../ui/menu/menuContext';
import { RankSheet } from '../ui/rank/RankSheet';
import { addDays, campusDate, formatIsoDate, relativeDayLabel } from '../functions/campusTime';

/* Data --------------------------------------------------------------------- */

function useMenu(hallSlug, date, mealSlug) {
  const [state, setState] = useState(() => ({ result: peekLikelyMenu(hallSlug, date, mealSlug), loading: true }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ result: peekLikelyMenu(hallSlug, date, mealSlug), loading: true });

    loadMenu({ hallSlug, date, mealSlug, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setState({ result, loading: false }); })
      .catch(err => {
        if (controller.signal.aborted) return;
        console.error('Loading the menu failed', err);
        setState(prev => ({ result: prev.result ?? { status: 'unavailable', stations: [], periods: [], errors: [] }, loading: false }));
      });

    return () => controller.abort();
  }, [hallSlug, date, mealSlug, attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);
  return { ...state, retry };
}

/* Pieces ------------------------------------------------------------------- */


function MenuSkeleton() {
  return (
    <div role="status" aria-label="Loading the menu" className="space-y-4">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="border-b border-line pb-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function SourceNotice({ result }) {
  const kind = menuNotice(result);
  if (!kind) return null;
  if (kind === 'server') {
    const old = result.servedDate && result.servedDate !== result.date;
    return (
      <Notice tone="warn" className="mb-5" title="Live menu unavailable">
        {old
          ? `Showing the last stored menu, from ${formatIsoDate(result.servedDate, { weekday: 'long', month: 'short', day: 'numeric' })}. Today's may differ.`
          : 'Showing the copy stored on our server. It may be missing late changes.'}
      </Notice>
    );
  }
  const saved = result.savedAt ? new Date(result.savedAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : null;
  return (
    <Notice tone="warn" className="mb-5" title="You're seeing a saved copy">
      DineOnCampus could not be reached, so this is the copy this device saved{saved ? ` on ${saved}` : ''}.
    </Notice>
  );
}

/* Page --------------------------------------------------------------------- */

const DEFAULT_MEALS = [
  { slug: 'breakfast', name: 'Breakfast' },
  { slug: 'lunch', name: 'Lunch' },
  { slug: 'dinner', name: 'Dinner' },
];

export default function Menu() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const hall = hallBySlug(params.hall);
  const today = campusDate();
  const requestedDate = searchParams.get('date');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate ?? '') ? requestedDate : today;
  const mealSlug = params.meal ? slugify(params.meal) : null;

  const { result, loading, retry } = useMenu(hall?.slug ?? params.hall, date, mealSlug);
  const fresh = useNewToday(result);
  const { halls, now } = useHours();
  const hallHours = halls.find(h => h.slug === hall?.slug);

  const [query, setQuery] = useState('');
  const [diets, setDiets] = useState(() => new Set());
  const [avoid, setAvoid] = useState(() => new Set());
  const [showAllergens, setShowAllergens] = useState(false);
  const [newOnly, setNewOnly] = useState(false);

  const toggle = (setter, key) => setter(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const clearFilters = () => { setQuery(''); setDiets(new Set()); setAvoid(new Set()); setNewOnly(false); };

  const stations = useMemo(() => result?.stations ?? [], [result]);
  const curated = useMemo(() => curateMenu(stations, { newKeys: fresh.keys }), [stations, fresh.keys]);
  const picksInOrder = useMemo(() => stablePicks(stations, fresh.keys), [stations, fresh.keys]);
  const filtering = Boolean(query.trim() || diets.size || avoid.size || newOnly);

  const view = useMemo(() => {
    const match = item => itemMatches(item, { query, diets, avoid }) && (!newOnly || item.isNew);
    const byName = new Map(curated.stations.map(s => [s.name, s]));
    const picks = picksInOrder.filter(match).slice(0, 5).map(item => ({ ...item, stationLabel: byName.get(item.station)?.label ?? item.station }));
    const sections = curated.stations
      .filter(s => s.kind !== 'build')
      .map(s => ({ ...s, dishes: s.dishes.filter(match), extras: s.extras.filter(match) }))
      .filter(s => s.dishes.length || (filtering && s.extras.length));
    const bars = curated.stations
      .filter(s => s.kind === 'build')
      .map(s => ({ ...s, extras: s.extras.filter(match) }))
      .filter(s => s.extras.length);
    return {
      picks,
      plated: sections.filter(s => s.kind === 'dishes'),
      sweets: sections.filter(s => s.kind === 'sweets'),
      bars,
      shown: sections.reduce((n, s) => n + s.dishes.length + (filtering ? s.extras.length : 0), 0) + (filtering ? bars.reduce((n, b) => n + b.extras.length, 0) : 0),
      dishes: sections.reduce((n, s) => n + s.dishes.length, 0),
      parts: sections.reduce((n, s) => n + s.extras.length, 0) + bars.reduce((n, b) => n + b.extras.length, 0),
    };
  }, [curated, picksInOrder, query, diets, avoid, filtering, newOnly]);

  // Community: your scores, campus scores for every dish on this menu, and
  // the ranking sheet. Rows built from them only appear when there is data.
  const { mine } = useRanks();
  const allDishes = useMemo(
    () => curated.stations.flatMap(s => s.dishes.map(d => ({ ...d, stationLabel: s.label }))),
    [curated],
  );
  const scoreIds = useMemo(() => (hall ? allDishes.map(d => dishId(hall.slug, d.name)) : []), [allDishes, hall]);
  const scores = useCampusScores(scoreIds);
  const [ranking, setRanking] = useState(null);
  const openRank = useCallback(item => {
    if (!hall) return;
    setRanking({
      id: dishId(hall.slug, item.name), name: item.name, hall: hall.slug,
      station: item.station ?? '', stationLabel: item.stationLabel ?? item.station, course: item.course ?? 'main',
    });
  }, [hall]);
  const [detail, setDetail] = useState(null);
  const rankFromSheet = useCallback(item => { setDetail(null); openRank(item); }, [openRank]);
  const menuContext = useMemo(
    () => ({ hall: hall?.slug ?? null, scores, mine, rank: rankFromSheet, show: setDetail }),
    [hall, scores, mine, rankFromSheet],
  );
  const yourFavorites = useMemo(() => {
    if (!hall) return [];
    return allDishes
      .map(d => ({ d, m: mine(dishId(hall.slug, d.name)) }))
      .filter(x => x.m?.bucket === 'loved')
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, 5)
      .map(x => x.d);
  }, [allDishes, mine, hall]);
  // Campus favorites: dishes students score in the "loved" range, best
  // first, leaving out any already in your own row so nothing repeats.
  const campusFavorites = useMemo(() => {
    if (!hall) return [];
    const yours = new Set(yourFavorites.map(d => d.id));
    return allDishes
      .map(d => ({ d, s: scores[dishId(hall.slug, d.name)] }))
      .filter(x => x.s?.score != null && x.s.score >= 6.8 && !yours.has(x.d.id) && itemMatches(x.d, { query, diets, avoid }) && (!newOnly || x.d.isNew))
      .sort((a, b) => b.s.score - a.s.score)
      .slice(0, 5)
      .map(x => x.d);
  }, [allDishes, scores, hall, query, diets, avoid, yourFavorites, newOnly]);

  const periods = result?.periods?.length ? result.periods : DEFAULT_MEALS;
  const activeMeal = result?.period?.slug ?? mealSlug;
  // The bill: dishes you loved, then campus favorites, then the picks, with
  // no dish twice. They fill the shelf of picks at the top.
  const billing = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const d of [...yourFavorites, ...(campusFavorites.length >= 2 ? campusFavorites : []), ...view.picks]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      out.push(d);
    }
    return out;
  }, [yourFavorites, campusFavorites, view.picks]);
  const shelf = billing.slice(0, 8);
  const mealName = result?.period?.name ?? periods.find(p => p.slug === activeMeal)?.name ?? 'Menu';
  const dayWord = relativeDayLabel(date, today);
  usePageTitle(
    hall ? `${hall.name} ${mealName.toLowerCase()}, ${dayWord.toLowerCase()}` : 'Menu',
    hall ? `What ${hall.name} is serving for ${mealName.toLowerCase()} ${dayWord.toLowerCase()}, with calories, protein, dietary labels and allergens.` : undefined,
  );

  if (!hall) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="We don't know that dining hall"
        action={HALLS.map(h => <ButtonLink key={h.slug} to={`/menu/${h.slug}`} variant="secondary">{h.name}</ButtonLink>)}
      >
        The link may be out of date. These are the three residential halls.
      </EmptyState>
    );
  }

  const dateQuery = date === today ? '' : `?date=${date}`;
  const status = hallHours ? describeStatus(hallHours.days, now) : null;
  const showSkeleton = loading && !(result?.status === 'ok');
  const ready = result?.status === 'ok';
  const newCount = curated.stations.reduce((n, s) => n + s.dishes.filter(d => d.isNew).length, 0);
  const proof = newProof(fresh.compared, mealName);
  const statusLine = (
    <>
      {status && date === today && <><StatusText status={status} /> · </>}
      {formatIsoDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
    </>
  );

  const anchors = [
    ...view.plated.map(s => ({ ...s, count: s.dishes.length })),
    ...(view.bars.length ? [{ name: 'build-your-own', label: 'Build your own', count: view.bars.length, unit: 'bar' }] : []),
    ...view.sweets.map(s => ({ ...s, count: s.dishes.length })),
  ];

  return (
    <MenuContext.Provider value={menuContext}>
    <div className="mx-auto max-w-5xl">
      <h1 className="sr-only">{hall.name}, {mealName.toLowerCase()} {dayWord.toLowerCase()}</h1>

      {/* Hall switch keeps the chosen day and meal. */}
      <nav aria-label="Dining hall" className="mb-3">
        <ul className="flex rounded-full bg-surface-2 p-1">
          {HALLS.map(h => {
            const active = h.slug === hall.slug;
            return (
              <li key={h.slug} className="min-w-0 flex-1">
                <Link
                  to={`/menu/${h.slug}${activeMeal ? `/${activeMeal}` : ''}${dateQuery}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-full px-2 text-center text-sm leading-tight transition-colors
                    ${active ? 'bg-surface font-semibold text-ink shadow-card ring-1 ring-card-line' : 'font-medium text-ink-muted hover:text-ink'}`}
                >
                  <span className="sm:hidden">{h.shortName}</span><span className="hidden sm:inline">{h.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Day strip: today and the next six days. */}
      <nav aria-label="Day" className="-mx-4 mb-1 overflow-x-auto px-4 scrollbar-none">
        <ul className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map(d => {
            const active = d === date;
            return (
              <li key={d} className="shrink-0">
                <Link
                  to={`/menu/${hall.slug}${mealSlug ? `/${mealSlug}` : ''}${d === today ? '' : `?date=${d}`}`}
                  aria-current={active ? 'date' : undefined}
                  className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-xl px-2.5 transition-colors
                    ${active ? 'bg-ink text-bg' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`}
                >
                  <span className="text-xs font-semibold leading-none">{d === today ? 'Today' : formatIsoDate(d, { weekday: 'short' })}</span>
                  <span className="mt-1 text-sm font-semibold leading-none tabular">{formatIsoDate(d, { day: 'numeric' })}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Meals actually served that day, once known. */}
      <nav aria-label="Meal" className="mb-4 border-b border-line">
        <ul className="flex">
          {periods.map(p => {
            const active = p.slug === activeMeal;
            return (
              <li key={p.slug} className="flex-1 sm:flex-none">
                <Link
                  to={`/menu/${hall.slug}/${p.slug}${dateQuery}`}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-11 items-center justify-center px-4 text-base transition-colors
                    ${active ? 'font-semibold text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:bg-brand' : 'text-ink-muted hover:text-ink'}`}
                >
                  {p.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="mb-5 text-sm text-ink-muted">{statusLine}</p>

      <SourceNotice result={result} />

      {showSkeleton && <MenuSkeleton />}

      {!showSkeleton && result?.status === 'ok' && (
        <div key={`${hall.slug}|${date}|${activeMeal}`} className="animate-fade">
          {/* Search and filters. */}
          <div className="mb-8 space-y-2">
            <div className="relative">
              <label htmlFor="menu-search" className="sr-only">Search this menu</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
              <input
                id="menu-search" type="search" value={query} autoComplete="off"
                disabled={!ready}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${mealName.toLowerCase()}`}
                className="min-h-11 w-full rounded-full bg-surface-2 pl-11 pr-11 text-base placeholder:text-ink-subtle focus:outline-2 focus:outline-brand-text disabled:opacity-60"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search"
                  className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:text-ink">
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
            </div>
            <div role="group" aria-label="Filters" className="relative -mx-4 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
              {DIET_FILTERS.map(f => (
                <Chip key={f.key} disabled={!ready} pressed={diets.has(f.key)} onClick={() => toggle(setDiets, f.key)}>{f.label}</Chip>
              ))}
              {fresh.status === 'ready' && newCount > 0 && (
                <Chip disabled={!ready} pressed={newOnly} onClick={() => setNewOnly(v => !v)}>New today · {newCount}</Chip>
              )}
              <Chip disabled={!ready} pressed={showAllergens || avoid.size > 0} onClick={() => setShowAllergens(v => !v)}>
                {avoid.size ? `Avoiding ${avoid.size} allergen${avoid.size === 1 ? '' : 's'}` : 'Allergens'}
              </Chip>
            </div>
            {showAllergens && (
              <div className="rounded-card bg-surface-2 p-4">
                <p className="text-sm font-semibold">Hide dishes that contain</p>
                <div role="group" aria-label="Allergens to avoid" className="mt-3 flex flex-wrap gap-2">
                  {ALLERGENS.map(a => <Chip key={a} pressed={avoid.has(a)} onClick={() => toggle(setAvoid, a)}>{a}</Chip>)}
                </div>
                <p className="mt-3 text-sm text-ink-muted">Based on the allergens the dining team lists. Kitchens are shared, so ask staff if an allergy is serious.</p>
              </div>
            )}
          </div>

          {!filtering && (
            <PicksShelf
              title={`${mealName} picks`}
              note={fresh.status === 'ready' && newCount > 0 ? `See all ${newCount} new today` : null}
              noteDetail={proof}
              onNote={() => setNewOnly(true)}
              items={shelf}
            />
          )}

          <StationRail stations={anchors.map(s => ({ name: s.name, label: s.label, count: s.count, unit: s.unit }))} />

          <p className="mb-6 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted" role="status">
            {filtering
              ? (newOnly && !query.trim() && !diets.size && !avoid.size
                ? `${view.dishes} ${view.dishes === 1 ? 'dish is' : 'dishes are'} new today${view.bars.length ? `, plus new ingredients at ${view.bars.length} build-your-own ${view.bars.length === 1 ? 'bar' : 'bars'}` : ''}.`
                : `${view.dishes} ${view.dishes === 1 ? 'dish' : 'dishes'}${view.parts ? ` and ${view.parts} ${view.parts === 1 ? 'side or ingredient' : 'sides and ingredients'}` : ''} match.`)
              : `${view.dishes} ${view.dishes === 1 ? 'dish' : 'dishes'} at ${view.plated.length + view.sweets.length} stations${view.bars.length ? `, plus ${view.bars.length} build-your-own ${view.bars.length === 1 ? 'bar' : 'bars'}` : ''}.`}
            {filtering && <button type="button" onClick={clearFilters} className="min-h-11 font-semibold text-brand-text">Clear filters</button>}
          </p>

          {view.shown === 0 && filtering ? (
            <EmptyState icon={Search} title="Nothing matches those filters"
              action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>
              Try removing a filter or searching for something else.
            </EmptyState>
          ) : (
            <div className="space-y-7 lg:columns-2 lg:gap-6 lg:space-y-0 [&>*]:lg:mb-7 [&>*]:lg:break-inside-avoid">
              {/* Two independent columns on wide screens: cards stack top to bottom, so short and long stations never leave gaps. */}
              {view.plated.map(station => <StationCard key={`${station.name}|${filtering}`} station={station} expanded={filtering} />)}
              <BuildBars key={`bars|${filtering}`} bars={view.bars} expanded={filtering} />
              {view.sweets.map(station => <StationCard key={`${station.name}|${filtering}`} station={station} expanded={filtering} />)}
            </div>
          )}
        </div>
      )}

      {!showSkeleton && result && result.status !== 'ok' && (
        <MenuEmpty result={result} hall={hall} date={date} dayWord={dayWord.toLowerCase()} onRetry={retry} retrying={loading} dateQuery={dateQuery} mealSlug={mealSlug} />
      )}
      <DishSheet item={detail} open={Boolean(detail)} onClose={() => setDetail(null)} periodSlug={result?.period?.slug} />
      <RankSheet dish={ranking} open={Boolean(ranking)} onClose={() => setRanking(null)} />
    </div>
    </MenuContext.Provider>
  );
}

function MenuEmpty({ result, hall, date, dayWord, onRetry, retrying, dateQuery, mealSlug }) {
  const mealName = mealSlug ? mealSlug.replace(/-/g, ' ') : null;
  const official = (
    <a href={OFFICIAL_SITE} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary' })}>
      Official site <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  );

  if (result.status === 'not-served') {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title={`${hall.name} isn't serving ${mealName ? mealName.toLowerCase() : 'that meal'} ${dayWord}`}
        action={result.periods.map(p => (
          <ButtonLink key={p.slug} to={`/menu/${hall.slug}/${p.slug}${dateQuery}`} variant="secondary">{p.name}</ButtonLink>
        ))}
      >
        {result.periods.length ? `Here's what it is serving ${dayWord}:` : null}
      </EmptyState>
    );
  }

  if (result.status === 'closed') {
    return (
      <EmptyState icon={UtensilsCrossed} title={`${hall.name} is closed ${dayWord}`}
        action={<ButtonLink to="/hours" variant="secondary">See all hours</ButtonLink>}>
        No meals are scheduled for {formatIsoDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}.
      </EmptyState>
    );
  }

  if (result.status === 'no-menu') {
    return (
      <EmptyState icon={UtensilsCrossed} title={`No menu posted for ${dayWord} yet`}
        action={<>{date !== campusDate() && <ButtonLink to={`/menu/${hall.slug}`} variant="secondary">Today's menu</ButtonLink>}{official}</>}>
        Menus usually appear a few days ahead. Check back later, or try another meal.
      </EmptyState>
    );
  }

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <EmptyState
      icon={offline ? WifiOff : UtensilsCrossed}
      title={offline ? "You're offline" : "The menu couldn't be loaded"}
      action={(
        <>
          <Button onClick={onRetry} loading={retrying}>{!retrying && <RefreshCw className="size-4" aria-hidden="true" />} Try again</Button>
          {official}
        </>
      )}
    >
      {offline
        ? 'Reconnect to load the latest menu. Menus you have opened before on this device appear here when available.'
        : 'DineOnCampus did not respond and no saved copy is available. This is usually brief.'}
    </EmptyState>
  );
}
