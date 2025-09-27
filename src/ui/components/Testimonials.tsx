const testimonials = [
  { name: "Ani M.", role: "Student", quote: "Micro-steps finally made daily reading stick." },
  { name: "David K.", role: "Engineer", quote: "The AI timing avoids clashes with my work day." },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-16 px-8 bg-gray-50">
      <h3 className="text-3xl font-bold text-center mb-10">What Our Users Say</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {testimonials.map((t, i) => (
          <div key={i} className="p-6 bg-white shadow rounded-lg">
            <p className="italic text-gray-700 mb-4">“{t.quote}”</p>
            <div className="font-semibold">{t.name}</div>
            <div className="text-sm text-gray-500">{t.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}