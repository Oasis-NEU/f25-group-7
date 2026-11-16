/**
 * Builds and writes nutrition tracker entries.
 * Shared by the tracker and the menu page's "add to log" action.
 */
import { addLog } from '../backend/tracker';
import { campusDate } from '../functions/campusTime';

const round1 = n => Math.round(n * 10) / 10;
const scaled = (value, qty) => (value == null || !Number.isFinite(Number(value)) ? null : round1(Number(value) * qty));

/** Meal types the food_logs table and tracker understand. */
export const LOG_MEALS = ['breakfast', 'lunch', 'dinner'];

/** Map a dining period ("Brunch", "Late Night") onto a tracker meal. */
export function logMealFor(periodSlug, minutes) {
  if (LOG_MEALS.includes(periodSlug)) return periodSlug;
  if (periodSlug === 'brunch') return minutes < 11 * 60 ? 'breakfast' : 'lunch';
  return minutes < 11 * 60 ? 'breakfast' : minutes < 16 * 60 ? 'lunch' : 'dinner';
}

/** The food_logs row for a menu item eaten `qty` times. */
export function logEntryFor(userId, item, mealType, qty = 1) {
  return {
    user_id: userId,
    logged_at: campusDate(),
    meal_type: mealType,
    food_name: qty !== 1 ? `${item.name} ×${qty}` : item.name,
    calories: item.calories == null ? null : Math.round(item.calories * qty),
    protein_g: scaled(item.protein, qty),
    carbs_g: scaled(item.carbs, qty),
    fat_g: scaled(item.fat, qty),
    fiber_g: scaled(item.fiber, qty),
    sodium_mg: scaled(item.sodium, qty),
    sugar_g: scaled(item.sugar, qty),
    portion: item.portion ?? null,
  };
}

/** Insert a row and return it, or throw with a readable message. */
export async function insertLog(entry) {
  try {
    return await addLog(entry.user_id, entry);
  } catch (err) {
    throw new Error(err?.code === 'permission-denied' ? 'Sign in again to save this.' : 'The entry could not be saved. Try again.');
  }
}
