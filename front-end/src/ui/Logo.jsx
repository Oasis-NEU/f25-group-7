/**
 * The NU Dining mark, a bowl with a flame, redrawn as SVG so it works on
 * light and dark backgrounds. The bowl takes the text colour; the flame is
 * always brand red.
 */
export function LogoMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        d="M17.6 3.5c4.6 3.4 6.4 7.6 5.3 11.3-.6 2-2 3.5-3.6 4.4.9-1.7 1-3.6.2-5.3-.5 2-1.9 3.3-3.6 4-1.4-2.4-1-5.6 1.1-8.1-2.9 1.2-5 4.2-5 7.6 0 1 .2 1.8.5 2.6-2.1-1.4-3-4-2.4-6.7.9-4.1 4.6-6.4 7.5-9.8Z"
        style={{ fill: 'var(--brand)' }}
      />
      <path d="M3.5 18.5h25a12.5 9.5 0 0 1-25 0Z" fill="currentColor" />
      <rect x="11" y="27.5" width="10" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">NU Dining</span>
    </span>
  );
}
