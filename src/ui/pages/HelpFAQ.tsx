import React, { useState } from "react";

interface FAQ {
  question: string;
  answer: string;
}

export default function HelpFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQ[] = [
    {
      question: "❓ How does StepHabit work?",
      answer:
        "StepHabit helps you build habits gradually with micro-steps. It adapts to your schedule and uses AI to suggest improvements.",
    },
    {
      question: "📱 Do I need internet to use StepHabit?",
      answer:
        "Most features work offline. AI coaching and cloud sync require internet access.",
    },
    {
      question: "🔔 Can I customize my reminders?",
      answer:
        "Yes! You can set reminders by habit, choose time of day, and let AI suggest the best schedule.",
    },
    {
      question: "☁️ Can I back up my data?",
      answer:
        "Yes, you can export data in CSV/PDF/JSON formats. Cloud sync with Google Drive and iCloud will be available soon.",
    },
    {
      question: "🤖 How smart is the AI Coach?",
      answer:
        "The AI Coach can suggest habits, micro-steps, and give motivational advice. Over time, it will adapt to your progress.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">❓ Help & FAQ</h1>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded">
              <button
                onClick={() => toggleFAQ(i)}
                className="w-full text-left px-4 py-3 font-medium flex justify-between items-center hover:bg-gray-100"
              >
                {faq.question}
                <span>{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && (
                <div className="px-4 py-3 text-gray-600 border-t bg-gray-50">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}