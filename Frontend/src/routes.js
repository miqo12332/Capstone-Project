import React from "react";

// ===== Auth =====
const Login = React.lazy(() => import("./views/auth/Login"));
const Register = React.lazy(() => import("./views/auth/Register"));
const Logout = React.lazy(() => import("./views/auth/Logout"));
const Profile = React.lazy(() => import("./views/auth/Profile"));

// ===== Dashboard & Habits =====
const Dashboard = React.lazy(() => import("./views/dashboard/Dashboard"));
const Habits = React.lazy(() => import("./views/dashboard/Habits"));
const Notifications = React.lazy(() => import("./views/dashboard/Notifications"));
const ReportsAnalytics = React.lazy(() => import("./views/dashboard/ReportsAnalytics"));
const Schedules = React.lazy(() => import("./views/dashboard/Schedules"));
const SmartScheduler = React.lazy(() => import("./views/dashboard/SmartScheduler"));

// ===== Profile =====
const UserProfile = React.lazy(() => import("./views/profile/UserProfile"));
const Preferences = React.lazy(() => import("./views/profile/Preferences"));
const Settings = React.lazy(() => import("./views/profile/Settings"));

// ===== Community =====
const Friends = React.lazy(() => import("./views/community/Friends"));
const Messages = React.lazy(() => import("./views/community/Messages"));
const GroupChallenges = React.lazy(() => import("./views/community/GroupChallenges"));
const Leaderboard = React.lazy(() => import("./views/community/Leaderboard"));

// ===== Sync =====
const CalendarSync = React.lazy(() => import("./views/sync/CalendarSync"));
const FitnessSync = React.lazy(() => import("./views/sync/FitnessSync"));

// ===== Support =====
const Contact = React.lazy(() => import("./views/support/Contact"));
const HelpCenter = React.lazy(() => import("./views/support/HelpCenter"));

// ===== Routes Array =====
const routes = [
  // ===== Dashboard =====
  { path: "/", name: "Home", element: Dashboard },
  { path: "/dashboard", name: "Dashboard", element: Dashboard },
  { path: "/habits", name: "Habits", element: Habits },
  { path: "/addhabit", name: "Habits", element: Habits },
  { path: "/habit-library", name: "Habits", element: Habits },
  { path: "/notifications", name: "Notifications", element: Notifications },
  { path: "/reportsanalytics", name: "Reports & Analytics", element: ReportsAnalytics },
  { path: "/schedules", name: "Schedules", element: Schedules },
  { path: "/smart-scheduler", name: "Smart Scheduler", element: SmartScheduler },
  { path: "/progress-tracker", name: "Habits", element: Habits },
  { path: "/dailychallenge", name: "Habits", element: Habits },
  { path: "/habit-coach", name: "Habits", element: Habits },

  // ===== My Routine (rerouted) =====
  { path: "/myroutine", name: "Habits", element: Habits },

  // ===== Profile =====
  { path: "/profile", name: "User Profile", element: UserProfile },
  { path: "/settings", name: "Settings", element: Settings },
  { path: "/preferences", name: "Preferences", element: Preferences },

  // ===== Community =====
  { path: "/friends", name: "Friends", element: Friends },
  { path: "/messages", name: "Messages", element: Messages },
  { path: "/leaderboard", name: "Leaderboard", element: Leaderboard },
  { path: "/group-challenges", name: "Group Challenges", element: GroupChallenges },

  // ===== Sync =====
  { path: "/calendar-sync", name: "Calendar Sync", element: CalendarSync },
  { path: "/fitness-sync", name: "Fitness Sync", element: FitnessSync },

  // ===== Support =====
  { path: "/contact", name: "Contact", element: Contact },
  { path: "/help", name: "Help Center", element: HelpCenter },

  // ===== Auth =====
  { path: "/login", name: "Login", element: Login },
  { path: "/register", name: "Register", element: Register },
  { path: "/logout", name: "Logout", element: Logout },
  { path: "/auth/profile", name: "Profile", element: Profile },
];

export default routes;
