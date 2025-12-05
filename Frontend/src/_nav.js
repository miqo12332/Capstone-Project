import React from "react"
import CIcon from "@coreui/icons-react"
import { CNavItem, CNavTitle } from "@coreui/react"
import { cilCalendar, cilGroup, cilList, cilSpeedometer, cilUser } from "@coreui/icons"

const _nav = [
  {
    component: CNavTitle,
    name: 'Plan & track',
  },
  {
    component: CNavItem,
    name: 'Dashboard',
    subtitle: 'Your streaks, wins, and upcoming focus',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Planner',
    subtitle: 'Map out today and queue tomorrow',
    to: '/planner',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Habits',
    subtitle: 'Build, track, and tidy your routines',
    to: '/habits',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Connect',
  },
  {
    component: CNavItem,
    name: 'Community',
    subtitle: 'Ideas, accountability, and friendly nudges',
    to: '/community',
    icon: <CIcon icon={cilGroup} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'You',
  },
  {
    component: CNavItem,
    name: 'Profile',
    subtitle: 'Profile, preferences, and privacy',
    to: '/profile',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
]

export default _nav
