import { Navigation } from 'lucide-react';
import { directionsUrl } from '../data/halls';

/** Opens walking directions to a hall in the visitor's maps app. */
export function DirectionsLink({ hall, className = '' }) {
  return (
    <a
      href={directionsUrl(hall)}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-text hover:underline ${className}`}
    >
      <Navigation className="size-4" aria-hidden="true" />
      Directions<span className="sr-only"> to {hall.name} (opens maps)</span>
    </a>
  );
}
