import React, { useState, useEffect } from "react";

export default function ThemeSettings() {
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme]);

  const handleSave = () => {
    alert(`✅ Theme set to ${theme}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6">
          🎨 Theme Settings
        </h1>

        {/* Theme Selector */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center p-3 border rounded cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === "light"}
              onChange={() => setTheme("light")}
              className="mr-2"
            />
            🌞 Light Mode
          </label>

          <label className="flex items-center p-3 border rounded cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
              className="mr-2"
            />
            🌙 Dark Mode
          </label>

          <label className="flex items-center p-3 border rounded cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={theme === "system"}
              onChange={() => setTheme("system")}
              className="mr-2"
            />
            💻 System Default
          </label>
        </div>

        {/* Preview */}
        <div className="mb-6 p-4 rounded border text-center">
          <p className="font-medium">
            Preview: {theme === "system" ? "Following system preference" : theme}
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Save Theme
        </button>
      </div>
    </div>
  );
}