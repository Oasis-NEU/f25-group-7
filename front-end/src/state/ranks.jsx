/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';
import { getDishStats, getMyRanks, removeRanking, saveRanking } from '../backend/ranks';
import { campusScore, scoredList } from '../data/ranking';
import { readJson, removeKey, writeJson } from '../data/storage';

// A copy of your list on this device, so scores and "Your favorites" render
// with the menu instead of popping in after the network read.
const cacheKey = uid => `ranks:${uid}`;
const readCache = uid => {
  const v = readJson(cacheKey(uid));
  return v && v.ranks && v.details ? v : null;
};

const RanksContext = createContext(null);
const EMPTY = { loved: [], fine: [], disliked: [] };

/**
 * Your ranked dishes, loaded once per session and kept in memory, so every
 * menu line can show your score without another read.
 */
export function RanksProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'idle', ranks: EMPTY, details: {} });

  const lastUid = useRef(null);
  useEffect(() => {
    if (!user) {
      // Signing out removes the device copy, for shared computers.
      if (lastUid.current) removeKey(cacheKey(lastUid.current));
      lastUid.current = null;
      setState({ status: 'idle', ranks: EMPTY, details: {} });
      return undefined;
    }
    lastUid.current = user.id;
    let alive = true;
    const cached = readCache(user.id);
    setState(cached ? { status: 'ready', ranks: cached.ranks, details: cached.details } : s => ({ ...s, status: 'loading' }));
    getMyRanks(user.id)
      .then(({ ranks, details }) => { if (alive) setState({ status: 'ready', ranks, details }); })
      .catch(err => { console.error('Loading your rankings failed', err); if (alive) setState(s => ({ ...s, status: 'error' })); });
    return () => { alive = false; };
  }, [user]);

  const save = useCallback(async ({ dish, bucket, insertAt }) => {
    const previous = state.details[dish.id]?.bucket ?? null;
    const ranks = await saveRanking(user.id, { dish, bucket, insertAt, previous, ranks: state.ranks });
    setState(s => ({ ...s, ranks, details: { ...s.details, [dish.id]: { bucket, name: dish.name, hall: dish.hall, station: dish.stationLabel || dish.station, course: dish.course, rankedAt: Date.now() } } }));
    return ranks;
  }, [user, state.ranks, state.details]);

  const remove = useCallback(async dish => {
    const previous = state.details[dish.id]?.bucket;
    if (!previous) return;
    const ranks = await removeRanking(user.id, { dish, previous, ranks: state.ranks });
    setState(s => {
      const details = { ...s.details };
      delete details[dish.id];
      return { ...s, ranks, details };
    });
  }, [user, state.ranks, state.details]);

  useEffect(() => {
    if (user && state.status === 'ready') writeJson(cacheKey(user.id), { ranks: state.ranks, details: state.details });
  }, [user, state]);

  const value = useMemo(() => {
    const list = scoredList(state.ranks, state.details);
    const byId = new Map(list.map(d => [d.id, d]));
    return { ...state, list, mine: id => byId.get(id) ?? null, save, remove };
  }, [state, save, remove]);

  return <RanksContext.Provider value={value}>{children}</RanksContext.Provider>;
}

export function useRanks() {
  const value = useContext(RanksContext);
  if (!value) throw new Error('useRanks must be used inside RanksProvider');
  return value;
}

/**
 * Campus scores for a set of dish ids: { [id]: { score, count } }. One read
 * per 30 dishes, cached for five minutes; an empty object until loaded or
 * when Firebase is unavailable.
 */
export function useCampusScores(ids, refresh = null) {
  const key = [...new Set(ids)].sort().join('|');
  const [scores, setScores] = useState({});
  const last = useRef('');
  useEffect(() => {
    if (!key) { setScores({}); return undefined; }
    let alive = true;
    last.current = key;
    getDishStats(key.split('|'))
      .then(stats => {
        if (!alive || last.current !== key) return;
        const out = {};
        for (const [id, s] of Object.entries(stats)) out[id] = campusScore(s);
        setScores(out);
      })
      .catch(() => {});
    return () => { alive = false; };
    // `refresh` changes when your own rankings do, so a dish you just ranked re-reads its counts.
  }, [key, refresh]);
  return scores;
}
