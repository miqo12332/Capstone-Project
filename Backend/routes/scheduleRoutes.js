// routes/scheduleRoutes.js
import express from "express";
import Schedule from "../models/Schedule.js";
import Habit from "../models/Habit.js";

const router = express.Router();

const normalizeDateOnly = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const formatScheduleDates = (schedule) => {
  if (!schedule) return schedule;

  const plain = schedule.get ? schedule.get({ plain: true }) : schedule;

  return {
    ...plain,
    day: normalizeDateOnly(plain.day),
    enddate: normalizeDateOnly(plain.enddate),
  };
};

// GET schedules for a user (joins Habit by habit_id)
router.get("/user/:userId", async (req, res) => {
  try {
    const records = await Schedule.findAll({
      where: { user_id: req.params.userId },
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title"],
          required: false,
        },
      ],
      order: [["day", "ASC"]],
    });

    const schedules = records.map((schedule) => formatScheduleDates(schedule));

    res.json(schedules);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ error: "Failed to fetch schedules", "err": err });
  }
});

// POST create schedule (habit_id optional = custom event)
router.post("/", async (req, res) => {
  try {
    const {
      habit_id,
      user_id,
      day,
      starttime,
      endtime,
      enddate,
      repeat,
      customdays,
      notes,
      type,
      custom_title,
    } = req.body;

    if (!user_id || !day || !starttime) {
      return res.status(400).json({ error: "user_id, day and starttime are required" });
    }

    let resolvedHabitId = habit_id ? Number(habit_id) : null;

    if (!resolvedHabitId) {
      if (type === "custom") {
        const title = (custom_title || "").trim();
        if (!title) {
          return res
            .status(400)
            .json({ error: "custom_title is required when creating a custom schedule" });
        }

        const [habit] = await Habit.findOrCreate({
          where: { user_id, title },
          defaults: {
            description: notes || null,
            category: "custom",
          },
        });

        resolvedHabitId = habit.id;
      } else {
        return res.status(400).json({ error: "habit_id is required for habit schedules" });
      }
    }

    const normalizedDay = normalizeDateOnly(day);
    const normalizedEndDate = normalizeDateOnly(enddate);

    if (!normalizedDay) {
      return res.status(400).json({ error: "day must be a valid date" });
    }

    const created = await Schedule.create({
      habit_id: resolvedHabitId,
      user_id,
      day: normalizedDay,
      starttime,
      endtime: endtime || null,
      enddate: normalizedEndDate,
      repeat: repeat || "daily",
      customdays: repeat === "custom" ? customdays || null : null,
      notes: notes || null,
    });

    const scheduleWithHabit = await Schedule.findByPk(created.id, {
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title"],
        },
      ],
    });

    res.status(201).json(formatScheduleDates(scheduleWithHabit || created));
  } catch (err) {
    console.error("❌ Error creating schedule:", err);
    res.status(500).json({ error: "Failed to add schedule", "err": err });
  }
});

// DELETE schedule
router.delete("/:id", async (req, res) => {
  try {
    const n = await Schedule.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ error: "Schedule not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ Error deleting schedule:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

export default router;