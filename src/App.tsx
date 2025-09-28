import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

// Import pages
import LandingPage from "./ui/pages/LandingPage";
import Onboarding from "./ui/pages/Onboarding";
import Dashboard from "./ui/pages/Dashboard";
import AddHabit from "./ui/pages/AddHabit";
import HabitDetail from "./ui/pages/HabitDetail";
import MyRoutine from "./ui/pages/MyRoutine";
import SuggestedHabits from "./ui/pages/SuggestedHabits";
import AICoach from "./ui/pages/AICoach";
import FriendsList from "./ui/pages/FriendsList";
import GroupChallenges from "./ui/pages/GroupChallenges";
import NotificationsSettings from "./ui/pages/NotificationsSettings";
import ProfileSettings from "./ui/pages/ProfileSettings";
import ThemeSettings from "./ui/pages/ThemeSettings";
import ReportsAnalytics from "./ui/pages/ReportsAnalytics";
import ExportData from "./ui/pages/ExportData";
import HelpFAQ from "./ui/pages/HelpFAQ";
import TermsPrivacy from "./ui/pages/TermsPrivacy";
import ContactSupport from "./ui/pages/ContactSupport";
import AboutStepHabit from "./ui/pages/AboutStepHabit";
import DailyChallenge from "./ui/pages/DailyChallenge";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <nav className="w-72 bg-gray-800 text-white p-6 space-y-6">
          <h1 className="text-xl font-bold mb-4">📌 StepHabit</h1>

          {/* Section: Core */}
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">
              Core
            </h2>
            <ul className="space-y-1">
              <li><Link to="/" className="hover:underline">🏠 Landing</Link></li>
              <li><Link to="/onboarding" className="hover:underline">🚀 Onboarding</Link></li>
              <li><Link to="/dashboard" className="hover:underline">📊 Dashboard</Link></li>
            </ul>
          </div>

          {/* Section: Habits */}
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">
              Habits
            </h2>
            <ul className="space-y-1">
              <li><Link to="/add-habit" className="hover:underline">➕ Add Habit</Link></li>
              <li><Link to="/habit-detail" className="hover:underline">📌 Habit Detail</Link></li>
              <li><Link to="/routine" className="hover:underline">⏰ My Routine</Link></li>
              <li><Link to="/suggested" className="hover:underline">✨ Suggested Habits</Link></li>
              <li><Link to="/coach" className="hover:underline">🤖 AI Coach</Link></li>
              <li><Link to="/daily-challenge" className="hover:underline">🎯 Daily Challenge</Link></li>
            </ul>
          </div>

          {/* Section: Social */}
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">
              Social
            </h2>
            <ul className="space-y-1">
              <li><Link to="/friends" className="hover:underline">👥 Friends</Link></li>
              <li><Link to="/challenges" className="hover:underline">🏆 Challenges</Link></li>
            </ul>
          </div>

          {/* Section: Analytics */}
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">
              Analytics
            </h2>
            <ul className="space-y-1">
              <li><Link to="/reports" className="hover:underline">📈 Reports</Link></li>
              <li><Link to="/export" className="hover:underline">📂 Export Data</Link></li>
            </ul>
          </div>

          {/* Section: Settings */}
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">
              Settings
            </h2>
            <ul className="space-y-1">
              <li><Link to="/notifications" className="hover:underline">🔔 Notifications</Link></li>
              <li><Link to="/profile" className="hover:underline">👤 Profile</Link></li>
              <li><Link to="/theme" className="hover:underline">🎨 Theme</Link></li>
            </ul>
          </div>

          {/* Section: Help & Info */}
          <div>
            <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">
              Help & Info
            </h2>
            <ul className="space-y-1">
              <li><Link to="/faq" className="hover:underline">❓ FAQ</Link></li>
              <li><Link to="/terms" className="hover:underline">📜 Terms & Privacy</Link></li>
              <li><Link to="/contact" className="hover:underline">📩 Contact</Link></li>
              <li><Link to="/about" className="hover:underline">ℹ️ About</Link></li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          <Routes>
            {/* Core */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Habits */}
            <Route path="/add-habit" element={<AddHabit />} />
            <Route path="/habit-detail" element={<HabitDetail />} />
            <Route path="/routine" element={<MyRoutine />} />
            <Route path="/suggested" element={<SuggestedHabits />} />
            <Route path="/coach" element={<AICoach />} />
            <Route path="/daily-challenge" element={<DailyChallenge />} />

            {/* Social */}
            <Route path="/friends" element={<FriendsList />} />
            <Route path="/challenges" element={<GroupChallenges />} />

            {/* Analytics */}
            <Route path="/reports" element={<ReportsAnalytics />} />
            <Route path="/export" element={<ExportData />} />

            {/* Settings */}
            <Route path="/notifications" element={<NotificationsSettings />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/theme" element={<ThemeSettings />} />

            {/* Help & Info */}
            <Route path="/faq" element={<HelpFAQ />} />
            <Route path="/terms" element={<TermsPrivacy />} />
            <Route path="/contact" element={<ContactSupport />} />
            <Route path="/about" element={<AboutStepHabit />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}