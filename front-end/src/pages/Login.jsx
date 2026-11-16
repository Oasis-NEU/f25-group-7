import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isFirebaseConfigured } from '../backend/firebase';
import { signIn } from '../backend/account';
import { AuthLayout } from '../layout/AuthLayout';
import { Button } from '../ui/Button';
import { Field, PasswordField } from '../ui/Field';
import { Notice } from '../ui/primitives';
import { AccountsUnavailable } from '../ui/AccountsUnavailable';
import { safeNext } from '../state/auth';
import { usePageTitle } from '../lib/usePageTitle';

export default function Login() {
  usePageTitle('Sign in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  if (!isFirebaseConfigured) return <AuthLayout title="Sign in"><AccountsUnavailable feature="Signing in" /></AuthLayout>;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Rank dishes, track what you eat and vote each meal. Menus never need an account."
      footer={(
        <>
          <p>New here? <Link to={`/signup${next !== '/home' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-text">Create an account</Link></p>
          <p><Link to="/forgot" className="font-semibold text-brand-text">Forgot your password?</Link></p>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        {error && <Notice tone="error" role="alert" title={error} />}
        <Field label="Email" type="email" autoComplete="email" inputMode="email" required value={email}
          onChange={e => setEmail(e.target.value)} placeholder="you@northeastern.edu" />
        <PasswordField label="Password" autoComplete="current-password" required value={password}
          onChange={e => setPassword(e.target.value)} />
        <Button type="submit" block size="lg" loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthLayout>
  );
}
