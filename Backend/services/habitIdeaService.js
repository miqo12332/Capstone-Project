import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { buildHabitSuggestion } from "../utils/habitNlp.js"

const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "")
const CLAUDE_CHAT_MODEL =
  process.env.CLAUDE_CHAT_MODEL || process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022"
const ENV_CLAUDE_API_KEY =
  process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY

const TARGET_HINTS = [
  { match: ["run", "walk", "jog"], reps: 10 },
  { match: ["water", "hydrate", "drink"], reps: 8 },
  { match: ["meditat", "breathe", "breath"], reps: 5 },
  { match: ["read", "study", "learn"], reps: 20 },
  { match: ["push", "squat", "lift", "plank"], reps: 15 },
]

const normalizePlan = (candidate, fallback) => {
  if (!candidate || typeof candidate !== "object") return fallback

  const normalized = {
    description: candidate.description?.toString().trim() || fallback.description,
    category: candidate.category?.toString().trim() || fallback.category,
    targetReps:
      typeof candidate.targetReps === "number"
        ? candidate.targetReps
        : candidate.targetReps
        ? Number(candidate.targetReps)
        : fallback.targetReps,
    isDailyGoal:
      typeof candidate.isDailyGoal === "boolean"
        ? candidate.isDailyGoal
        : typeof candidate.is_daily_goal === "boolean"
        ? candidate.is_daily_goal
        : fallback.isDailyGoal,
  }

  return normalized
}

const inferTargetReps = (title, category) => {
  const lower = title.toLowerCase()
  const hint = TARGET_HINTS.find((item) => item.match.some((needle) => lower.includes(needle)))
  if (hint) return hint.reps

  switch (category) {
    case "Fitness":
      return 12
    case "Wellness":
      return 5
    case "Productivity":
      return 20
    case "Nutrition":
      return 6
    default:
      return null
  }
}

const buildFallbackPlan = (title) => {
  const base = buildHabitSuggestion(title)
  return {
    description: base.description,
    category: base.category,
    targetReps: inferTargetReps(title, base.category),
    isDailyGoal: base.isDailyGoal,
  }
}

const normalizeRewrite = (candidate, fallback) => {
  if (!candidate || typeof candidate !== "object") return fallback

  return {
    title: candidate.title?.toString().trim() || fallback.title,
    description: candidate.description?.toString().trim() || fallback.description,
    category: candidate.category?.toString().trim() || fallback.category,
    isDailyGoal:
      typeof candidate.isDailyGoal === "boolean"
        ? candidate.isDailyGoal
        : typeof candidate.is_daily_goal === "boolean"
        ? candidate.is_daily_goal
        : fallback.isDailyGoal,
  }
}

const buildRewriteFallback = (message) => {
  const base = buildHabitSuggestion(message)
  return {
    title: base.title,
    description: base.description,
    category: base.category,
    isDailyGoal: true,
  }
}

export const generateHabitPlan = async (title) => {
  const fallback = buildFallbackPlan(title)

  if (!ENV_CLAUDE_API_KEY) {
    return fallback
  }

  try {
    const chat = new ChatAnthropic({
      apiKey: ENV_CLAUDE_API_KEY,
      baseURL: CLAUDE_BASE_URL,
      model: CLAUDE_CHAT_MODEL,
      temperature: 0.4,
      maxTokens: 300,
    })

    const prompt = [
      new SystemMessage(
        [
          "You are an assistant that drafts concise StepHabit entries.",
          "Always respond with a JSON object: { description: string, category: string, targetReps: number|null, isDailyGoal: boolean }.",
          "Descriptions should be under 200 characters with a clear action.",
          "Choose a single short category word (e.g., Fitness, Wellness, Productivity).",
          "targetReps is a small integer count of reps or minutes. If unsure, return null.",
        ].join(" ")
      ),
      new HumanMessage(
        `Habit title: "${title}". Propose a friendly description, category, and targetReps that make sense for a beginner.`
      ),
    ]

    const response = await chat.invoke(prompt)
    const content =
      typeof response?.content === "string"
        ? response.content
        : response?.content?.map?.((p) => p.text).filter(Boolean).join("\n")

    const jsonText = typeof content === "string" ? content.match(/\{[\s\S]*\}/)?.[0] : null
    if (!jsonText) return fallback

    const parsed = JSON.parse(jsonText)
    return normalizePlan(parsed, fallback)
  } catch (error) {
    console.warn("AI habit generation failed; using fallback", error?.message || error)
    return fallback
  }
}

export const rewriteHabitIdea = async (message) => {
  const fallback = buildRewriteFallback(message)

  if (!ENV_CLAUDE_API_KEY) return fallback

  try {
    const chat = new ChatAnthropic({
      apiKey: ENV_CLAUDE_API_KEY,
      baseURL: CLAUDE_BASE_URL,
      model: CLAUDE_CHAT_MODEL,
      temperature: 0.3,
      maxTokens: 250,
    })

    const prompt = [
      new SystemMessage(
        [
          "Rewrite the user's rough habit idea into a crisp StepHabit entry.",
          "Respond ONLY with JSON shaped as { title: string, description: string, category: string, isDailyGoal: boolean }.",
          "Title must be 2-5 words, Description under 180 characters with a clear action, Category is one short noun,",
          "and isDailyGoal is true if the habit is suitable for daily repetition (default to true).",
        ].join(" ")
      ),
      new HumanMessage(`Habit idea: "${message}". Rewrite and clarify it.`),
    ]

    const response = await chat.invoke(prompt)
    const content =
      typeof response?.content === "string"
        ? response.content
        : response?.content?.map?.((p) => p.text).filter(Boolean).join("\n")

    const jsonText = typeof content === "string" ? content.match(/\{[\s\S]*\}/)?.[0] : null
    if (!jsonText) return fallback

    const parsed = JSON.parse(jsonText)
    return normalizeRewrite(parsed, fallback)
  } catch (error) {
    console.warn("AI habit rewrite failed; using fallback", error?.message || error)
    return fallback
  }
}