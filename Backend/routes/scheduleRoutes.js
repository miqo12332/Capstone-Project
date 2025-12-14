// routes/scheduleRoutes.js
import express from "express";
import Schedule from "../models/Schedule.js";
import Habit from "../models/Habit.js";
import BusySchedule from "../models/BusySchedule.js";

const router = express.Router();

const WEEKDAY_LOOKUP = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseDateOnly = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const addDaysUtc = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const normalizeCustomDays = (customdays) => {
  const dayList = Array.isArray(customdays)
    ? customdays
    : typeof customdays === "string"
    ? customdays.split(",")
    : [];

  const indexes = [];

  dayList.forEach((day) => {
    const normalized = String(day || "").trim().toLowerCase();
    if (!normalized) return;
    const mapped = WEEKDAY_LOOKUP[normalized] ?? WEEKDAY_LOOKUP[normalized.slice(0, 3)];
    if (mapped === undefined) return;
    if (!indexes.includes(mapped)) indexes.push(mapped);
  });

  const labelString = indexes.map((idx) => WEEKDAY_LABELS[idx]).join(", ");
  return { indexes, labelString };
};

const buildOccurrences = (startDay, endDay, repeat, customdays) => {
  const startDate = parseDateOnly(startDay);
  const finalDate = parseDateOnly(endDay || startDay);

  if (!startDate || !finalDate) throw new Error("Invalid date range");
  if (finalDate < startDate) throw new Error("End date cannot be before start date");

  const pattern = repeat || "daily";
  const { indexes: customIndexes, labelString } = normalizeCustomDays(customdays);

  if (pattern === "custom" && customIndexes.length === 0)
    throw new Error("Select at least one day for a custom repeat");

  const occurrences = [];

  if (pattern === "custom") {
    let cursor = startDate;
    while (cursor <= finalDate) {
      if (customIndexes.includes(cursor.getUTCDay())) occurrences.push(formatDateOnly(cursor));
      cursor = addDaysUtc(cursor, 1);
    }
    return { occurrences, customLabel: labelString };
  }

  const step = pattern === "weekly" ? 7 : pattern === "every3days" ? 3 : 1;
  let cursor = startDate;
  while (cursor <= finalDate) {
    occurrences.push(formatDateOnly(cursor));
    cursor = addDaysUtc(cursor, step);
  }

  return { occurrences, customLabel: labelString };
};

// GET schedules for a user (joins Habit by habit_id) + busy events
router.get("/user/:userId", async (req, res) => {
  try {
    const [habitSchedules, busySchedules] = await Promise.all([
      Schedule.findAll({
        where: { user_id: req.params.userId },
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
        where: { user_id: req.params.userId },
        order: [["day", "ASC"], ["starttime", "ASC"]],
      }),
    ]);

    const mappedSchedules = habitSchedules.map((s) => ({
      ...s.toJSON(),
      type: "habit",
      custom_title: null,
    }));

    const mappedBusy = busySchedules.map((b) => ({
      ...b.toJSON(),
      type: "custom",
      habit: null,
      habit_id: null,
      custom_title: b.title,
    }));

    const combined = [...mappedSchedules, ...mappedBusy].sort((a, b) => {
      const dayA = new Date(a.day).getTime();
      const dayB = new Date(b.day).getTime();
      if (dayA !== dayB) return dayA - dayB;
      return (a.starttime || "").localeCompare(b.starttime || "");
    });

    res.json(combined);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ error: "Failed to fetch schedules", err });
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

    const trimmedTitle = (custom_title || "").trim();
    const scheduleType = type === "custom" || type === "busy" ? "custom" : "habit";

    if (scheduleType === "habit" && !habit_id) {
      return res.status(400).json({ error: "habit_id is required for habit schedules" });
    }

    if (scheduleType === "custom" && !trimmedTitle) {
      return res.status(400).json({ error: "Title is required for a busy event" });
    }

    const { occurrences, customLabel } = buildOccurrences(
      day,
      enddate,
      repeat,
      customdays
    );

    if (!occurrences.length) {
      return res
        .status(400)
        .json({ error: "No dates were generated for this repeat pattern" });
    }

    const repeatValue = repeat || "daily";
    const customdaysValue = repeatValue === "custom" ? customLabel : null;

    const basePayload = {
      user_id,
      day,
      starttime,
      endtime: endtime || null,
      enddate: enddate || null,
      repeat: repeatValue,
      customdays: customdaysValue,
      notes: notes || null,
    };

    if (scheduleType === "habit") {
      const payloads = occurrences.map((occurrenceDay) => ({
        ...basePayload,
        day: occurrenceDay,
        habit_id: Number(habit_id),
      }));

      const created = await Schedule.bulkCreate(payloads, { returning: true });

      return res.status(201).json(
        created.map((entry) => ({
          ...entry.toJSON(),
          type: "habit",
          custom_title: null,
        }))
      );
    }

    const payloads = occurrences.map((occurrenceDay) => ({
      ...basePayload,
      day: occurrenceDay,
      title: trimmedTitle,
    }));

    const createdBusy = await BusySchedule.bulkCreate(payloads, { returning: true });

    return res.status(201).json(
      createdBusy.map((entry) => ({
        ...entry.toJSON(),
        type: "custom",
        custom_title: trimmedTitle,
        habit: null,
      }))
    );
  } catch (err) {
    console.error("❌ Error creating schedule:", err);
    res.status(500).json({ error: "Failed to add schedule", "err": err });
  }
});

// DELETE schedule
router.delete("/:id", async (req, res) => {
  try {
    const { type } = req.query;

    if (type === "custom") {
      const deletedBusy = await BusySchedule.destroy({ where: { id: req.params.id } });
      if (deletedBusy) return res.json({ message: "Deleted" });
    }

    const deletedSchedule = await Schedule.destroy({ where: { id: req.params.id } });
    if (deletedSchedule) return res.json({ message: "Deleted" });

    const deletedBusy = await BusySchedule.destroy({ where: { id: req.params.id } });
    if (deletedBusy) return res.json({ message: "Deleted" });

    return res.status(404).json({ error: "Schedule not found" });
  } catch (err) {
    console.error("❌ Error deleting schedule:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

// UPDATE schedule
router.put("/:id", async (req, res) => {
  try {
    const { type } = req.query;
    const { day, starttime, endtime } = req.body;

    if (!day || !starttime) {
      return res.status(400).json({ error: "day and starttime are required" });
    }

    const payload = {
      day,
      starttime,
      endtime: endtime || null,
    };

    if (type === "custom") {
      const [updated] = await BusySchedule.update(payload, { where: { id: req.params.id } });
      if (!updated) return res.status(404).json({ error: "Schedule not found" });

      const busy = await BusySchedule.findByPk(req.params.id);
      return res.json({
        ...busy.toJSON(),
        type: "custom",
        habit: null,
        habit_id: null,
        custom_title: busy.title,
      });
    }

    const [updatedSchedule] = await Schedule.update(payload, {
      where: { id: req.params.id },
    });

    if (updatedSchedule) {
      const fresh = await Schedule.findByPk(req.params.id, {
        include: [
          {
            model: Habit,
            as: "habit",
            attributes: ["id", "title"],
            required: false,
          },
        ],
      });

      return res.json({
        ...fresh.toJSON(),
        type: "habit",
        custom_title: null,
      });
    }

    const [updatedBusy] = await BusySchedule.update(payload, { where: { id: req.params.id } });
    if (updatedBusy) {
      const busy = await BusySchedule.findByPk(req.params.id);
      return res.json({
        ...busy.toJSON(),
        type: "custom",
        habit: null,
        habit_id: null,
        custom_title: busy.title,
      });
    }

    return res.status(404).json({ error: "Schedule not found" });
  } catch (err) {
    console.error("❌ Error updating schedule:", err);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

export default router;