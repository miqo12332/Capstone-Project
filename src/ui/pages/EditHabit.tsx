import React, { useState } from "react";

export default function EditHabit() {
  // Pretend we loaded an existing habit
  const [name, setName] = useState("Morning Run 🏃‍♂️");
  const [frequency, setFrequency] = useState("daily");
  const [microStep, setMicroStep] = useState("Put on running shoes");
  const [startDate, setStartDate] = useState("2025-01-01");
  const [problem, setProblem] = useState("");

  // Mock AI assistance function
  const suggestFix = () => {
    if (!problem) {
      alert("⚠️ Please describe your problem first.");
      return;
    }

    let newName = name;
    let newFrequency = frequency;
    let newMicroStep = microStep;

    if (problem.toLowerCase().includes("sore") && name.toLowerCase().includes("run")) {
      newFrequency = "3x_week"; // reduce running load
      newMicroStep = "Start with a 5-minute jog";
    } else if (problem.toLowerCase().includes("forget")) {
      newMicroStep = "Set a reminder alarm";
    } else if (problem.toLowerCase().includes("time")) {
      newMicroStep = "Do 5 pushups instead of 100";
      newFrequency = "3x_week";
    }

    setName(newName);
    setFrequency(newFrequency);
    setMicroStep(newMicroStep);

    alert("💡 AI has suggested changes to your habit!");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ name, frequency, microStep, startDate });
    alert("✅ Habit updated successfully!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-yellow-600 mb-6">
          ✏️ Edit Habit
        </h1>

        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Problem box */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Describe your problem
            </label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full border rounded p-2"
              rows={3}
              placeholder="e.g. I get sore legs from running daily"
            />
            <button
              type="button"
              onClick={suggestFix}
              className="mt-2 bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
            >
              AI Suggest Fix
            </button>
          </div>

          {/* Habit Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded p-2"
              required
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="daily">Daily</option>
              <option value="3x_week">3x per week</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Micro Step */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Starting Micro-Step
            </label>
            <input
              type="text"
              value={microStep}
              onChange={(e) => setMicroStep(e.target.value)}
              className="w-full border rounded p-2"
              required
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded p-2"
              required
            />
          </div>

          {/* Save Changes */}
          <button
            type="submit"
            className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}