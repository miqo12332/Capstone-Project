import React from "react";

export default function Leaderboard() {
  const users = [
    { name: "Alice", score: 120, rank: 1 },
    { name: "Bob", score: 110, rank: 2 },
    { name: "Charlie", score: 90, rank: 3 },
    { name: "Miqs", score: 85, rank: 4 },
    { name: "David", score: 70, rank: 5 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">🏅 Leaderboard</h1>

        <ul className="divide-y divide-gray-200">
          {users.map((user, i) => (
            <li
              key={i}
              className={`flex items-center justify-between py-3 px-4 rounded ${
                user.name === "Miqs" ? "bg-yellow-50 font-semibold" : ""
              }`}
            >
              <span>
                #{user.rank} — {user.name}
              </span>
              <span className="text-blue-600 font-medium">{user.score} pts</span>
            </li>
          ))}
        </ul>

        <p className="text-center mt-6 text-gray-600">
          🎉 Keep going! Earn points by completing habits and climb the ranks.
        </p>
      </div>
    </div>
  );
}