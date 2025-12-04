import { ChatAnthropic } from "@langchain/anthropic"
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"

// ai/claudeAgent.js  (or whatever path you use)

const MAX_HISTORY_MESSAGES = parseInt(process.env.ASSISTANT_HISTORY_LIMIT || "12", 10)

const CLAUDE_BASE_URL = (
  process.env.CLAUDE_BASE_URL || "https://api.anthropic.com"
).replace(/\/$/, "")

// Use a pinned Claude model version by default to avoid MODEL_NOT_FOUND errors
// that can occur if "-latest" aliases are unavailable in a given environment.
const CLAUDE_MODEL =
  process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022"

// Just a label, for UI / status
const PROVIDER_NAME = process.env.CLAUDE_PROVIDER_NAME || "Anthropic Claude"

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY

// ---------- STATUS HELPERS ----------

const hasApiKey = () => Boolean(CLAUDE_API_KEY)

export const getAgentStatus = () => ({
  ready: hasApiKey(),
  provider: PROVIDER_NAME,
  model: hasApiKey() ? CLAUDE_MODEL : null,
  reason: hasApiKey()
    ? null
    : "Set the CLAUDE_API_KEY environment variable to enable the adaptive AI companion.",
  updatedAt: new Date().toISOString(),
})

// ---------- HISTORY + SNAPSHOT HELPERS ----------

const limitHistory = (history = []) => {
  if (!Array.isArray(history) || !history.length) {
    return []
  }

  const limit = Number.isFinite(MAX_HISTORY_MESSAGES)
    ? Math.max(MAX_HISTORY_MESSAGES, 2)
    : 12

  return history.slice(-limit)
}

const formatList = (items = []) => items.filter(Boolean).join("; ")

const describeSnapshot = (snapshot = {}, insightText) => {
  const profile = snapshot.user || {}
  const progress = snapshot.progress || {}
  const schedules = snapshot.schedules?.upcoming || []
  const topHabits = (snapshot.progress?.habitSummaries || []).slice(0, 5)
  const needsHelp = (snapshot.progress?.habitSummaries || [])
    .filter((habit) => habit.completionRate < 60)
    .slice(0, 3)

  const lines = [
    `Name: ${profile.name || "Unknown"}`,
    `Primary goal: ${profile.primary_goal || "Not specified"}`,
    `Focus area: ${profile.focus_area || "Not set"}`,
    `Daily commitment: ${profile.daily_commitment || "Not set"}`,
    `Support preference: ${profile.support_preference || "Not set"}`,
    `Average completion: ${progress.completionRate || 0}% over ${progress.total || 0} recent entries`,
  ]

  if (topHabits.length) {
    lines.push(
      `Top habits: ${formatList(
        topHabits.map(
          (habit) =>
            `${habit.title} — ${habit.completionRate}% success (${habit.completed} completed, ${habit.missed} missed)`
        )
      )}`
    )
  }

  if (needsHelp.length) {
    lines.push(
      `Habits needing focus: ${formatList(
        needsHelp.map(
          (habit) =>
            `${habit.title} — ${habit.completionRate}% success (${habit.completed} completed, ${habit.missed} missed)`
        )
      )}`
    )
  }

  if (schedules.length) {
    lines.push(
      `Upcoming schedule: ${formatList(
        schedules.slice(0, 5).map(
          (item) =>
            `${item.habitTitle} on ${item.day} at ${item.starttime}${
              item.endtime ? ` until ${item.endtime}` : ""
            }`
        )
      )}`
    )
  }

  if (insightText) {
    lines.push(`Recent insight summary: ${insightText}`)
  }

  return lines.join("\n")
}

// ---------- MESSAGE BUILDER ----------

const buildMessages = ({ snapshot, insightText, history = [] }) => {
  const systemPrompt = [
    "You are StepHabit's AI companion, a motivational coach who reasons carefully",
    "about the user's habits, schedules, and progress before responding.",
    "Provide empathetic yet practical guidance, highlight relevant insights,",
    "and end with a reflective or action-oriented question that encourages follow-up.",
    "Keep responses concise (2-4 short paragraphs or paragraphs with a short bullet list).",
    "Use Markdown for emphasis when it improves clarity.",
  ].join(" ")

  const contextBlock = describeSnapshot(snapshot, insightText)

  const formattedHistory = limitHistory(history)
    .filter((entry) => Boolean(entry?.content))
    .map((entry) =>
      entry.role === "assistant"
        ? new AIMessage(entry.content)
        : new HumanMessage(entry.content)
    )

  return {
    systemInstruction: `${systemPrompt}\n\n${contextBlock}`,
    contents: formattedHistory,
  }
}

// ---------- MAIN CALL ----------

export const runReasoningAgent = async ({
  snapshot,
  insightText,
  history,
  apiKeyOverride,
}) => {
  const apiKey = apiKeyOverride || CLAUDE_API_KEY
  if (!apiKey) {
    throw new Error("Missing Claude API key. Set CLAUDE_API_KEY in your environment.")
  }

  const { systemInstruction, contents } = buildMessages({
    snapshot,
    insightText,
    history,
  })

  const chat = new ChatAnthropic({
    anthropicApiKey: apiKey,
    anthropicApiUrl: `${CLAUDE_BASE_URL}/v1`,
    model: CLAUDE_MODEL,
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 1024,
  })

  const replyMessage = await chat.invoke([
    new SystemMessage(systemInstruction),
    ...(contents && contents.length
      ? contents
      : [
          new HumanMessage(
            "Provide tailored guidance based on the system instruction and any available context."
          ),
        ]),
  ])

  const reply = typeof replyMessage.content === "string"
    ? replyMessage.content.trim()
    : replyMessage.content
        ?.map((part) => part?.text)
        .filter(Boolean)
        .join("\n")
        ?.trim()

  if (!reply) {
    throw new Error("Claude response missing content")
  }

  return {
    reply,
    meta: {
      ready: true,
      provider: PROVIDER_NAME,
      model: CLAUDE_MODEL,
      reason: null,
      usage: replyMessage?.response_metadata?.usage || null,
      updatedAt: new Date().toISOString(),
    },
  }
}