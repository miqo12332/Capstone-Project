import { Op } from "sequelize"
import { User, UserSetting } from "../models/index.js"
import { EmailConfigError, sendEmail } from "../utils/emailService.js"

const lastSentByUser = new Map()

const parseTime = (timeString) => {
  if (!timeString) return null
  const [hourStr, minuteStr] = timeString.split(":")
  const hour = Number.parseInt(hourStr, 10)
  const minute = Number.parseInt(minuteStr, 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return { hour, minute }
}

const getLocalTimeInfo = (timezone) => {
  const now = new Date()
  const safeZone = timezone || "UTC"
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
}

const shouldSendReminderNow = (settings) => {
  const reminderTime = parseTime(settings.daily_reminder_time)
  if (!reminderTime) return null

  const { hour, minute, dateKey } = getLocalTimeInfo(settings.timezone)
  if (reminderTime.hour !== hour || reminderTime.minute !== minute) return null
  if (lastSentByUser.get(settings.user_id) === dateKey) return null

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

let schedulerHandle = null

export const startReminderScheduler = () => {
  if (schedulerHandle) return schedulerHandle

  schedulerHandle = setInterval(() => {
    dispatchDailyReminderEmails().catch((error) =>
      console.error("Reminder scheduler error", error),
    )
  }, 60_000)

  return schedulerHandle
}
