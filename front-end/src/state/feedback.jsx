/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useId, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { FEEDBACK_KINDS, FEEDBACK_MAX, sendFeedback } from '../backend/feedback';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Chip } from '../ui/primitives';

const FeedbackContext = createContext({ open: () => {} });

/** Open the feedback sheet from anywhere: open({ kind: 'menu', dish: 'Tofu Jambalaya' }). */
export function useFeedback() {
  return useContext(FeedbackContext);
}

function FeedbackSheet({ request, onClose }) {
  const { user } = useAuth();
  const [kind, setKind] = useState(request?.kind ?? 'bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const messageId = useId();
  const emailId = useId();
  const current = FEEDBACK_KINDS.find(k => k.key === kind) ?? FEEDBACK_KINDS[0];
  const dish = request?.dish ?? '';

  async function submit(e) {
    e.preventDefault();
    if (message.trim().length < 3) { setError('Write a little more so we can act on it.'); return; }
    setState('sending'); setError('');
    try {
      // Your email and account go with the note only when you ask for a reply.
      await sendFeedback({ kind, message, dish, user: user && contact ? user : null, email: user ? (contact ? user.email : '') : email });
      setState('sent');
    } catch (err) { setError(err.message); setState('idle'); }
  }

  if (state === 'sent') {
    return (
      <Dialog open onClose={onClose} title="Thanks, it’s sent" footer={<Button block onClick={onClose}>Done</Button>}>
        <p className="text-base text-ink-muted">Every note is read. Fixes and ideas from feedback go into the next update.</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={dish ? 'Report a problem' : 'Send feedback'}
      description={dish ? dish : 'Bugs, ideas, wrong menu info: every note is read.'}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button block type="submit" form="feedback-form" loading={state === 'sending'}>Send</Button>
        </>
      )}
    >
      <form id="feedback-form" onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-muted">What’s it about?</legend>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_KINDS.map(k => <Chip key={k.key} pressed={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</Chip>)}
          </div>
        </fieldset>

        <div>
          <label htmlFor={messageId} className="text-sm font-semibold">Your note</label>
          <textarea
            id={messageId}
            required
            rows={5}
            maxLength={FEEDBACK_MAX}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={current.hint}
            className="mt-1.5 w-full resize-none rounded-xl bg-surface-2 px-3.5 py-3 text-base placeholder:text-ink-subtle focus:outline-2 focus:outline-brand-text"
          />
          <p className="mt-1 text-right text-xs text-ink-subtle tabular">{FEEDBACK_MAX - message.length}</p>
        </div>

        {user ? (
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" checked={contact} onChange={e => setContact(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" />
            <span>
              <span className="block font-semibold">Let the NU Dining team reply to me</span>
              <span className="block text-ink-muted">Adds {user.email} to this note. Only the team sees it, never other students. Nothing is emailed to you now.</span>
            </span>
          </label>
        ) : (
          <div>
            <label htmlFor={emailId} className="text-sm font-semibold">Email <span className="font-normal text-ink-muted">(optional, if you’d like a reply; only the team sees it)</span></label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl bg-surface-2 px-3.5 text-base focus:outline-2 focus:outline-brand-text"
            />
          </div>
        )}

        <p className="text-xs text-ink-muted">Feedback is private: only the NU Dining team reads it. It includes the page you’re on, light or dark mode, screen width and browser, so we can reproduce problems, plus your email only if you add it above.</p>
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

/** Holds the one feedback sheet for the whole app. */
export function FeedbackProvider({ children }) {
  const [request, setRequest] = useState(null);
  const open = useCallback((req = {}) => setRequest({ ...req, at: Date.now() }), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {/* Keyed per opening so each starts clean. */}
      {request && <FeedbackSheet key={request.at} request={request} onClose={() => setRequest(null)} />}
    </FeedbackContext.Provider>
  );
}
