import React from "react";

export default function GroupChallenges() {
  const challenges = [
    {
      title: "📚 7-Day Reading Challenge",
      participants: 12,
      progress: "80%",
      joined: true,
    },
    {
      title: "🏃 5K Run in a Week",
      participants: 20,
      progress: "40%",
      joined: false,
    },
    {
      title: "🧘 10 Meditation Sessions",
      participants: 8,
      progress: "60%",
      joined: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">👥 Group Challenges</h1>

        <ul className="space-y-4">
          {challenges.map((c, i) => (
            <li key={i} className="p-4 border rounded shadow-sm hover:bg-gray-50">
              <h2 className="text-lg font-semibold">{c.title}</h2>
              <p className="text-gray-600">{c.participants} participants</p>
              <div className="w-full bg-gray-200 rounded h-2 mt-2 mb-4">
                <div
                  className="bg-green-500 h-2 rounded"
                  style={{ width: c.progress }}
                />
              </div>
              {c.joined ? (
                <button className="bg-gray-400 text-white px-4 py-1 rounded cursor-not-allowed">
                  ✅ Joined
                </button>
              ) : (
                <button className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600">
                  Join Challenge
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center">
          <button className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600">
            ➕ Create New Challenge
          </button>
        </div>
      </div>
    </div>
  );
}