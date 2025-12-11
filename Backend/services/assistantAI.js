import {
  buildHabitSuggestion,
  detectConfirmation,
  detectDeleteIntent,
  detectEditIntent,
  detectHabitIdea,
} from "../utils/habitNlp.js";

/**
 * Analyze a user's message and return assistant guidance.
 * @param {string} message
 * @param {Array} history - prior chat messages with metadata
 * @returns {Promise<{reply: string, intent: string, habitSuggestion: object|null}>}
 */
export async function analyzeMessage(message, history = []) {
  const normalized = (message || "").trim();
  if (!normalized) {
    return {
      reply: "I didn't catch that. Tell me what you're thinking about building as a habit.",
      intent: "chat",
      habitSuggestion: null,
    };
  }

  const pendingSuggestion = findPendingSuggestion(history);
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
