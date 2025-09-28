import React, { useState } from "react";

export default function ExportData() {
  const [autoBackup, setAutoBackup] = useState(false);
  const [format, setFormat] = useState("CSV");

  const handleExport = () => {
    alert(`✅ Data exported as ${format}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          📂 Export & Backup Data
        </h1>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Choose Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="CSV">CSV (Excel)</option>
            <option value="PDF">PDF Report</option>
            <option value="JSON">JSON (Raw Data)</option>
          </select>
        </div>

        {/* Export Buttons */}
        <button
          onClick={handleExport}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Export Now
        </button>

        {/* Divider */}
        <hr className="my-6" />

        {/* Automatic Backup */}
        <div className="mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoBackup}
              onChange={() => setAutoBackup(!autoBackup)}
              className="h-5 w-5"
            />
            <span>Enable Automatic Weekly Backup</span>
          </label>
          {autoBackup && (
            <p className="text-sm text-gray-500 mt-2">
              🔄 Your data will be automatically exported every Sunday at 6 PM.
            </p>
          )}
        </div>

        {/* Cloud Backup */}
        <div className="space-y-3">
          <h2 className="font-semibold">☁️ Cloud Sync (Coming Soon)</h2>
          <button className="w-full bg-gray-200 text-gray-600 py-2 rounded cursor-not-allowed">
            Google Drive Sync
          </button>
          <button className="w-full bg-gray-200 text-gray-600 py-2 rounded cursor-not-allowed">
            iCloud Sync
          </button>
        </div>
      </div>
    </div>
  );
}