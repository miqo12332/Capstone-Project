// snapshotBuilder.js

import { User, Habit, Progress as Completion, Schedule, BusySchedule } from "../models/index.js";

const calculateRate = (done, total) =>
  total > 0 ? Math.round((done / total) * 100) : 0;

const toDateTime = (day, time) => {
  if (!day || !time) return null;
  const safeDay = typeof day === "string" ? day : day.toISOString().split("T")[0];
  return new Date(`${safeDay}T${time}`);
};

export async function buildSnapshot(userId) {
  if (!userId) throw new Error("userId is required.");

  const user = await User.findByPk(userId, {
    attributes: ["id", "name", "primary_goal", "focus_area", "daily_commitment", "support_preference"],
  });
  if (!user) throw new Error(`User ${userId} not found.`);

  const habits = await Habit.findAll({ where: { user_id: userId }, attributes: ["id", "title"] });
  const completions = await Completion.findAll({ where: { user_id: userId }, attributes: ["habit_id", "status"] });

  const [habitSchedules, busyEvents] = await Promise.all([
    Schedule.findAll({
      where: { user_id: userId },
      include: [{ model: Habit, as: "habit", attributes: ["title"] }],
    }),
    BusySchedule.findAll({ where: { user_id: userId } }),
  ]);

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
      upcoming: [
        ...habitSchedules.map(s => ({
          type: "habit",
          habitTitle: s.habit?.title || "",
          title: s.habit?.title || "",
          day: s.day,
          starttime: s.starttime,
          endtime: s.endtime,
          startsAt: toDateTime(s.day, s.starttime),
        })),
        ...busyEvents.map(event => ({
          type: "busy",
          title: event.title,
          habitTitle: event.title,
          day: event.day,
          starttime: event.starttime,
          endtime: event.endtime,
          startsAt: toDateTime(event.day, event.starttime),
        })),
      ]
        .filter(item => item.startsAt && item.startsAt >= new Date())
        .sort((a, b) => a.startsAt - b.startsAt)
        .slice(0, 5)
        .map(({ startsAt, ...rest }) => rest),
    },
  };
}

export default buildSnapshot;
