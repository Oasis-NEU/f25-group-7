import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth';
import { resendVerification } from '../backend/account';
import { Button } from './Button';
import { PageHeader } from './primitives';

// The address verification emails come from: the custom SMTP sender when one
// is configured, otherwise Firebase's default noreply address.
const AUTH_DOMAIN = import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN;
const SENDER = import.meta.env?.VITE_EMAIL_SENDER || (AUTH_DOMAIN ? `noreply@${AUTH_DOMAIN}` : null);

/**
 * Shown in place of an account page until the person's @northeastern.edu
 * address is verified. Menus and hours never need an account, so nothing
 * else is held back.
 */
export function VerifyGate({ feature = 'This page' }) {
  const { user, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState('idle');

  if (!user.northeastern) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Northeastern accounts only">
          {feature} needs an @northeastern.edu account. You are signed in as {user.email}.
        </PageHeader>
        <Button variant="secondary" onClick={async () => { await signOut(); navigate('/signup'); }}>Sign out and create one</Button>
      </div>
    );
  }

  async function check() {
    setState('checking');
    const next = await refresh();
    setState(next?.verified ? 'idle' : 'not-yet');
  }

  async function resend() {
    setState('sending');
    try { await resendVerification(); setState('sent'); }
    catch (err) { setState(/too-many|too many/i.test(err?.message ?? '') ? 'throttled' : 'error'); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Verify your email">
        {feature} opens once you confirm <b className="font-semibold text-ink">{user.email}</b>. We send a link when you sign up.
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Button onClick={check} loading={state === 'checking'}>I’ve verified it</Button>
        <Button variant="secondary" onClick={resend} loading={state === 'sending'}>Send the link again</Button>
      </div>
      <p role="status" className="mt-3 min-h-6 text-sm">
        {state === 'not-yet' && 'Not verified yet. Open the link in the email, then try again.'}
        {state === 'sent' && 'Sent. It can take a few minutes to arrive.'}
        {state === 'throttled' && 'Too many links in a short time. Wait a few minutes, then send again.'}
        {state === 'error' && 'The link could not be sent. Try again in a minute.'}
      </p>

      <section aria-labelledby="no-email" className="mt-10 border-t border-line pt-6">
        <h2 id="no-email" className="text-lg font-semibold">No email?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-ink-muted">
          {SENDER && <li>It comes from <b className="font-semibold text-ink break-all">{SENDER}</b>.</li>}
          <li>Look in Junk Email in Outlook.</li>
          <li>Northeastern’s mail filter can hold it in quarantine. Check <a className="font-semibold text-brand-text" href="https://security.microsoft.com/quarantine" target="_blank" rel="noreferrer">security.microsoft.com/quarantine</a> with your Northeastern login and release it.</li>
        </ul>
      </section>
    </div>
  );
}
