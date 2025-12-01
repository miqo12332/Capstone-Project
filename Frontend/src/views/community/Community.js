import React, { useContext, useEffect, useMemo, useState } from "react"
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
import { AuthContext } from "../../context/AuthContext"
import { fetchFriends } from "../../services/friends"
import { fetchThreads } from "../../services/messages"
import { fetchChallenges } from "../../services/challenges"

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
  const { user } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname))
  const [friendTotal, setFriendTotal] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [joinedChallenges, setJoinedChallenges] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setFriendTotal(0)
      setUnreadMessages(0)
      setJoinedChallenges(0)
      return
    }

    const loadCounts = async () => {
      try {
        const [friends, threads, challenges] = await Promise.all([
          fetchFriends(user.id),
          fetchThreads(user.id),
          fetchChallenges(),
        ])

        setFriendTotal(Array.isArray(friends) ? friends.length : 0)

        const unreadCount = Array.isArray(threads)
          ? threads.reduce((sum, thread) => sum + (Number(thread.unread) || 0), 0)
          : 0
        setUnreadMessages(unreadCount)

        const joinedCount = Array.isArray(challenges)
          ? challenges.reduce((count, challenge) => {
              const membership = (challenge.participants || []).find(
                (participant) => participant.id === user.id
              )
              const status = membership?.UserGroupChallenge?.status
              const role = membership?.UserGroupChallenge?.role
              return status === "accepted" || role === "creator" ? count + 1 : count
            }, 0)
          : 0
        setJoinedChallenges(joinedCount)
      } catch (error) {
        console.error("Failed to load community counts", error)
        setFriendTotal(0)
        setUnreadMessages(0)
        setJoinedChallenges(0)
      }
    }

    loadCounts()
  }, [user?.id])

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

  const formatValue = (value) =>
    typeof value === "number" && value > 999 ? `${(value / 1000).toFixed(1)}k` : value

  const heroStats = [
    { label: "Friends", value: formatValue(friendTotal), detail: "Your friends" },
    { label: "Messages", value: formatValue(unreadMessages), detail: "Unread" },
    { label: "Challenges", value: formatValue(joinedChallenges), detail: "Joined" },
    { label: "Leaderboard", value: "", detail: "" },
  ]

  return (
    <div className="community-shell pt-3 pb-4 position-relative">
      <div className="compact-hero shadow-sm rounded-4 bg-white border p-3 p-lg-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h1 className="h3 mb-1">Community</h1>
            <p className="text-body-secondary mb-0">
              Friends, messages, challenges, and leaderboards in one place.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            {heroStats.map((stat) => (
              <div key={stat.label} className="stat-chip text-center px-3 py-2">
                <div className="fw-semibold">{stat.value}</div>
                <div className="small text-body-secondary">{stat.label}</div>
                <div className="visually-hidden">{stat.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shadow-sm rounded-4 bg-white border p-3 p-lg-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40 }}
            >
              <CIcon icon={tabMeta[activeTab].icon} />
            </div>
            <div>
              <h2 className="h5 mb-1">{tabMeta[activeTab].label}</h2>
              <p className="text-body-secondary small mb-0">{tabMeta[activeTab].accent}</p>
            </div>
          </div>
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
