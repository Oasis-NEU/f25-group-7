/**
 * localStorage that can never take the page down.
 *
 * Storage throws in private windows, when the quota is full and when a
 * browser blocks site data. Every caller here treats it as a convenience,
 * so all failures read as "nothing stored".
 */
const PREFIX = 'nu-dining:v1:';

function store() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readJson(key) {
  try {
    const raw = store()?.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJson(key, value) {
  try {
    store()?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    store()?.removeItem(PREFIX + key);
  } catch {
    // Nothing to do: the entry is unreachable either way.
  }
}

/** Every stored key under a prefix, without the namespace. */
export function keysWithPrefix(prefix) {
  const s = store();
  if (!s) return [];
  const found = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (key?.startsWith(PREFIX + prefix)) found.push(key.slice(PREFIX.length));
    }
  } catch {
    return [];
  }
  return found;
}
