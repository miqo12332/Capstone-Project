import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ResponsiveContainer,
} from "recharts";

const allHabits = ["All Habits", "Reading", "Running", "Meditation"];

const weeklyData = [
  { day: "Mon", habits: 3 },
  { day: "Tue", habits: 4 },
  { day: "Wed", habits: 2 },
  { day: "Thu", habits: 5 },
  { day: "Fri", habits: 4 },
  { day: "Sat", habits: 6 },
  { day: "Sun", habits: 3 },
];

const monthlyData = [
  { week: "Week 1", completed: 15, missed: 5 },
  { week: "Week 2", completed: 18, missed: 2 },
  { week: "Week 3", completed: 20, missed: 1 },
  { week: "Week 4", completed: 16, missed: 4 },
];

export default function ReportsAnalytics() {
  const [selectedHabit, setSelectedHabit] = useState("All Habits");

  // Mock AI insights
  const aiInsights = {
    "All Habits": "🔥 You’re 20% more consistent this month than last.",
    Reading: "📚 Best reading streak is 5 days in a row. Try to push to 7!",
    Running: "🏃 You run best on weekends — maybe schedule harder runs then.",
    Meditation: "🧘 You’re most consistent in mornings. Keep it that way!",
  };

  const handleExportCSV = () => {
    alert("📂 Data exported as CSV (mock).");
  };

  const handleExportPDF = () => {
    alert("📄 Report exported as PDF (mock).");
  };

  // Mock trend calculation
  const trend =
    monthlyData[3].completed > monthlyData[0].completed
      ? "📈 Improving"
      : "📉 Declining";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          📊 Reports & Analytics
        </h1>

        {/* Habit Filter */}
        <div className="flex justify-between items-center mb-6">
          <select
            value={selectedHabit}
            onChange={(e) => setSelectedHabit(e.target.value)}
            className="border p-2 rounded"
          >
            {allHabits.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>

          <div className="space-x-2">
            <button
              onClick={handleExportCSV}
              className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Weekly Progress (Line Chart) */}
        <h2 className="text-lg font-semibold mb-2">
          Weekly Progress ({selectedHabit})
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="habits" stroke="#3b82f6" />
          </LineChart>
        </ResponsiveContainer>

        {/* Monthly Summary (Bar Chart) */}
        <h2 className="text-lg font-semibold mt-8 mb-2">Monthly Summary</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" fill="#10b981" />
            <Bar dataKey="missed" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>

        {/* AI Insights */}
        <div className="mt-8 p-4 bg-purple-50 border rounded">
          <h3 className="font-semibold text-purple-600">💡 AI Insights</h3>
          <p>{aiInsights[selectedHabit]}</p>
          <p className="mt-2 text-sm text-gray-500">Trend: {trend}</p>
        </div>
      </div>
    </div>
  );
}