import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * An accessible modal. A bottom sheet on phones, centred on larger screens.
 *
 * Escape and the backdrop close it, focus moves inside on open and returns
 * to whatever opened it on close, Tab stays inside, and the page behind
 * does not scroll.
 */
export function Dialog({ open, onClose, title, description, children, footer, dismissible = true, size = 'md' }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  // Kept in a ref so a parent re-render (typing in a field inside the
  // dialog) does not re-run the effect and yank focus back to the top.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () => [...panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];
    // The sheet itself takes focus, so its title is announced and no control lights up on open.
    (panel.querySelector('[data-autofocus]') ?? panel).focus();

    function onKey(event) {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-[var(--scrim)] animate-fade"
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative w-full ${size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md'} max-h-[90dvh] flex flex-col
          bg-surface text-ink border border-card-line shadow-card rounded-t-3xl sm:rounded-3xl animate-sheet pb-safe outline-none`}
      >
        {/* Grabber: the sheet affordance on phones. */}
        <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start gap-3 px-5 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="-mt-1 grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line px-5 sm:px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
