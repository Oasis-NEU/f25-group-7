import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const inputClass = `w-full min-h-12 rounded-xl border border-line-strong/60 bg-surface px-3.5 text-base text-ink
  placeholder:text-ink-subtle transition-colors
  hover:border-line-strong focus:border-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text
  aria-[invalid=true]:border-danger`;

/**
 * A labelled input with optional hint and error text, both tied to the input
 * through aria-describedby so screen readers read them with the field.
 */
export function Field({ label, hint, error, id: givenId, className = '', inputClassName = '', trailing, ...input }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className={`${inputClass} ${trailing ? 'pr-12' : ''} ${inputClassName}`}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
      </div>
      {hint && !error && <p id={hintId} className="mt-1.5 text-sm text-ink-muted">{hint}</p>}
      {error && <p id={errorId} className="mt-1.5 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

/** A password field with a show/hide toggle. Paste and password managers stay enabled. */
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="grid size-10 place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </button>
      )}
    />
  );
}
