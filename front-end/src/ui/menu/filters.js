import { Drumstick, Flame, Leaf, Sprout, WheatOff, Zap } from 'lucide-react';

/** Diet and nutrition filters. Every test reads a DineOnCampus label or number. */
export const DIET_FILTERS = [
  { key: 'vegan', label: 'Vegan', icon: Leaf, test: i => i.vegan },
  { key: 'vegetarian', label: 'Vegetarian', icon: Sprout, test: i => i.vegetarian },
  { key: 'gluten', label: 'Avoiding gluten', icon: WheatOff, test: i => i.glutenFree },
  { key: 'protein', label: 'High protein', icon: Zap, test: i => i.highProtein },
  { key: 'light', label: 'Under 500 cal', icon: Flame, test: i => i.calories != null && i.calories < 500 },
  { key: 'meat', label: 'Meat & fish', icon: Drumstick, test: i => !i.vegetarian },
];

/**
 * The proof that rides with every "new today" claim, naming exactly the days
 * that were actually compared.
 */
export function newProof(compared, mealName = 'menu') {
  const meal = mealName.toLowerCase();
  if (compared?.yesterday && compared?.tomorrow) return `Not on yesterday’s or tomorrow’s ${meal}`;
  if (compared?.yesterday) return `Not on yesterday’s ${meal}`;
  if (compared?.tomorrow) return `Not on tomorrow’s ${meal}`;
  return '';
}

export const ALLERGENS = ['Milk', 'Egg', 'Wheat', 'Gluten', 'Soy', 'Peanuts', 'Tree Nuts', 'Fish', 'Shellfish', 'Sesame', 'Pork'];

/** "Fish (Haddock)*" -> "fish" */
const allergenKey = name => String(name).replace(/\*/g, '').replace(/\s*\(.*\)\s*/g, '').replace(/\s*-.*$/, '').trim().toLowerCase();

/** Whether an item passes the search, diet filters and allergens to avoid. */
export function itemMatches(item, { query = '', diets, avoid }) {
  const q = query.trim().toLowerCase();
  if (q && !item.name.toLowerCase().includes(q) && !String(item.station ?? '').toLowerCase().includes(q)
    && !String(item.description ?? '').toLowerCase().includes(q)) return false;
  for (const filter of DIET_FILTERS) {
    if (diets?.has(filter.key) && !filter.test(item)) return false;
  }
  if (avoid?.size) {
    const contains = item.allergens.map(allergenKey);
    for (const allergen of avoid) if (contains.includes(allergen.toLowerCase())) return false;
  }
  return true;
}

/** "Vegan · No gluten · 21 g protein", the dining team's labels as plain words. */
export function dietWords(item) {
  const words = [];
  if (item.vegan) words.push('Vegan');
  else if (item.vegetarian) words.push('Vegetarian');
  if (item.glutenFree) words.push('No gluten');
  if (item.highProtein && item.protein != null) words.push(`${Math.round(item.protein)} g protein`);
  return words.join(' · ');
}

/** The id a station's section is anchored to. */
export const sectionId = name => `station-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
