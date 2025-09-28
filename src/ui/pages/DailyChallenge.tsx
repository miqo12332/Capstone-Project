import React, { useState } from "react";

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState(
    "💡 Today’s AI Challenge: Read 5 pages at 9:00 PM"
  );
  const [status, setStatus] = useState<"pending" | "accepted" | "skipped">(
    "pending"
  );

  const handleAccept = () => setStatus("accepted");
  const handleSkip = () => setStatus("skipped");

  const newChallenge = () => {
    // Mock logic – later will use AI + routine
    const suggestions = [
      "💪 Do 20 pushups at 6:30 PM",
      "📖 Read 5 pages at 9:00 PM",
      "🧘 Meditate for 10 minutes at 7:00 AM",
      "🚶 Walk for 15 minutes during lunch",
    ];
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    setChallenge(`💡 Today’s AI Challenge: ${random}`);
    setStatus("pending");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          🎯 Daily Challenge
        </h1>

        <p className="text-lg mb-6">{challenge}</p>

        {status === "pending" && (
          <div className="space-x-4">
            <button
              onClick={handleAccept}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              ✅ Accept
            </button>
            <button
              onClick={handleSkip}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              ❌ Skip
            </button>
          </div>
        )}

        {status === "accepted" && (
          <p className="text-green-600 font-semibold mt-4">
            🎉 Great! Challenge added to your schedule.
          </p>
        )}
        {status === "skipped" && (
          <p className="text-red-600 font-semibold mt-4">
            ⏭️ Challenge skipped. Try another one!
          </p>
        )}

        <button
          onClick={newChallenge}
          className="mt-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          🔄 Get Another Challenge
        </button>
      </div>
    </div>
  );
}