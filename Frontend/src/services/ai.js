// Lightweight fetch-based client for the AI reasoning endpoint.
export const sendReasoningRequest = async ({ snapshot, insightText = "", history = [] }) => {
  const response = await fetch("/ai/reason", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, insightText, history }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || "AI reasoning request failed");
  }

  return response.json();
};

export const fetchAgentStatus = async () => {
  const response = await fetch("/ai/status");
  if (!response.ok) throw new Error("Unable to load AI status");
  return response.json();
};
