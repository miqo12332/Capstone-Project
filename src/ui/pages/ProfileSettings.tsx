import React, { useState } from "react";

export default function ProfileSettings() {
  const [username, setUsername] = useState("JohnDoe");
  const [email, setEmail] = useState("johndoe@example.com");
  const [timezone, setTimezone] = useState("GMT+4");
  const [darkMode, setDarkMode] = useState(false);
  const [googleSync, setGoogleSync] = useState(false);
  const [appleSync, setAppleSync] = useState(false);

  const handleSave = () => {
    alert("✅ Profile & sync settings updated successfully!");
  };

  const handleGoogleSync = () => {
    setGoogleSync(true);
    alert("🔗 Google account synced! (Calendar + Fit)");
  };

  const handleAppleSync = () => {
    setAppleSync(true);
    alert("🔗 Apple account synced! (Calendar + Health)");
  };

  return (
    <div
      className={`min-h-screen p-6 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50"
      }`}
    >
      <div
        className={`max-w-lg mx-auto p-6 rounded-lg shadow ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          👤 Profile Settings
        </h1>

        {/* Avatar */}
        <div className="mb-6 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gray-300 flex items-center justify-center text-3xl">
            {username[0]}
          </div>
          <button className="mt-2 text-sm text-blue-500 hover:underline">
            Change Avatar
          </button>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded p-2 text-black"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded p-2 text-black"
          />
        </div>

        {/* Timezone */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full border rounded p-2 text-black"
          >
            <option value="GMT-5">GMT-5 (New York)</option>
            <option value="GMT+0">GMT+0 (London)</option>
            <option value="GMT+4">GMT+4 (Yerevan)</option>
            <option value="GMT+9">GMT+9 (Tokyo)</option>
          </select>
        </div>

        {/* Dark Mode */}
        <div className="mb-6 flex items-center justify-between">
          <span>🌙 Dark Mode</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
            className="h-5 w-5"
          />
        </div>

        {/* Sync & Integrations */}
        <h2 className="text-xl font-bold text-purple-600 mb-3">
          🔗 Sync & Integrations
        </h2>
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleSync}
            className={`w-full py-2 rounded ${
              googleSync
                ? "bg-green-500 text-white"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {googleSync ? "✅ Google Synced" : "Sync with Google (Calendar + Fit)"}
          </button>

          <button
            onClick={handleAppleSync}
            className={`w-full py-2 rounded ${
              appleSync
                ? "bg-green-500 text-white"
                : "bg-gray-800 text-white hover:bg-gray-900"
            }`}
          >
            {appleSync ? "✅ Apple Synced" : "Sync with Apple (Calendar + Health)"}
          </button>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}