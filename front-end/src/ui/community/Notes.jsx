import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { useAuth } from '../../state/auth';
import { deleteNote, getDishNotes, getMyNote, NOTE_MAX, saveNote } from '../../backend/notes';
import { hallBySlug } from '../../data/halls';
import { Button } from '../Button';
import { ago } from '../../lib/ago';

/*
 * The community log: what people said about a dish, anonymously, labelled
 * with how they ranked it. Your own notes show as "You". The label is always
 * a word; its colour only echoes the score tier.
 */

const BUCKET = {
  loved: { word: 'Loved it', tone: 'text-score-high' },
  fine: { word: 'It was fine', tone: 'text-score-mid' },
  disliked: { word: 'Didn’t like it', tone: 'text-score-low' },
};

/** One note: who, how they ranked it, when, what they said, and (in the feed) which dish. */
export function NoteItem({ note, showDish = false, mine = false }) {
  const b = BUCKET[note.bucket] ?? BUCKET.fine;
  const hall = hallBySlug(note.hall);
  return (
    <li className="flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-muted">
        <UserRound className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] text-ink-muted">
          <span className="font-semibold text-ink">{mine ? 'You' : 'A student'}</span>
          {' · '}<span className={`font-semibold ${b.tone}`}>{b.word}</span>
          {' · '}<time dateTime={new Date(note.updatedAt).toISOString()}>{ago(note.updatedAt)}</time>
        </p>
        {showDish && (
          <p className="mt-0.5 text-base font-semibold leading-snug">
            {hall ? <Link to={`/menu/${hall.slug}`} className="hover:underline">{note.dish}</Link> : note.dish}
            {hall && <span className="text-[0.8125rem] font-normal text-ink-muted"> · {hall.shortName ?? hall.name}</span>}
          </p>
        )}
        <p className="mt-1 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed">{note.text}</p>
      </div>
    </li>
  );
}

/**
 * Write or edit your note on a dish you ranked. `bucket` is your ranking of
 * it; the note is public but anonymous: no name is shown.
 */
export function NoteComposer({ dish, bucket, initial = null, onChange, autoFocus = false }) {
  const { user } = useAuth();
  const [note, setNote] = useState(initial);
  const [text, setText] = useState(initial?.text ?? '');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const id = useId();
  useEffect(() => { setNote(initial); setText(initial?.text ?? ''); }, [initial]);
  if (!user) return null;

  const left = NOTE_MAX - text.length;
  const changed = text.trim() !== (note?.text ?? '');

  async function post() {
    setState('saving'); setError('');
    try {
      const saved = await saveNote(user, dish, { text, bucket, createdAt: note?.createdAt ?? null });
      setNote(saved); setText(saved.text); setState('saved');
      onChange?.(saved);
    } catch (err) { setError(err.message); setState('idle'); }
  }
  async function remove() {
    setState('saving'); setError('');
    try {
      await deleteNote(user.id, dish.id);
      setNote(null); setText(''); setState('idle');
      onChange?.(null);
    } catch { setError('The note was not deleted. Try again.'); setState('idle'); }
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">{note ? 'Your note' : 'Add a note'} <span className="font-normal text-ink-muted">(optional)</span></label>
      <textarea
        id={id}
        value={text}
        maxLength={NOTE_MAX}
        rows={3}
        autoFocus={autoFocus}
        onChange={e => { setText(e.target.value); if (state === 'saved') setState('idle'); }}
        placeholder="What did you like or not? Portion, flavor, worth the line…"
        className="mt-1.5 w-full resize-none rounded-xl bg-surface-2 px-3.5 py-3 text-base placeholder:text-ink-subtle focus:outline-2 focus:outline-brand-text"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={post} loading={state === 'saving'} disabled={!text.trim() || !changed}>
          {note ? 'Update note' : 'Post note'}
        </Button>
        {note && <Button size="sm" variant="ghost" onClick={remove} disabled={state === 'saving'}>Delete</Button>}
        <span className={`ml-auto text-xs tabular ${left < 20 ? 'text-warn' : 'text-ink-subtle'}`}>{left}</span>
      </div>
      <p role="status" className="mt-1.5 text-xs text-ink-muted">
        {error ? <span className="text-danger">{error}</span> : state === 'saved' ? 'Posted anonymously. Everyone can see it on this dish.' : 'Posted anonymously. Students see your ranking and note, never your name.'}
      </p>
    </div>
  );
}

/** The split of rankings as words and a thin bar: "4 loved · 1 fine · 0 didn’t like". */
function Split({ campus }) {
  const total = (campus?.loved ?? 0) + (campus?.fine ?? 0) + (campus?.disliked ?? 0);
  if (!total) return <p className="text-sm text-ink-muted">Nobody has ranked this yet. Be the first.</p>;
  const parts = [['loved', 'bg-score-high'], ['fine', 'bg-score-mid'], ['disliked', 'bg-score-low']];
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        {parts.map(([k, c]) => campus[k] ? <span key={k} className={c} style={{ width: `${(campus[k] / total) * 100}%` }} /> : null)}
      </div>
      <p className="mt-2 text-sm text-ink-muted tabular">
        {campus.loved} loved · {campus.fine} fine · {campus.disliked} didn’t like
      </p>
    </div>
  );
}

/**
 * "What people said" in a dish's sheet: the split, your note if you ranked
 * the dish, and everyone else's newest notes.
 */
export function DishCommunity({ dish, campus, yours }) {
  const { user, canPost } = useAuth();
  const [notes, setNotes] = useState(null);
  const [mine, setMine] = useState(null);

  useEffect(() => {
    let alive = true;
    setNotes(null);
    getDishNotes(dish.id).then(list => alive && setNotes(list)).catch(() => alive && setNotes([]));
    if (user) getMyNote(dish.id, user.id).then(n => alive && setMine(n)).catch(() => {});
    else setMine(null);
    return () => { alive = false; };
  }, [dish.id, user]);

  const others = (notes ?? []).filter(n => n.uid !== user?.id);
  return (
    <section aria-labelledby="community-heading" className="space-y-4">
      <h3 id="community-heading" className="text-base font-semibold">What people said</h3>
      <Split campus={campus} />
      {yours && canPost && (
        <NoteComposer dish={dish} bucket={yours.bucket} initial={mine} onChange={n => setMine(n)} />
      )}
      {notes == null ? (
        <p className="text-sm text-ink-muted" role="status">Loading notes…</p>
      ) : others.length ? (
        <ul className="-mx-1 overflow-hidden rounded-card border border-card-line">{others.map(n => <NoteItem key={n.id} note={n} />)}</ul>
      ) : (
        <p className="text-sm text-ink-muted">{yours ? 'No notes from others yet.' : 'No notes yet. Rank it to leave one.'}</p>
      )}
    </section>
  );
}
