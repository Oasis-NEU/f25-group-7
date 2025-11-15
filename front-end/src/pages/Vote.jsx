import { Building, Building2 } from 'lucide-react';
import { castVote } from '../functions/send_vote';
import { lookupVotes } from '../functions/pull_vote'
import FoodBackground from "../Components/background";
import TextType from '../Components/TextType';
import { useState, useEffect } from "react";

export const Vote = () => {

  const [votes, setVotes] = useState({ steast: 0, iv: 0 });

   // Fetch votes function
  const fetchVotes = async () => {
    const steastVotes = await lookupVotes("steast");
    const ivVotes = await lookupVotes("iv");
    setVotes({ steast: steastVotes, iv: ivVotes });
  };

  // Handle vote
  const handleVote = async (option) => {
    await castVote(option);
    await fetchVotes(); // Immediately update votes after voting
    alert(`Vote for ${option} cast!`);
  };

  // Fetch votes initially and set interval for automatic updates
  useEffect(() => {
    let mounted = true;

    const updateVotes = async () => {
      if (!mounted) return;
      await fetchVotes();
    };

    updateVotes(); // initial fetch
    const interval = setInterval(updateVotes, 2000); // fetch every 2 seconds

    return () => {
      mounted = false;
      clearInterval(interval); // cleanup interval
    };
  }, []);


  return (
    <div className="min-h-screen bg-black">
      <FoodBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl font-bold text-white mb-2">
            <TextType
              text={["Steast or IV?", "Vote your choice"]}
              typingSpeed={100}
              pauseDuration={3500}
              showCursor={true}
              cursorCharacter="|"
              textColors={["#FFFFFF", "#FFFFFF"]}
            />
          </div>

          <div className="flex gap-4 mt-8 justify-center">
            <button
              className="flex items-center gap-2 px-6 py-3 bg-red-900 text-white rounded-lg hover:bg-red-600 transition"
              onClick={() => handleVote("steast")}
            >
              <Building className="w-5 h-5" />
              <span>Vote for Stetson East</span>
              <span>{votes.steast}</span>
            </button>
            <button
              className="flex items-center gap-2 px-6 py-3 bg-red-900 text-white rounded-lg hover:bg-red-600 transition"
              onClick={() => handleVote("iv")}
            >
              <span>Vote for International Village</span>
              <span>{votes.iv}</span>
              <Building2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};