import React from "react";

export default function CalendarView() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const habits = [
    { name: "Morning Run 🏃‍♂️", days: ["Mon", "Wed", "Fri"] },
    { name: "Read 10 Pages 📚", days: ["Tue", "Thu", "Sat", "Sun"] },
    { name: "Meditate 🧘", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">📅 Weekly Habit Calendar</h1>

        <div className="grid grid-cols-7 gap-2 text-center">
          {days.map((day) => (
            <div key={day} className="font-semibold text-gray-700 border-b pb-2">
              {day}
            </div>
          ))}

          {days.map((day) => (
            <div key={day + "-slot"} className="min-h-[100px] border rounded p-2">
              {habits
                .filter((habit) => habit.days.includes(day))
                .map((habit, i) => (
                  <div
                    key={i}
                    className="bg-blue-100 text-blue-700 text-sm rounded px-2 py-1 mb-1"
                  >
                    {habit.name}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}