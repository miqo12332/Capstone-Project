import React, { useEffect, useMemo, useState } from "react"
import { CBadge, CNav, CNavItem, CNavLink, CTabContent, CTabPane } from "@coreui/react"
import { useLocation, useNavigate } from "react-router-dom"

import Friends from "./Friends"
import Messages from "./Messages"
import GroupChallenges from "./GroupChallenges"
import Leaderboard from "./Leaderboard"

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

  return (
    <div className="pt-3 pb-5 position-relative">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Community</h2>
          <p className="text-body-secondary mb-0">
            One place for friends, messages, challenges, and leaderboards.
          </p>
        </div>
        <CBadge color="warning" className="px-3 py-2 d-flex align-items-center gap-2">
          <span role="img" aria-label="community">
            ⭐
          </span>
          4-in-1 experience
        </CBadge>
      </div>

      <CNav variant="tabs" role="tablist" className="mb-2">
        <CNavItem>
          <CNavLink active={activeTab === "friends"} onClick={() => handleTabChange("friends")}>
            Friends
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "messages"} onClick={() => handleTabChange("messages")}>
            Messages
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "challenges"} onClick={() => handleTabChange("challenges")}>
            Challenges
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "leaderboard"} onClick={() => handleTabChange("leaderboard")}>
            Leaderboard
          </CNavLink>
        </CNavItem>
      </CNav>

      <p className="text-body-secondary small mb-3">{tabDescription[activeTab]}</p>

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
