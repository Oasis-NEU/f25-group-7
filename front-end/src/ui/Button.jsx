import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { buttonClass } from './buttonClass';

/**
 * A button that can show progress. While `loading` it stays the same size,
 * is disabled and announces itself as busy.
 */
export const Button = forwardRef(function Button(
  { variant, size, block, className, loading = false, disabled, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function ButtonLink({ to, variant, size, block, className, children, ...rest }) {
  return (
    <Link to={to} className={buttonClass({ variant, size, block, className })} {...rest}>
      {children}
    </Link>
  );
}
