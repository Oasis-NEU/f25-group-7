import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isFirebaseConfigured, NU_EMAIL } from '../backend/firebase';
import { signUp } from '../backend/account';
import { AuthLayout } from '../layout/AuthLayout';
import { Button } from '../ui/Button';
import { Field, PasswordField } from '../ui/Field';
import { Notice } from '../ui/primitives';
import { AccountsUnavailable } from '../ui/AccountsUnavailable';
import { safeNext } from '../state/auth';
import { usePageTitle } from '../lib/usePageTitle';

const MIN_PASSWORD = 8;

export default function Signup() {
  usePageTitle('Create an account');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  if (!isFirebaseConfigured) return <AuthLayout title="Create an account"><AccountsUnavailable feature="Creating an account" /></AuthLayout>;

  // Validate on blur, not on every keystroke.
  const passwordError = touched.password && password.length > 0 && password.length < MIN_PASSWORD
    ? `Use at least ${MIN_PASSWORD} characters.` : '';
  const confirmError = touched.confirm && confirmPassword && confirmPassword !== password
    ? 'The passwords do not match.' : '';

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    setError('');
    if (password.length < MIN_PASSWORD) { setError(`Choose a password of at least ${MIN_PASSWORD} characters.`); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    if (!NU_EMAIL.test(email.trim())) { setError('Use your @northeastern.edu email. Rankings and votes are for Northeastern students.'); return; }

    setLoading(true);
    try {
      await signUp({ name, email, password });
      // Signed in already; rankings and votes unlock once the email is verified.
      setNotice(`We sent a link to ${email.trim()}. Open it to verify your Northeastern email, then come back to rank dishes and vote.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Free. Adds the nutrition tracker and meal voting."
      footer={<p>Already have an account? <Link to="/login" className="font-semibold text-brand-text">Sign in</Link></p>}
    >
      {notice ? (
        <Notice tone="success" role="status" title="Check your inbox"
          action={<Button onClick={() => navigate(next, { replace: true })}>Continue</Button>}>
          {notice}
        </Notice>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice tone="error" role="alert" title={error} />}
          <Field label="Name" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} />
          <Field label="Email" type="email" autoComplete="email" inputMode="email" required value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@northeastern.edu"
            hint="Your Northeastern email. We send a link to verify it." />
          <PasswordField label="Password" autoComplete="new-password" required value={password}
            onChange={e => setPassword(e.target.value)} onBlur={() => setTouched(t => ({ ...t, password: true }))}
            hint={`At least ${MIN_PASSWORD} characters.`} error={passwordError} />
          <PasswordField label="Confirm password" autoComplete="new-password" required value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
            error={confirmError} />
          <Button type="submit" block size="lg" loading={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
