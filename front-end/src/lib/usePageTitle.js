import { useEffect } from 'react';

const SITE = 'NU Dining';
const DEFAULT_DESCRIPTION = 'Today’s menus, opening hours and nutrition for Northeastern’s three residential dining halls: Stetson East, International Village and 60 Belvidere.';

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * A specific title and description per page, for tabs, bookmarks, search
 * results and link previews, instead of "NU Dining" everywhere.
 */
export function usePageTitle(title, description = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE}` : SITE;
    document.title = full;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', full);
    setMeta('meta[property="og:description"]', 'content', description);
  }, [title, description]);
}
