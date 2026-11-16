/**
 * Accounts on Firebase Auth. Every function throws an Error whose message is
 * safe to show; see describeAuthError for the wording.
 */
import { firebase, NU_EMAIL } from './firebase.js';

const MESSAGES = {
  'auth/invalid-credential': 'That email and password do not match an account.',
  'auth/wrong-password': 'That email and password do not match an account.',
  'auth/user-not-found': 'That email and password do not match an account.',
  'auth/email-already-in-use': 'An account already uses that email. Sign in instead, or reset the password.',
  'auth/weak-password': 'Choose a longer password: at least 8 characters.',
  'auth/invalid-email': 'That does not look like an email address.',
  'auth/too-many-requests': 'Too many links sent to this account recently. Wait about an hour, then send one more.',
  'auth/quota-exceeded': 'The daily email limit was reached. Try again tomorrow.',
  'auth/network-request-failed': 'The account service could not be reached. Check your connection and try again.',
  'auth/expired-action-code': 'This link has expired. Request a new one.',
  'auth/invalid-action-code': 'This link has already been used or is not valid. Request a new one.',
};

export function describeAuthError(err, fallback = 'Something went wrong. Try again.') {
  return MESSAGES[err?.code] ?? err?.message ?? fallback;
}

async function require() {
  const fb = await firebase();
  if (!fb) throw new Error('Accounts are not set up on this copy of the site.');
  return fb;
}

/** Calls back with the user (or null) now and on every change; returns an unsubscribe. */
export async function watchUser(callback) {
  const fb = await firebase();
  if (!fb) { callback(null); return () => {}; }
  return fb.authApi.onAuthStateChanged(fb.auth, async user => {
    if (!user) { callback(null); return; }
    // Firebase reloads the account on start, so emailVerified can turn true
    // while the saved ID token still says false, and the security rules read
    // the token. Swap in a fresh token before reporting the account verified.
    if (user.emailVerified) {
      const claims = await user.getIdTokenResult().then(r => r.claims).catch(() => null);
      if (claims && !claims.email_verified) await user.getIdToken(true).catch(() => {});
    }
    callback(toUser(user));
  });
}

function toUser(u) {
  return {
    id: u.uid,
    email: u.email,
    name: u.displayName || null,
    verified: u.emailVerified,
    northeastern: Boolean(u.email && NU_EMAIL.test(u.email)),
  };
}

export async function signIn(email, password) {
  const { auth, authApi } = await require();
  try {
    const { user } = await authApi.signInWithEmailAndPassword(auth, email.trim(), password);
    return toUser(user);
  } catch (err) {
    throw new Error(describeAuthError(err));
  }
}

/** Creates the account and sends the verification email; posting waits for it. */
export async function signUp({ name, email, password }) {
  const { auth, authApi } = await require();
  if (!NU_EMAIL.test(email.trim())) throw new Error('Use your @northeastern.edu email.');
  try {
    const { user } = await authApi.createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name?.trim()) await authApi.updateProfile(user, { displayName: name.trim() });
    await authApi.sendEmailVerification(user, { url: `${window.location.origin}/home` });
    return toUser(user);
  } catch (err) {
    throw new Error(describeAuthError(err));
  }
}

export async function resendVerification() {
  const { auth, authApi } = await require();
  if (!auth.currentUser) throw new Error('Sign in first.');
  try {
    await authApi.sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/home` });
  } catch (first) {
    let err = first;
    // A site address Firebase does not list (a preview deploy) rejects the
    // return link; the email still works without one.
    if (/continue-uri|unauthorized-domain/.test(first?.code ?? '')) {
      try { await authApi.sendEmailVerification(auth.currentUser); return; } catch (retry) { err = retry; }
    }
    console.error('Verification email failed', err?.code, err?.message);
    throw new Error(describeAuthError(err));
  }
}

/** Re-reads the account after the person clicks the link in their inbox. */
export async function refreshUser() {
  const { auth } = await require();
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  // The ID token carries email_verified for the security rules; refresh it too.
  await auth.currentUser.getIdToken(true);
  return toUser(auth.currentUser);
}

export async function signOut() {
  const fb = await firebase();
  if (fb) await fb.authApi.signOut(fb.auth);
}

export async function sendPasswordReset(email) {
  const { auth, authApi } = await require();
  try {
    await authApi.sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/login` });
  } catch (err) {
    // Do not reveal whether an account exists for that address.
    if (err?.code === 'auth/user-not-found') return;
    throw new Error(describeAuthError(err));
  }
}

/** Completes a reset from the emailed link's oobCode. */
export async function confirmReset(code, password) {
  const { auth, authApi } = await require();
  try {
    await authApi.confirmPasswordReset(auth, code, password);
  } catch (err) {
    throw new Error(describeAuthError(err));
  }
}
