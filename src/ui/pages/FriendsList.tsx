import React from "react";

export default function FriendsList() {
  const friends = [
    { name: "Hovs", streak: 15, online: true },
    { name: "Miqs", streak: 7, online: false },
    { name: "Ara jan Miqs", streak: 3, online: true },
    { name: "Artur", streak: 20, online: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">👥 Friends</h1>

        <ul className="divide-y divide-gray-200">
          {friends.map((f, i) => (
            <li key={i} className="flex justify-between items-center py-4">
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-sm text-gray-500">🔥 {f.streak}-day streak</p>
              </div>
              <span
                className={`w-3 h-3 rounded-full mr-2 ${
                  f.online ? "bg-green-500" : "bg-gray-400"
                }`}
                title={f.online ? "Online" : "Offline"}
              ></span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-center">
          <button className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600">
            ➕ Add Friend
          </button>
        </div>
      </div>
    </div>
  );
}