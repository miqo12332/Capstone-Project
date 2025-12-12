import express from "express";
import Progress from "../models/Progress.js";
import Habit from "../models/Habit.js";

const router = express.Router();

/**
 * NEW: Log a single press (+ or -)
 * Body: { userId: number, status: "done" | "missed" }
 * Each call inserts a NEW ROW for today.
 */
router.post("/:habitId/log", async (req, res) => {
  try {
    const { habitId } = req.params;
    const { userId, status, reason } = req.body;

    if (!userId || !["done", "missed"].includes(status)) {
      return res.status(400).json({ error: "userId and valid status required" });
    }

    if (status === "missed" && !reason?.trim()) {
      return res.status(400).json({ error: "Please share a short reflection for missed check-ins" });
    }

    const habit = await Habit.findByPk(habitId);
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const row = await Progress.create({
      user_id: userId,
      habit_id: habitId,
      status,                // 'done' or 'missed'
      reflection_reason: status === "missed" ? reason.trim() : null,
      progress_date: new Date(), // stored as DATE; time ignored by PG
    });

    res.status(201).json({ message: "Logged", row });
  } catch (err) {
    console.error("❌ /log error:", err);
    res.status(500).json({ error: "Failed to log progress" });
  }
});

/**
 * Update the number of logs for a specific status on a given day.
 * Body: { userId: number, status: "done" | "missed", targetCount: number, date?: string }
 * The optional date defaults to today (server timezone).
 */
router.put("/:habitId/logs", async (req, res) => {
  try {
    const { habitId } = req.params;
    const { userId, status, targetCount, date, note } = req.body;

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

    const targetDate = date ? new Date(date) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date provided" });
    }

    const isoDate = targetDate.toISOString().split("T")[0];

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

    const trimmedNote = note?.trim() || null;

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
          reflection_reason: trimmedNote,
        }))
      );
    } else if (existing.length > desiredCount) {
      const toRemove = existing.slice(0, existing.length - desiredCount);
      await Promise.all(toRemove.map((row) => row.destroy()));
    }

    if (desiredCount > 0 && existing.length > 0) {
      const latest = existing[0];
      if (latest.reflection_reason !== trimmedNote) {
        latest.reflection_reason = trimmedNote;
        await latest.save();
      }
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
  } catch (err) {
    console.error("❌ /logs update error:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

/**
 * Already had this: get today's progress for a user
 * (Dashboard uses this to build charts)
 */
router.get("/today/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // fetch ALL today's rows for this user
    const today = new Date().toISOString().split("T")[0];
    const rows = await Progress.findAll({
      where: { user_id: userId, progress_date: today },
      // include: [{ model: Habit }], // optional
      order: [["id", "ASC"]],
    });

    res.json(rows);
  } catch (err) {
    console.error("❌ /today error:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// Recent history for a user (used by Habits → History tab)
router.get("/history/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const entries = await Progress.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title", "category"],
        },
      ],
      order: [
        ["progress_date", "DESC"],
        ["created_at", "DESC"],
      ],
      limit: 50,
    });

    const mapped = entries.map((row) => ({
      id: row.id,
      habitId: row.habit_id,
      habitTitle: row.habit?.title || `Habit ${row.habit_id}`,
      category: row.habit?.category || null,
      status: row.status,
      reason: row.reflection_reason,
      progressDate: row.progress_date,
      createdAt: row.created_at,
    }));

    res.json(mapped);
  } catch (err) {
    console.error("❌ /history error:", err);
    res.status(500).json({ error: "Failed to load progress history" });
  }
});

/* (Optional) keep the old "done" route if you still use it elsewhere */
router.post("/:habitId/done", async (req, res) => {
  try {
    const { userId } = req.body;
    const { habitId } = req.params;

    const habit = await Habit.findByPk(habitId);
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const progress = await Progress.create({
      user_id: userId,
      habit_id: habitId,
      status: "done",
      progress_date: new Date(),
    });

    res.json({ message: "✅ Habit logged as done", progress });
  } catch (err) {
    console.error("❌ Mark done error:", err);
    res.status(500).json({ error: "Failed to log progress" });
  }
});

export default router;