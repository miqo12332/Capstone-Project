import React, { useState } from "react";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "ai", text: "👋 Hi! I’m your AI Coach. Tell me your habit goals, and I’ll help!" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const newMessages = [...messages, { sender: "user", text: input }];

    // Mock AI response
    const aiResponse = getAIResponse(input);

    newMessages.push({ sender: "ai", text: aiResponse });
    setInput("");
  };

  // Mock AI brain (later connect to OpenAI or Gemini)
  const getAIResponse = (query: string): string => {
    if (query.toLowerCase().includes("exercise")) {
      return "💡 Try starting with just 10 pushups every other day instead of 100 daily. Rest days matter!";
    }
    if (query.toLowerCase().includes("reading")) {
      return "📚 Start with 5 minutes before bed. Over time, increase to 15–20 minutes.";
    }
    if (query.toLowerCase().includes("motivation")) {
      return "🔥 Remember: consistency beats intensity. Small wins daily = big success long-term.";
    }
    return "✨ That’s a great goal! Let’s break it into smaller, achievable steps.";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow p-6 flex flex-col h-[80vh]">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">🤖 AI Coach</h1>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 border p-3 rounded">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg max-w-[75%] ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white self-end ml-auto"
                  : "bg-gray-200 text-black self-start mr-auto"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about habits..."
            className="flex-1 border rounded p-2"
          />
          <button
            onClick={handleSend}
            className="bg-green-500 text-white px-4 rounded hover:bg-green-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}