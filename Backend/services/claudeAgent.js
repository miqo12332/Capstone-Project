// Thin wrapper around the Claude reasoning agent implementation.
// This allows other modules to import from a stable path even if the
// underlying implementation lives in a different file.

import { runReasoningAgent, getAgentStatus } from "./assistantAgent.js";

export { runReasoningAgent, getAgentStatus };
