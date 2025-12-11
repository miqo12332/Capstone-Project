// snapshotBuilder.js

import { Op } from "sequelize";
import { User, Habit, Progress as Completion, Schedule } from "../models/index.js";

const calculateRate = (done, total) =>
  total > 0 ? Math.round((done / total) * 100) : 0;

export async function buildSnapshot(userId) {
  if (!userId) throw new Error("userId is required.");

  const user = await User.findByPk(userId, {
    attributes: ["id", "name", "primary_goal", "focus_area", "daily_commitment", "support_preference"],
  });
  if (!user) throw new Error(`User ${userId} not found.`);

  const habits = await Habit.findAll({ where: { user_id: userId }, attributes: ["id", "title"] });
  const completions = await Completion.findAll({ where: { user_id: userId }, attributes: ["habit_id", "status"] });

  const now = new Date();
  const upcoming = await Schedule.findAll({
    where: { starttime: { [Op.gte]: now }, user_id: userId },
    include: [{ model: Habit, as: "habit", attributes: ["title"] }],
    order: [["starttime", "ASC"]],
    limit: 5,
  });

  const habitSummaries = habits.map(h => {
    const entries = completions.filter(c => c.habit_id === h.id);
    const done = entries.filter(e => ["completed", "done"].includes(e.status)).length;
    const missed = entries.filter(e => e.status === "missed").length;
    return {
      title: h.title,
      completionRate: calculateRate(done, done + missed),
      completed: done,
      missed,
    };
  });

  const totalCompleted = completions.filter(e => ["completed", "done"].includes(e.status)).length;

  return {
    user: {
      name: user.name,
      primary_goal: user.primary_goal,
      focus_area: user.focus_area,
      daily_commitment: user.daily_commitment,
      support_preference: user.support_preference,
    },
    progress: {
      completionRate: calculateRate(totalCompleted, completions.length),
      total: completions.length,
      habitSummaries,
    },
    schedules: {
      upcoming: upcoming.map(s => ({
        habitTitle: s.habit?.title || "",
        day: s.day || s.starttime.toISOString().split("T")[0],
        starttime: s.starttime,
        endtime: s.endtime,
      })),
    },
  };
}

export default buildSnapshot;
