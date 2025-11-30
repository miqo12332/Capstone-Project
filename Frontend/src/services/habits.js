// /src/services/habits.js
const BASE_URL = "http://localhost:5001/api/habits";

export const getHabits = async (userId) => {
  const res = await fetch(`${BASE_URL}/user/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch habits");
  return await res.json();
};


export const createHabit = async (habit) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(habit),
  });
  if (!res.ok) throw new Error("Failed to create habit");
  return await res.json();
};

export const updateHabit = async (id, habit) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(habit),
  });
  if (!res.ok) throw new Error("Failed to update habit");
  return await res.json();
};

export const deleteHabit = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete habit");
  return await res.json();
};