import { Link } from 'react-router-dom';
import { hallBySlug } from '../data/halls';
import { DirectionsLink } from '../ui/Directions';
import { RefreshCw } from 'lucide-react';
import { useHours } from '../state/hours';
import { StatusText } from '../ui/HallStatus';
import { describeStatus, noHoursListed, shortTime } from '../ui/status';
import { Button } from '../ui/Button';
import { Notice, PageHeader } from '../ui/primitives';
import { usePageTitle } from '../lib/usePageTitle';
import { formatIsoDate, relativeDayLabel } from '../functions/campusTime';
import { FALLBACK_UPDATED, mergeSlots } from '../functions/hours';

function ago(iso) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}

/** One line saying where the hours on screen came from. */
export function HoursSourceNote({ className = '' }) {
  const { source, halls, loading } = useHours();
  const newest = halls.map(h => h.fetchedAt).filter(Boolean).sort().at(-1);
  let text;
  // While the live schedule is loading the page already shows usable hours,
  // and the Refresh button shows the wait, so the note stays quiet.
  if (source === 'pending' || loading) return null;
  if (source === 'live') text = 'Hours are live from DineOnCampus.';
  else if (source === 'cache') text = `Live hours are unavailable. Showing the copy saved on this device ${ago(newest) ?? ''}.`;
  else if (source === 'server') text = 'Live hours are unavailable. Showing the last stored weekly schedule.';
  else text = `Live hours are unavailable. Showing the regular schedule last checked on ${formatIsoDate(FALLBACK_UPDATED, { month: 'long', day: 'numeric', year: 'numeric' })}.`;
  return <p className={`text-sm text-ink-muted ${className}`} role="status">{text}</p>;
}


/** Explains an empty week instead of implying every hall is shut for good. */
export function NoHoursNotice({ className = '' }) {
  const { halls, source } = useHours();
  if (!noHoursListed(halls, source)) return null;
  return (
    <Notice tone="info" className={className} title="No hours are listed for the coming week">
      That usually means a break, or that the next schedule has not been published yet. Check the
      official dining site for updates.
    </Notice>
  );
}

function Times({ day }) {
  const slots = day.closed ? [] : mergeSlots(day.slots);
  if (!slots.length) return <span className="text-ink-muted">Closed</span>;
  return slots.map(slot => (
    <span key={slot.opens} className="block whitespace-nowrap">{shortTime(slot.opens)}–{shortTime(slot.closes)}</span>
  ));
}

const LABELS = [
  ['Vegan', 'No animal products of any kind: no meat, fish, dairy or eggs.'],
  ['Vegetarian', 'No meat, poultry, fish or seafood. May contain eggs or dairy.'],
  ['Avoiding gluten', 'Made without gluten-containing ingredients. Not certified gluten-free: shared kitchens mean cross-contact is possible.'],
  ['High protein', 'At least 15 g of protein per serving, from the dining team’s nutrition data.'],
];

export default function Hours() {
  const { halls, now, refresh, loading, source } = useHours();
  const anyEstimated = halls.some(h => h.days.some(d => d.estimated));
  usePageTitle('Dining hall hours', 'Opening hours for Stetson East, International Village and 60 Belvidere for the next seven days, live from DineOnCampus.');

  return (
    <>
      <PageHeader
        title="Dining hall hours"
        actions={(
          <Button variant="secondary" size="sm" onClick={refresh} loading={loading}>
            {!loading && <RefreshCw className="size-4" aria-hidden="true" />} Refresh
          </Button>
        )}
      >
        The next seven days at the three residential halls.
      </PageHeader>

      {source !== 'live' && source !== 'pending' && anyEstimated && (
        <Notice tone="warn" className="mb-6" title="Some days show usual hours">
          Live hours could not be loaded, so some days repeat the regular weekly pattern. Check the
          official site before a holiday or break.
        </Notice>
      )}

      <NoHoursNotice className="mb-6" />

      {/* Phones: one hall at a time, so no hall hides off the edge. */}
      {/* One card per hall, the next seven days as rows; three across on wide screens. */}
      <div className="grid items-start gap-4 md:grid-cols-3">
        {halls.map(hall => (
          <section key={hall.slug} aria-labelledby={`hours-${hall.slug}`} className="overflow-hidden rounded-card border border-card-line bg-surface shadow-card">
            <div className="px-4 pb-2 pt-4">
              <h2 id={`hours-${hall.slug}`} className="text-lg font-semibold">
                <Link to={`/menu/${hall.slug}`} className="hover:underline">{hall.name}</Link>
              </h2>
              <StatusText status={describeStatus(hall.days, now)} className="text-sm" />
              <DirectionsLink hall={hallBySlug(hall.slug) ?? hall} className="mt-1" />
            </div>
            <dl className="border-t border-line text-sm tabular">
              {hall.days.map((day, i) => (
                <div key={day.date} className="flex min-h-12 items-baseline justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
                  <dt className={i === 0 ? 'font-semibold' : 'text-ink-muted'}>
                    {relativeDayLabel(day.date)}
                    {day.special && <span className="ml-2 text-xs font-semibold text-ink">Special hours</span>}
                  </dt>
                  <dd className={`text-right ${i === 0 ? 'font-semibold' : ''}`}><Times day={day} /></dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <HoursSourceNote className="mt-4" />

      <section aria-labelledby="labels-heading" className="mt-12 max-w-3xl">
        <h2 id="labels-heading" className="px-1 text-xl font-semibold">About the dietary labels</h2>
        <p className="mt-1 px-1 text-sm text-ink-muted">From the dining team’s data. With a serious allergy, confirm with staff.</p>
        <dl className="mt-3 overflow-hidden rounded-card border border-card-line bg-surface shadow-card">
          {LABELS.map(([term, definition]) => (
            <div key={term} className="grid gap-1 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-semibold">{term}</dt>
              <dd className="text-sm text-ink-muted">{definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
