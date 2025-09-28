import React, { useState } from "react";

export default function DeleteHabitModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    setIsOpen(false);
    alert("🗑 Habit deleted successfully!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Delete button to trigger modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        🗑 Delete Habit
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Confirm Delete
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this habit? <br />
              This action cannot be undone.
            </p>

            <div className="flex justify-between">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}