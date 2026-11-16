/**
 * Turn DineOnCampus's flat station lists into something a hungry person can
 * scan: real dishes first, build-your-own bars and condiments folded, and a
 * few picks worth leading with.
 *
 * Everything here is inferred from fields DineOnCampus provides (portion,
 * calories, description, order, station name). Nothing is invented: when a
 * rule is unsure it keeps an item visible rather than hiding it.
 */

/** Portions that mean "a spoonful of something", not a dish. */
const SPOON_PORTION = /\b(tsp|tbsp|teaspoons?|tablespoons?|packets?|pumps?)\b/i;
/** Fluid ounces: a soup is 8 fl oz, a dressing or oil is 1 or 2. */
const FLUID_PORTION = /(\d+(?:\.\d+)?)\s*(?:fl\.?\s?oz|floz)/i;
/** Things served on or beside a dish rather than as one. */
/** Always something you add to a dish, whatever its portion's calories ("Brown Sugar Topping", 800 cal a cup). */
const ADD_ON_NAMES = /\b(toppings?|sprinkles|cinnamon sugar|brown sugar|powdered sugar|whipped cream|granola topping|syrup)\b/i;
const EXTRA_NAMES = /\b(sauce|dressing|gravy|syrup|salsa|oil|vinegar|crackers?|croutons?|dip|spread|butter|jam|jelly|honey|ketchup|mustard|mayo(nnaise)?|relish|seasoning|sprinkles|toppings?|buns?)\b/i;

/** Station names that are build-your-own bars rather than plated dishes. */
const BUILD_NAMES = /^(deli|fresh|salad|garden|menutainment|omelet|toppings?|condiments?|cereal|yogurt|bagel|toast)\b/i;

const FLAVORS = [
  ['italian', /cucina|pizza|pasta|pomodoro|ital/i],
  ['grill', /flame|grill|burger|smash/i],
  ['soup', /soup|chili|broth/i],
  ['allergen-free', /without|allergen|true balance|simple serving/i],
  ['sweets', /sweet|dessert|bake|pastry|cookie|treat|pie|cake/i],
  ['fresh', /fresh|salad|garden|greens/i],
  ['deli', /\bdeli\b|sandwich|sub\b/i],
  ['breakfast', /menutainment|omelet|egg|breakfast|griddle|waffle|pancake/i],
  ['global', /global|world|latin|spice|asian|wok|halal|sushi|mezze|tandoor|indian|curry|taco/i],
  ['homestyle', /homestyle|comfort|classic|carvery|roast|kitchen/i],
  ['grains', /rice|grain|bowl/i],
];

/** A station's food family, used to give it a recognisable colour and icon. */
export function flavorOf(stationName) {
  const name = String(stationName ?? '');
  return FLAVORS.find(([, pattern]) => pattern.test(name))?.[0] ?? 'other';
}

/** "FRESH 52 B" -> "Fresh 52 B", "DELICIOUS WITHOUT" -> "Delicious Without". */
export function stationLabel(name) {
  return String(name ?? '').toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\b(Bbq|Nu|Iv)\b/g, s => s.toUpperCase());
}

/** A condiment, topping or single ingredient, as opposed to something you'd call a dish. */
export function isExtra(item) {
  const portion = item.portion ?? '';
  if (SPOON_PORTION.test(portion)) return true;
  const fluid = portion.match(FLUID_PORTION);
  if (fluid && Number(fluid[1]) <= 2) return true;
  if (ADD_ON_NAMES.test(item.name)) return true;
  if (EXTRA_NAMES.test(item.name) && (item.calories ?? 0) < 160) return true;
  return item.calories != null && item.calories < 80 && !item.description;
}

/** A description that only repeats the name ("Brown Rice": "Brown Rice") tells nobody anything. */
export function hasRealDescription(item) {
  const desc = String(item.description ?? '').trim().toLowerCase();
  if (desc.length < 8) return false;
  return !desc.startsWith(String(item.name ?? '').trim().toLowerCase());
}

/** Mostly ingredients: the salad bar, the deli counter, the omelet station. */
function isBuildYourOwn(station, extras) {
  if (BUILD_NAMES.test(station.name) && !/special/i.test(station.name)) return true;
  if (station.items.length < 8) return false;
  const parts = station.items.filter(item => isExtra(item) || ((item.calories ?? 0) < 80 && !item.description));
  return parts.length / station.items.length >= 0.6 || extras.length / station.items.length >= 0.5;
}

/** Lower-case, punctuation-free name used to compare menus across days. */
export const dishKey = name => String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** How strongly a dish deserves to lead. Higher is better; ties keep menu order. */
function leadScore(item, isNew) {
  let score = 0;
  if (hasRealDescription(item)) score += 3;
  if ((item.calories ?? 0) >= 200) score += 2;
  if ((item.calories ?? 0) < 150) score -= 2;
  if ((item.protein ?? 0) >= 20) score += 1;
  if (isNew) score += 4;
  return score;
}

/** Below this a dish is a side, not something to lead a menu with. */
const PICK_FLOOR = 2;

/**
 * @param stations  normalized stations from menu.js
 * @param options.newKeys  Set of dishKey()s that are new today, or null when unknown
 * @returns {{ stations: CuratedStation[], picks: Item[], counts }}
 *
 * CuratedStation: { name, label, flavor, kind: 'dishes'|'build'|'sweets',
 *                   dishes, extras, items }
 */
export function curateMenu(stations, { newKeys = null } = {}) {
  const curated = (stations ?? []).map(station => {
    const flavor = flavorOf(station.name);
    // Sweets compare with sweets when ranking; everything else is a main.
    const course = flavor === 'sweets' ? 'sweet' : 'main';
    const items = station.items.map(item => ({
      ...item,
      course,
      isNew: Boolean(newKeys && newKeys.has(dishKey(item.name)) && !isExtra(item)),
    }));
    const extras = items.filter(isExtra);
    const build = isBuildYourOwn(station, extras);
    const kind = build ? 'build' : flavor === 'sweets' ? 'sweets' : 'dishes';
    // A build-your-own bar is all parts; elsewhere the dishes lead and extras fold.
    const dishes = build ? [] : items.filter(item => !isExtra(item));
    return { name: station.name, label: stationLabel(station.name), flavor, kind, dishes, extras: build ? items : extras, items };
  });

  // Picks: the strongest dish from each plated station, then the strongest of
  // the rest, so one big station cannot crowd out the others.
  const candidates = curated
    .filter(station => station.kind === 'dishes')
    .map(station => station.dishes
      .map((item, index) => ({ item, index, score: leadScore(item, item.isNew) }))
      .sort((a, b) => b.score - a.score || a.index - b.index));
  const firstRound = candidates.map(list => list[0]).filter(c => c && c.score >= PICK_FLOOR);
  const secondRound = candidates.flatMap(list => list.slice(1, 2)).filter(c => c.score >= PICK_FLOOR + 1);
  const picks = [...firstRound.sort((a, b) => b.score - a.score), ...secondRound.sort((a, b) => b.score - a.score)]
    .slice(0, 8)
    .map(c => c.item);

  const counts = {
    items: curated.reduce((n, s) => n + s.items.length, 0),
    dishes: curated.reduce((n, s) => n + s.dishes.length, 0),
    stations: curated.length,
  };
  return { stations: curated, picks, counts };
}

/**
 * Keys for dishes on today's menu that appear on none of the comparison
 * menus. Returns null when no comparison menu is available, so the caller can
 * say "unknown" instead of calling everything new.
 */
export function newTodayKeys(todayStations, comparisonStationLists) {
  const lists = (comparisonStationLists ?? []).filter(list => Array.isArray(list) && list.length);
  if (!lists.length) return null;
  const seen = new Set(lists.flatMap(list => list.flatMap(station => station.items.map(item => dishKey(item.name)))));
  const fresh = new Set();
  for (const station of todayStations ?? []) {
    for (const item of station.items) {
      const key = dishKey(item.name);
      if (!seen.has(key)) fresh.add(key);
    }
  }
  return fresh;
}

/**
 * Picks whose order never changes once the menu is on screen.
 *
 * Which dishes are new is only known a moment after the menu loads (it needs
 * the neighbouring days), and letting "new" boost a dish reshuffled the list
 * under the reader's eyes. So the choice and order come from the menu alone,
 * and the new-today flags are applied afterwards.
 */
export function stablePicks(stations, newKeys = null) {
  const order = curateMenu(stations).picks.map(item => item.id);
  const flagged = new Map(curateMenu(stations, { newKeys }).stations.flatMap(s => s.items).map(item => [item.id, item]));
  return order.map(id => flagged.get(id)).filter(Boolean);
}
