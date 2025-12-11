import React from "react"
import CIcon from "@coreui/icons-react"
import { CNavItem, CNavTitle } from "@coreui/react"
import { cilCalendar, cilChatBubble, cilGroup, cilList, cilSpeedometer, cilUser } from "@coreui/icons"

const _nav = [
  {
    component: CNavTitle,
    name: 'Plan & track',
  },
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Planner',
    to: '/planner',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Habits',
    to: '/habits',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'HabitCoach',
    to: '/habit-coach',
    icon: <CIcon icon={cilChatBubble} customClassName="nav-icon" />,
  },

  {
    component: CNavTitle,
    name: 'Connect',
  },
  {
    component: CNavItem,
    name: 'Community',
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
    to: '/profile',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },
]

export default _nav
