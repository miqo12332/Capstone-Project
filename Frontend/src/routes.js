import React from "react"

// ===== Auth =====
const Login = React.lazy(() => import("./views/auth/Login"))
const Register = React.lazy(() => import("./views/auth/Register"))
const Profile = React.lazy(() => import("./views/auth/Profile"))

// ===== Dashboard & Habits =====
const Dashboard = React.lazy(() => import("./views/dashboard/Dashboard"))
const Habits = React.lazy(() => import("./views/dashboard/Habits"))
const Planner = React.lazy(() => import("./views/dashboard/Planner"))
const Notifications = React.lazy(() => import("./views/dashboard/Notifications"))

// ===== Profile =====
const UserProfile = React.lazy(() => import("./views/profile/UserProfile"))

// ===== Community =====
const Community = React.lazy(() => import("./views/community/Community"))

// ===== Support =====
const Contact = React.lazy(() => import("./views/support/Contact"))
const HelpCenter = React.lazy(() => import("./views/support/HelpCenter"))

// ===== Routes Array =====
const routes = [
  // ===== Dashboard =====
  { path: "/", name: "Home", element: Dashboard },
  { path: "/dashboard", name: "Dashboard", element: Dashboard },
  { path: "/notifications", name: "Notifications", element: Notifications },
  { path: "/habits", name: "Habits", element: Habits },
  { path: "/addhabit", name: "Habits", element: Habits },
  { path: "/habit-library", name: "Habits", element: Habits },
  { path: "/habit-coach", name: "Habits", element: Habits },
  { path: "/planner", name: "Planner", element: Planner },
  { path: "/schedules", name: "Planner", element: Planner },
  { path: "/smart-scheduler", name: "Planner", element: Planner },
  { path: "/progress-tracker", name: "Habits", element: Habits },

  // ===== Profile =====
  { path: "/profile", name: "Profile", element: UserProfile },

  // ===== Community =====
  { path: "/community", name: "Community", element: Community },
  { path: "/friends", name: "Community", element: Community },
  { path: "/messages", name: "Community", element: Community },
  { path: "/leaderboard", name: "Community", element: Community },
  { path: "/group-challenges", name: "Community", element: Community },

  // ===== Support =====
  { path: "/contact", name: "Contact", element: Contact },
  { path: "/help", name: "Help Center", element: HelpCenter },

  // ===== Auth =====
  { path: "/login", name: "Login", element: Login },
  { path: "/register", name: "Register", element: Register },
  { path: "/auth/profile", name: "Profile", element: Profile },
]

export default routes
