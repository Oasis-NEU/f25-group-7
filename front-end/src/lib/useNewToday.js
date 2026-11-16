import { useEffect, useRef, useState } from 'react';
import { loadNeighbourStations } from '../data/menu';
import { newTodayKeys } from '../data/curate';

/**
 * Which of today's dishes are new: compares against the same meal on the day
 * before and after. 'unknown' when neither neighbour could be loaded, so the
 * page never calls everything new.
 */
export function useNewToday(result) {
  const [state, setState] = useState({ status: 'idle', keys: null, compared: null });
  const ok = result?.status === 'ok' && result?.period?.slug;
  const id = ok ? `${result.hall}|${result.date}|${result.period.slug}|${result.source}` : null;
  const stationsRef = useRef(null);
  stationsRef.current = result?.stations;

  useEffect(() => {
    if (!id) { setState({ status: 'idle', keys: null, compared: null }); return undefined; }
    const [hallSlug, date, mealSlug] = id.split('|');
    const controller = new AbortController();
    setState({ status: 'checking', keys: null, compared: null });
    loadNeighbourStations({ hallSlug, date, mealSlug, signal: controller.signal }).then(lists => {
      if (controller.signal.aborted) return;
      const keys = newTodayKeys(stationsRef.current, lists);
      const compared = { yesterday: Boolean(lists?.[0]?.length), tomorrow: Boolean(lists?.[1]?.length) };
      setState({ status: keys ? 'ready' : 'unknown', keys, compared });
    });
    return () => controller.abort();
  }, [id]);

  return state;
}
