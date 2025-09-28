import React, { useState } from "react";

interface TimeBlock {
  start: string;
  end: string;
  label: string;
}

export default function MyRoutine() {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    { start: "09:00", end: "17:00", label: "Work" },
    { start: "22:00", end: "07:00", label: "Sleep" },
  ]);

  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const addBlock = () => {
    if (newStart && newEnd && newLabel) {
      setTimeBlocks([...timeBlocks, { start: newStart, end: newEnd, label: newLabel }]);
      setNewStart("");
      setNewEnd("");
      setNewLabel("");
    }
  };

  const suggestHabitTime = () => {
    // Mock logic: suggest between 07:00–09:00 or 17:00–22:00 if free
    return "💡 AI Suggestion: Best time for habits is 07:30 AM or 06:30 PM";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">⏰ My Routine</h1>

        {/* Existing time blocks */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Your Busy Times</h2>
          <ul className="space-y-2">
            {timeBlocks.map((block, i) => (
              <li
                key={i}
                className="p-3 border rounded flex justify-between items-center bg-gray-50"
              >
                <span>
                  {block.label}: {block.start} → {block.end}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Add new time block */}
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Add a Busy Period</h2>
          <div className="flex space-x-2 mb-2">
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="border rounded p-2 flex-1"
            />
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="border rounded p-2 flex-1"
            />
          </div>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g., Gym, Classes"
            className="border rounded p-2 w-full mb-2"
          />
          <button
            onClick={addBlock}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            ➕ Add
          </button>
        </div>

        {/* AI Suggestion */}
        <div className="p-4 bg-purple-50 border rounded text-purple-700">
          {suggestHabitTime()}
        </div>
      </div>
    </div>
  );
}