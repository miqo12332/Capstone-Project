import React from "react";

const habits = [
  { id: 1, name: "Morning Run 🏃‍♂️", streak: 5, completedToday: true },
  { id: 2, name: "Read 10 Pages 📚", streak: 12, completedToday: false },
  { id: 3, name: "Meditate 5 min 🧘", streak: 7, completedToday: true },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <h1 className="text-3xl font-bold text-blue-600 mb-6">
        👋 Welcome back, Miqs!
      </h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-white rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-green-500">🔥 12</h2>
          <p className="text-gray-600">Current Streak</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-blue-500">3</h2>
          <p className="text-gray-600">Habits Completed Today</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-purple-500">6</h2>
          <p className="text-gray-600">Active Habits</p>
        </div>
      </div>

      {/* Habits List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Your Habits</h2>
        <ul className="space-y-3">
          {habits.map((habit) => (
            <li
              key={habit.id}
              className="flex items-center justify-between p-4 border rounded hover:bg-gray-50"
            >
              <div>
                <span className="font-medium">{habit.name}</span>
                <p className="text-sm text-gray-500">
                  🔥 {habit.streak}-day streak
                </p>
              </div>
              {habit.completedToday ? (
                <span className="text-green-600 font-bold">✔ Done</span>
              ) : (
                <button className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600">
                  Mark Done
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Add Habit Button */}
      <div className="mt-8 text-center">
        <button className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600">
          + Add New Habit
        </button>
      </div>
    </div>
  );
}