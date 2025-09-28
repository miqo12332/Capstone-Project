import React from "react";

export default function WeeklyStats() {
  const stats = [
    { day: "Mon", completed: 2 },
    { day: "Tue", completed: 3 },
    { day: "Wed", completed: 1 },
    { day: "Thu", completed: 2 },
    { day: "Fri", completed: 3 },
    { day: "Sat", completed: 4 },
    { day: "Sun", completed: 2 },
  ];

  const max = Math.max(...stats.map((s) => s.completed));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">📊 Weekly Stats</h1>

        <div className="grid grid-cols-7 gap-4 items-end h-64">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className="w-8 bg-green-500 rounded"
                style={{ height: `${(s.completed / max) * 100}%` }}
              />
              <span className="mt-2 text-sm">{s.day}</span>
              <span className="text-xs text-gray-500">{s.completed}</span>
            </div>
          ))}
        </div>

        <p className="text-center mt-6 text-gray-600">
          ✅ You completed <b>{stats.reduce((a, b) => a + b.completed, 0)}</b> habits this week!
        </p>
      </div>
    </div>
  );
}