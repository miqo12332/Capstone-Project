import React from "react"
import CIcon from "@coreui/icons-react"
import { CNavItem, CNavTitle } from "@coreui/react"
import {
  cilAccountLogout,
  cilBell,
  cilCalendar,
  cilContact,
  cilGraph,
  cilInfo,
  cilGroup,
  cilLightbulb,
  cilList,
  cilLockLocked,
  cilSettings,
  cilSpeedometer,
  cilStar,
  cilSync,
  cilUser,
  cilUserPlus,
  cilChatBubble,
} from "@coreui/icons"

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'My Schedule',
    to: '/schedules',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Habit Tools',
  },
  {
    component: CNavItem,
    name: 'Habits',
    to: '/habits',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Notifications',
    to: '/notifications',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Community',
  },
  {
    component: CNavItem,
    name: 'Friends',
    to: '/friends',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Messages',
    to: '/messages',
    icon: <CIcon icon={cilChatBubble} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Leaderboard',
    to: '/leaderboard',
    icon: <CIcon icon={cilGroup} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Group Challenges',
    to: '/group-challenges',
    icon: <CIcon icon={cilLightbulb} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Profile & Auth',
  },
  {
    component: CNavItem,
    name: 'Register',
    to: '/register',
    icon: <CIcon icon={cilUserPlus} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Login',
    to: '/login',
    icon: <CIcon icon={cilLockLocked} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Logout',
    to: '/logout',
    icon: <CIcon icon={cilAccountLogout} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'User Profile',
    to: '/profile',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Preferences',
    to: '/preferences',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Sync',
  },
  {
    component: CNavItem,
    name: 'Calendar Sync',
    to: '/calendar-sync',
    icon: <CIcon icon={cilSync} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Fitness Sync',
    to: '/fitness-sync',
    icon: <CIcon icon={cilSync} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Other',
  },
  {
    component: CNavItem,
    name: 'Achievements',
    to: '/achievements',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'About StepHabit',
    to: '/about',
    icon: <CIcon icon={cilInfo} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Help Center',
    to: '/help',
    icon: <CIcon icon={cilInfo} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Contact',
    to: '/contact',
    icon: <CIcon icon={cilContact} customClassName="nav-icon" />,
  },
]

export default _nav
