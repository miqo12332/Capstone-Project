import React from "react";

export default function MonthlyStats() {
  // Fake data: 0–3 habits completed per day
  const days = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    completed: Math.floor(Math.random() * 4),
  }));

  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-200";
    if (count === 1) return "bg-green-200";
    if (count === 2) return "bg-green-400";
    return "bg-green-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">📅 Monthly Stats</h1>

        {/* Heatmap */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => (
            <div
              key={d.day}
              className={`w-10 h-10 rounded flex items-center justify-center text-xs text-gray-700 ${getColor(
                d.completed
              )}`}
            >
              {d.day}
            </div>
          ))}
        </div>

        <p className="text-center mt-6 text-gray-600">
          ✅ In the last 30 days, you completed{" "}
          <b>{days.reduce((a, b) => a + b.completed, 0)}</b> habits!
        </p>
      </div>
    </div>
  );
}