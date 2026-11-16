import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isFirebaseConfigured } from '../backend/firebase';
import { sendPasswordReset } from '../backend/account';
import { AuthLayout } from '../layout/AuthLayout';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Notice } from '../ui/primitives';
import { AccountsUnavailable } from '../ui/AccountsUnavailable';
import { usePageTitle } from '../lib/usePageTitle';

export default function Reset() {
  usePageTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isFirebaseConfigured) return <AuthLayout title="Reset your password"><AccountsUnavailable feature="Resetting a password" /></AuthLayout>;

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
      footer={<p>Remembered it? <Link to="/login" className="font-semibold text-brand-text">Sign in</Link></p>}
    >
      {sent ? (
        <Notice tone="success" role="status" title="Check your email">
          If an account exists for {email.trim()}, a reset link is on its way. It can take a minute to arrive.
        </Notice>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && <Notice tone="error" role="alert" title={error} />}
          <Field label="Email" type="email" autoComplete="email" inputMode="email" required value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@northeastern.edu" />
          <Button type="submit" block size="lg" loading={loading}>{loading ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
