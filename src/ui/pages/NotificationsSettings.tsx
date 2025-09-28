import React, { useState } from "react";

export default function NotificationsSettings() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState("Morning Run 🏃‍♂️");
  const [time, setTime] = useState("08:00");

  const handleSave = () => {
    alert(`✅ Notifications saved for ${selectedHabit} at ${time}`);
  };

  // Mock AI best time suggestion
  const suggestBestTime = () => {
    let suggestion = "08:00";
    if (selectedHabit.toLowerCase().includes("run")) suggestion = "07:00";
    else if (selectedHabit.toLowerCase().includes("read")) suggestion = "21:00";
    else if (selectedHabit.toLowerCase().includes("meditate")) suggestion = "06:30";

    setTime(suggestion);
    alert(`💡 AI suggests the best time for ${selectedHabit} is ${suggestion}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          🔔 Notifications Settings
        </h1>

        {/* Global Toggles */}
        <div className="space-y-4 mb-6">
          <label className="flex items-center justify-between p-3 border rounded">
            <span>Push Notifications</span>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={() => setPushEnabled(!pushEnabled)}
              className="h-5 w-5"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded">
            <span>Email Reminders</span>
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={() => setEmailEnabled(!emailEnabled)}
              className="h-5 w-5"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded">
            <span>SMS Notifications</span>
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={() => setSmsEnabled(!smsEnabled)}
              className="h-5 w-5"
            />
          </label>
        </div>

        {/* Habit-Specific Reminder */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Select Habit</label>
          <select
            value={selectedHabit}
            onChange={(e) => setSelectedHabit(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option>Morning Run 🏃‍♂️</option>
            <option>Read 10 Pages 📚</option>
            <option>Meditate 🧘</option>
          </select>
        </div>

        {/* Time Picker with AI Suggestion */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Reminder Time</label>
          <div className="flex space-x-2">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border rounded p-2"
            />
            <button
              type="button"
              onClick={suggestBestTime}
              className="bg-purple-500 text-white px-3 rounded hover:bg-purple-600"
            >
              AI
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            💡 Click AI to get the best time based on your habit type
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}