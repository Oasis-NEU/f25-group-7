import { supabase } from "../config/supabaseClient";

export async function lookupVotes(location) {
  if (location !== "steast" && location !== "iv") {
    console.error("Invalid location");
    return;
  }

  try {
    const today = new Date();
    const formattedDate = today.toISOString().substring(0, 10);

    // Fetch the row for today
    const { data: row, error: fetchError } = await supabase
      .from("steast_vs_iv")
      .select()
      .eq("date", formattedDate)
      .single();
    if (fetchError) {
      console.error("Error fetching votes:", fetchError);
      return;
    }

    return row ? row[location] : 0;

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}