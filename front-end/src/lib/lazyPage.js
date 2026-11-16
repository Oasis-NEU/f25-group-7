import { lazy } from 'react';

const RELOAD_FLAG = 'nu-dining:chunk-reload';

/**
 * React.lazy that survives a redeploy.
 *
 * A tab opened before a deploy still references the old hashed chunk files,
 * which no longer exist, so the import fails. Reload once to pick up the new
 * build; a flag in sessionStorage stops a reload loop if the failure is real.
 */
export function lazyPage(importer) {
  return lazy(async () => {
    try {
      const module = await importer();
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage blocked */ }
      return module;
    } catch (err) {
      let reloaded = false;
      try { reloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* storage blocked */ }
      if (!reloaded) {
        try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* storage blocked */ }
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    }
  });
}
