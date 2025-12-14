import express from "express";

import BusySchedule from "../models/BusySchedule.js";
import Habit from "../models/Habit.js";
import Schedule from "../models/Schedule.js";

const router = express.Router();

const TIMEZONE = "Asia/Yerevan";

const REQUIRED_FIELDS = ["title", "date", "startTime", "endTime"];

const clarificationPrompts = {
  title: "What's the event title?",
  date: "Which date should I book it for (YYYY-MM-DD)?",
  startTime: "What time does it start (HH:mm)?",
  endTime: "When does it end (HH:mm)?",
};

const toMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const buildScheduleList = async (userId) => {
  const [habitSchedules, busySchedules] = await Promise.all([
    Schedule.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title"],
          required: false,
        },
      ],
      order: [["day", "ASC"], ["starttime", "ASC"]],
    }),
    BusySchedule.findAll({
      where: { user_id: userId },
      order: [["day", "ASC"], ["starttime", "ASC"]],
    }),
  ]);

  const normalizedHabitSchedules = habitSchedules.map((schedule) => ({
    ...schedule.toJSON(),
    type: "habit",
    custom_title: null,
  }));

  const normalizedBusySchedules = busySchedules.map((busy) => ({
    ...busy.toJSON(),
    type: "custom",
    habit: null,
    habit_id: null,
    custom_title: busy.title,
  }));

  return [...normalizedHabitSchedules, ...normalizedBusySchedules];
};

const detectOverlaps = (entries, date, startTime, endTime) => {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes === null || endMinutes === null) return [];

  return entries
    .filter((entry) => entry.day === date)
    .filter((entry) => {
      const entryStart = toMinutes(entry.starttime);
      const entryEnd = toMinutes(entry.endtime || entry.starttime);

      if (entryStart === null || entryEnd === null) return false;

      return startMinutes < entryEnd && endMinutes > entryStart;
    })
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      title: entry.custom_title || entry.habit?.title || entry.notes || "Scheduled time",
      day: entry.day,
      starttime: entry.starttime,
      endtime: entry.endtime,
    }));
};

router.post("/", async (req, res) => {
  try {
    const { userId, title, date, startTime, endTime, notes = "" } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const schedules = await buildScheduleList(userId);
    const missing = REQUIRED_FIELDS.filter((field) => !req.body?.[field] || !String(req.body[field]).trim());

    if (missing.length) {
      const field = missing[0];
      return res.status(200).json({
        status: "clarify",
        message: clarificationPrompts[field] || `Please provide ${field}.`,
        missing,
        schedules,
        timezone: TIMEZONE,
      });
    }

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      return res.status(400).json({
        status: "error",
        message: "EVENT_NOT_CREATED\nReason: Start and end times must be in HH:mm format.",
      });
    }

    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        status: "error",
        message: "EVENT_NOT_CREATED\nReason: End time must be after start time.",
      });
    }

    const overlaps = detectOverlaps(schedules, date, startTime, endTime);

    const created = await BusySchedule.create({
      user_id: userId,
      title: title.trim(),
      day: date,
      starttime: startTime,
      endtime: endTime,
      enddate: date,
      repeat: "once",
      customdays: null,
      notes: notes?.trim() || null,
    });

    const message = [
      "EVENT_CREATED",
      `Title: ${title.trim()}`,
      `Date: ${date}`,
      `Time: ${startTime}–${endTime}`,
      `Timezone: ${TIMEZONE}`,
    ].join("\n");

    return res.status(201).json({
      status: "created",
      message,
      event: {
        id: created.id,
        title: created.title,
        day: created.day,
        starttime: created.starttime,
        endtime: created.endtime,
        timezone: TIMEZONE,
      },
      overlaps,
      schedules: [...schedules, { ...created.toJSON(), type: "custom", custom_title: created.title }],
    });
  } catch (error) {
    console.error("❌ schedule agent failed", error);
    return res.status(500).json({
      status: "error",
      message: "EVENT_NOT_CREATED\nReason: Unable to add the event right now.",
    });
  }
});

export default router;
