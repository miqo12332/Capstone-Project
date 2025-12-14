/**
 * Email reminder scheduler for StepHabit.
 * Manual test notes:
 * - Configure SMTP_* env vars and create a schedule/busy_schedule row with today's date and upcoming starttime.
 * - Start the server, wait for the matching minute, and verify logs plus a new row in `notifications`.
 * - Remove SMTP settings to confirm the scheduler logs a warning but continues ticking.
 */
import { QueryTypes } from "sequelize";
import sequelize from "../sequelize.js";
import Notification from "../models/Notification.js";
import { sendEmail, EmailConfigError } from "../utils/emailService.js";

const TIME_ZONE = process.env.NOTIFY_TIME_ZONE || "Asia/Yerevan";
const TICK_INTERVAL_MS = 60 * 1000;

let schedulerHandle = null;
let emailConfigWarned = false;

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);

const formatTime = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

const normalizeTime = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    return value.slice(0, 5);
  }
  return formatTime(new Date(value));
};

const getCurrentDateTime = () => {
  const now = new Date();
  return {
    currentDate: formatDate(now),
    currentTime: formatTime(now),
  };
};

const buildSignature = (type, id, day, startTime, title) =>
  `[EMAIL_SENT] ${type} id=${id} day=${day} start=${startTime} title=${title || ""}`;

const fetchSchedulesForToday = async () => {
  return sequelize.query(
    `SELECT s.id, s.userid, s.day, s.starttime, h.title AS habit_title, u.email, u.name
     FROM schedules s
     JOIN habits h ON h.id = s.habit_id
     JOIN users u ON u.id = s.userid
     WHERE s.day = CURRENT_DATE;`,
    { type: QueryTypes.SELECT }
  );
};

const fetchBusySchedulesForToday = async () => {
  return sequelize.query(
    `SELECT b.id, b.userid, b.day, b.starttime, b.title, u.email, u.name
     FROM busy_schedules b
     JOIN users u ON u.id = b.userid
     WHERE b.day = CURRENT_DATE;`,
    { type: QueryTypes.SELECT }
  );
};

const hasNotificationForToday = async (userId, signature) => {
  const rows = await sequelize.query(
    `SELECT id FROM notifications
     WHERE user_id = :userId
       AND message = :signature
       AND DATE(created_at) = CURRENT_DATE
     LIMIT 1;`,
    {
      type: QueryTypes.SELECT,
      replacements: { userId, signature },
    }
  );

  return rows.length > 0;
};

const recordNotification = async (userId, signature, metadata = {}) => {
  await Notification.create({
    user_id: userId,
    message: signature,
    title: "Email reminder sent",
    type: "email",
    category: "reminder",
    priority: "medium",
    metadata,
    created_at: new Date(),
  });
};

const sendReminderEmail = async ({ to, subject, text }) => {
  try {
    await sendEmail({ to, subject, text });
    return true;
  } catch (err) {
    if (err instanceof EmailConfigError) {
      if (!emailConfigWarned) {
        console.warn(
          "[EmailScheduler] Email configuration missing. Set SMTP_* env vars to enable reminders.",
          err.message
        );
        emailConfigWarned = true;
      }
      return false;
    }

    console.error("[EmailScheduler] Failed to send email:", err);
    return false;
  }
};

const processSchedules = async (currentDate, currentTime) => {
  const schedules = await fetchSchedulesForToday();
  const due = schedules.filter(
    (item) => normalizeTime(item.starttime) === currentTime
  );

  for (const item of due) {
    const startTime = normalizeTime(item.starttime);
    const signature = buildSignature(
      "HABIT_SCHEDULE",
      item.id,
      currentDate,
      startTime,
      item.habit_title
    );

    const alreadySent = await hasNotificationForToday(item.userid, signature);
    if (alreadySent) {
      console.log(
        `[EmailScheduler] Skipping duplicate habit schedule id=${item.id} at ${startTime}.`
      );
      continue;
    }

    const subject = `Upcoming habit: ${item.habit_title}`;
    const text = `Hi ${item.name || "there"}, your habit "${item.habit_title}" starts at ${startTime} on ${currentDate}.`;

    const sent = await sendReminderEmail({ to: item.email, subject, text });
    if (sent) {
      await recordNotification(item.userid, signature, {
        habit_id: item.id,
        start_time: startTime,
        day: currentDate,
      });
      console.log(
        `[EmailScheduler] Sent habit reminder for id=${item.id} to ${item.email}.`
      );
    }
  }
};

const processBusySchedules = async (currentDate, currentTime) => {
  const busySchedules = await fetchBusySchedulesForToday();
  const due = busySchedules.filter(
    (item) => normalizeTime(item.starttime) === currentTime
  );

  for (const item of due) {
    const startTime = normalizeTime(item.starttime);
    const signature = buildSignature(
      "BUSY_EVENT",
      item.id,
      currentDate,
      startTime,
      item.title
    );

    const alreadySent = await hasNotificationForToday(item.userid, signature);
    if (alreadySent) {
      console.log(
        `[EmailScheduler] Skipping duplicate busy schedule id=${item.id} at ${startTime}.`
      );
      continue;
    }

    const subject = `Upcoming event: ${item.title}`;
    const text = `Hi ${item.name || "there"}, your event "${item.title}" starts at ${startTime} on ${currentDate}.`;

    const sent = await sendReminderEmail({ to: item.email, subject, text });
    if (sent) {
      await recordNotification(item.userid, signature, {
        busy_schedule_id: item.id,
        start_time: startTime,
        day: currentDate,
      });
      console.log(
        `[EmailScheduler] Sent busy schedule reminder for id=${item.id} to ${item.email}.`
      );
    }
  }
};

const tick = async () => {
  const { currentDate, currentTime } = getCurrentDateTime();
  console.log(`[EmailScheduler] Tick ${currentDate} ${currentTime}`);

  await processSchedules(currentDate, currentTime);
  await processBusySchedules(currentDate, currentTime);
};

export const startEmailScheduler = () => {
  if (schedulerHandle) {
    return;
  }

  tick().catch((err) => console.error("[EmailScheduler] Tick error:", err));
  schedulerHandle = setInterval(() => {
    tick().catch((err) => console.error("[EmailScheduler] Tick error:", err));
  }, TICK_INTERVAL_MS);
};

export default startEmailScheduler;
