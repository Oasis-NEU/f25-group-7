import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronDown, House, LogIn, LogOut, MessageSquarePlus, Star, Trophy, Activity } from 'lucide-react';
import { useFeedback } from '../state/feedback';
import { ThemeToggle } from '../ui/ThemeToggle';
import { resendVerification } from '../backend/account';
import { Logo } from '../ui/Logo';
import { buttonClass } from '../ui/buttonClass';
import { displayName, useAuth } from '../state/auth';
import { OFFICIAL_SITE } from '../data/dineoncampus';

const NAV = [
  { to: '/home', label: 'Today', icon: House, match: ['/home', '/menu'] },
  { to: '/hours', label: 'Hours', icon: CalendarClock, match: ['/hours'] },
  { to: '/rankings', label: 'Ratings', icon: Star, match: ['/rankings'] },
  { to: '/vote', label: 'Vote', icon: Trophy, match: ['/vote'] },
  { to: '/tracker', label: 'Tracker', icon: Activity, match: ['/tracker'] },
];

const isActive = (item, pathname) => item.match.some(prefix => pathname.startsWith(prefix));

function AccountMenu() {
  const { user, ready, available, signOut } = useAuth();
  const feedback = useFeedback();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!available || !ready) return null;

  if (!user) {
    return (
      <Link to="/login" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
        <LogIn className="size-4" aria-hidden="true" /> Sign in
      </Link>
    );
  }

  const name = displayName(user);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-xl pl-1.5 pr-2 hover:bg-surface-2"
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-brand-ink" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-36 truncate text-sm font-semibold sm:inline">{name}</span>
        <ChevronDown className={`size-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-card-line bg-surface shadow-card animate-rise">
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs text-ink-muted">Signed in as</p>
            <p className="truncate text-sm font-semibold">{user.email}</p>
          </div>
          <div className="p-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); feedback.open(); }}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-surface-2"
            >
              <MessageSquarePlus className="size-4" aria-hidden="true" /> Send feedback
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={async () => { await signOut(); navigate('/home'); }}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shown to signed-in people whose Northeastern email is not verified yet,
 * since rankings and votes need a verified account.
 */
// Account pages show the full verify screen instead, so the banner steps aside there.
const GATED = ['/rankings', '/tracker'];

function VerifyBanner() {
  const { user, refresh } = useAuth();
  const { pathname } = useLocation();
  const [state, setState] = useState('idle');
  if (!user || user.verified || !user.northeastern) return null;
  if (GATED.some(p => pathname.startsWith(p))) return null;
  return (
    <div className="border-b border-card-line bg-surface">
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <p className="min-w-0 flex-1">
          Verify your email to rank dishes and vote. The link went to <b className="font-semibold">{user.email}</b>.
          <span role="status" className="ml-1 text-ink-muted">
            {state === 'not-yet' && 'Not verified yet.'}
            {state === 'sent' && 'Sent again.'}
            {!['idle', 'checking', 'not-yet', 'sent'].includes(state) && state}
          </span>
        </p>
        <div className="flex gap-4 font-semibold">
          <button type="button" className="min-h-11 underline-offset-4 hover:underline" disabled={state === 'checking'}
            onClick={async () => { setState('checking'); const u = await refresh(); setState(u?.verified ? 'idle' : 'not-yet'); }}>
            {state === 'checking' ? 'Checking…' : 'I’ve verified it'}
          </button>
          <button type="button" className="min-h-11 text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            onClick={async () => { try { await resendVerification(); setState('sent'); } catch (err) { setState(err.message); } }}>
            Send again
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const feedback = useFeedback();
  return (
    <footer className="mt-16 w-full border-t border-card-line bg-surface text-sm text-ink-muted">
      <div className="flex w-full flex-col gap-3 px-4 pb-28 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:pb-6 lg:px-8">
        <p>Menus and hours come live from DineOnCampus. Times can change during breaks and holidays.</p>
        <div className="flex flex-wrap items-center gap-x-5">
          <button type="button" onClick={() => feedback.open()} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-text hover:underline">
            <MessageSquarePlus className="size-4" aria-hidden="true" /> Send feedback
          </button>
          <a href={OFFICIAL_SITE} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">
            Official dining site
          </a>
        </div>
      </div>
    </footer>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);

  // Move focus to the page on navigation, so screen readers announce the new
  // page instead of staying on the link that was activated.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-bg">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-card-line material-bar">
        <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/home" className="rounded-lg" aria-label="NU Dining, today">
            <Logo />
          </Link>
          <nav aria-label="Main" className="ml-4 hidden items-stretch gap-1 self-stretch md:flex">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={isActive(item, pathname) ? 'page' : undefined}
                className={`relative flex h-16 items-center px-3 text-sm transition-colors
                  ${isActive(item, pathname) ? 'font-semibold text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-brand' : 'font-medium text-ink-muted hover:text-ink'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>
      <VerifyBanner />

      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 pt-8 sm:pt-12 outline-none">
        <Outlet />
      </main>

      <Footer />

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-card-line material-bar pb-safe md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(item => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors
                    ${active ? 'text-brand-text' : 'text-ink-muted hover:text-ink'}`}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
