import React, { useState } from "react";

export default function AddHabit() {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [microStep, setMicroStep] = useState("");
  const [startDate, setStartDate] = useState("");

  // Mock AI micro-step suggestion
  const suggestMicroStep = () => {
    if (!name) {
      alert("Please enter a habit name first!");
      return;
    }

    let suggestion = "";
    if (name.toLowerCase().includes("run")) {
      suggestion = "Put on running shoes";
    } else if (name.toLowerCase().includes("read")) {
      suggestion = "Open a book and read 1 page";
    } else if (name.toLowerCase().includes("meditate")) {
      suggestion = "Sit quietly for 1 minute";
    } else if (name.toLowerCase().includes("pushup")) {
      suggestion = "Start with 10 pushups";
    } else {
      suggestion = `Start with 1 minute of ${name}`;
    }

    setMicroStep(suggestion);
  };

  // Mock AI frequency suggestion
  const suggestFrequency = () => {
    if (!name) {
      alert("Please enter a habit name first!");
      return;
    }

    let suggestion = "daily"; // default
    if (name.toLowerCase().includes("pushup")) {
      suggestion = "3 times per week"; // rest days needed
    } else if (name.toLowerCase().includes("run")) {
      suggestion = "3–4 times per week";
    } else if (name.toLowerCase().includes("gym")) {
      suggestion = "3–5 times per week";
    } else if (name.toLowerCase().includes("meditate") || name.toLowerCase().includes("read")) {
      suggestion = "daily"; // good daily habit
    }

    alert(`💡 Suggested frequency for "${name}": ${suggestion}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ name, frequency, microStep, startDate });
    alert("✅ Habit created successfully!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">➕ Add New Habit</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Habit Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="e.g. Pushups"
              required
            />
          </div>

          {/* Frequency + AI */}
          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <div className="flex space-x-2">
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
              <button
                type="button"
                onClick={suggestFrequency}
                className="bg-purple-500 text-white px-3 rounded hover:bg-purple-600"
              >
                AI
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Click <strong>AI</strong> to get a frequency suggestion
            </p>
          </div>

          {/* Micro Step + AI */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Starting Micro-Step
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={microStep}
                onChange={(e) => setMicroStep(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="e.g. Put on running shoes"
                required
              />
              <button
                type="button"
                onClick={suggestMicroStep}
                className="bg-purple-500 text-white px-3 rounded hover:bg-purple-600"
              >
                AI
              </button>
            </div>
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

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
          >
            Create Habit
          </button>
        </form>
      </div>
    </div>
  );
}