import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Card } from '../ui/primitives';
import { ThemeToggle } from '../ui/ThemeToggle';

/** A focused single-column layout for sign-in, sign-up and password pages. */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-card-line px-4 material-bar sm:px-6 lg:px-8">
        <Link to="/home" className="rounded-lg" aria-label="NU Dining, today"><Logo /></Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/home" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" /> Menus
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-6 sm:pt-12">
        <h1 className="text-title font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>}
        <Card className="mt-6 p-5 sm:p-6">{children}</Card>
        {footer && <div className="mt-6 space-y-2 text-center text-sm text-ink-muted">{footer}</div>}
      </main>
    </div>
  );
}
