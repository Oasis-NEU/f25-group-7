import { supabase } from "../config/supabaseClient";

const todayStr = () => new Date().toISOString().substring(0, 10);

/** Insert one vote row. Returns the Supabase response (check .error). */
export async function castVote(userId, mealPeriod, location) {
  return supabase.from("votes").insert({
    user_id:     userId,
    vote_date:   todayStr(),
    meal_period: mealPeriod,
    location,
  });
}

/** Delete a vote row (undo). Returns the Supabase response. */
export async function undoVote(userId, mealPeriod) {
  return supabase
    .from("votes")
    .delete()
    .eq("user_id",     userId)
    .eq("vote_date",   todayStr())
    .eq("meal_period", mealPeriod);
}

/** All-time cumulative totals across every user and every day. */
export async function getVoteTotals() {
  const { data } = await supabase.from("votes").select("location");
  if (!data) return { steast: 0, iv: 0 };
  return {
    steast: data.filter(r => r.location === "steast").length,
    iv:     data.filter(r => r.location === "iv").length,
  };
}

/** Meal periods this user has already voted on today (array of strings). */
export async function getUserVotedPeriods(userId) {
  const { data } = await supabase
    .from("votes")
    .select("meal_period")
    .eq("user_id",   userId)
    .eq("vote_date", todayStr());
  return (data || []).map(r => r.meal_period);
}
