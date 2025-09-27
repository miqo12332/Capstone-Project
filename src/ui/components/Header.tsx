export default function Header() {
  return (
    <header className="flex justify-between items-center py-6 px-8 bg-white shadow">
      <h1 className="text-2xl font-bold text-brand-blue">StepHabit</h1>
      <nav className="space-x-6">
        <a href="#benefits" className="text-gray-600 hover:text-brand-blue">Benefits</a>
        <a href="#how" className="text-gray-600 hover:text-brand-blue">How It Works</a>
        <a href="#testimonials" className="text-gray-600 hover:text-brand-blue">Testimonials</a>
      </nav>
      <button className="bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-emerald-600">
        Get Started
      </button>
    </header>
  );
}