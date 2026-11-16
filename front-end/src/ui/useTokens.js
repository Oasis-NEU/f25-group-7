import { useEffect, useState } from 'react';

/**
 * Resolved values of CSS custom properties, kept current across theme
 * changes. Chart libraries draw SVG with literal colours, so they cannot
 * follow `var(--x)` on their own.
 */
export function useTokens(names) {
  const key = names.join(',');
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(key.split(',').map(name => [name, style.getPropertyValue(name).trim()]));
  };
  const [values, setValues] = useState(read);

  useEffect(() => {
    const update = () => setValues(read());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener?.('change', update);
    update();
    return () => { observer.disconnect(); media.removeEventListener?.('change', update); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return values;
}
