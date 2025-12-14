import React, { useCallback, useContext, useEffect, useState } from "react"
import {
  CAlert,
  CAvatar,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCollapse,
  CCol,
  CForm,
  CFormInput,
  CFormSwitch,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilSearch, cilUser, cilUserPlus } from "@coreui/icons"
import { AuthContext } from "../../context/AuthContext"
import {
  addFriend,
  fetchFriendRequests,
  fetchFriends,
  respondToFriendRequest,
  searchPotentialFriends,
  updateHabitVisibility,
} from "../../services/friends"

const Friends = () => {
  const { user } = useContext(AuthContext)
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [addingFriendIds, setAddingFriendIds] = useState([])
  const [requests, setRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [respondingIds, setRespondingIds] = useState([])
  const [updatingVisibility, setUpdatingVisibility] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [expandedFriendId, setExpandedFriendId] = useState(null)

  useEffect(() => {
    if (!user?.id) return

    const loadFriendsAndRequests = async () => {
      try {
        setLoadingFriends(true)
        setLoadingRequests(true)
        setError("")
        const [friendData, requestData] = await Promise.all([
          fetchFriends(user.id),
          fetchFriendRequests(user.id),
        ])
        setFriends(Array.isArray(friendData) ? friendData : [])
        setRequests(Array.isArray(requestData) ? requestData : [])
      } catch (err) {
        console.error("Failed to load friends", err)
        setError("Unable to load friends right now. Please try again.")
      } finally {
        setLoadingFriends(false)
        setLoadingRequests(false)
      }
    }

    loadFriendsAndRequests()
  }, [user?.id])

  const performSearch = useCallback(
    async (query, { allowEmpty = false } = {}) => {
      const trimmedQuery = (query || "").trim()
      setSuccess("")
      setError("")

      if (!allowEmpty && !trimmedQuery) {
        setSearchResults([])
        return
      }

      try {
        setSearching(true)
        const results = await searchPotentialFriends(user.id, trimmedQuery)
        setSearchResults(Array.isArray(results) ? results : [])
      } catch (err) {
        console.error("Friend search failed", err)
        setError("Search failed. Please try again.")
      } finally {
        setSearching(false)
      }
    },
    [user?.id]
  )

  const handleSearch = async (event) => {
    event.preventDefault()
    performSearch(searchTerm)
  }

  const handleGrowCircleClick = () => {
    setSearchTerm("")
    performSearch("", { allowEmpty: true })
  }

  const handleAddFriend = async (friendId) => {
    if (addingFriendIds.includes(friendId)) return

    setAddingFriendIds((prev) => [...prev, friendId])

    try {
      setError("")
      const response = await addFriend(user.id, friendId)
      setSearchResults((prev) => prev.filter((candidate) => candidate.id !== friendId))
      setSuccess(response?.message || "Friend request sent.")
    } catch (err) {
      console.error("Failed to add friend", err)
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Could not add friend right now. Please try again."
      setError(message)
    } finally {
      setAddingFriendIds((prev) => prev.filter((id) => id !== friendId))
    }
  }

  const handleRespondToRequest = async (requesterId, action) => {
    if (respondingIds.includes(requesterId)) return

    setRespondingIds((prev) => [...prev, requesterId])
    setError("")
    setSuccess("")

    try {
      const response = await respondToFriendRequest(user.id, requesterId, action)

      if (action === "accept" && response) {
        setFriends((prev) => [...prev, response])
      }

      setRequests((prev) => prev.filter((request) => request.requester.id !== requesterId))
      setSuccess(
        action === "accept" ? "Friend request accepted." : "Friend request rejected."
      )
    } catch (err) {
      console.error("Failed to respond to request", err)
      const message =
        err?.response?.data?.error || err?.message || "Unable to process the request."
      setError(message)
    } finally {
      setRespondingIds((prev) => prev.filter((id) => id !== requesterId))
    }
  }

  const handleUpdateVisibility = async (friendId, shareHabits) => {
    setUpdatingVisibility((prev) => [...prev, friendId])
    setError("")
    setSuccess("")

    try {
      await updateHabitVisibility(user.id, friendId, shareHabits)
      setFriends((prev) =>
        prev.map((friend) =>
          friend.id === friendId ? { ...friend, can_view_my_habits: shareHabits } : friend
        )
      )
      setSuccess("Visibility updated.")
    } catch (err) {
      console.error("Failed to update visibility", err)
      const message = err?.response?.data?.error || err?.message || "Update failed."
      setError(message)
    } finally {
      setUpdatingVisibility((prev) => prev.filter((id) => id !== friendId))
    }
  }

  if (!user) {
    return (
      <CAlert color="info" className="mt-4 community-section-card subtle-bg">
        Please log in to view and manage your friends.
      </CAlert>
    )
  }

  const hasSearchResults = searchResults.length > 0
  const hasRequests = requests.length > 0

  const toggleFriendDetails = (friendId) => {
    setExpandedFriendId((previous) => (previous === friendId ? null : friendId))
  }

  useEffect(() => {
    if (!searchTerm.trim()) {
      return
    }

    const delayId = setTimeout(() => {
      performSearch(searchTerm)
    }, 300)

    return () => clearTimeout(delayId)
  }, [performSearch, searchTerm])

  return (
    <CRow className="justify-content-center mt-4">
      <CCol xs={12} lg={10} xl={9}>
        {error && <CAlert color="danger">{error}</CAlert>}
        {success && <CAlert color="success">{success}</CAlert>}

        <CCard className="mb-4 community-section-card subtle-bg border-0">
          <CCardHeader className="bg-transparent border-0 pt-4 pb-0">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <p className="text-uppercase small text-body-secondary mb-1">Find friends</p>
                <h4 className="mb-0">Discover new accountability partners</h4>
              </div>
              <CButton
                color="primary"
                className="px-3 py-2 rounded-pill"
                variant="ghost"
                onClick={handleGrowCircleClick}
              >
                <CIcon icon={cilUserPlus} className="me-2" /> Grow your circle
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody className="pt-3">
            <CForm onSubmit={handleSearch} className="mb-3">
              <CInputGroup className="shadow-sm">
                <CInputGroupText className="bg-white">
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(event) => {
                    const value = event.target.value
                    setSearchTerm(value)

                    if (!value.trim()) {
                      setSearchResults([])
                      setSuccess("")
                    }
                  }}
                />
                <CButton type="submit" color="primary" disabled={searching} className="px-4">
                  {searching ? <CSpinner size="sm" /> : "Search"}
                </CButton>
              </CInputGroup>
            </CForm>

            {searching && (
              <div className="text-center my-3">
                <CSpinner />
              </div>
            )}

            {!searching && hasSearchResults && (
              <CListGroup className="rounded-4 overflow-hidden">
                {searchResults.map((person) => {
                  const isAdding = addingFriendIds.includes(person.id)
                  return (
                    <CListGroupItem
                      key={person.id}
                      className="d-flex justify-content-between align-items-center flex-wrap gap-2"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <CAvatar color="primary" text={person.name?.[0] || "?"}>
                          <CIcon icon={cilUser} />
                        </CAvatar>
                        <div>
                          <div className="fw-semibold">{person.name}</div>
                          <small className="text-muted">{person.email}</small>
                        </div>
                      </div>
                      <CButton
                        color="success"
                        size="sm"
                        disabled={isAdding}
                        onClick={() => handleAddFriend(person.id)}
                        className="px-3"
                      >
                        {isAdding ? <CSpinner size="sm" /> : <CIcon icon={cilUserPlus} />} Add
                      </CButton>
                    </CListGroupItem>
                  )
                })}
              </CListGroup>
            )}

            {!searching && !hasSearchResults && searchTerm.trim() && (
              <p className="text-muted mb-0">No people matched your search.</p>
            )}
          </CCardBody>
        </CCard>

        <CCard className="mb-4 community-section-card border-0">
          <CCardHeader className="bg-transparent border-0 pt-4 pb-0">
            <div className="d-flex align-items-center justify-content-between">
              <h4 className="mb-0">Pending Requests</h4>
              <CBadge color="warning" className="rounded-pill">Action needed</CBadge>
            </div>
          </CCardHeader>
          <CCardBody>
            {loadingRequests ? (
              <div className="text-center my-4">
                <CSpinner />
              </div>
            ) : hasRequests ? (
              <CListGroup className="rounded-4 overflow-hidden">
                {requests.map((request) => {
                  const isResponding = respondingIds.includes(request.requester.id)
                  return (
                    <CListGroupItem
                      key={request.id}
                      className="d-flex justify-content-between align-items-center flex-wrap gap-2"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <CAvatar color="info" text={request.requester.name?.[0] || "?"}>
                          <CIcon icon={cilUser} />
                        </CAvatar>
                        <div>
                          <div className="fw-semibold">{request.requester.name}</div>
                          <small className="text-muted">{request.requester.email}</small>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <CButton
                          color="success"
                          size="sm"
                          variant="outline"
                          disabled={isResponding}
                          onClick={() => handleRespondToRequest(request.requester.id, "accept")}
                        >
                          {isResponding ? <CSpinner size="sm" /> : "Accept"}
                        </CButton>
                        <CButton
                          color="secondary"
                          size="sm"
                          variant="outline"
                          disabled={isResponding}
                          onClick={() => handleRespondToRequest(request.requester.id, "reject")}
                        >
                          {isResponding ? <CSpinner size="sm" /> : "Reject"}
                        </CButton>
                      </div>
                    </CListGroupItem>
                  )
                })}
              </CListGroup>
            ) : (
              <p className="text-muted mb-0">No pending requests right now.</p>
            )}
          </CCardBody>
        </CCard>

        <CCard className="community-section-card border-0">
          <CCardHeader className="bg-transparent border-0 pt-4 pb-0">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h4 className="mb-0">Your Friends</h4>
              <CBadge color="success" className="rounded-pill">
                {friends.length} connected
              </CBadge>
            </div>
          </CCardHeader>
          <CCardBody>
            {loadingFriends ? (
              <div className="text-center my-4">
                <CSpinner />
              </div>
            ) : friends.length > 0 ? (
              <CListGroup className="rounded-4 overflow-hidden">
                {friends.map((friend) => {
                  const isUpdating = updatingVisibility.includes(friend.id)
                  const isExpanded = expandedFriendId === friend.id
                  return (
                    <CListGroupItem key={friend.id} className="p-3">
                      <div className="d-flex justify-content-between flex-wrap align-items-start gap-2">
                        <div className="d-flex align-items-center gap-3">
                          <CAvatar color="light" text={friend.name?.[0] || "?"}>
                            <CIcon icon={cilUser} />
                          </CAvatar>
                          <div>
                            <div className="fw-semibold">{friend.name}</div>
                            {friend.email && <small className="text-muted">{friend.email}</small>}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {friend.created_at && (
                            <small className="text-muted">
                              Joined {new Date(friend.created_at).toLocaleDateString()}
                            </small>
                          )}
                          <CButton
                            color="light"
                            size="sm"
                            variant="outline"
                            onClick={() => toggleFriendDetails(friend.id)}
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </CButton>
                        </div>
                      </div>

                      <CCollapse visible={isExpanded} className="mt-3">
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
                          <div>
                            <div className="fw-semibold mb-1">Sharing preferences</div>
                            <small className="text-muted d-block">
                              {friend.shares_habits_with_me
                                ? `${friend.name} shares their habits with you.`
                                : `${friend.name} has hidden their habits.`}
                            </small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <small className="text-muted">Share my habits</small>
                            <CFormSwitch
                              id={`share-${friend.id}`}
                              checked={!!friend.can_view_my_habits}
                              disabled={isUpdating}
                              onChange={(event) =>
                                handleUpdateVisibility(friend.id, event.target.checked)
                              }
                            />
                          </div>
                        </div>

                        {Array.isArray(friend.habits) && friend.habits.length > 0 ? (
                          <div className="mt-3">
                            <div className="fw-semibold mb-2">Habits</div>
                            <ul className="mb-0 ps-3">
                              {friend.habits.map((habit) => (
                                <li key={habit.id} className="mb-1">
                                  <span className="fw-semibold">{habit.title}</span>
                                  {habit.category && <span className="text-muted"> · {habit.category}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-muted mb-0 mt-3">No habits shared yet.</p>
                        )}
                      </CCollapse>
                    </CListGroupItem>
                  )
                })}
              </CListGroup>
            ) : (
              <p className="text-muted mb-0">
                You haven't added any friends yet. Use the search above to start building your
                community.
              </p>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Friends
