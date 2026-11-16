import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isFirebaseConfigured } from '../backend/firebase';
import { confirmReset } from '../backend/account';
import { AuthLayout } from '../layout/AuthLayout';
import { Button } from '../ui/Button';
import { PasswordField } from '../ui/Field';
import { Notice } from '../ui/primitives';
import { AccountsUnavailable } from '../ui/AccountsUnavailable';
import { usePageTitle } from '../lib/usePageTitle';

const MIN_PASSWORD = 8;

export default function SetPass() {
  usePageTitle('Choose a new password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Firebase's reset email links here with ?mode=resetPassword&oobCode=… once the
  // project's email action URL points at /reset-password.
  const [params] = useSearchParams();
  const code = params.get('oobCode');

  if (!isFirebaseConfigured) return <AuthLayout title="Choose a new password"><AccountsUnavailable feature="Resetting a password" /></AuthLayout>;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) { setError(`Use at least ${MIN_PASSWORD} characters.`); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    if (!code) { setError('Open the link from your password reset email to choose a new password.'); return; }
    setLoading(true);
    try {
      await confirmReset(code, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      footer={<p>Need a new link? <Link to="/forgot" className="font-semibold text-brand-text">Send another</Link></p>}
    >
      {done ? (
        <Notice tone="success" role="status" title="Password updated"
          action={<Button onClick={() => navigate('/login', { replace: true })}>Sign in</Button>}>
          Sign in with your new password.
        </Notice>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice tone="error" role="alert" title={error} />}
          <PasswordField label="New password" autoComplete="new-password" required value={password}
            onChange={e => setPassword(e.target.value)} hint={`At least ${MIN_PASSWORD} characters.`} />
          <PasswordField label="Confirm new password" autoComplete="new-password" required value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} />
          <Button type="submit" block size="lg" loading={loading}>{loading ? 'Saving…' : 'Save password'}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
