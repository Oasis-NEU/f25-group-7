import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`bg-surface border border-card-line rounded-card shadow-card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** A toggle chip. Pressed state is exposed to assistive tech, not only by colour. */
export function Chip({ pressed, onClick, icon: Icon, children, className = '', disabled = false }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:cursor-default
        ${pressed
          ? 'bg-ink text-bg'
          : 'bg-surface-2 text-ink-muted hover:text-ink'} ${className}`}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

const TONES = {
  info: { icon: Info, box: 'bg-surface-2 border-line', title: 'text-ink', iconClass: 'text-ink-muted' },
  warn: { icon: AlertTriangle, box: 'bg-warn-soft border-transparent', title: 'text-ink', iconClass: 'text-warn' },
  error: { icon: XCircle, box: 'bg-danger-soft border-transparent', title: 'text-ink', iconClass: 'text-danger' },
  success: { icon: CheckCircle2, box: 'bg-open-soft border-transparent', title: 'text-ink', iconClass: 'text-open' },
};

/** An inline message with an icon, a title and optional detail or action. */
export function Notice({ tone = 'info', title, children, action, className = '', role }) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={role} className={`flex gap-3 rounded-2xl border px-4 py-3.5 ${t.box} ${className}`}>
      <Icon className={`size-5 shrink-0 mt-0.5 ${t.iconClass}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className={`font-semibold ${t.title}`}>{title}</p>}
        {children && <div className="text-ink-muted mt-0.5 leading-relaxed">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-skeleton rounded-lg bg-surface-2 ${className}`} />;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12 sm:py-16">
      {Icon && <Icon className="mb-3 size-8 text-ink-subtle" strokeWidth={1.75} aria-hidden="true" />}
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children && <div className="mt-1.5 max-w-md text-sm text-ink-muted leading-relaxed">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, children, actions }) {
  return (
    <header className="mb-8 sm:mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {children && <div className="mt-2 sm:mt-3 text-base sm:text-lg text-ink-muted max-w-2xl">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Visually hidden but read by screen readers. */
export function VisuallyHidden({ children }) {
  return <span className="sr-only">{children}</span>;
}
