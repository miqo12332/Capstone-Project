import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { QueryTypes } from "sequelize";

import sequelize from "../sequelize.js";
import { buildHabitSuggestion, detectConfirmation, detectHabitIdea } from "../utils/habitNlp.js";
import {
  Achievement,
  CalendarEvent,
  Friend,
  GroupChallenge,
  Habit,
  Notification,
  Progress,
  Schedule,
  User,
  UserSetting,
  BusySchedule,
} from "../models/index.js";
import { findPendingHabitSuggestion, getChatHistory } from "./memoryService.js";

const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620";
const FALLBACK_CLAUDE_MODEL = process.env.CLAUDE_FALLBACK_MODEL || "claude-3-haiku-20240307";
const MESSAGE_HISTORY_LIMIT = 12;

const resolveApiKey = () =>
  process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || null;

const normalizeTableName = (entry) => {
  if (!entry) return "unknown";
  if (typeof entry === "string") return entry;
  return entry.tableName || entry.table_name || "unknown";
};

const describeTables = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const rawTables = await queryInterface.showAllTables();
  const tableNames = rawTables.map(normalizeTableName);

  const definitions = [];

  for (const name of tableNames) {
    try {
      const columns = await queryInterface.describeTable(name);
      const rows = await sequelize.query(`SELECT COUNT(*) as count FROM ${name};`, {
        type: QueryTypes.SELECT,
      });

      definitions.push({
        name,
        rowCount: parseInt(rows?.[0]?.count, 10) || 0,
        columns: Object.entries(columns || {}).map(([columnName, detail]) => ({
          name: columnName,
          type: detail?.type || "unknown",
          allowNull: Boolean(detail?.allowNull),
        })),
      });
    } catch (error) {
      console.error("Failed to describe table", name, error);
    }
  }

  return definitions;
};

const mapHabit = (habit) => ({
  id: habit.id,
  title: habit.title,
  category: habit.category,
  goal: habit.goal,
  progressLogs: (habit.progressLogs || []).length,
  schedules: (habit.schedules || []).map((s) => ({
    id: s.id,
    day: s.day,
    starttime: s.starttime,
    endtime: s.endtime,
  })),
});

const mapBusySchedule = (entry) => ({
  id: entry.id,
  title: entry.title,
  day: entry.day,
  starttime: entry.starttime,
  endtime: entry.endtime,
  repeat: entry.repeat,
  notes: entry.notes,
});

const loadUserContext = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      { model: Habit, as: "habits", include: [{ model: Schedule, as: "schedules" }, { model: Progress, as: "progressLogs" }] },
      { model: Notification, as: "notifications" },
      { model: Achievement, as: "achievements" },
      { model: UserSetting, as: "settings" },
      { model: CalendarEvent, as: "calendarEvents" },
      { model: BusySchedule, as: "busySchedules" },
      {
        model: User,
        as: "friends",
        through: { model: Friend, attributes: ["status", "created_at", "share_habits"] },
      },
      { model: GroupChallenge, as: "groupChallenges" },
    ],
  });

  if (!user) return null;

  const plain = user.get({ plain: true });

  return {
    profile: {
      id: plain.id,
      name: plain.name,
      email: plain.email,
      primary_goal: plain.primary_goal,
      focus_area: plain.focus_area,
      daily_commitment: plain.daily_commitment,
      support_preference: plain.support_preference,
    },
    habits: (plain.habits || []).map(mapHabit),
    notifications: (plain.notifications || []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      scheduled_for: n.scheduled_for,
    })),
    achievements: (plain.achievements || []).map((a) => ({ id: a.id, name: a.name })),
    settings: plain.settings || null,
    calendarEvents: (plain.calendarEvents || []).map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
    })),
    friends: (plain.friends || []).map((friend) => ({
      id: friend.id,
      name: friend.name,
      email: friend.email,
      status: friend.Friend?.status || null,
      connected_since: friend.Friend?.created_at || null,
      share_habits: friend.Friend?.share_habits ?? null,
    })),
    groupChallenges: (plain.groupChallenges || []).map((challenge) => ({
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
    })),
    busySchedules: (plain.busySchedules || []).map(mapBusySchedule),
  };
};

const formatTableSummary = (tables) =>
  tables
    .map((table) => {
      const columns = table.columns.map((c) => `${c.name} (${c.type})`).join(", ");
      return `${table.name} [${table.rowCount} rows]: ${columns}`;
    })
    .join("\n");

const analyzeHabitIntent = (message, history = []) => {
  const normalized = (message || "").trim();
  const lower = normalized.toLowerCase();
  const pendingSuggestion = findPendingHabitSuggestion(history);

  if (!normalized) {
    return { intent: "chat", habitSuggestion: null, reply: null };
  }

  if (detectConfirmation(lower) && pendingSuggestion) {
    return {
      intent: "confirm-add",
      habitSuggestion: pendingSuggestion,
      reply: null,
    };
  }

  if (detectHabitIdea(lower)) {
    return {
      intent: "suggest",
      habitSuggestion: null,
      reply: null,
    };
  }

  return { intent: "chat", habitSuggestion: null, reply: null };
};

const toChatMessage = (entry) => {
  if (!entry?.content) return null;
  return entry.role === "assistant"
    ? new AIMessage(entry.content)
    : new HumanMessage(entry.content);
};

const summarizeRecentTopics = (history) => {
  const userMessages = (history || [])
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content);

  if (!userMessages.length) return null;

  const lastTwo = userMessages.slice(-2);
  return lastTwo.join(" | ");
};

const fallbackReply = ({ message, userContext, dbOverview, history }) => {
  const habits = userContext?.habits || [];
  const habitTitles = habits.map((h) => h.title).filter(Boolean);
  const primaryGoal = userContext?.profile?.primary_goal || "your goals";
  const tablesMention = dbOverview?.length ? dbOverview.map((t) => t.name).join(", ") : "the database";
  const recentTopics = summarizeRecentTopics(history);

  const habitLine = habitTitles.length
    ? `I'm tracking ${habitTitles.length} of your habits, like ${habitTitles.slice(0, 3).join(", ")}.`
    : "I don't see any saved habits yet, but I can help you plan the first one.";

  const topicLine = recentTopics
    ? `You recently asked about ${recentTopics}.`
    : "We can start fresh—tell me what's on your mind.";

  return [
    `Got it: "${message}". Here's how I can help while we chat naturally:`,
    habitLine,
    `I'm aware of tables such as ${tablesMention} and your primary goal is ${primaryGoal}.`,
    topicLine,
    "What would you like to explore next?",
  ].join(" ");
};

const buildChatMessages = ({ systemInstruction, history, message }) => {
  const conversation = (history || [])
    .filter((entry) => ["user", "assistant"].includes(entry.role))
    .slice(-MESSAGE_HISTORY_LIMIT)
    .map(toChatMessage)
    .filter(Boolean);

  if (message && (!history?.length || history[history.length - 1]?.role !== "user")) {
    conversation.push(new HumanMessage(message));
  }

  return [new SystemMessage(systemInstruction), ...conversation];
};

const buildConversationMessages = (history) =>
  (history || [])
    .filter((entry) => ["user", "assistant"].includes(entry.role))
    .slice(-MESSAGE_HISTORY_LIMIT)
    .map(toChatMessage)
    .filter(Boolean);

const parseProgressDecision = (raw) => {
  if (!raw) return null;

  try {
    const cleaned = raw.trim().replace(/```(json)?/g, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const target = jsonStart >= 0 && jsonEnd >= 0 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(target);

    if (parsed.action !== "log-progress") return null;

    const habitId = Number.parseInt(parsed.habitId, 10);
    const status = ["done", "missed"].includes(parsed.status) ? parsed.status : null;

    if (!habitId || !status) return null;

    return {
      habitId,
      status,
      note: parsed.note?.trim() || null,
      userReply: parsed.userReply?.trim() || null,
    };
  } catch (error) {
    console.error("Failed to parse progress decision", error?.message || error);
    return null;
  }
};

const requestClaudeProgressDecision = async ({ message, userContext, history }) => {
  const habits = userContext?.habits || [];
  if (!habits.length) return null;

  const habitSummaries = habits.map((h) => ({
    id: h.id,
    title: h.title,
    goal: h.goal || null,
    targetReps: h.targetReps || null,
  }));

  const systemInstruction = [
    "You are Claude, the StepHabit AI coach that can log progress.",
    "If the user reports doing or missing a habit, choose the best matching habitId from the provided list and decide status",
    "based on whether they met the goal/target reps. Partial or below-goal updates should be treated as missed with a warm",
    "note acknowledging effort.",
    "Respond ONLY with JSON in the shape: { action: 'log-progress', habitId: number, status: 'done' | 'missed', note: str",
    "ing | null, userReply: string }. The userReply should be a friendly one-sentence acknowledgment that you generated.",
    "Use the note field to briefly capture what happened (e.g., partial completion) in natural language. Do not include mark",
    "down.",
    `Known habits: ${JSON.stringify(habitSummaries)}`,
  ].join("\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    [
      "Decide if this message should log progress for a known habit. If it doesn't match, respond with { action: 'none' }.",
      `User message: ${message}`,
    ].join("\n")
  );

  const reply = await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt]);
  return parseProgressDecision(reply);
};

const normalizeTimeString = (value) => {
  if (!value && value !== 0) return null;

  const raw = `${value}`.trim();
  if (!raw) return null;

  const ampmMatch = raw.match(/(am|pm)/i);
  const numericParts = raw.split(/[^0-9]/).filter(Boolean);

  const hourPart = numericParts[0];
  const minutePart = numericParts[1] || "0";

  if (!hourPart) return null;

  let hour = Number.parseInt(hourPart, 10);
  let minute = Number.parseInt(minutePart, 10) || 0;

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (ampmMatch) {
    const suffix = ampmMatch[1].toLowerCase();
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const normalizeIsoDate = (value) => {
  if (!value) return null;
  const [datePart] = `${value}`.trim().split(/[T\s]/);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart || "")) return null;
  return datePart;
};

const normalizeScheduleDecision = (decision) => {
  if (!decision) return null;

  const day = normalizeIsoDate(decision.day);
  const starttime = normalizeTimeString(decision.starttime);
  const endtime = normalizeTimeString(decision.endtime);

  if (!day || !starttime) return null;

  return { ...decision, day, starttime, endtime };
};

const parseScheduleDecision = (raw) => {
  if (!raw) return null;

  try {
    const cleaned = raw.trim().replace(/```(json)?/g, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const target = jsonStart >= 0 && jsonEnd >= 0 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(target);

    if (parsed.action !== "create-schedule") return null;

    const typeRaw = parsed.type || parsed.kind || parsed.scheduleType;
    const type = typeRaw === "habit" ? "habit" : typeRaw === "busy" ? "busy" : null;

    const day = (parsed.day || parsed.date || parsed.dayDate || parsed.calendarDate)?.trim();
    const starttime =
      parsed.starttime || parsed.start_time || parsed.start || parsed.startTime || parsed.time || null;
    const endtime =
      parsed.endtime || parsed.end_time || parsed.end || parsed.endTime || parsed.finish || parsed.until || null;

    const title = (parsed.title || parsed.name || parsed.custom_title || parsed.summary || "").trim();
    const repeat = (parsed.repeat || parsed.recurrence || parsed.frequency || "once").trim();
    const customdays = (parsed.customdays || parsed.custom_days || parsed.days || "").trim() || null;
    const notes = (parsed.notes || parsed.note || parsed.description || "").trim() || null;
    const userReply = (parsed.userReply || parsed.reply || "").trim() || null;
    const habitId =
      parsed.habitId || parsed.habit_id || parsed.habit?.id || parsed.habitIdRaw || parsed.habitRef || null;

    if (!type || !day || !starttime) return null;
    if (type === "habit" && !habitId) return null;
    if (type === "busy" && !title) return null;

    const normalized = normalizeScheduleDecision({
      type,
      habitId: habitId ? Number.parseInt(habitId, 10) : null,
      title: title || null,
      day,
      starttime,
      endtime,
      repeat,
      customdays,
      notes,
      userReply,
    });

    return normalized;
  } catch (error) {
    console.error("Failed to parse schedule decision", error?.message || error);
    return null;
  }
};

const MIN_DEFAULT_DURATION = 60;

const timeToMinutes = (time) => {
  const normalized = normalizeTimeString(time);
  if (!normalized) return null;

  const [hours, minutes] = normalized.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return null;
  const hrs = Math.max(0, Math.floor(minutes / 60));
  const mins = Math.max(0, Math.floor(minutes % 60));
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

const findScheduleConflict = async ({ userId, day, starttime, endtime }) => {
  if (!userId || !day || !starttime) return null;

  const [habitsForDay, busyForDay] = await Promise.all([
    Schedule.findAll({
      where: { user_id: userId, day },
      include: [{ model: Habit, as: "habit", attributes: ["title"] }],
    }),
    BusySchedule.findAll({ where: { user_id: userId, day } }),
  ]);

  const toRange = (entry) => {
    const start = timeToMinutes(entry.starttime);
    const end = timeToMinutes(entry.endtime);
    if (start == null) return null;
    return {
      start,
      end: end != null ? end : start + MIN_DEFAULT_DURATION,
      title: entry.title || entry.custom_title || entry?.habit?.title || entry.notes || "another block",
    };
  };

  const targetStart = timeToMinutes(starttime);
  const targetEnd = timeToMinutes(endtime);

  if (targetStart == null) return null;
  const desiredRange = {
    start: targetStart,
    end: targetEnd != null ? targetEnd : targetStart + MIN_DEFAULT_DURATION,
  };

  const existing = [...habitsForDay, ...busyForDay]
    .map((entry) => ({ ...toRange(entry), raw: entry }))
    .filter(Boolean);

  return existing.find((range) => desiredRange.start < range.end && desiredRange.end > range.start) || null;
};

const requestClaudeScheduleDecision = async ({ message, userContext, history }) => {
  const habits = userContext?.habits || [];
  const busySchedules = userContext?.busySchedules || [];

  const habitSummaries = habits.map((h) => ({
    id: h.id,
    title: h.title,
    existingSlots: (h.schedules || []).map((s) => ({ day: s.day, starttime: s.starttime })),
  }));

  const systemInstruction = [
    "You are Claude, the StepHabit AI scheduler.",
    "When the user asks to add something to their schedule or block time, respond with JSON only.",
    "Shape: { action: 'create-schedule', type: 'habit' | 'busy', habitId: number | null, title: string | null, day: 'YYYY-MM-DD', starttime: 'HH:MM', endtime: 'HH:MM' | null, repeat: string | null, customdays: string | null, notes: string | null, userReply: string }.",
    "Use 24-hour times. If you cannot confidently schedule, return { action: 'none' }.",
    "For type 'habit', pick the best matching habitId from the list. For 'busy', supply a clear title.",
    `Known habits: ${JSON.stringify(habitSummaries)}`,
    `Current busy events: ${JSON.stringify(busySchedules)}`,
  ].join("\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    [
      "Decide if this message should add a habit session or busy block to the user's calendar.",
      `User message: ${message}`,
    ].join("\n")
  );

  const reply = await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt]);
  return parseScheduleDecision(reply);
};

const callClaude = async (messages) => {
  const apiKey = resolveApiKey();
  if (!apiKey) return null;

  const modelsToTry = [CLAUDE_MODEL, FALLBACK_CLAUDE_MODEL].filter(Boolean);

  for (const model of modelsToTry) {
    try {
      const chat = new ChatAnthropic({
        apiKey,
        baseURL: CLAUDE_BASE_URL,
        model,
        temperature: 0.4,
        maxTokens: 800,
      });

      const result = await chat.invoke(messages);
      const reply =
        typeof result?.content === "string"
          ? result.content.trim()
          : result?.content?.map?.((c) => c.text).filter(Boolean).join("\n").trim();

      return reply || null;
    } catch (error) {
      const notFound =
        error?.lc_error_code === "MODEL_NOT_FOUND" ||
        error?.status === 404 ||
        error?.error?.error?.type === "not_found_error";

      console.error("AI chat model failed", model, error?.message || error);
      if (!notFound) throw error;
    }
  }

  return null;
};

const parseHabitJson = (raw) => {
  if (!raw) return null;

  try {
    const cleaned = raw.trim().replace(/```(json)?/g, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const target = jsonStart >= 0 && jsonEnd >= 0 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
    const parsed = JSON.parse(target);

    if (!parsed.title || !parsed.description) return null;

    return {
      title: parsed.title,
      description: parsed.description,
      category: parsed.category || "General",
      isDailyGoal: parsed.isDailyGoal !== false,
      targetReps: parsed.targetReps ?? null,
      summary: parsed.summary || `${parsed.title} — ${parsed.description}`,
    };
  } catch (error) {
    console.error("Failed to parse habit JSON", error?.message || error);
    return null;
  }
};

const requestClaudeHabitSuggestion = async ({ message, userContext }) => {
  const systemInstruction = [
    "You are Claude, an encouraging habit coach.",
    "Given a user's request, propose a single, realistic starter habit using their context.",
    "Respond ONLY with compact JSON using keys: title (short habit name), description (one sentence with when/how long), category (broad area), isDailyGoal (boolean), targetReps (integer or null), summary (friendly one-line pitch).",
    "Keep defaults gentle (e.g., 10 minutes a day) and avoid markdown.",
    `User context: ${JSON.stringify(userContext || {})}`,
  ].join("\n");

  const messages = [new SystemMessage(systemInstruction), new HumanMessage(message)];
  const reply = await callClaude(messages);
  return parseHabitJson(reply);
};

const generateClaudeSuggestionReply = async ({
  habitSuggestion,
  systemInstruction,
  history,
}) => {
  if (!habitSuggestion) return null;

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    [
      "Share this starter habit with the user in one short, warm paragraph.",
      "Encourage them and ask if they'd like to add it or adjust details.",
      "Habit details:",
      JSON.stringify(habitSuggestion),
    ].join("\n"),
  );

  return callClaude([new SystemMessage(systemInstruction), ...conversation, prompt]);
};

export const generateHabitCreatedReply = async ({ habit, context }) => {
  const { dbOverview, userContext, history } = context || {};

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "A habit was just saved for the user. Acknowledge it briefly and invite tweaks or next steps.",
    "Keep replies short and natural.",
    "Database overview:\n" + formatTableSummary(dbOverview || []),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  const conversation = buildConversationMessages(history);
  const prompt = new HumanMessage(
    `Confirm the habit creation to the user in a friendly sentence and offer help adjusting it: ${JSON.stringify(habit)}`,
  );

  return (
    (await callClaude([new SystemMessage(systemInstruction), ...conversation, prompt])) ||
    "Your habit was saved. Want to adjust anything?"
  );
};

export const generateAiChatReply = async ({ userId, message, history: providedHistory = null }) => {
  const [dbOverview, userContext, history] = await Promise.all([
    describeTables(),
    loadUserContext(userId),
    providedHistory
      ? Promise.resolve(providedHistory)
      : getChatHistory(userId, MESSAGE_HISTORY_LIMIT),
  ]);

  const habitAnalysis = analyzeHabitIntent(message, history);

  const progressDecision = await requestClaudeProgressDecision({
    message,
    userContext,
    history,
  });

  const scheduleDecision = await requestClaudeScheduleDecision({
    message,
    userContext,
    history,
  });

  const normalizedScheduleDecision = normalizeScheduleDecision(scheduleDecision);

  const systemInstruction = [
    "You are a warm, conversational AI assistant for the StepHabit platform.",
    "Respond with short, human-feeling paragraphs (avoid bullet lists unless requested).",
    "You can see the database overview and the current user's context—use them naturally in conversation.",
    "Stay encouraging and keep the chat flowing with one clear next step in each reply.",
    "Database overview:\n" + formatTableSummary(dbOverview),
    "User context:\n" + JSON.stringify(userContext || {}, null, 2),
  ].join("\n\n");

  let habitSuggestion = habitAnalysis.habitSuggestion;
  let replyFromClaude = progressDecision?.userReply || null;
  let loggedProgress = null;
  let createdSchedule = null;
  let finalIntent = habitAnalysis.intent;

  if (progressDecision) {
    try {
      const entry = await Progress.create({
        user_id: userId,
        habit_id: progressDecision.habitId,
        status: progressDecision.status,
        reflection_reason: progressDecision.note,
        progress_date: new Date(),
      });

      loggedProgress = {
        id: entry.id,
        habitId: entry.habit_id,
        status: entry.status,
        note: entry.reflection_reason,
        progressDate: entry.progress_date,
      };

      finalIntent = "log-progress";
    } catch (error) {
      console.error("Failed to save progress from Claude decision", error?.message || error);
    }
  }

  if (normalizedScheduleDecision?.type === "habit" || normalizedScheduleDecision?.type === "busy") {
    try {
      const conflict = await findScheduleConflict({
        userId,
        day: normalizedScheduleDecision.day,
        starttime: normalizedScheduleDecision.starttime,
        endtime: normalizedScheduleDecision.endtime,
      });

      if (conflict) {
        replyFromClaude =
          scheduleDecision?.userReply ||
          `I couldn't add that block because it overlaps with ${conflict.title} at ${minutesToTime(conflict.start)}.`;
        finalIntent = "chat";
      }

      if (!conflict && normalizedScheduleDecision.type === "habit" && normalizedScheduleDecision.habitId) {
        const habit = await Habit.findOne({ where: { id: normalizedScheduleDecision.habitId, user_id: userId } });

        if (habit) {
          const created = await Schedule.create({
            habit_id: normalizedScheduleDecision.habitId,
            user_id: userId,
            day: normalizedScheduleDecision.day,
            starttime: normalizedScheduleDecision.starttime,
            endtime: normalizedScheduleDecision.endtime || null,
            enddate: normalizedScheduleDecision.day,
            repeat: normalizedScheduleDecision.repeat || "once",
            customdays:
              normalizedScheduleDecision.repeat === "custom" ? normalizedScheduleDecision.customdays || null : null,
            notes: normalizedScheduleDecision.notes || "Created via HabitCoach",
          });

          createdSchedule = {
            ...(created.toJSON ? created.toJSON() : created),
            type: "habit",
            title: habit.title,
          };

          if (userContext?.habits) {
            const target = userContext.habits.find((h) => h.id === habit.id);
            if (target) {
              target.schedules = [...(target.schedules || []), createdSchedule];
            }
          }
        }
      }

      if (!conflict && normalizedScheduleDecision.type === "busy") {
        const busy = await BusySchedule.create({
          user_id: userId,
          title: normalizedScheduleDecision.title,
          day: normalizedScheduleDecision.day,
          starttime: normalizedScheduleDecision.starttime,
          endtime: normalizedScheduleDecision.endtime || null,
          enddate: normalizedScheduleDecision.day,
          repeat: normalizedScheduleDecision.repeat || "once",
          customdays:
            normalizedScheduleDecision.repeat === "custom" ? normalizedScheduleDecision.customdays || null : null,
          notes: normalizedScheduleDecision.notes || "Blocked by HabitCoach",
        });

        createdSchedule = {
          ...(busy.toJSON ? busy.toJSON() : busy),
          type: "custom",
          habit: null,
          habit_id: null,
          custom_title: busy.title,
        };

        if (userContext?.busySchedules) {
          userContext.busySchedules = [...(userContext.busySchedules || []), createdSchedule];
        }
      }

      if (!conflict && createdSchedule) {
        finalIntent = "add-schedule";
        replyFromClaude =
          normalizedScheduleDecision.userReply ||
          (normalizedScheduleDecision.type === "habit"
            ? `I added a ${createdSchedule.title || "habit"} session on ${normalizedScheduleDecision.day} at ${normalizedScheduleDecision.starttime}.`
            : `I blocked "${normalizedScheduleDecision.title}" on ${normalizedScheduleDecision.day} at ${normalizedScheduleDecision.starttime}.`);
      }
    } catch (error) {
      console.error("Failed to save schedule from Claude decision", error?.message || error);
    }
  }

  if (progressDecision && !replyFromClaude) {
    const matchedHabit = (userContext?.habits || []).find((h) => h.id === progressDecision.habitId);
    const recapPrompt = new HumanMessage(
      [
        "Give one short, friendly sentence confirming I logged the habit progress.",
        `Habit: ${matchedHabit?.title || "Unknown habit"} (${progressDecision.status})`,
        progressDecision.note ? `Note to mention: ${progressDecision.note}` : "No extra note provided.",
      ].join("\n")
    );

    replyFromClaude = await callClaude([new SystemMessage(systemInstruction), ...buildConversationMessages(history), recapPrompt]);
  }

  if (!createdSchedule) {
    if (habitAnalysis.intent === "suggest") {
      habitSuggestion =
        (await requestClaudeHabitSuggestion({ message, userContext })) || buildHabitSuggestion(message);

      if (habitSuggestion) {
        replyFromClaude = await generateClaudeSuggestionReply({
          habitSuggestion,
          systemInstruction,
          history,
        });
      }
    } else if (habitAnalysis.intent === "chat" && !loggedProgress) {
      replyFromClaude = await callClaude(buildChatMessages({ systemInstruction, history, message }));
    }
  }

  const reply =
    habitAnalysis.reply ||
    replyFromClaude ||
    fallbackReply({ message, userContext, dbOverview, history });

  return {
    reply,
    intent: finalIntent,
    habitSuggestion,
    loggedProgress,
    createdSchedule,
    context: { dbOverview, userContext, history },
  };
};
