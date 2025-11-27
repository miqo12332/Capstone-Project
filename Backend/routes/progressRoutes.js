import express from "express";
import { Op } from "sequelize";
import Progress from "../models/Progress.js";
import Habit from "../models/Habit.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

const todayIso = () => new Date().toISOString().split("T")[0];

const normalizeDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
};

router.post(
  "/:habitId/log",
  asyncHandler(async (req, res) => {
    const { habitId } = req.params;
    const { userId, status } = req.body;

    if (!userId || !["done", "missed"].includes(status)) {
      return res.status(400).json({ error: "userId and valid status required" });
    }

    const habit = await Habit.findByPk(habitId);
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const row = await Progress.create({
      user_id: userId,
      habit_id: habitId,
      status,
      progress_date: todayIso(),
    });

    res.status(201).json({ message: "Logged", row });
  })
);

router.put(
  "/:habitId/logs",
  asyncHandler(async (req, res) => {
    const { habitId } = req.params;
    const { userId, status, targetCount, date } = req.body;

    if (!userId || !["done", "missed"].includes(status)) {
      return res.status(400).json({ error: "userId and valid status required" });
    }

    const desiredCount = Number.parseInt(targetCount, 10);
    if (Number.isNaN(desiredCount) || desiredCount < 0) {
      return res.status(400).json({ error: "targetCount must be a non-negative number" });
    }

    const habit = await Habit.findByPk(habitId);
    if (!habit) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const isoDate = normalizeDate(date);
    if (!isoDate) {
      return res.status(400).json({ error: "Invalid date provided" });
    }

    const existing = await Progress.findAll({
      where: {
        user_id: userId,
        habit_id: habitId,
        status,
        progress_date: isoDate,
      },
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
    });

    if (existing.length < desiredCount) {
      const missingCount = desiredCount - existing.length;
      const now = new Date();
      await Progress.bulkCreate(
        Array.from({ length: missingCount }).map(() => ({
          user_id: userId,
          habit_id: habitId,
          status,
          progress_date: isoDate,
          created_at: now,
        }))
      );
    } else if (existing.length > desiredCount) {
      const toRemove = existing.slice(0, existing.length - desiredCount);
      await Promise.all(toRemove.map((row) => row.destroy()));
    }

    const [doneCount, missedCount] = await Promise.all([
      Progress.count({
        where: {
          user_id: userId,
          habit_id: habitId,
          status: "done",
          progress_date: isoDate,
        },
      }),
      Progress.count({
        where: {
          user_id: userId,
          habit_id: habitId,
          status: "missed",
          progress_date: isoDate,
        },
      }),
    ]);

    res.json({
      message: "Progress updated",
      counts: { done: doneCount, missed: missedCount },
      date: isoDate,
    });
  })
);

router.get(
  "/today/:userId",
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    const rows = await Progress.findAll({
      where: { user_id: userId, progress_date: todayIso() },
      order: [["id", "ASC"]],
    });

    res.json(rows);
  })
);

router.post(
  "/:habitId/done",
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const { habitId } = req.params;

    const habit = await Habit.findByPk(habitId);
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const progress = await Progress.create({
      user_id: userId,
      habit_id: habitId,
      status: "done",
      progress_date: todayIso(),
    });

    res.json({ message: "✅ Habit logged as done", progress });
  })
);

router.get(
  "/:habitId/summary",
  asyncHandler(async (req, res) => {
    const { habitId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const totals = await Progress.findAll({
      where: { habit_id: habitId, user_id: userId, status: { [Op.in]: ["done", "missed"] } },
      attributes: ["status", [Progress.sequelize.fn("COUNT", Progress.sequelize.col("id")), "count"]],
      group: ["status"],
      order: [["status", "ASC"]],
    });

    const base = { done: 0, missed: 0 };
    totals.forEach((row) => {
      base[row.status] = Number(row.get("count"));
    });
    const total = base.done + base.missed;
    const successRate = total > 0 ? Math.round((base.done / total) * 100) : null;

    const lastEntry = await Progress.findOne({
      where: { habit_id: habitId, user_id: userId },
      order: [["progress_date", "DESC"], ["created_at", "DESC"]],
      attributes: ["progress_date"],
    });

    res.json({
      totals: base,
      successRate,
      lastEntryDate: lastEntry?.progress_date ?? null,
    });
  })
);

const buildDateStatusMap = (rows) => {
  return rows.reduce((acc, row) => {
    const date = row.progress_date;
    if (!acc[date]) {
      acc[date] = { done: 0, missed: 0 };
    }
    if (row.status === "done") acc[date].done += 1;
    if (row.status === "missed") acc[date].missed += 1;
    return acc;
  }, {});
};

const computeStreaks = (dateStatusMap) => {
  const today = todayIso();
  const dates = Object.keys(dateStatusMap).sort((a, b) => (a < b ? 1 : -1));

  let currentStreak = 0;
  let longestStreak = 0;
  let pointer = today;

  // Build a set for quick lookup
  const hasDate = new Set(dates);

  while (hasDate.has(pointer)) {
    const status = dateStatusMap[pointer];
    if (status.done > 0) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      break;
    }

    const prev = new Date(pointer);
    prev.setDate(prev.getDate() - 1);
    pointer = prev.toISOString().split("T")[0];
  }

  // Longest streak across all recorded dates
  let tempStreak = 0;
  const ordered = Object.keys(dateStatusMap).sort();
  ordered.forEach((d, idx) => {
    const status = dateStatusMap[d];
    if (status.done > 0) {
      tempStreak += 1;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }

    const next = ordered[idx + 1];
    if (next) {
      const currDate = new Date(d);
      currDate.setDate(currDate.getDate() + 1);
      const expected = currDate.toISOString().split("T")[0];
      if (expected !== next) {
        tempStreak = 0;
      }
    }
  });

  return { currentStreak, longestStreak };
};

router.get(
  "/:habitId/streak",
  asyncHandler(async (req, res) => {
    const { habitId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const rows = await Progress.findAll({
      where: {
        habit_id: habitId,
        user_id: userId,
        status: { [Op.in]: ["done", "missed"] },
      },
      attributes: ["progress_date", "status"],
      order: [["progress_date", "DESC"], ["created_at", "DESC"]],
    });

    const dateStatusMap = buildDateStatusMap(rows);
    const streaks = computeStreaks(dateStatusMap);

    res.json({
      ...streaks,
      lastUpdated: rows[0]?.progress_date ?? null,
    });
  })
);

export default router;
