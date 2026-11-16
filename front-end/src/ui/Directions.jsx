import { Footprints, TrainFront } from 'lucide-react';
import { directionsUrl } from '../data/halls';

const MODES = [
  { mode: 'walk', label: 'Walk', icon: Footprints, spoken: 'Walking directions' },
  { mode: 'transit', label: 'Transit', icon: TrainFront, spoken: 'Public transit directions' },
];

/**
 * Directions to a hall, one tap each: walking or public transit (the T and
 * buses), opening the visitor's maps app. Both stay visible; nothing to expand.
 */
export function DirectionsLink({ hall, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {MODES.map(({ mode, label, icon: Icon, spoken }) => (
        <a
          key={mode}
          href={directionsUrl(hall, mode)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-surface-2"
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
          <span className="sr-only">: {spoken.toLowerCase()} to {hall.name} (opens maps)</span>
        </a>
      ))}
    </span>
  );
}
