import React from "react";

export default function AboutStepHabit() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          ℹ️ About StepHabit
        </h1>

        {/* Mission */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">🌍 Our Mission</h2>
          <p className="text-gray-600">
            At StepHabit, our mission is simple: help people build lasting
            habits through small, consistent actions. We believe **progress
            starts with micro-steps**, and our AI-powered platform makes it
            easier to stay motivated and consistent.
          </p>
        </section>

        {/* Vision */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">🚀 Our Vision</h2>
          <p className="text-gray-600">
            We envision a world where anyone can improve themselves one small
            step at a time — whether it’s exercising, reading, or learning a new
            skill. By combining psychology and AI, we make habit formation
            sustainable and rewarding.
          </p>
        </section>

        {/* Team */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">👨‍💻 The Team</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>
              <strong>Mikayel Davtyan</strong> — Co-Founder, Research & AI
            </li>
            <li>
              <strong>Artur Aghamyan</strong> — Co-Founder, Development &
              Engineering
            </li>
            <li>
              <strong>Supervisor: Aleksandr Hayrapetyan</strong> — Guidance &
              Mentorship
            </li>
          </ul>
        </section>

        {/* Closing */}
        <section>
          <h2 className="text-xl font-semibold mb-2">💡 Why StepHabit?</h2>
          <p className="text-gray-600">
            Unlike other trackers, StepHabit focuses on **consistency before
            intensity**. We don’t just remind you — we guide you, encourage you,
            and adapt to your life, making habits part of who you are.
          </p>
        </section>
      </div>
    </div>
  );
}