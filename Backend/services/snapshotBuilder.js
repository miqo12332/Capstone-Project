// Helper to assemble the snapshot object expected by the Claude reasoning agent.
// This uses Sequelize models as an example; adjust field names to match your schema.

import { Op } from "sequelize";
import {
  User,
  Habit,
  Progress as Completion, // Alias to match the generic "Completion" concept
  Schedule,
} from "../models/index.js";

const calculateCompletionRate = (completed, total) => {
  if (!total || total <= 0) return 0;
  return Math.round((completed / total) * 100);
};

export async function buildSnapshot(userId) {
  if (!userId) {
    throw new Error("userId is required to build a snapshot");
  }

  // Load the core profile. Expand the fields to match your real columns.
  const user = await User.findByPk(userId, {
    attributes: ["id", "name", "primary_goal", "focus_area", "daily_commitment", "support_preference"],
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // Fetch habits and related progress. Replace field names to match your tables.
  const habits = await Habit.findAll({
    where: { user_id: userId },
    attributes: ["id", "title"],
  });

  const completions = await Completion.findAll({
    where: { user_id: userId },
    attributes: ["habit_id", "status"], // e.g., status could be "completed" or "missed"
  });

  const now = new Date();
  const upcomingSchedules = await Schedule.findAll({
    where: {
      starttime: { [Op.gte]: now },
    },
    include: [{ model: Habit, as: "habit", attributes: ["title"] }],
    order: [["starttime", "ASC"]],
    limit: 5,
  });

  const habitSummaries = habits.map((habit) => {
    const habitCompletions = completions.filter(
      (completion) => completion.habit_id === habit.id
    );

    const completedCount = habitCompletions.filter(
      (entry) => entry.status === "completed"
    ).length;
    const missedCount = habitCompletions.filter(
      (entry) => entry.status === "missed"
    ).length;
    const totalCount = completedCount + missedCount;

    return {
      title: habit.title,
      completionRate: calculateCompletionRate(completedCount, totalCount),
      completed: completedCount,
      missed: missedCount,
    };
  });

  const allCompleted = completions.filter((entry) => entry.status === "completed").length;
  const overallCompletionRate = calculateCompletionRate(allCompleted, completions.length);

  return {
    user: {
      name: user.name,
      primary_goal: user.primary_goal,
      focus_area: user.focus_area,
      daily_commitment: user.daily_commitment,
      support_preference: user.support_preference,
    },
    progress: {
      completionRate: overallCompletionRate,
      total: completions.length,
      habitSummaries,
    },
    schedules: {
      upcoming: upcomingSchedules.map((schedule) => ({
        habitTitle: schedule.habit?.title || "",
        day: schedule.day || schedule.starttime?.toISOString()?.split("T")[0],
        starttime: schedule.starttime,
        endtime: schedule.endtime,
      })),
    },
  };
}

export default buildSnapshot;
