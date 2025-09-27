const items = [
  { icon: "🌱", title: "Start Small", desc: "Begin with micro-steps that feel effortless." },
  { icon: "🤖", title: "Smart Scheduling", desc: "AI finds the perfect times for your habits." },
  { icon: "🔥", title: "Stay Motivated", desc: "Gamification and charts keep you going." },
];

export default function Benefits() {
  return (
    <section id="benefits" className="py-16 px-8 bg-gray-50 text-center">
      <h3 className="text-3xl font-bold mb-10">Why StepHabit?</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {items.map((b, i) => (
          <div key={i} className="p-6 bg-white shadow rounded-lg">
            <div className="text-5xl mb-4">{b.icon}</div>
            <h4 className="text-xl font-semibold">{b.title}</h4>
            <p className="text-gray-600 mt-2">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}