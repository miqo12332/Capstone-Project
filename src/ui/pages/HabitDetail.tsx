import React from "react";

export default function HabitDetail() {
  const habit = {
    name: "Morning Run 🏃‍♂️",
    description: "Go for a short jog in the morning to stay active.",
    streak: 7,
    totalCompleted: 45,
    createdAt: "2025-01-01",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white shadow p-6 rounded-lg">
        {/* Header */}
        <h1 className="text-3xl font-bold text-blue-600 mb-2">
          {habit.name}
        </h1>
        <p className="text-gray-600 mb-6">{habit.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-green-50 rounded text-center">
            <h2 className="text-2xl font-bold text-green-600">
              🔥 {habit.streak}
            </h2>
            <p className="text-gray-500">Day Streak</p>
          </div>
          <div className="p-4 bg-blue-50 rounded text-center">
            <h2 className="text-2xl font-bold text-blue-600">
              {habit.totalCompleted}
            </h2>
            <p className="text-gray-500">Total Completions</p>
          </div>
          <div className="p-4 bg-purple-50 rounded text-center">
            <h2 className="text-xl font-bold text-purple-600">
              {habit.createdAt}
            </h2>
            <p className="text-gray-500">Started</p>
          </div>
        </div>

        {/* Progress Graph (placeholder) */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Progress Overview</h2>
          <div className="h-40 bg-gray-100 rounded flex items-center justify-center text-gray-400">
            📊 Chart Placeholder
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
            ✏️ Edit
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  );
}