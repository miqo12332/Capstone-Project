import React, { useState } from "react";

export default function ContactSupport() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`📩 Message sent!\nFrom: ${name} (${email})\nMessage: ${message}`);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          📩 Contact & Support
        </h1>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full border rounded p-2 h-28"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
          >
            Send Message
          </button>
        </form>

        {/* Divider */}
        <hr className="my-6" />

        {/* Other Support Options */}
        <div className="space-y-3">
          <p>
            📧 Email us directly:{" "}
            <a
              href="mailto:support@stephabit.com"
              className="text-blue-500 hover:underline"
            >
              support@stephabit.com
            </a>
          </p>

          <p>
            💬 Live Chat:{" "}
            <span className="text-gray-500 italic">
              (Coming soon — AI assistant integration)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}