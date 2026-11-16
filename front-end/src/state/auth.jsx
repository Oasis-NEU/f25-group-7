/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isFirebaseConfigured } from '../backend/firebase';
import { refreshUser, signOut as accountSignOut, watchUser } from '../backend/account';
import { PageSpinner } from '../ui/Spinner';
import { AccountsUnavailable } from '../ui/AccountsUnavailable';
import { VerifyGate } from '../ui/VerifyGate';

const AuthContext = createContext({ user: null, ready: true, available: false, canPost: false, signOut: async () => {}, refresh: async () => {} });

/**
 * One source of truth for who is signed in.
 *
 * Firebase restores a saved session locally, so this is usually ready
 * before the first paint finishes. If Firebase cannot load, the app becomes
 * ready after a few seconds and treats the visitor as signed out rather than
 * holding every page on a spinner.
 *
 * canPost: a verified @northeastern.edu account, the only kind the database
 * accepts rankings and votes from.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    let alive = true;
    let stop = () => {};
    const giveUp = setTimeout(() => alive && setReady(true), 4000);
    watchUser(next => {
      if (!alive) return;
      setUser(next);
      setReady(true);
    }).then(unsubscribe => { stop = unsubscribe; if (!alive) unsubscribe(); })
      .catch(err => { console.error('Accounts failed to load', err); if (alive) setReady(true); });
    return () => { alive = false; clearTimeout(giveUp); stop(); };
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    await accountSignOut().catch(err => console.error('Sign out failed', err));
  }, []);

  /** Re-read the account, e.g. after the person verifies their email. */
  const refresh = useCallback(async () => {
    const next = await refreshUser().catch(() => null);
    if (next) setUser(next);
    return next;
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    available: isFirebaseConfigured,
    canPost: Boolean(user?.verified && user?.northeastern),
    signOut,
    refresh,
  }), [user, ready, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Gate a page behind sign-in, keeping the destination for after login. */
export function RequireAuth({ children, feature }) {
  const { user, ready, available, canPost } = useAuth();
  const location = useLocation();

  if (!available) return <AccountsUnavailable feature={feature} />;
  if (!ready) return <PageSpinner label="Checking your account" />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  // Account pages need a verified @northeastern.edu address, as the
  // database rules do; signing in alone is not enough.
  if (!canPost) return <VerifyGate feature={feature} />;
  return children;
}

/** Display name for the signed-in user. */
export function displayName(user) {
  return user?.name?.trim() || user?.email || 'Account';
}

/** Only allow same-site paths after login, never an external redirect. */
export function safeNext(value, fallback = '/home') {
  if (typeof value !== 'string') return fallback;
  return value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
