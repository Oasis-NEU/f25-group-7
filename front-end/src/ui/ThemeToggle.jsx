import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../state/theme';

/** Switches between the default dark appearance and light; the choice is remembered. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="grid size-11 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
