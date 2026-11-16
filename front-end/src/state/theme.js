import { useCallback, useEffect, useState } from 'react';

const KEY = 'nu-dining:theme';
const COLORS = { dark: '#0F0F10', light: '#F4F4F5' };

const current = () => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme]);
  try { localStorage.setItem(KEY, theme); } catch { /* private mode: the choice lasts this visit */ }
}

/**
 * The app is dark unless the visitor picks light. index.html applies the
 * saved choice before first paint; this keeps React in step and saves changes.
 */
export function useTheme() {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(current()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(() => apply(current() === 'dark' ? 'light' : 'dark'), []);
  return { theme, toggle };
}
