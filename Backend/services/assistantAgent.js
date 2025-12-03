const MAX_HISTORY_MESSAGES = parseInt(process.env.ASSISTANT_HISTORY_LIMIT || "12", 10);
const GEMINI_BASE_URL = (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const normalizeModelName = (name = "") => name.replace(/^models\//, "").replace(/-latest$/, "");
const GEMINI_MODEL = normalizeModelName(process.env.GEMINI_MODEL || "gemini-1.5-flash");
const PROVIDER_NAME = process.env.GEMINI_PROVIDER_NAME || "Google Gemini";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyA0MwERRiDFuO-kuMsF-BmJWdQaIIO8F1k";

const hasApiKey = () => Boolean(GEMINI_API_KEY);

let resolvedModelName = null;
let resolvingModelPromise = null;

const parseModelVersion = (name = "") => {
  const match = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const resolveModelName = async (apiKey) => {
  const fallback = GEMINI_MODEL;

  try {
    const response = await fetch(`${GEMINI_BASE_URL}/models?key=${apiKey}`);

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models : [];

    const supportsGenerateContent = (model = {}) =>
      Array.isArray(model.supportedMethods) && model.supportedMethods.includes("generateContent");

    const simplified = models
      .filter((model) => model?.name)
      .map((model) => ({
        ...model,
        simpleName: normalizeModelName(model.name),
      }))
      .filter((model) => supportsGenerateContent(model));

    if (simplified.some((model) => model.simpleName === fallback)) {
      return fallback;
    }

    const flashModels = simplified.filter((model) => model.simpleName.includes("-flash"));

    if (!flashModels.length) {
      return fallback;
    }

    flashModels.sort((a, b) => parseModelVersion(b.simpleName) - parseModelVersion(a.simpleName));
    return flashModels[0].simpleName || fallback;
  } catch (error) {
    return fallback;
  }
};

const getModelName = async (apiKey) => {
  if (resolvedModelName) {
    return resolvedModelName;
  }

  if (!resolvingModelPromise) {
    resolvingModelPromise = resolveModelName(apiKey)
      .then((name) => {
        resolvedModelName = name || GEMINI_MODEL;
        return resolvedModelName;
      })
      .finally(() => {
        resolvingModelPromise = null;
      });
  }

  return resolvingModelPromise;
};

export const getAgentStatus = () => ({
  ready: hasApiKey(),
  provider: PROVIDER_NAME,
  model: hasApiKey() ? resolvedModelName || GEMINI_MODEL : null,
  reason: hasApiKey()
    ? null
    : "Set the GEMINI_API_KEY environment variable to enable the adaptive AI companion.",
  updatedAt: new Date().toISOString(),
});

const limitHistory = (history = []) => {
  if (!Array.isArray(history) || !history.length) {
    return [];
  }

  const limit = Number.isFinite(MAX_HISTORY_MESSAGES) ? Math.max(MAX_HISTORY_MESSAGES, 2) : 12;
  return history.slice(-limit);
};

const formatList = (items = []) => items.filter(Boolean).join("; ");

const describeSnapshot = (snapshot = {}, insightText) => {
  const profile = snapshot.user || {};
  const progress = snapshot.progress || {};
  const schedules = snapshot.schedules?.upcoming || [];
  const topHabits = (snapshot.progress?.habitSummaries || []).slice(0, 5);
  const needsHelp = (snapshot.progress?.habitSummaries || [])
    .filter((habit) => habit.completionRate < 60)
    .slice(0, 3);

  const lines = [
    `Name: ${profile.name || "Unknown"}`,
    `Primary goal: ${profile.primary_goal || "Not specified"}`,
    `Focus area: ${profile.focus_area || "Not set"}`,
    `Daily commitment: ${profile.daily_commitment || "Not set"}`,
    `Support preference: ${profile.support_preference || "Not set"}`,
    `Average completion: ${progress.completionRate || 0}% over ${progress.total || 0} recent entries`,
  ];

  if (topHabits.length) {
    lines.push(
      `Top habits: ${formatList(
        topHabits.map(
          (habit) => `${habit.title} — ${habit.completionRate}% success (${habit.completed} completed, ${habit.missed} missed)`
        )
      )}`
    );
  }

  if (needsHelp.length) {
    lines.push(
      `Habits needing focus: ${formatList(
        needsHelp.map(
          (habit) => `${habit.title} — ${habit.completionRate}% success (${habit.completed} completed, ${habit.missed} missed)`
        )
      )}`
    );
  }

  if (schedules.length) {
    lines.push(
      `Upcoming schedule: ${formatList(
        schedules.slice(0, 5).map(
          (item) => `${item.habitTitle} on ${item.day} at ${item.starttime}${item.endtime ? ` until ${item.endtime}` : ""}`
        )
      )}`
    );
  }

  if (insightText) {
    lines.push(`Recent insight summary: ${insightText}`);
  }

  return lines.join("\n");
};

const buildMessages = ({ snapshot, insightText, history = [] }) => {
  const systemPrompt = [
    "You are StepHabit's AI companion, a motivational coach who reasons carefully",
    "about the user's habits, schedules, and progress before responding.",
    "Provide empathetic yet practical guidance, highlight relevant insights,",
    "and end with a reflective or action-oriented question that encourages follow-up.",
    "Keep responses concise (2-4 short paragraphs or paragraphs with a short bullet list).",
    "Use Markdown for emphasis when it improves clarity.",
  ].join(" ");

  const contextBlock = describeSnapshot(snapshot, insightText);

  const formattedHistory = limitHistory(history).map((entry) => ({
    role: entry.role === "assistant" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));

  return {
    systemInstruction: `${systemPrompt}\n\n${contextBlock}`,
    contents: formattedHistory,
  };
};

export const runReasoningAgent = async ({ snapshot, insightText, history, apiKeyOverride }) => {
  const apiKey = apiKeyOverride || GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }

  const modelName = await getModelName(apiKey);

  const { systemInstruction, contents } = buildMessages({ snapshot, insightText, history });

  const payload = {
    contents:
      contents && contents.length
        ? contents
        : [
            {
              role: "user",
              parts: [
                {
                  text: "Provide tailored guidance based on the system instruction and any available context.",
                },
              ],
            },
          ],
    system_instruction: {
      role: "system",
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
    },
  };

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    ?.trim();

  if (!reply) {
    throw new Error("Gemini response missing content");
  }

  return {
    reply,
    meta: {
      ready: true,
      provider: PROVIDER_NAME,
      model: modelName,
      reason: null,
      usage: data?.usage || null,
      updatedAt: new Date().toISOString(),
    },
  };
};
