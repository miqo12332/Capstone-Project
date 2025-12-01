import express from "express";
import { Op } from "sequelize";
import {
  Habit,
  Progress,
  Schedule,
  UserSetting,
} from "../models/index.js";
import {
  habitLibraryBlueprint,
  libraryFacets,
  libraryCategories,
} from "../data/habitLibrary.js";

const router = express.Router();

const allCategories = libraryCategories;
const baseFacets = libraryFacets;

const filterHabits = ({ q, category, difficulty, timeframe, pillar }) => {
  return habitLibraryBlueprint.filter((habit) => {
    const matchesQuery = q
      ? `${habit.name} ${habit.description} ${habit.tags.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase())
      : true;
    const matchesCategory = category ? habit.category === category : true;
    const matchesDifficulty = difficulty ? habit.difficulty === difficulty : true;
    const matchesTimeframe = timeframe ? habit.timeframe === timeframe : true;
    const matchesPillar = pillar ? habit.pillar === pillar : true;

    return (
      matchesQuery &&
      matchesCategory &&
      matchesDifficulty &&
      matchesTimeframe &&
      matchesPillar
    );
  });
};

const buildSummary = (habits) => {
  if (!habits.length) {
    return {
      total: 0,
      averageDuration: 0,
      commonTimeframes: [],
      leadingCategory: null,
    };
  }

  const averageDuration = Math.round(
    habits.reduce((acc, habit) => acc + habit.duration, 0) / habits.length
  );

  const timeframeCounts = habits.reduce((acc, habit) => {
    acc[habit.timeframe] = (acc[habit.timeframe] || 0) + 1;
    return acc;
  }, {});

  const categoryCounts = habits.reduce((acc, habit) => {
    acc[habit.category] = (acc[habit.category] || 0) + 1;
    return acc;
  }, {});

  const commonTimeframes = Object.entries(timeframeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([time]) => time);

  const leadingCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)[0];

  return {
    total: habits.length,
    averageDuration,
    commonTimeframes,
    leadingCategory,
  };
};

const formatNotificationWindow = (dateString, timeString) => {
  if (!dateString) return null;
  const start = new Date(`${dateString}T${timeString || "00:00:00"}`);
  return Number.isNaN(start.getTime()) ? null : start;
};

router.get("/", (req, res) => {
  const filters = {
    q: req.query.q || "",
    category: req.query.category || "",
    difficulty: req.query.difficulty || "",
    timeframe: req.query.timeframe || "",
    pillar: req.query.pillar || "",
  };

  const habits = filterHabits(filters);
  const summary = buildSummary(habits);

  res.json({
    habits,
    summary,
    facets: baseFacets,
  });
});

router.get("/highlights", (req, res) => {
  const topTrending = [...habitLibraryBlueprint]
    .sort((a, b) => b.metrics.adoptionRate - a.metrics.adoptionRate)
    .slice(0, 3)
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      category: habit.category,
      metric: `${habit.metrics.adoptionRate}% adoption`,
      description: habit.description,
      insight: habit.insight,
    }));

  const recoveryFocus = habitLibraryBlueprint
    .filter((habit) => habit.category === "Wellness")
    .sort((a, b) => b.metrics.completion - a.metrics.completion)
    .slice(0, 2)
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      completion: habit.metrics.completion,
      duration: habit.duration,
    }));

  res.json({
    trending: topTrending,
    wellnessAnchors: recoveryFocus,
  });
});

router.get("/recommendations/:userId", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const [userHabits, recentProgress, settings] = await Promise.all([
      Habit.findAll({ where: { user_id: userId } }),
      Progress.findAll({
        where: { user_id: userId },
        order: [["progress_date", "DESC"]],
        limit: 50,
      }),
      UserSetting.findOne({ where: { user_id: userId } }),
    ]);

    const ownedTitles = new Set(
      userHabits.map((habit) => habit.title.toLowerCase())
    );
    const ownedCategories = new Set(
      userHabits.map((habit) => (habit.category || "").trim()).filter(Boolean)
    );

    const completionCounts = recentProgress.reduce(
      (acc, entry) => {
        const key = entry.status.toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { completed: 0, missed: 0 }
    );

    const totalLogged = completionCounts.completed + completionCounts.missed;
    const completionRate = totalLogged
      ? Math.round((completionCounts.completed / totalLogged) * 100)
      : null;

    const missingCategories = allCategories.filter(
      (category) => !ownedCategories.has(category)
    );

    const prioritizedCategories = missingCategories.length
      ? missingCategories
      : allCategories;

    const suggestions = habitLibraryBlueprint
      .filter((habit) => !ownedTitles.has(habit.name.toLowerCase()))
      .map((habit) => {
        const categoryReason = missingCategories.includes(habit.category)
          ? `Explore more ${habit.category.toLowerCase()} habits to balance your routine.`
          : `Pairs nicely with your existing focus on ${habit.category.toLowerCase()} goals.`;

        const timeframeHint = settings?.daily_reminder_time
          ? `Try stacking near your ${settings.daily_reminder_time} reminder.`
          : `Schedule it when your energy is highest.`;

        return {
          id: habit.id,
          name: habit.name,
          description: habit.description,
          category: habit.category,
          difficulty: habit.difficulty,
          timeframe: habit.timeframe,
          duration: habit.duration,
          benefits: habit.benefits,
          metrics: habit.metrics,
          sampleSchedule: habit.sampleSchedule,
          reason: `${categoryReason} ${timeframeHint}`.trim(),
        };
      })
      .sort((a, b) => b.metrics.adoptionRate - a.metrics.adoptionRate)
      .slice(0, 5);

    res.json({
      suggestions,
      context: {
        ownedHabitCount: userHabits.length,
        completionRate,
        missingCategories,
        nextFocusCategory: prioritizedCategories[0] || null,
      },
    });
  } catch (error) {
    console.error("Failed to build recommendations", error);
    res.status(500).json({ error: "Unable to build habit recommendations" });
  }
});

router.post("/:userId/refresh", async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const today = new Date();
    const horizon = new Date();
    horizon.setDate(today.getDate() + 7);

    const schedules = await Schedule.findAll({
      where: {
        user_id: userId,
        day: {
          [Op.between]: [
            today.toISOString().slice(0, 10),
            horizon.toISOString().slice(0, 10),
          ],
        },
      },
      include: [{ model: Habit, as: "habit" }],
    });

    const actionableWindows = schedules
      .map((schedule) => ({
        id: schedule.id,
        window: formatNotificationWindow(schedule.day, schedule.starttime),
        repeat: schedule.repeat,
        customdays: schedule.customdays,
        habitTitle: schedule.habit?.title || "Scheduled session",
      }))
      .filter((entry) => entry.window && entry.window.getTime() > today.getTime())
      .sort((a, b) => a.window.getTime() - b.window.getTime())
      .slice(0, 3);

    res.json({ windows: actionableWindows });
  } catch (error) {
    console.error("Failed to refresh habit library insights", error);
    res.status(500).json({ error: "Unable to refresh scheduling insights" });
  }
});

export default router;
