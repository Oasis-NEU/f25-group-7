/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { initialHours, loadHours } from '../data/schedule';
import { campusNow } from '../functions/campusTime';

const HoursContext = createContext(null);

/** Refresh the schedule when the tab comes back after this long. */
const REFRESH_AFTER_MS = 15 * 60 * 1000;

/**
 * Opening hours shared by every page, plus a campus clock.
 *
 * The first paint uses this browser's saved copy or the bundled schedule, so
 * the status pills never start empty; the live schedule replaces it as soon
 * as it arrives. The clock ticks every 30 seconds and the schedule reloads
 * when the campus date rolls over, so a tab left open overnight stays right.
 */
export function HoursProvider({ children }) {
  const [hours, setHours] = useState(initialHours);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => campusNow());
  const lastLoad = useRef(0);
  const inFlight = useRef(null);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    try {
      const result = await loadHours({ signal: controller.signal });
      if (!controller.signal.aborted) {
        setHours(result);
        lastLoad.current = Date.now();
      }
    } catch (err) {
      if (!controller.signal.aborted) console.error('Loading hours failed', err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const tick = setInterval(() => setNow(campusNow()), 30_000);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(campusNow());
      if (Date.now() - lastLoad.current > REFRESH_AFTER_MS) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      inFlight.current?.abort();
    };
  }, [refresh]);

  // A new campus day means a new seven-day window.
  const today = now.date;
  const firstDay = useRef(today);
  useEffect(() => {
    if (today !== firstDay.current) {
      firstDay.current = today;
      refresh();
    }
  }, [today, refresh]);

  const value = useMemo(() => ({ ...hours, loading, refresh, now }), [hours, loading, refresh, now]);
  return <HoursContext.Provider value={value}>{children}</HoursContext.Provider>;
}

export function useHours() {
  const value = useContext(HoursContext);
  if (!value) throw new Error('useHours must be used inside HoursProvider');
  return value;
}
