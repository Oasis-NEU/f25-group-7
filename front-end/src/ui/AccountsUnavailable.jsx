import { UserX } from 'lucide-react';
import { ButtonLink } from './Button';
import { EmptyState } from './primitives';

/** Shown in place of account features when Supabase is not configured. */
export function AccountsUnavailable({ feature = 'This feature' }) {
  return (
    <EmptyState
      icon={UserX}
      title="Accounts are unavailable right now"
      action={<ButtonLink to="/home" variant="secondary">See today's menus</ButtonLink>}
    >
      {feature} needs an account, and sign-in is not set up on this copy of the site.
      Menus and hours work without one.
    </EmptyState>
  );
}
