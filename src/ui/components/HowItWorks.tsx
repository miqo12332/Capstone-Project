const steps = [
  { step: 1, title: "Choose a Habit", desc: "Pick a small starting point you can’t fail." },
  { step: 2, title: "AI Schedules It", desc: "We find the best times around your day." },
  { step: 3, title: "Grow Gradually", desc: "Increase step size as your streak grows." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-16 px-8">
      <h3 className="text-3xl font-bold text-center mb-10">How It Works</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
        {steps.map((s, i) => (
          <div key={i} className="p-6 bg-white shadow rounded-lg">
            <div className="text-3xl font-bold text-brand-blue mb-4">{s.step}</div>
            <h4 className="text-xl font-semibold">{s.title}</h4>
            <p className="text-gray-600 mt-2">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}