import React from "react";

export default function TermsPrivacy() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          📜 Terms & Privacy
        </h1>

        {/* Terms of Service */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">⚖️ Terms of Service</h2>
          <p className="text-gray-600 mb-4">
            By using StepHabit, you agree to follow our rules and guidelines.
            You must be at least 13 years old to use this app. Do not misuse
            the platform by attempting to disrupt services or access data you
            don’t own.
          </p>
          <ul className="list-disc pl-6 text-gray-600">
            <li>You are responsible for your account activity.</li>
            <li>Habits and data are stored securely but at your discretion.</li>
            <li>We may update features, and terms may change over time.</li>
          </ul>
        </section>

        {/* Privacy Policy */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">🔒 Privacy Policy</h2>
          <p className="text-gray-600 mb-4">
            Your privacy is important to us. StepHabit collects minimal data
            necessary to provide personalized coaching and reminders. Data is
            never sold to third parties.
          </p>
          <ul className="list-disc pl-6 text-gray-600">
            <li>We collect habits, progress logs, and notification preferences.</li>
            <li>We do not share your personal information without consent.</li>
            <li>
              Data may be used anonymously for analytics to improve the app.
            </li>
          </ul>
        </section>

        {/* Data Rights */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">🛡️ Your Data Rights</h2>
          <p className="text-gray-600">
            You can export or delete your data anytime from the Export page.
            Contact us if you wish to permanently remove your account and data.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold mb-2">📩 Contact Us</h2>
          <p className="text-gray-600">
            If you have questions about these terms or your privacy, reach out
            at <a href="mailto:support@stephabit.com" className="text-blue-500 hover:underline">
              support@stephabit.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}