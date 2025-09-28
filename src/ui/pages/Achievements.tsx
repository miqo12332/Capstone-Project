import React from "react";

export default function Achievements() {
  const badges = [
    { name: "🔥 7-Day Streak", unlocked: true },
    { name: "📅 30 Days Consistency", unlocked: true },
    { name: "💪 100 Pushups Completed", unlocked: false },
    { name: "📚 50 Pages Read", unlocked: true },
    { name: "🧘 10 Meditation Sessions", unlocked: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">🏆 Achievements</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg text-center border shadow ${
                badge.unlocked ? "bg-green-50 border-green-400" : "bg-gray-100 border-gray-300"
              }`}
            >
              <div className="text-3xl mb-2">
                {badge.unlocked ? "✅" : "🔒"}
              </div>
              <p
                className={`font-medium ${
                  badge.unlocked ? "text-green-700" : "text-gray-500"
                }`}
              >
                {badge.name}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-gray-600">
          Keep building habits to unlock more rewards 🎉
        </p>
      </div>
    </div>
  );
}