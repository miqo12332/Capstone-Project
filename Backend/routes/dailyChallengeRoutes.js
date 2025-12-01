import express from "express";
import { Op } from "sequelize";
import { Habit, Progress, Schedule } from "../models/index.js";

const router = express.Router();

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 22 * 60;

const toISODate = (date) => date.toISOString().split("T")[0];

const parseMinutes = (time) => {
  if (!time) return null;
  const [h, m] = time.split(":");
  const hours = Number.parseInt(h, 10);
  const minutes = Number.parseInt(m, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const formatMinutes = (minutes) => {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

const buildTimeline = (rows, todayISO) => {
  const timelineMap = new Map();

  for (const row of rows) {
    const date = row.progress_date;
    const current = timelineMap.get(date) || { done: 0, missed: 0 };
    if (row.status === "done") {
      current.done += 1;
    } else if (row.status === "missed") {
      current.missed += 1;
    }
    timelineMap.set(date, current);
  }

  const sorted = Array.from(timelineMap.entries()).sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  );

  let doneTotal = 0;
  let missedTotal = 0;
  let doneToday = 0;
  const timeline = sorted.map(([date, counts]) => {
    doneTotal += counts.done;
    missedTotal += counts.missed;
    if (date === todayISO) {
      doneToday = counts.done;
    }
    return {
      date,
      completed: counts.done,
      missed: counts.missed,
      net: counts.done - counts.missed,
    };
  });

  const totals = { done: doneTotal, missed: missedTotal };

  return { timeline, totals, doneToday };
};

const computeStreak = (timeline) => {
  let bestStreak = 0;
  let currentStreak = 0;
  let previousSuccessDate = null;

  for (const entry of timeline) {
    const success = entry.completed > entry.missed && entry.completed > 0;
    if (success) {
      const currentDate = new Date(entry.date);
      if (previousSuccessDate) {
        const diff = Math.round(
          (currentDate - previousSuccessDate) / MS_PER_DAY
        );
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      previousSuccessDate = currentDate;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
      previousSuccessDate = null;
    }
  }

  // If the last entry wasn't a success, streak resets
  if (!timeline.length || timeline[timeline.length - 1].completed <= timeline[timeline.length - 1].missed) {
    currentStreak = 0;
  }

  return { current: currentStreak, best: bestStreak };
};

const computeWeeklySummary = (timeline) => {
  const recent = timeline.slice(-7);
  const done = recent.reduce((sum, d) => sum + d.completed, 0);
  const missed = recent.reduce((sum, d) => sum + d.missed, 0);
  const total = done + missed;
  const completionRate = total ? Math.round((done / total) * 100) : 0;
  return { done, missed, completionRate };
};

const computeOpenWindows = (schedules) => {
  const byDate = new Map();
  for (const sched of schedules) {
    const list = byDate.get(sched.day) || [];
    list.push(sched);
    byDate.set(sched.day, list);
  }

  const windows = [];
  for (const [date, items] of byDate.entries()) {
    const sorted = items.sort((a, b) => {
      if (a.starttime === b.starttime) {
        return (a.endtime || "") < (b.endtime || "") ? -1 : 1;
      }
      return a.starttime < b.starttime ? -1 : 1;
    });

    let cursor = DAY_START_MINUTES;
    for (const item of sorted) {
      const start = parseMinutes(item.starttime) ?? DAY_START_MINUTES;
      const end = parseMinutes(item.endtime) ?? start + 60;
      if (start > cursor) {
        windows.push({
          date,
          start: formatMinutes(cursor),
          end: formatMinutes(Math.min(start, DAY_END_MINUTES)),
          durationMinutes: Math.max(0, start - cursor),
        });
      }
      cursor = Math.max(cursor, end);
    }

    if (cursor < DAY_END_MINUTES) {
      windows.push({
        date,
        start: formatMinutes(cursor),
        end: formatMinutes(DAY_END_MINUTES),
        durationMinutes: DAY_END_MINUTES - cursor,
      });
    }
  }

  return windows
    .filter((slot) => slot.durationMinutes >= 20)
    .sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date < b.date ? -1 : 1));
};

router.get("/summary", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const today = new Date();
    const todayISO = toISODate(today);
    const thirtyDaysAgo = new Date(today.getTime() - 29 * MS_PER_DAY);
    const horizon = new Date(today.getTime() + 6 * MS_PER_DAY);

    const [habits, progressRows, schedules] = await Promise.all([
      Habit.findAll({
        where: { user_id: userId },
        attributes: ["id", "title", "category", "description"],
        order: [["created_at", "ASC"]],
      }),
      Progress.findAll({
        where: {
          user_id: userId,
          progress_date: { [Op.gte]: toISODate(thirtyDaysAgo) },
        },
        include: [
          {
            model: Habit,
            as: "habit",
            attributes: ["id", "title"],
          },
        ],
        order: [["progress_date", "ASC"], ["id", "ASC"]],
      }),
      Schedule.findAll({
        where: {
          user_id: userId,
          day: { [Op.between]: [todayISO, toISODate(horizon)] },
        },
        include: [
          {
            model: Habit,
            as: "habit",
            attributes: ["id", "title", "category"],
          },
        ],
        order: [["day", "ASC"], ["starttime", "ASC"]],
      }),
    ]);

    const progressByHabit = new Map();
    for (const row of progressRows) {
      const list = progressByHabit.get(row.habit_id) || [];
      list.push(row);
      progressByHabit.set(row.habit_id, list);
    }

    const schedulesByHabit = new Map();
    for (const sched of schedules) {
      const list = schedulesByHabit.get(sched.habit_id) || [];
      list.push(sched);
      schedulesByHabit.set(sched.habit_id, list);
    }

    const habitMetrics = habits.map((habit) => {
      const rows = progressByHabit.get(habit.id) || [];
      const { timeline, totals, doneToday } = buildTimeline(rows, todayISO);
      const streak = computeStreak(timeline);
      const weekly = computeWeeklySummary(timeline);
      const totalChecks = totals.done + totals.missed;
      const successRate = totalChecks
        ? Math.round((totals.done / totalChecks) * 100)
        : 0;

      const nextSchedule = (schedulesByHabit.get(habit.id) || [])[0] || null;

      return {
        habitId: habit.id,
        name: habit.title,
        category: habit.category,
        description: habit.description,
        totals,
        timeline,
        doneToday,
        streak,
        weekly,
        successRate,
        nextSchedule: nextSchedule
          ? {
              id: nextSchedule.id,
              day: nextSchedule.day,
              starttime: nextSchedule.starttime,
              endtime: nextSchedule.endtime,
              repeat: nextSchedule.repeat,
              title: nextSchedule.habit?.title || habit.title,
            }
          : null,
      };
    });

    const overallToday = progressRows.reduce(
      (acc, row) => {
        if (row.progress_date === todayISO) {
          if (row.status === "done") acc.done += 1;
          else if (row.status === "missed") acc.missed += 1;
        }
        return acc;
      },
      { done: 0, missed: 0 }
    );

    const overallTotals = habitMetrics.reduce(
      (acc, metric) => {
        acc.done += metric.totals.done;
        acc.missed += metric.totals.missed;
        return acc;
      },
      { done: 0, missed: 0 }
    );
    const overallChecks = overallTotals.done + overallTotals.missed;
    const averageSuccess = overallChecks
      ? Math.round((overallTotals.done / overallChecks) * 100)
      : 0;

    const weeklyMomentum = habitMetrics.reduce(
      (acc, metric) => {
        acc.done += metric.weekly.done;
        acc.missed += metric.weekly.missed;
        return acc;
      },
      { done: 0, missed: 0 }
    );
    const weeklyTotal = weeklyMomentum.done + weeklyMomentum.missed;
    const weeklyRate = weeklyTotal
      ? Math.round((weeklyMomentum.done / weeklyTotal) * 100)
      : 0;

    const underperforming = habitMetrics
      .filter((m) => m.totals.done + m.totals.missed > 0)
      .sort((a, b) => a.successRate - b.successRate)[0];

    const upcoming = schedules[0];
    let focusMetric = underperforming || null;
    if (!focusMetric && upcoming) {
      focusMetric = habitMetrics.find((m) => m.habitId === upcoming.habit_id) || null;
    }
    if (!focusMetric && habitMetrics.length) {
      focusMetric = habitMetrics[0];
    }

    const focusTarget = focusMetric
      ? Math.max(1, focusMetric.doneToday) + 1
      : 1;

    const focusReason = focusMetric
      ? focusMetric.successRate < 70
        ? `This habit has a ${focusMetric.successRate}% success rate over the last month — let's turn it around today.`
        : focusMetric.doneToday === 0
        ? "No progress logged yet today. A quick win keeps your streak alive!"
        : `You're on a ${focusMetric.streak.current}-day streak. Keep the momentum with another successful check-in.`
      : "Pick any habit to focus on today.";

    const microChallenges = [];
    if (focusMetric) {
      microChallenges.push({
        id: `focus-${focusMetric.habitId}`,
        habitId: focusMetric.habitId,
        title: `Boost ${focusMetric.name}`,
        description: focusReason,
        targetLabel: `${focusTarget} wins`,
        progress: {
          current: focusMetric.doneToday,
          target: focusTarget,
          percent: Math.min(100, Math.round((focusMetric.doneToday / focusTarget) * 100)),
        },
        action: "done",
      });
    }

    if (weeklyRate < 80) {
      microChallenges.push({
        id: "momentum-gap",
        habitId: focusMetric?.habitId ?? null,
        title: "Momentum Maker",
        description: "Log two wins before dinner to close the gap in your weekly completion rate.",
        targetLabel: "2 quick sessions",
        progress: {
          current: Math.min(2, overallToday.done),
          target: 2,
          percent: Math.min(100, Math.round((overallToday.done / 2) * 100)),
        },
        action: "done",
      });
    }

    const bestStreak = habitMetrics
      .slice()
      .sort((a, b) => b.streak.current - a.streak.current)[0];
    if (bestStreak && (!focusMetric || bestStreak.habitId !== focusMetric.habitId)) {
      const streakTarget = Math.max(1, bestStreak.doneToday || 0);
      const streakPercent = streakTarget
        ? Math.min(100, Math.round((bestStreak.doneToday / streakTarget) * 100))
        : 0;
      microChallenges.push({
        id: `streak-${bestStreak.habitId}`,
        habitId: bestStreak.habitId,
        title: `${bestStreak.name} streak`,
        description: `Protect your ${bestStreak.streak.current}-day streak with at least one check-in today.`,
        targetLabel: "1 streak saver",
        progress: {
          current: bestStreak.doneToday,
          target: streakTarget,
          percent: streakPercent,
        },
        action: "done",
      });
    }

    const openWindows = computeOpenWindows(schedules).slice(0, 4);

    const insights = [];
    if (weeklyRate >= 80) {
      insights.push({
        title: "Consistency is strong",
        body: `You're completing ${weeklyRate}% of planned habits this week. Consider layering a micro-challenge onto ${focusMetric?.name || "your top habit"}.`,
      });
    } else {
      insights.push({
        title: "Rebuild the rhythm",
        body: `Weekly completion is ${weeklyRate}%. Anchoring today's focus habit to a scheduled window can quickly raise that average.`,
      });
    }

    if (openWindows.length) {
      const prime = openWindows[0];
      insights.push({
        title: "Perfect focus window",
        body: `${prime.date} has a ${prime.durationMinutes}-minute opening starting at ${prime.start}. Pair it with your focus habit for a reliable win.`,
      });
    }

    const leaderboard = habitMetrics
      .filter((m) => m.timeline.length)
      .sort((a, b) => b.streak.current - a.streak.current)
      .slice(0, 4)
      .map((m) => ({
        habitId: m.habitId,
        name: m.name,
        streak: m.streak,
        successRate: m.successRate,
        weekly: m.weekly,
      }));

    res.json({
      generatedAt: new Date().toISOString(),
      focusHabit: focusMetric
        ? {
            ...focusMetric,
            targetForToday: focusTarget,
            reason: focusReason,
          }
        : null,
      microChallenges,
      insights,
      leaderboard,
      opportunityWindows: openWindows,
      today: overallToday,
      stats: {
        totalHabits: habitMetrics.length,
        trackedHabits: habitMetrics.filter((m) => m.timeline.length).length,
        averageSuccess,
        weeklyRate,
      },
    });
  } catch (err) {
    console.error("❌ daily challenge summary error", err);
    res.status(500).json({ error: "Failed to load daily challenge" });
  }
});

export default router;
