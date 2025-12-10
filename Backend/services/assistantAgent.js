// assistantAgent.js
// Main AI reasoning engine for StepHabit

import { ChatNVIDIA } from "@langchain/nvidia";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

const MAX_HISTORY_MESSAGES = parseInt(process.env.ASSISTANT_HISTORY_LIMIT || "12", 10);

// ---- MODEL CONFIG ----
const NEMOTRON_BASE_URL = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");

const NEMOTRON_MODEL = (process.env.NVIDIA_MODEL || "nvidia/nemotron-nano-9b-v2:free").trim();

const NVIDIA_API_KEY = (process.env.NVIDIA_API_KEY || process.env.CLAUDE_API_KEY || "").trim();

// ---- STATUS HELPERS ----
const hasApiKey = () => Boolean(NVIDIA_API_KEY);

export const getAgentStatus = () => ({
  ready: hasApiKey(),
  endpoint: NEMOTRON_BASE_URL,
  model: hasApiKey() ? NEMOTRON_MODEL : null,
  reason: hasApiKey() ? null : "Set the NVIDIA_API_KEY environment variable.",
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
  const apiKey = apiKeyOverride || NVIDIA_API_KEY;
  if (!apiKey) throw new Error("Missing NVIDIA_API_KEY.");
  if (!NEMOTRON_MODEL) throw new Error("Missing NVIDIA_MODEL.");

  const { systemInstruction, contents } = buildMessages({ snapshot, insightText, history });

  let replyMessage;
  let degradedReason = null;

  try {
    const chat = new ChatNVIDIA({
      apiKey,
      baseURL: NEMOTRON_BASE_URL,
      model: NEMOTRON_MODEL,
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 1024,
    });

    replyMessage = await chat.invoke([
      new SystemMessage(systemInstruction),
      ...(contents.length ? contents : [new HumanMessage("Summarize my progress.")]),
    ]);
  } catch (err) {
    console.error("Model failed:", NEMOTRON_MODEL, err?.error || err?.message);
    throw err;
  }

  const reply =
    typeof replyMessage.content === "string"
      ? replyMessage.content.trim()
      : replyMessage.content.map(p => p.text).filter(Boolean).join("\n").trim();

  if (!reply) {
    degradedReason = "AI summary was empty; using your stored insights instead.";
  }

  const safeReply = reply || insightText || describeSnapshot(snapshot, insightText);

  return {
    reply: safeReply,
    meta: {
      ready: !degradedReason,
      endpoint: NEMOTRON_BASE_URL,
      model: NEMOTRON_MODEL,
      reason: degradedReason,
      updatedAt: new Date().toISOString(),
    },
  };
};
