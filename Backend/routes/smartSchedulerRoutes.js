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

const computeTimeline = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const bucket = map.get(row.progress_date) || { done: 0, missed: 0 };
    if (row.status === "done") bucket.done += 1;
    else if (row.status === "missed") bucket.missed += 1;
    map.set(row.progress_date, bucket);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, counts]) => ({
      date,
      completed: counts.done,
      missed: counts.missed,
    }));
};

const computeSuccessRate = (timeline) => {
  const totals = timeline.reduce(
    (acc, day) => {
      acc.done += day.completed;
      acc.missed += day.missed;
      return acc;
    },
    { done: 0, missed: 0 }
  );
  const total = totals.done + totals.missed;
  return {
    totals,
    rate: total ? Math.round((totals.done / total) * 100) : 0,
  };
};

const computeStreak = (timeline) => {
  let best = 0;
  let current = 0;
  let previousSuccess = null;

  for (const entry of timeline) {
    const success = entry.completed > entry.missed && entry.completed > 0;
    if (success) {
      const entryDate = new Date(entry.date);
      if (previousSuccess) {
        const diff = Math.round((entryDate - previousSuccess) / MS_PER_DAY);
        current = diff === 1 ? current + 1 : 1;
      } else {
        current = 1;
      }
      previousSuccess = entryDate;
      best = Math.max(best, current);
    } else {
      current = 0;
      previousSuccess = null;
    }
  }

  if (
    !timeline.length ||
    timeline[timeline.length - 1].completed <= timeline[timeline.length - 1].missed
  ) {
    current = 0;
  }

  return { current, best };
};

const mapSchedulesByDay = (schedules) => {
  const byDay = new Map();
  for (const sched of schedules) {
    const list = byDay.get(sched.day) || [];
    list.push(sched);
    byDay.set(sched.day, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => {
      if (a.starttime === b.starttime) {
        return (a.endtime || "") < (b.endtime || "") ? -1 : 1;
      }
      return a.starttime < b.starttime ? -1 : 1;
    });
  }
  return byDay;
};

const detectOverlaps = (byDay) => {
  const overlaps = [];
  for (const [day, list] of byDay.entries()) {
    let previous = null;
    for (const item of list) {
      if (!previous) {
        previous = item;
        continue;
      }
      const start = parseMinutes(item.starttime) ?? DAY_START_MINUTES;
      const end = parseMinutes(item.endtime) ?? start + 45;
      const prevStart = parseMinutes(previous.starttime) ?? DAY_START_MINUTES;
      const prevEnd = parseMinutes(previous.endtime) ?? prevStart + 45;
      if (start < prevEnd) {
        overlaps.push({
          day,
          first: previous,
          second: item,
          overlapMinutes: prevEnd - start,
        });
      }
      if (end > prevEnd) {
        previous = item;
      }
    }
  }
  return overlaps;
};

const findFreeWindows = (byDay) => {
  const windows = [];
  for (const [day, list] of byDay.entries()) {
    let cursor = DAY_START_MINUTES;
    for (const item of list) {
      const start = parseMinutes(item.starttime) ?? DAY_START_MINUTES;
      if (start > cursor) {
        windows.push({
          date: day,
          start: formatMinutes(cursor),
          end: formatMinutes(Math.min(start, DAY_END_MINUTES)),
          durationMinutes: Math.max(0, start - cursor),
        });
      }
      const end = parseMinutes(item.endtime) ?? start + 45;
      cursor = Math.max(cursor, end);
    }
    if (cursor < DAY_END_MINUTES) {
      windows.push({
        date: day,
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

const buildDensity = (byDay, today, days) => {
  const density = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(today.getTime() + i * MS_PER_DAY);
    const iso = toISODate(date);
    const items = byDay.get(iso) || [];
    const minutes = items.reduce((acc, item) => {
      const start = parseMinutes(item.starttime) ?? DAY_START_MINUTES;
      const end = parseMinutes(item.endtime) ?? start + 45;
      return acc + Math.max(0, end - start);
    }, 0);
    density.push({
      date: iso,
      entries: items.length,
      minutes,
    });
  }
  return density;
};

router.get("/insights", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const horizonDays = Math.min(Number(req.query.days) || 7, 21);
    const today = new Date();
    const startISO = toISODate(today);
    const endISO = toISODate(new Date(today.getTime() + (horizonDays - 1) * MS_PER_DAY));
    const thirtyDaysAgo = new Date(today.getTime() - 29 * MS_PER_DAY);

    const [habits, progressRows, schedules] = await Promise.all([
      Habit.findAll({
        where: { user_id: userId },
        attributes: ["id", "title", "category"],
        order: [["title", "ASC"]],
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
          day: { [Op.between]: [startISO, endISO] },
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

    const metricsByHabit = new Map();
    for (const habit of habits) {
      const rows = progressByHabit.get(habit.id) || [];
      const timeline = computeTimeline(rows);
      const streak = computeStreak(timeline);
      const { totals, rate } = computeSuccessRate(timeline);
      metricsByHabit.set(habit.id, {
        habitId: habit.id,
        name: habit.title,
        category: habit.category,
        timeline,
        streak,
        successRate: rate,
        totals,
      });
    }

    const schedulesByDay = mapSchedulesByDay(schedules);
    const overlaps = detectOverlaps(schedulesByDay);
    const freeWindows = findFreeWindows(schedulesByDay);
    const density = buildDensity(schedulesByDay, today, horizonDays);

    const upcoming = schedules.map((sched) => ({
      id: sched.id,
      habitId: sched.habit_id,
      title: sched.habit?.title || `Habit ${sched.habit_id}`,
      day: sched.day,
      starttime: sched.starttime,
      endtime: sched.endtime,
      repeat: sched.repeat,
      category: sched.habit?.category,
      successRate: metricsByHabit.get(sched.habit_id)?.successRate ?? null,
      streak: metricsByHabit.get(sched.habit_id)?.streak ?? null,
    }));

    const lowPerformers = habits
      .map((habit) => metricsByHabit.get(habit.id))
      .filter((metric) => metric)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 3);

    const suggestions = [];
    const claimedSlots = new Set();
    for (const metric of lowPerformers) {
      const candidateWindow = freeWindows.find((window) => {
        const key = `${window.date}-${window.start}`;
        if (claimedSlots.has(key)) return false;
        if (window.durationMinutes < 30) return false;
        claimedSlots.add(key);
        return true;
      });
      if (candidateWindow) {
        const confidence = Math.max(40, 100 - metric.successRate);
        suggestions.push({
          habitId: metric.habitId,
          habitName: metric.name,
          date: candidateWindow.date,
          start: candidateWindow.start,
          end: candidateWindow.end,
          durationMinutes: candidateWindow.durationMinutes,
          confidence,
          reason: `Success rate is ${metric.successRate}% — anchoring it in a free ${candidateWindow.durationMinutes}-minute block should boost consistency.`,
        });
      }
    }

    if (!suggestions.length && freeWindows.length && habits.length) {
      const metric = metricsByHabit.get(habits[0].id);
      const window = freeWindows[0];
      suggestions.push({
        habitId: metric?.habitId || habits[0].id,
        habitName: metric?.name || habits[0].title,
        date: window.date,
        start: window.start,
        end: window.end,
        durationMinutes: window.durationMinutes,
        confidence: 60,
        reason: "Prime window available — convert it into focused progress.",
      });
    }

    const summary = {
      totalHabits: habits.length,
      scheduledSessions: schedules.length,
      overlaps: overlaps.length,
      freeWindows: freeWindows.length,
    };

    res.json({
      generatedAt: new Date().toISOString(),
      horizonDays,
      summary,
      upcoming,
      overlaps,
      freeWindows,
      density,
      suggestions,
    });
  } catch (err) {
    console.error("❌ smart scheduler insights error", err);
    res.status(500).json({ error: "Failed to load smart scheduler insights" });
  }
});

router.post("/auto-plan", async (req, res) => {
  try {
    const { userId, habitId, day, starttime, endtime, notes } = req.body;
    if (!userId || !habitId || !day || !starttime) {
      return res
        .status(400)
        .json({ error: "userId, habitId, day and starttime are required" });
    }

    const habit = await Habit.findOne({
      where: { id: habitId, user_id: userId },
      attributes: ["id", "title"],
    });
    if (!habit) {
      return res.status(404).json({ error: "Habit not found for this user" });
    }

    const existing = await Schedule.findOne({
      where: {
        user_id: userId,
        habit_id: habitId,
        day,
        starttime,
      },
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "This habit is already scheduled for that time" });
    }

    const created = await Schedule.create({
      user_id: userId,
      habit_id: habitId,
      day,
      starttime,
      endtime: endtime || null,
      repeat: "once",
      customdays: null,
      notes: notes || "Created via Smart Scheduler",
    });

    const withHabit = await Schedule.findByPk(created.id, {
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title"],
        },
      ],
    });

    res.status(201).json(withHabit || created);
  } catch (err) {
    console.error("❌ smart scheduler auto-plan error", err);
    res.status(500).json({ error: "Failed to create smart schedule" });
  }
});

export default router;
