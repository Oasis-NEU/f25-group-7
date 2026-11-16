import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { isFirebaseConfigured } from '../backend/firebase';
import { applyVerification } from '../backend/account';
import { useAuth } from '../state/auth';
import { AuthLayout } from '../layout/AuthLayout';
import { ButtonLink } from '../ui/Button';
import { Notice } from '../ui/primitives';
import { PageSpinner } from '../ui/Spinner';
import { AccountsUnavailable } from '../ui/AccountsUnavailable';
import { usePageTitle } from '../lib/usePageTitle';

/**
 * Where Firebase's emails link to (the project's action URL), so the link in
 * a verification or reset email points at this site rather than a Firebase
 * domain. ?mode=verifyEmail completes here; ?mode=resetPassword goes on to
 * the reset form with the same code.
 */
export default function AuthAction() {
  usePageTitle('Confirming your email');
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const code = params.get('oobCode');
  const { refresh } = useAuth();
  const [state, setState] = useState({ status: 'working', message: '' });
  const ran = useRef(false);

  useEffect(() => {
    if (mode !== 'verifyEmail' || !code || ran.current || !isFirebaseConfigured) return;
    ran.current = true; // an action code works once; never apply it twice
    applyVerification(code)
      .then(() => refresh())
      .then(() => setState({ status: 'done', message: '' }))
      .catch(err => setState({ status: 'error', message: err.message }));
  }, [mode, code, refresh]);

  if (!isFirebaseConfigured) return <AuthLayout title="Confirm your email"><AccountsUnavailable feature="Confirming an email" /></AuthLayout>;
  if (mode === 'resetPassword') return <Navigate to={`/reset-password?oobCode=${encodeURIComponent(code ?? '')}`} replace />;

  if (mode !== 'verifyEmail' || !code) {
    return (
      <AuthLayout title="This link doesn’t work here">
        <Notice tone="error" title="Open the link from your NU Dining email" action={<ButtonLink to="/home">Today’s menus</ButtonLink>}>
          It may be incomplete. Copy the whole link from the email, or request a new one.
        </Notice>
      </AuthLayout>
    );
  }

  if (state.status === 'working') return <PageSpinner label="Confirming your email" />;

  return (
    <AuthLayout title={state.status === 'done' ? 'Email confirmed' : 'Couldn’t confirm your email'}>
      {state.status === 'done' ? (
        <Notice tone="success" role="status" title="You can rank dishes and vote now" action={<ButtonLink to="/home">Today’s menus</ButtonLink>}>
          If you signed up on another device, sign in there and it will pick this up.
        </Notice>
      ) : (
        <Notice tone="error" role="alert" title={state.message} action={<ButtonLink to="/rankings" variant="secondary">Send a new link</ButtonLink>} />
      )}
    </AuthLayout>
  );
}
