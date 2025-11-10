import { supabase } from "../config/supabaseClient";

// Function to cast a vote for 'steast' or 'iv'
export async function castVote(location) {
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

    // Get current vote count for this location
    const votes = row[location] || 0;

    // Increment votes
    const { data: updatedRow, error: updateError } = await supabase
      .from("steast_vs_iv")
      .update({ [location]: votes + 1 })
      .eq("date", formattedDate)
      .select();

    if (updateError) {
      console.error("Error updating votes:", updateError);
    } else {
      console.log("Votes updated:", updatedRow);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}
