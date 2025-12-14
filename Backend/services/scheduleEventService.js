import { Op } from "sequelize";
import sequelize from "../sequelize.js";
import { Habit, Schedule, BusySchedule } from "../models/index.js";

const TIMEZONE = "Asia/Yerevan";
const DAY_LENGTH_SECONDS = 24 * 60 * 60;

const normalizeTitle = (title) => (title || "").replace(/\s+/g, " ").trim();

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);

const resolveDay = (day) => {
  if (!day) return null;
  const normalized = String(day).trim().toLowerCase();

  if (normalized === "today") {
    return formatDate(new Date());
  }

  if (normalized === "tomorrow") {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    return formatDate(now);
  }

  const parsed = new Date(day);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDate(parsed);
};

const parseTimeToHms = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/);
  if (!match) return null;

  let [hours, minutes, seconds] = [match[1], match[2] || "00", match[3] || "00"]; // default seconds

  const h = Number(hours);
  const m = Number(minutes);
  const s = Number(seconds);
  if (h > 23 || m > 59 || s > 59) return null;

  const pad = (num) => num.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const toSeconds = (time) => {
  if (!time) return null;
  const [h, m, s] = time.split(":").map((part) => Number(part));
  return h * 3600 + m * 60 + (s || 0);
};

const formatTimeResponse = (time) => (time ? time.slice(0, 5) : null);

const detectOverlap = (newStart, newEnd, existingStart, existingEnd) => {
  const newStartSec = toSeconds(newStart);
  const newEndSec = newEnd ? toSeconds(newEnd) : null;
  const existingStartSec = toSeconds(existingStart);
  const existingEndSec = existingEnd ? toSeconds(existingEnd) : null;

  const startsBeforeExistingEnds = newStartSec < (existingEndSec ?? Infinity);
  const existingStartsBeforeNewEnds = existingStartSec < (newEndSec ?? Infinity);

  return startsBeforeExistingEnds && existingStartsBeforeNewEnds;
};

const buildEventSummary = (entry) => {
  const start = formatTimeResponse(entry.starttime) || "?";
  const end = formatTimeResponse(entry.endtime);
  const timeRange = end ? `${start}-${end}` : `${start}`;
  return `${entry.title || entry.habitTitle || "event"} at ${timeRange}`;
};

const findHabitMatch = async (userId, title) => {
  if (!userId || !title) return null;

  return Habit.findOne({
    where: {
      user_id: userId,
      title: { [Op.iLike]: title },
    },
  });
};

const findFreeSlots = (events, durationSeconds, searchStartSeconds = 0) => {
  if (!durationSeconds) return [];
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const suggestions = [];
  let cursor = Math.max(0, searchStartSeconds);

  for (const event of sorted) {
    const blockEnd = event.end ?? DAY_LENGTH_SECONDS;
    if (cursor < event.start && event.start - cursor >= durationSeconds) {
      suggestions.push({ start: cursor, end: cursor + durationSeconds });
      if (suggestions.length === 2) return suggestions;
    }
    cursor = Math.max(cursor, blockEnd);
  }

  if (DAY_LENGTH_SECONDS - cursor >= durationSeconds) {
    suggestions.push({ start: cursor, end: cursor + durationSeconds });
  }

  return suggestions.slice(0, 2);
};

const secondsToTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

const mergeEventsForDay = (habitSchedules, busySchedules) => {
  return [
    ...habitSchedules.map((sched) => ({
      id: sched.id,
      start: toSeconds(sched.starttime),
      end: sched.endtime ? toSeconds(sched.endtime) : null,
    })),
    ...busySchedules.map((event) => ({
      id: event.id,
      start: toSeconds(event.starttime),
      end: event.endtime ? toSeconds(event.endtime) : null,
    })),
  ];
};

const mapReason = (conflict) => {
  if (!conflict) return "Conflicts with an existing event";
  return `Conflicts with ${buildEventSummary(conflict)}.`;
};

export const createScheduleEvent = async (payload = {}) => {
  const userId = payload.user_id ?? payload.userid ?? payload.userId;
  const rawTitle = payload.title || payload.habit_title || payload.habitTitle;
  const dayInput = payload.day;
  const startInput = payload.starttime || payload.start_time || payload.start;
  const endInput = payload.endtime || payload.end_time || payload.end;
  const repeatInput = payload.repeat;
  const enddate = payload.enddate || payload.end_date || null;
  const customdays = payload.customdays || payload.custom_days || null;
  const notes = payload.notes || null;

  const title = normalizeTitle(rawTitle);
  if (!title) {
    return { status: "EVENT_NEEDS_INFO", question: "What is the event or habit title?" };
  }

  const day = resolveDay(dayInput);
  if (!day) {
    return { status: "EVENT_NEEDS_INFO", question: "Which date should I use (YYYY-MM-DD, today, or tomorrow)?" };
  }

  const starttime = parseTimeToHms(startInput);
  if (!starttime) {
    return { status: "EVENT_NEEDS_INFO", question: "What start time should I set? (HH:MM)" };
  }

  if (!endInput) {
    return { status: "EVENT_NEEDS_INFO", question: "What end time should I set for this event?" };
  }

  const endtime = parseTimeToHms(endInput);
  if (!endtime) {
    return { status: "EVENT_NEEDS_INFO", question: "What end time should I set? (HH:MM)" };
  }

  if (toSeconds(endtime) <= toSeconds(starttime)) {
    return { status: "EVENT_NEEDS_INFO", question: "End time must be after the start time. What end time should I use?" };
  }

  if (!userId) {
    return { status: "EVENT_NEEDS_INFO", question: "Which user is this for?" };
  }

  try {
    const habit = await findHabitMatch(userId, title);
    const repeat = repeatInput || "daily";

    const [habitSchedules, busySchedules] = await Promise.all([
      Schedule.findAll({
        where: { user_id: userId, day },
        include: [{ model: Habit, as: "habit", attributes: ["title"] }],
      }),
      BusySchedule.findAll({ where: { user_id: userId, day } }),
    ]);

    // Duplicate checks
    if (habit) {
      const duplicate = habitSchedules.find(
        (s) =>
          s.habit_id === habit.id &&
          s.starttime === starttime &&
          (s.endtime || null) === endtime &&
          s.day === day
      );
      if (duplicate) {
        return {
          status: "EVENT_CONFLICT",
          reason: "This habit is already scheduled for that time.",
          question: "Would you like to choose a different time?",
        };
      }
    } else {
      const duplicate = busySchedules.find(
        (b) =>
          b.title.toLowerCase() === title.toLowerCase() &&
          b.starttime === starttime &&
          (b.endtime || null) === endtime &&
          b.day === day
      );
      if (duplicate) {
        return {
          status: "EVENT_CONFLICT",
          reason: "This event already exists at that time.",
          question: "Do you want to schedule it for a different time?",
        };
      }
    }

    // Conflict detection across both tables
    const combinedEntries = [
      ...habitSchedules.map((s) => ({
        type: "habit",
        title: s.habit?.title || "Habit",
        habitTitle: s.habit?.title,
        starttime: s.starttime,
        endtime: s.endtime,
      })),
      ...busySchedules.map((b) => ({
        type: "busy",
        title: b.title,
        starttime: b.starttime,
        endtime: b.endtime,
      })),
    ];

    const conflicting = combinedEntries.find((entry) =>
      detectOverlap(starttime, endtime, entry.starttime, entry.endtime)
    );

    if (conflicting) {
      const durationSeconds = toSeconds(endtime) - toSeconds(starttime);
      const freeSlots = findFreeSlots(
        mergeEventsForDay(habitSchedules, busySchedules),
        durationSeconds,
        conflicting.endtime ? toSeconds(conflicting.endtime) : toSeconds(starttime)
      );

      const suggestions = freeSlots
        .map((slot) => `${secondsToTime(slot.start)}-${secondsToTime(slot.end)}`)
        .join(" or ");

      const followUp = suggestions
        ? `Would you like to try ${suggestions}?`
        : "What new time should I use?";

      return {
        status: "EVENT_CONFLICT",
        reason: mapReason(conflicting),
        question: followUp,
      };
    }

    const insertPayload = habit
      ? {
          habit_id: habit.id,
          user_id: userId,
          day,
          starttime,
          endtime,
          enddate,
          repeat,
          customdays: repeat === "custom" ? customdays || null : null,
          notes,
        }
      : {
          user_id: userId,
          title,
          day,
          starttime,
          endtime,
          enddate,
          repeat,
          customdays: repeat === "custom" ? customdays || null : null,
          notes,
        };

    const created = await sequelize.transaction(async (t) => {
      if (habit) {
        return Schedule.create(insertPayload, { transaction: t, returning: true });
      }
      return BusySchedule.create(insertPayload, { transaction: t, returning: true });
    });

    return {
      status: "EVENT_CREATED",
      table: habit ? "schedules" : "busy_schedules",
      id: created.id,
      title: habit ? habit.title : title,
      day,
      starttime: formatTimeResponse(starttime),
      endtime: formatTimeResponse(endtime),
      repeat: repeat || null,
    };
  } catch (error) {
    console.error("Failed to create schedule event", error);
    return { status: "EVENT_NOT_CREATED", reason: error?.message || "Database error" };
  }
};

export default createScheduleEvent;
