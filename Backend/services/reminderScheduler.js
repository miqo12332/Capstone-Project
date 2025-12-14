import { Op } from "sequelize"
import { User, UserSetting, Notification } from "../models/index.js"
import { EmailConfigError, sendEmail } from "../utils/emailService.js"

const lastSentByUser = new Map()

const parseTime = (timeString) => {
  if (!timeString) return null
  const [hourStr, minuteStr] = timeString.split(":")
  const hour = Number.parseInt(hourStr, 10)
  const minute = Number.parseInt(minuteStr, 10)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    // Handle values like "08:00:00" by retrying with the first two segments
    const [h, m] = timeString.split(":").slice(0, 2)
    const retryHour = Number.parseInt(h, 10)
    const retryMinute = Number.parseInt(m, 10)
    if (!Number.isFinite(retryHour) || !Number.isFinite(retryMinute)) return null
    return { hour: retryHour, minute: retryMinute }
  }

  return { hour, minute }
}

const getLocalTimeInfo = (timezone) => {
  const now = new Date()
  const safeZone = timezone || "UTC"

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: safeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
    const parts = formatter.formatToParts(now)
    const hour = Number(parts.find((part) => part.type === "hour")?.value || "0")
    const minute = Number(parts.find((part) => part.type === "minute")?.value || "0")
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: safeZone }).format(now)
    return { hour, minute, dateKey }
  } catch {
    // Invalid or unsupported time zone; fall back to UTC so reminders still send
    const utcHour = now.getUTCHours()
    const utcMinute = now.getUTCMinutes()
    const utcDateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(now)
    return { hour: utcHour, minute: utcMinute, dateKey: utcDateKey }
  }
}

const shouldSendReminderNow = (settings) => {
  const reminderTime = parseTime(settings.daily_reminder_time)
  if (!reminderTime) return null

  const { hour, minute, dateKey } = getLocalTimeInfo(settings.timezone)
  const nowMinutes = hour * 60 + minute
  const scheduledMinutes = reminderTime.hour * 60 + reminderTime.minute
  if (Number.isNaN(nowMinutes) || Number.isNaN(scheduledMinutes)) return null

  // Catch up reminders if the service was temporarily offline
  if (nowMinutes < scheduledMinutes) return null

  const persistedLastSend = settings.last_reminder_sent_date
  const memoryLastSend = lastSentByUser.get(settings.user_id)
  const alreadySentForDay = persistedLastSend === dateKey || memoryLastSend === dateKey
  if (alreadySentForDay) return null

  return dateKey
}

const buildEmailContent = (user, settings) => {
  const greetingName = user.name || "there"
  const scheduledTime = settings.daily_reminder_time
  const timezone = settings.timezone || "UTC"

  return {
    subject: "Your daily StepHabit reminder",
    text: `Hi ${greetingName},\n\nThis is your scheduled daily reminder from StepHabit. Take a moment to review today's plan and keep your streaks on track.\n\nReminder time: ${scheduledTime} (${timezone})\nDashboard: https://app.stephabit.com\n\nYou've got this!\n— The StepHabit Team`,
  }
}

export const dispatchDailyReminderEmails = async () => {
  const settings = await UserSetting.findAll({
    where: {
      email_alerts: true,
      daily_reminder_time: { [Op.ne]: null },
    },
    include: [{ model: User, as: "user" }],
  })

  for (const setting of settings) {
    const recipient = setting.user?.email
    if (!recipient) continue

    const reminderDateKey = shouldSendReminderNow(setting)
    if (!reminderDateKey) continue

    const { subject, text } = buildEmailContent(setting.user, setting)

    try {
      await sendEmail({ to: recipient, subject, text })
      lastSentByUser.set(setting.user_id, reminderDateKey)
      await setting.update({ last_reminder_sent_date: reminderDateKey })
      console.log(`📧 Sent reminder email to ${recipient}`)
    } catch (error) {
      if (error instanceof EmailConfigError) {
        console.warn("Email configuration missing; reminder emails are paused.")
        return
      }
      console.error(`Failed to send reminder to ${recipient}:`, error)
    }
  }
}

const scheduledWindowMinutes = 5

export const dispatchScheduledNotificationEmails = async () => {
  const now = new Date()
  const windowStart = new Date(now.getTime() - scheduledWindowMinutes * 60 * 1000)

  const notifications = await Notification.findAll({
    where: {
      scheduled_for: { [Op.ne]: null, [Op.lte]: now, [Op.gte]: windowStart },
      email_sent_at: { [Op.is]: null },
    },
    include: [{ model: User, as: "user" }],
  })

  for (const notification of notifications) {
    const recipient = notification.user?.email
    if (!recipient) continue

    const subject = notification.title || "StepHabit reminder"
    const text = notification.message || "You have an upcoming StepHabit reminder."

    try {
      await sendEmail({ to: recipient, subject, text })
      await notification.update({ email_sent_at: now })
      console.log(`📧 Sent scheduled notification email to ${recipient}`)
    } catch (error) {
      if (error instanceof EmailConfigError) {
        console.warn("Email configuration missing; scheduled notification emails are paused.")
        return
      }
      console.error(`Failed to send scheduled notification to ${recipient}:`, error)
    }
  }
}

let schedulerHandle = null

export const startReminderScheduler = () => {
  if (schedulerHandle) return schedulerHandle

  schedulerHandle = setInterval(() => {
    console.log("⏱️ Reminder scheduler tick")
    dispatchDailyReminderEmails().catch((error) =>
      console.error("Reminder scheduler error", error),
    )
    dispatchScheduledNotificationEmails().catch((error) =>
      console.error("Scheduled notification email error", error),
    )
  }, 60_000)

  return schedulerHandle
}
