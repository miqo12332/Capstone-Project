import React, { useState } from "react";

interface Habit {
  title: string;
  description: string;
  category: string;
  aiReason: string;
  difficulty: "Easy" | "Moderate" | "Advanced";
}

export default function SuggestedHabits() {
  const [userInput, setUserInput] = useState("");
  const [filter, setFilter] = useState("All");

  const [habits, setHabits] = useState<Habit[]>([
    {
      title: "📚 Read 10 pages daily",
      description: "Improve focus and build knowledge in small, manageable steps.",
      category: "Mind",
      aiReason: "AI noticed you enjoy learning but struggle with consistency.",
      difficulty: "Easy",
    },
    {
      title: "🏃 Run 2km every other day",
      description: "Boost cardiovascular health with balanced rest days.",
      category: "Body",
      aiReason: "AI suggests alternating days to avoid burnout.",
      difficulty: "Moderate",
    },
    {
      title: "🧘 Meditate 10 minutes",
      description: "Reduce stress and improve mindfulness gradually.",
      category: "Mind",
      aiReason: "AI recommends starting with short sessions to build habit comfort.",
      difficulty: "Easy",
    },
    {
      title: "💧 Drink 2L water",
      description: "Stay hydrated for better energy and focus.",
      category: "Health",
      aiReason: "AI detected fatigue patterns — hydration is a simple but powerful fix.",
      difficulty: "Easy",
    },
    {
      title: "🏋️ Strength train 3x weekly",
      description: "Build long-term muscle and stability.",
      category: "Body",
      aiReason: "AI suggests strength > cardio for sustainable fitness.",
      difficulty: "Advanced",
    },
  ]);

  // Mock regenerate function
  const regenerateHabits = () => {
    alert("🔄 AI generated new habit suggestions!");
  };

  // Filter habits by category
  const filteredHabits =
    filter === "All" ? habits : habits.filter((h) => h.category === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          ✨ AI Suggested Habits
        </h1>

        {/* User Input */}
        <div className="flex space-x-2 mb-6">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Describe your goal or challenge (e.g., I feel tired)..."
            className="flex-1 border rounded p-2"
          />
          <button
            onClick={regenerateHabits}
            className="bg-purple-500 text-white px-4 rounded hover:bg-purple-600"
          >
            Generate
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-3 mb-6">
          {["All", "Mind", "Body", "Health"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded ${
                filter === cat
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Habit Cards */}
        <div className="space-y-6">
          {filteredHabits.map((habit, i) => (
            <div
              key={i}
              className="p-4 border rounded-lg hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold">{habit.title}</h2>
              <p className="text-gray-600">{habit.description}</p>
              <p className="text-sm text-purple-600 mt-2 italic">
                💡 {habit.aiReason}
              </p>
              <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-yellow-200 text-yellow-800">
                Difficulty: {habit.difficulty}
              </span>
              <button
                onClick={() => alert(`✅ Added: ${habit.title}`)}
                className="mt-3 bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 block"
              >
                ➕ Add Habit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}