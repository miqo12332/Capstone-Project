import React, { useState } from "react";
import PropTypes from "prop-types";

import { sendReasoningRequest } from "../../services/ai";

// Simple UI wrapper that calls the /ai/reason endpoint and renders the responses.
// Pass in the latest snapshot and optional insight text to ground the AI companion.
const AIAgentPanel = ({ snapshot, insightText = "", initialHistory = [] }) => {
  const [history, setHistory] = useState(initialHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const trimmed = input.trim();
    const pendingHistory = [...history, { role: "user", content: trimmed }];

    setLoading(true);
    setError("");
    setHistory(pendingHistory);
    setInput("");

    try {
      const result = await sendReasoningRequest({
        snapshot,
        insightText,
        history: pendingHistory,
      });

      setHistory([...pendingHistory, { role: "assistant", content: result.reply }]);
      if (result?.meta) setMeta(result.meta);
    } catch (err) {
      setError(err.message || "Unexpected error contacting the AI service.");
      setHistory(history);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-agent-panel">
      <div className="ai-agent-panel__history">
        {history.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`ai-agent-panel__message ai-agent-panel__message--${message.role}`}
          >
            <strong>{message.role === "assistant" ? "AI" : "You"}:</strong> {" "}
            <span>{message.content}</span>
          </div>
        ))}
      </div>

      {error && <div className="ai-agent-panel__error">{error}</div>}

      <div className="ai-agent-panel__input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the StepHabit AI companion anything about your habits..."
          rows={3}
        />
        <button type="button" onClick={sendMessage} disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>

      {meta?.usage && (
        <div className="ai-agent-panel__meta">
          <small>
            Tokens used: prompt {meta.usage.input_tokens} / completion {meta.usage.output_tokens}
          </small>
        </div>
      )}
    </div>
  );
};

AIAgentPanel.propTypes = {
  snapshot: PropTypes.object.isRequired,
  insightText: PropTypes.string,
  initialHistory: PropTypes.array,
};

export default AIAgentPanel;
