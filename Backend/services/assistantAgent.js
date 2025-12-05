// assistantAgent.js
// Main Claude AI reasoning engine for StepHabit

import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

const MAX_HISTORY_MESSAGES = parseInt(process.env.ASSISTANT_HISTORY_LIMIT || "12", 10);

// ---- MODEL CONFIG ----
const CLAUDE_BASE_URL = (process.env.CLAUDE_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-20250514";
const FALLBACK_CLAUDE_MODEL = process.env.CLAUDE_FALLBACK_MODEL || "claude-haiku-4-5-20251001";

const PROVIDER_NAME = process.env.CLAUDE_PROVIDER_NAME || "Anthropic Claude";
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// ---- STATUS HELPERS ----
const hasApiKey = () => Boolean(CLAUDE_API_KEY);

export const getAgentStatus = () => ({
  ready: hasApiKey(),
  provider: PROVIDER_NAME,
  model: hasApiKey() ? CLAUDE_MODEL : null,
  reason: hasApiKey() ? null : "Set the CLAUDE_API_KEY environment variable.",
  updatedAt: new Date().toISOString(),
});

// ---- HISTORY UTILS ----
const limitHistory = (history = []) => {
  if (!Array.isArray(history) || !history.length) return [];
  const limit = Number.isFinite(MAX_HISTORY_MESSAGES) ? Math.max(MAX_HISTORY_MESSAGES, 2) : 12;
  return history.slice(-limit);
};

// ---- SNAPSHOT FORMATTER ----
const formatList = (items = []) => items.filter(Boolean).join("; ");

const describeSnapshot = (snapshot = {}, insightText) => {
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
    `Support preference: ${profile.support_preference || "Not set"}`,
    `Average completion: ${progress.completionRate || 0}% over ${progress.total || 0} entries`,
  ];

  if (topHabits.length) {
    lines.push(
      `Top habits: ${formatList(topHabits.map(h =>
        `${h.title} — ${h.completionRate}% (${h.completed} done, ${h.missed} missed)`
      ))}`
    );
  }

  if (needsHelp.length) {
    lines.push(
      `Habits needing focus: ${formatList(needsHelp.map(h =>
        `${h.title} — ${h.completionRate}% (${h.completed} done, ${h.missed} missed)`
      ))}`
    );
  }

  if (schedules.length) {
    lines.push(
      `Upcoming schedule: ${formatList(
        schedules.slice(0, 5).map(item =>
          `${item.habitTitle} on ${item.day} at ${item.starttime}`
        )
      )}`
    );
  }

  if (insightText) lines.push(`Recent insight: ${insightText}`);

  return lines.join("\n");
};

// ---- MESSAGE BUILDER ----
const buildMessages = ({ snapshot, insightText, history = [] }) => {
  const systemPrompt = [
    "You are StepHabit's AI companion, a motivational coach.",
    "You reason carefully about habits, schedules, and progress.",
    "Keep responses short, supportive, and actionable.",
    "Always end with a reflective or action-oriented question."
  ].join(" ");

  const contextBlock = describeSnapshot(snapshot, insightText);

  const formattedHistory = limitHistory(history).map(entry =>
    entry.role === "assistant"
      ? new AIMessage(entry.content)
      : new HumanMessage(entry.content)
  );

  return {
    systemInstruction: `${systemPrompt}\n\n${contextBlock}`,
    contents: formattedHistory,
  };
};

// ---- MAIN AGENT CALL ----
export const runReasoningAgent = async ({ snapshot, insightText, history, apiKeyOverride }) => {
  const apiKey = apiKeyOverride || CLAUDE_API_KEY;
  if (!apiKey) throw new Error("Missing CLAUDE_API_KEY.");

  const { systemInstruction, contents } = buildMessages({ snapshot, insightText, history });

  const modelsToTry = [CLAUDE_MODEL, FALLBACK_CLAUDE_MODEL];

  const isModelNotFound = err =>
    err?.lc_error_code === "MODEL_NOT_FOUND" ||
    err?.status === 404 ||
    err?.error?.error?.type === "not_found_error";

  let replyMessage;
  let modelUsed = modelsToTry[0];
  let degradedReason = null;

  for (const modelName of modelsToTry) {
    try {
      console.log("Trying Claude model:", modelName);

      const chat = new ChatAnthropic({
        anthropicApiKey: apiKey,
        anthropicApiUrl: CLAUDE_BASE_URL, // IMPORTANT — DO NOT ADD /v1
        model: modelName,
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 1024,
      });

      replyMessage = await chat.invoke([
        new SystemMessage(systemInstruction),
        ...(contents.length ? contents : [new HumanMessage("Summarize my progress.")]),
      ]);

      modelUsed = modelName;
      break; // success
    } catch (err) {
      console.error("Model failed:", modelName, err?.error || err?.message);
      if (!isModelNotFound(err) || modelName === modelsToTry.at(-1)) throw err;
    }
  }

  const reply =
    typeof replyMessage.content === "string"
      ? replyMessage.content.trim()
      : replyMessage.content.map(p => p.text).filter(Boolean).join("\n").trim();

  if (!reply) {
    degradedReason = "AI summary was empty; showing a quick snapshot instead.";
  }

  const safeReply = reply || describeSnapshot(snapshot, insightText);

  return {
    reply: safeReply,
    meta: {
      ready: !degradedReason,
      provider: PROVIDER_NAME,
      model: modelUsed,
      reason: degradedReason,
      updatedAt: new Date().toISOString(),
    },
  };
};
