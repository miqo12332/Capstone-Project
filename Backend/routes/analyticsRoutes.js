// backend/routes/analyticsRoutes.js
import express from "express";
import { Habit, Progress } from "../models/index.js";

const router = express.Router();

/**
 * GET /api/analytics/progress?userId=123
 * Returns a rich analytics object:
 * {
 *   summary: {
 *     completionRate,
 *     peakDay: { date, completed, missed },
 *     streakLeader: { habitId, habitName, streak: { current, best } },
 *     habitLeaderboard: [...],
 *     dailyTrend: [{ date, completed, missed, net }]
 *   },
 *   habits: [
 *     {
 *       habitId,
 *       habitName,
 *       totals: { done, missed },
 *       successRate,
 *       streak: { current, best },
 *       bestDay,
 *       recent: { completionRate, done, missed },
 *       productivity: [{ date, completed, missed, net }]
 *     }
 *   ]
 * }
 */
router.get("/progress", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // Pull all rows for this user with the habit name
    const rows = await Progress.findAll({
      where: { user_id: userId },
      include: [{ model: Habit, as: "habit", attributes: ["id", "title"] }],
      order: [["progress_date", "ASC"], ["id", "ASC"]],
    });

    const perHabit = {}; // habitId -> aggregation bucket

    for (const r of rows) {
      const habitId = r.habit_id;
      const date = r.progress_date;
      const habitName = r.habit?.title || `Habit ${habitId}`;

      if (!perHabit[habitId]) {
        perHabit[habitId] = {
          habitName,
          byDate: {},
          totals: { done: 0, missed: 0 },
        };
      }

      const bucket = perHabit[habitId];
      const day = bucket.byDate[date] || { done: 0, missed: 0 };

      if (r.status === "done") {
        day.done += 1;
        bucket.totals.done += 1;
      } else if (r.status === "missed") {
        day.missed += 1;
        bucket.totals.missed += 1;
      }

      bucket.byDate[date] = day;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const allDailyTotals = {}; // date -> { completed, missed }

    const habits = Object.entries(perHabit).map(([hid, bucket]) => {
      const entries = Object.entries(bucket.byDate).sort((a, b) =>
        a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
      );

      let bestStreak = 0;
      let currentStreak = 0;
      let previousSuccessDate = null;
      let bestDay = null;
      let lastSuccessDate = null;

      const productivity = entries.map(([date, counts]) => {
        const completed = counts.done;
        const missed = counts.missed;
        const net = completed - missed;

        const daySummary = { date, completed, missed, net };

        if (!allDailyTotals[date]) {
          allDailyTotals[date] = { completed: 0, missed: 0 };
        }
        allDailyTotals[date].completed += completed;
        allDailyTotals[date].missed += missed;

        if (!bestDay || net > bestDay.net) {
          bestDay = { date, net, completed, missed };
        }

        const isSuccess = completed > missed && completed > 0;
        if (isSuccess) {
          const currentDate = new Date(date);
          if (previousSuccessDate) {
            const diff = Math.round(
              (currentDate - previousSuccessDate) / msPerDay
            );
            currentStreak = diff === 1 ? currentStreak + 1 : 1;
          } else {
            currentStreak = 1;
          }
          previousSuccessDate = currentDate;
          lastSuccessDate = currentDate;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          currentStreak = 0;
          previousSuccessDate = null;
        }

        return daySummary;
      });

      // If the last recorded day wasn't a success, the current streak should be 0
      if (!lastSuccessDate || productivity.length === 0) {
        currentStreak = 0;
      } else {
        const lastEntry = productivity[productivity.length - 1];
        const lastEntryDate = new Date(lastEntry.date);
        const diff = Math.round((lastEntryDate - lastSuccessDate) / msPerDay);
        if (diff !== 0) {
          currentStreak = 0;
        }
      }

      const totalChecks = bucket.totals.done + bucket.totals.missed;
      const successRate = totalChecks
        ? Math.round((bucket.totals.done / totalChecks) * 100)
        : 0;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const lastSeven = entries.filter(([date]) => {
        const current = new Date(date);
        current.setHours(0, 0, 0, 0);
        return current >= sevenDaysAgo;
      });

      const lastSevenDone = lastSeven.reduce(
        (sum, [, counts]) => sum + counts.done,
        0
      );
      const lastSevenMissed = lastSeven.reduce(
        (sum, [, counts]) => sum + counts.missed,
        0
      );
      const recentTotal = lastSevenDone + lastSevenMissed;
      const recentCompletionRate = recentTotal
        ? Math.round((lastSevenDone / recentTotal) * 100)
        : 0;

      return {
        habitId: Number(hid),
        habitName: bucket.habitName,
        totals: bucket.totals,
        successRate,
        streak: { current: currentStreak, best: bestStreak },
        bestDay: bestDay
          ? {
              date: bestDay.date,
              net: bestDay.net,
              completed: bestDay.completed,
              missed: bestDay.missed,
            }
          : null,
        recent: {
          completionRate: recentCompletionRate,
          done: lastSevenDone,
          missed: lastSevenMissed,
        },
        productivity,
      };
    });

    const totalDone = habits.reduce((sum, h) => sum + h.totals.done, 0);
    const totalMissed = habits.reduce((sum, h) => sum + h.totals.missed, 0);
    const totalCheckIns = totalDone + totalMissed;

    const dailyTrend = Object.entries(allDailyTotals)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, counts]) => ({
        date,
        completed: counts.completed,
        missed: counts.missed,
        net: counts.completed - counts.missed,
      }));

    const peakDay = dailyTrend.reduce((best, day) => {
      if (!best || day.completed > best.completed) return day;
      return best;
    }, null);

    const streakLeader = habits
      .filter((h) => h.streak.best > 0)
      .sort((a, b) => b.streak.best - a.streak.best || b.successRate - a.successRate)
      .at(0) || null;

    const habitLeaderboard = habits
      .filter((h) => h.totals.done + h.totals.missed > 0)
      .map((h) => ({
        habitId: h.habitId,
        habitName: h.habitName,
        successRate: h.successRate,
        totalCheckIns: h.totals.done + h.totals.missed,
        currentStreak: h.streak.current,
        bestStreak: h.streak.best,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    const summary = {
      totalHabits: habits.length,
      totalCheckIns,
      totalDone,
      totalMissed,
      completionRate: totalCheckIns
        ? Math.round((totalDone / totalCheckIns) * 100)
        : 0,
      peakDay,
      streakLeader,
      habitLeaderboard,
      dailyTrend,
    };

    res.json({ summary, habits });
  } catch (err) {
    console.error("❌ Failed to fetch progress analytics:", err);
    res.status(500).json({ error: "Failed to fetch progress analytics" });
  }
});

export default router;
