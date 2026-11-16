// The words carry the status; colour only echoes it.
const TONE = {
  open: 'text-open',
  soon: 'text-warn',
  closed: 'text-ink-subtle',
};

/**
 * A hall's status as words: "Open until 10 PM", "Closing soon, 10 AM",
 * "Closed, opens 7 AM". The words carry the meaning; colour only echoes it.
 */
export function StatusText({ status, className = '', plain = false }) {
  const text = status.tone === 'open'
    ? `Open ${status.detail.replace(/^Until/, 'until')}`
    : status.tone === 'soon'
      ? `Closing soon, ${status.detail.replace(/^Closes /, '')}`
      : `Closed, ${status.detail.charAt(0).toLowerCase()}${status.detail.slice(1)}`;
  return <span className={`font-semibold ${plain ? '' : TONE[status.tone]} ${className}`}>{text}</span>;
}
