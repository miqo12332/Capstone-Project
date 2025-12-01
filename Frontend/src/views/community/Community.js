import React, { useEffect, useMemo, useState } from "react"
import {
  CBadge,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilChatBubble, cilGroup, cilSpeedometer, cilUser } from "@coreui/icons"
import { useLocation, useNavigate } from "react-router-dom"

import Friends from "./Friends"
import Messages from "./Messages"
import GroupChallenges from "./GroupChallenges"
import Leaderboard from "./Leaderboard"

import "./Community.css"

const tabRoutes = {
  friends: "/community",
  messages: "/messages",
  challenges: "/group-challenges",
  leaderboard: "/leaderboard",
}

const pathToTab = {
  "/community": "friends",
  "/friends": "friends",
  "/messages": "messages",
  "/group-challenges": "challenges",
  "/leaderboard": "leaderboard",
}

const getTabFromPath = (pathname) => pathToTab[pathname?.replace(/\/$/, "")] || "friends"

const Community = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname))

  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname)
    if (tabFromPath !== activeTab) {
      setActiveTab(tabFromPath)
    }
  }, [location.pathname, activeTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    const nextPath = tabRoutes[tab] || "/community"
    if (location.pathname !== nextPath) {
      navigate(nextPath)
    }
  }

  const tabDescription = useMemo(
    () => ({
      friends: "Add, search, and remove friends to grow your circle.",
      messages: "DM friends to share progress and encouragement.",
      challenges: "Join group challenges to stay accountable together.",
      leaderboard: "Track weekly streaks and completion scores.",
    }),
    []
  )

  const tabMeta = useMemo(
    () => ({
      friends: {
        icon: cilUser,
        label: "Friends",
        accent: "Stay connected and discover new accountability partners.",
      },
      messages: {
        icon: cilChatBubble,
        label: "Messages",
        accent: "Keep your conversations organized with clean, bright threads.",
      },
      challenges: {
        icon: cilGroup,
        label: "Challenges",
        accent: "Team up, set dates, and power through together.",
      },
      leaderboard: {
        icon: cilSpeedometer,
        label: "Leaderboard",
        accent: "Celebrate consistency and cheer on the top performers.",
      },
    }),
    []
  )

  const heroStats = [
    { label: "Connections", value: "120+", detail: "active friends and teammates" },
    { label: "Messages", value: "3.2k", detail: "shared wins this month" },
    { label: "Challenges", value: "28", detail: "group goals to join" },
    { label: "Leaders", value: "Top 10", detail: "updated every week" },
  ]

  return (
    <div className="community-shell pt-3 pb-5 position-relative">
      <div className="community-hero rounded-4 shadow-sm p-4 p-lg-5 mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div className="text-white">
            <p className="text-uppercase small mb-2 opacity-75">Community hub</p>
            <h1 className="display-6 fw-bold mb-2">Bring your habits to life with people</h1>
            <p className="lead mb-3 mb-lg-4 text-white-75">
              Switch between friends, messages, challenges, and leaderboards without losing context.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <CBadge color="light" className="text-dark px-3 py-2 rounded-pill shadow-sm">
                <span role="img" aria-label="sparkle">
                  ✨
                </span>{" "}
                Modernized layout
              </CBadge>
              <CBadge color="info" className="px-3 py-2 rounded-pill shadow-sm">
                Guided navigation
              </CBadge>
            </div>
          </div>
          <div className="hero-highlight text-white p-3 rounded-4">
            <div className="small text-uppercase opacity-75">Currently viewing</div>
            <div className="d-flex align-items-center gap-2 mt-2">
              <div className="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44 }}
              >
                <CIcon icon={tabMeta[activeTab].icon} size="lg" />
              </div>
              <div>
                <div className="fw-semibold">{tabMeta[activeTab].label}</div>
                <div className="small opacity-75">{tabMeta[activeTab].accent}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="row row-cols-2 row-cols-md-4 g-3 mt-3">
          {heroStats.map((stat) => (
            <div className="col" key={stat.label}>
              <div className="glass-card p-3 h-100 rounded-3">
                <div className="text-uppercase small text-white-50">{stat.label}</div>
                <div className="fs-4 fw-bold text-white">{stat.value}</div>
                <div className="small text-white-75">{stat.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="floating-card shadow-sm rounded-4 bg-white p-3 p-lg-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h2 className="fw-bold mb-1">Community</h2>
            <p className="text-body-secondary mb-0">
              One place for friends, messages, challenges, and leaderboards.
            </p>
          </div>
          <CBadge color="warning" className="px-3 py-2 d-flex align-items-center gap-2 rounded-pill">
            <span role="img" aria-label="community">
              ⭐
            </span>
            4-in-1 experience
          </CBadge>
        </div>

        <CNav variant="pills" role="tablist" className="community-tabs mb-2">
          {Object.entries(tabMeta).map(([tab, meta]) => (
            <CNavItem key={tab}>
              <CNavLink
                active={activeTab === tab}
                onClick={() => handleTabChange(tab)}
                className="rounded-pill d-flex align-items-center gap-2 px-3"
              >
                <CIcon icon={meta.icon} className="text-primary" />
                {meta.label}
              </CNavLink>
            </CNavItem>
          ))}
        </CNav>

        <p className="text-body-secondary small mb-0">{tabDescription[activeTab]}</p>
      </div>

      <CTabContent>
        <CTabPane visible={activeTab === "friends"}>
          <Friends />
        </CTabPane>
        <CTabPane visible={activeTab === "messages"}>
          <Messages />
        </CTabPane>
        <CTabPane visible={activeTab === "challenges"}>
          <GroupChallenges />
        </CTabPane>
        <CTabPane visible={activeTab === "leaderboard"}>
          <Leaderboard />
        </CTabPane>
      </CTabContent>
    </div>
  )
}

export default Community
