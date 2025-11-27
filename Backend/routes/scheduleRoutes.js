// routes/scheduleRoutes.js
import express from "express";
import Schedule from "../models/Schedule.js";
import Habit from "../models/Habit.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/user/:userId",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await User.findByPk(userId, { attributes: ["id"] });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const schedules = await Schedule.findAll({
      where: { userid: userId },
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title"],
          required: false,
        },
      ],
      order: [
        ["day", "ASC"],
        ["starttime", "ASC"],
      ],
    });
    res.json(schedules);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      habit_id,
      userid,
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

    if (!userid || !day || !starttime) {
      return res.status(400).json({ error: "userid, day and starttime are required" });
    }

    const user = await User.findByPk(userid, { attributes: ["id"] });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
          where: { user_id: userid, title },
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

    const created = await Schedule.create({
      habit_id: resolvedHabitId,
      userid,
      day,
      starttime,
      endtime: endtime || null,
      enddate: enddate || null,
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

    res.status(201).json(scheduleWithHabit || created);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const n = await Schedule.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ error: "Schedule not found" });
    res.json({ message: "Deleted" });
  })
);

export default router;
