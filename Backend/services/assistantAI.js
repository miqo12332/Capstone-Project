import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

import {
  buildHabitSuggestion,
  detectConfirmation,
  detectDeleteIntent,
  detectEditIntent,
  detectHabitIdea,
} from "../utils/habitNlp.js";

const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const CLAUDE_CHAT_MODEL =
  process.env.CLAUDE_CHAT_MODEL || process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";
const PROVIDER_NAME = process.env.CLAUDE_PROVIDER_NAME || "Anthropic Claude";
const ENV_CLAUDE_API_KEY =
  process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;

const limitHistory = (history = [], max = 12) => history.slice(Math.max(history.length - max, 0));

export const getChatAgentStatus = () => {
  const apiKeyAvailable = Boolean(ENV_CLAUDE_API_KEY);
  return {
    ready: apiKeyAvailable,
    provider: PROVIDER_NAME,
    model: apiKeyAvailable ? CLAUDE_CHAT_MODEL : null,
    reason: apiKeyAvailable
      ? null
      : "Set CLAUDE_API_KEY or ANTHROPIC_API_KEY to enable AI-powered chat.",
    updatedAt: new Date().toISOString(),
  };
};

const coerceHabit = (candidate) => {
  if (!candidate || typeof candidate !== "object") return null;
  const { title, description, category, isDailyGoal } = candidate;
  if (!title || !description) return null;
  return {
    title: String(title).trim(),
    description: String(description).trim(),
    category: category ? String(category) : "General",
    isDailyGoal: Boolean(isDailyGoal),
  };
};

const parseAssistantReply = (content, pendingSuggestion) => {
  const fallback = {
    reply:
      "I’m here to help you build habits. Share a habit you want to start, and I'll shape it into an easy plan.",
    intent: "chat",
    habitSuggestion: null,
  };

  if (!content) return fallback;

  const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
  if (!jsonMatch) return fallback;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const intent = parsed.intent || "chat";
    const habitSuggestion = coerceHabit(parsed.habitSuggestion) || pendingSuggestion || null;

    return {
      reply: parsed.reply || fallback.reply,
      intent,
      habitSuggestion,
    };
  } catch (err) {
    console.warn("⚠️ Failed to parse Claude reply as JSON", err);
    return fallback;
  }
};

const buildClaudePrompt = ({ message, history, pendingSuggestion }) => {
  const systemPrompt = [
    "You are StepHabit's friendly habit coach.",
    "Always respond with a single JSON object using the schema { reply: string, intent: 'chat'|'suggest'|'confirm-add'|'edit'|'delete', habitSuggestion: habit|null }.",
    "When a user asks for help starting a habit, suggest a simple beginner-friendly plan and set intent to 'suggest'.",
    "Never add the habit automatically. Only when the user clearly confirms, set intent to 'confirm-add'.",
    "habitSuggestion format: { title, description, category, isDailyGoal }.",
    "Be concise, warm, and practical. If a habitSuggestion is provided, end the reply by asking if they want it added.",
  ].join(" ");

  const formattedHistory = limitHistory(history || []).map((entry) =>
    entry.role === "assistant"
      ? new AIMessage(entry.content)
      : new HumanMessage(entry.content)
  );

  const context = pendingSuggestion
    ? `Pending suggestion to confirm: ${pendingSuggestion.title} — ${pendingSuggestion.description}`
    : "No pending suggestion yet.";

  return [
    new SystemMessage(systemPrompt),
    ...formattedHistory,
    new HumanMessage(`Context: ${context}`),
    new HumanMessage(message),
  ];
};

/**
 * Analyze a user's message and return assistant guidance via Claude when available.
 * Falls back to lightweight heuristics when the AI key is missing.
 * @param {string} message
 * @param {Array} history - prior chat messages with metadata
 * @returns {Promise<{reply: string, intent: string, habitSuggestion: object|null}>}
 */
export async function analyzeMessage(message, history = []) {
  const normalized = (message || "").trim();
  const pendingSuggestion = findPendingSuggestion(history);

  if (!normalized) {
    return {
      reply: "I didn't catch that. Tell me what you're thinking about building as a habit.",
      intent: "chat",
      habitSuggestion: null,
    };
  }

  if (ENV_CLAUDE_API_KEY) {
    try {
      const chat = new ChatAnthropic({
        apiKey: ENV_CLAUDE_API_KEY,
        baseURL: CLAUDE_BASE_URL,
        model: CLAUDE_CHAT_MODEL,
        temperature: 0.6,
        maxTokens: 512,
      });

      const prompt = buildClaudePrompt({ message: normalized, history, pendingSuggestion });
      const response = await chat.invoke(prompt);
      const content =
        typeof response?.content === "string"
          ? response.content
          : response?.content?.map?.((p) => p.text).filter(Boolean).join("\n");

      const parsed = parseAssistantReply(content, pendingSuggestion);
      if (parsed.intent === "confirm-add" && !parsed.habitSuggestion && pendingSuggestion) {
        parsed.habitSuggestion = pendingSuggestion;
      }
      return parsed;
    } catch (error) {
      console.error("Claude chat failed, using fallback heuristics", error?.message || error);
    }
  }

  const lower = normalized.toLowerCase();

  if (detectConfirmation(lower) && pendingSuggestion) {
    return {
      reply: `Great! I'll add the habit we discussed: ${pendingSuggestion.title}.`,
      intent: "confirm-add",
      habitSuggestion: pendingSuggestion,
    };
  }

  if (detectDeleteIntent(lower)) {
    return {
      reply: "Which habit would you like me to delete?",
      intent: "delete",
      habitSuggestion: null,
    };
  }

  if (detectEditIntent(lower)) {
    return {
      reply: "Tell me what needs to change and I'll update the habit for you.",
      intent: "edit",
      habitSuggestion: null,
    };
  }

  if (detectHabitIdea(lower)) {
    const habitSuggestion = buildHabitSuggestion(normalized);
    if (habitSuggestion) {
      return {
        reply: `Here’s a beginner-friendly habit idea: ${habitSuggestion.title} — ${habitSuggestion.description}`,
        intent: "suggest",
        habitSuggestion,
      };
    }
  }

  return {
    reply: "I’m here to help you build habits. Share a habit you want to start, and I'll shape it into an easy plan.",
    intent: "chat",
    habitSuggestion: null,
  };
}

function findPendingSuggestion(history) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry.role !== "assistant") continue;
    if (entry.metadata?.createdHabit) continue;
    if (entry.metadata?.habitSuggestion) {
      return entry.metadata.habitSuggestion;
    }
  }
  return null;
}
