// assistantAgent.js
// Main Claude AI reasoning engine for StepHabit

import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

const MAX_HISTORY_MESSAGES = parseInt(process.env.ASSISTANT_HISTORY_LIMIT || "12", 10);

// ---- MODEL CONFIG ----
const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929";
const FALLBACK_CLAUDE_MODEL = process.env.CLAUDE_FALLBACK_MODEL || "claude-haiku-4-5-20251001";

const PROVIDER_NAME = process.env.CLAUDE_PROVIDER_NAME || "Anthropic Claude";
const ENV_CLAUDE_API_KEY =
  process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;

// ---- STATUS HELPERS ----
const resolveApiKey = (override) => override || ENV_CLAUDE_API_KEY;

const hasApiKey = (override) => Boolean(resolveApiKey(override));

export const getAgentStatus = (options = {}) => {
  const apiKeyAvailable = hasApiKey(options.apiKeyOverride);

  return {
    ready: apiKeyAvailable,
    provider: options.providerOverride || PROVIDER_NAME,
    model: apiKeyAvailable ? options.modelOverride || CLAUDE_MODEL : null,
    reason: apiKeyAvailable
      ? null
      : "Set the CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable, or include an API key with the request.",
    updatedAt: new Date().toISOString(),
  };
};

// ---- HISTORY UTILS ----
const limitHistory = (history = []) => {
  if (!Array.isArray(history) || !history.length) return [];
  const limit = Number.isFinite(MAX_HISTORY_MESSAGES) ? Math.max(MAX_HISTORY_MESSAGES, 2) : 12;
  return history.slice(-limit);
};

// ---- SNAPSHOT FORMATTER ----
const formatList = (items = []) => items.filter(Boolean).join("; ");

const describeSnapshot = (snapshot = {}, insightText, profileMemory) => {
  const profile = snapshot.user || {};
  const progress = snapshot.progress || {};
  const schedules = snapshot.schedules?.upcoming || [];

  const topHabits = (progress.habitSummaries || []).slice(0, 5);
  const needsHelp = (progress.habitSummaries || []).filter(h => h.completionRate < 60).slice(0, 3);

  const lines = [
    `Name: ${profile.name || "Unknown"}`,
    `Primary goal: ${profile.primary_goal || "Not specified"}`,
    `Focus area: ${profile.focus_area || "Not set"}`,
    `Daily commitment: ${profile.daily_commitment || "Not set"}`,
    `Support style: ${profile.support_preference || "Not set"}`,
    `Average completion: ${progress.completionRate || 0}% over ${progress.total || 0} recent actions`,
  ];

  if (profileMemory?.about) {
    lines.push(`Personal note from user: ${profileMemory.about}`);
  }

  if (topHabits.length) {
    lines.push(
      `Top habits: ${formatList(
        topHabits.map(h => `${h.title} (${h.completionRate}% success)`)
      )}`
    );
  }

  if (needsHelp.length) {
    lines.push(
      `Habits needing love: ${formatList(
        needsHelp.map(h => `${h.title} (${h.completionRate}% success)`)
      )}`
    );
  }

  if (schedules.length) {
    lines.push(
      `Upcoming schedule: ${formatList(
        schedules.slice(0, 5).map(item => `${item.habitTitle} on ${item.day} at ${item.starttime}`)
      )}`
    );
  }

  if (insightText) lines.push(`Recent insight: ${insightText}`);

  return lines.join("\n");
};

// ---- MESSAGE BUILDER ----
const buildMessages = ({ snapshot, insightText, profileMemory, history = [] }) => {
  const systemPrompt = [
    "You are StepHabit's AI coach.",
    "Your job is to turn the user's data into a warm, natural motivational summary.",
    "NEVER repeat the raw analytics fields such as 'Primary goal:', 'Focus area:', 'Top habits:', etc.",
    "NEVER output the structured snapshot text back to the user.",
    "ALWAYS convert the analytics into a natural short paragraph.",
    "Keep responses supportive and actionable.",
    "End with a small reflective or motivational question."
  ].join(" ");

  const contextBlock = describeSnapshot(snapshot, insightText, profileMemory);

  const formattedHistory = limitHistory(history).map(entry =>
    entry.role === "assistant"
      ? new AIMessage(entry.content)
      : new HumanMessage(entry.content)
  );

  return {
    systemInstruction: `${systemPrompt}\n\nUSER DATA SNAPSHOT:\n${contextBlock}`,
    contents: formattedHistory,
    contextBlock,
    insightText,
  };
};

// ---- COPY DETECTION ----
const normalizeText = (text) => (text ? text.replace(/\s+/g, " ").trim().toLowerCase() : "");

const isCopiedInsight = (reply, insightText) => {
  if (!reply || !insightText) return false;
  const normalizedReply = normalizeText(reply);
  const normalizedInsight = normalizeText(insightText);
  if (!normalizedReply || !normalizedInsight) return false;
  return (
    normalizedReply === normalizedInsight ||
    normalizedInsight.includes(normalizedReply) ||
    normalizedReply.includes(normalizedInsight)
  );
};

const isCopiedSnapshot = (reply, snapshotText) => {
  if (!reply || !snapshotText) return false;
  const normalizedReply = normalizeText(reply);
  const normalizedSnapshot = normalizeText(snapshotText);
  if (!normalizedReply || !normalizedSnapshot) return false;

  const snapshotSnippet = normalizedSnapshot.slice(0, 160);
  return (
    normalizedReply === normalizedSnapshot ||
    normalizedReply.includes(snapshotSnippet) ||
    normalizedSnapshot.includes(normalizedReply)
  );
};

// ---- MAIN AGENT CALL ----
export const runReasoningAgent = async ({
  snapshot,
  insightText,
  profileMemory,
  history,
  apiKeyOverride,
  modelOverride,
  providerOverride,
}) => {
  const apiKey = resolveApiKey(apiKeyOverride);
  if (!apiKey) throw new Error("Missing AI API key.");

  const { systemInstruction, contents, contextBlock } = buildMessages({
    snapshot,
    insightText,
    profileMemory,
    history,
  });

  const modelsToTry = [modelOverride || CLAUDE_MODEL, FALLBACK_CLAUDE_MODEL].filter(Boolean);

  const isModelNotFound = err =>
    err?.lc_error_code === "MODEL_NOT_FOUND" ||
    err?.status === 404 ||
    err?.error?.error?.type === "not_found_error";

  let replyMessage = null;
  let modelUsed = modelsToTry[0];
  let degradedReason = null;

  const tryClaude = async messages => {
    for (const modelName of modelsToTry) {
      try {
        console.log("Trying Claude model:", modelName);

        const chat = new ChatAnthropic({
          apiKey,
          baseURL: CLAUDE_BASE_URL,
          model: modelName,
          temperature: 0.7,
          maxTokens: 1024,
        });

        const result = await chat.invoke(messages);
        return { result, modelName };
      } catch (err) {
        console.error("Model failed:", modelName, err?.error || err?.message);
        if (!isModelNotFound(err) || modelName === modelsToTry.at(-1)) throw err;
      }
    }
    return { result: null, modelName: null };
  };

  const summaryRequest = (instruction) => [
    new SystemMessage(systemInstruction),
    ...(contents.length ? contents : []),
    new HumanMessage(instruction),
  ];

  ({ result: replyMessage, modelName: modelUsed } = await tryClaude(
    summaryRequest(
      "Give a short, natural motivational summary based on the user's data. Do not copy the snapshot text; rewrite it in your own words."
    )
  ));

  // ---- EXTRACT REPLY TEXT ----
  let reply =
    typeof replyMessage?.content === "string"
      ? replyMessage.content.trim()
      : replyMessage?.content?.map?.(p => p.text).filter(Boolean).join("\n").trim();

  // ---- DETECTION LOGIC: check if Claude duplicated analytics ----
  const looksLikeAnalytics =
    reply?.includes("Primary goal:") ||
    reply?.includes("Top habits:") ||
    reply?.includes("Focus area:") ||
    reply?.includes("Habits needing") ||
    reply?.includes("Average completion") ||
    isCopiedInsight(reply, insightText) ||
    isCopiedSnapshot(reply, contextBlock);

  if (looksLikeAnalytics) {
    console.log("Claude returned analytics instead of a summary. Regenerating...");

    const rewritePrompt = [
      new SystemMessage(
        `${systemInstruction}\n\nRewrite the summary in your own words without repeating the structured fields. Always end with a short motivational question.`
      ),
      new HumanMessage(
        "Create a fresh motivational paragraph based on the snapshot above. Do NOT copy the raw analytics or the previous draft. Be concise, supportive, and action-oriented."
      ),
      new HumanMessage(`Previous draft to avoid copying: ${reply}`),
    ];

    ({ result: replyMessage, modelName: modelUsed } = await tryClaude(rewritePrompt));

    reply =
      typeof replyMessage?.content === "string"
        ? replyMessage.content.trim()
        : replyMessage?.content?.map(p => p.text).filter(Boolean).join("\n").trim();

    degradedReason = "Analytics or copied text detected; regenerated with AI summary.";
  }

  const safeReply = reply || insightText || "I'm here to help you move forward. What feels like the next small step?";

  return {
    reply: safeReply,
    meta: {
      ready: true,
      provider: providerOverride || PROVIDER_NAME,
      model: modelUsed,
      reason: degradedReason,
      updatedAt: new Date().toISOString(),
    },
  };
};
