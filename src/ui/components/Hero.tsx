export default function Hero() {
  return (
    <section className="text-center py-20 bg-gradient-to-r from-brand-blue to-brand-green text-white">
      <h2 className="text-5xl font-extrabold mb-6">Build Habits That Last</h2>
      <p className="text-lg mb-8">AI-driven scheduling and micro-steps for long-term success.</p>
      <div className="space-x-4">
        <button className="bg-white text-brand-blue font-semibold px-6 py-3 rounded-lg shadow hover:bg-gray-100">
          Start Free
        </button>
        <button className="border border-white px-6 py-3 rounded-lg hover:bg-white hover:text-brand-blue">
          Watch Demo
        </button>
      </div>
    </section>
  );
}