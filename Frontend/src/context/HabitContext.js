import React, { createContext, useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { API_BASE } from "../utils/apiConfig";

export const HabitContext = createContext();

export const HabitProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load habits from backend for the logged-in user
useEffect(() => {
  const fetchHabits = async () => {
    if (!user || !user.id) return; // ensure user is loaded
    try {
const res = await fetch(`${API_BASE}/habits?user_id=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setHabits(data);
    } catch (err) {
      console.error("❌ Failed to fetch habits:", err);
    } finally {
      setLoading(false);
    }
  };
  fetchHabits();
}, [user]);

  // Add a habit
  const addHabit = async (habitName, description = "") => {
    if (!user) return;

    try {
      const res = await fetch(`${API_BASE}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: habitName, description, user_id: user.id }),
      });

      if (!res.ok) throw new Error("Failed to add habit");
      const newHabit = await res.json();
      setHabits((prev) => [...prev, newHabit]);
    } catch (err) {
      console.error("❌ Failed to add habit:", err);
    }
  };

  return (
    <HabitContext.Provider value={{ habits, addHabit, loading }}>
      {children}
    </HabitContext.Provider>
  );
};