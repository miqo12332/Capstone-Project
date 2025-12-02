import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormSwitch,
  CFormTextarea,
  CInputGroup,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilCheckCircle,
  cilChatBubble,
  cilImage,
  cilLocationPin,
  cilPlus,
  cilSend,
} from "@coreui/icons"

import { AuthContext } from "../../context/AuthContext"
import {
  createChallenge,
  fetchChallenges,
  joinChallenge,
  cancelJoinRequest,
  decideJoinRequest,
  fetchChallengeMessages,
  sendChallengeMessage,
} from "../../services/challenges"
import { fetchFriends } from "../../services/friends"

const initialFormState = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  requiresApproval: false,
  invites: [],
}

const parseChallengeMessage = (content) => {
  if (!content) return { text: "" }

  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === "object") {
      return {
        text: parsed.text || "",
        attachment: parsed.attachment || null,
        location: parsed.location || null,
      }
    }
  } catch (err) {
    return { text: content, attachment: null, location: null }
  }

  return { text: content, attachment: null, location: null }
}

const GroupChallenges = () => {
  const { user } = useContext(AuthContext)
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [canceling, setCanceling] = useState([])
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(initialFormState)
  const [chatChallenge, setChatChallenge] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState("")
  const [chatText, setChatText] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const [deciding, setDeciding] = useState({})
  const chatBottomRef = useRef(null)
  const [chatAttachment, setChatAttachment] = useState(null)
  const [chatLocation, setChatLocation] = useState(null)
  const [chatLocating, setChatLocating] = useState(false)
  const chatFileInputRef = useRef(null)

  const isAuthenticated = Boolean(user)

  const refreshChallenges = async () => {
    try {
      setLoading(true)
      const data = await fetchChallenges()
      setChallenges(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to load challenges", err)
      setError("Could not load challenges. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshChallenges()
  }, [])

  useEffect(() => {
    const loadFriends = async () => {
      if (!user?.id) return
      try {
        setLoadingFriends(true)
        const data = await fetchFriends(user.id)
        setFriends(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Failed to load friends", err)
      } finally {
        setLoadingFriends(false)
      }
    }

    loadFriends()
  }, [user?.id])

  const handleJoin = async (challengeId) => {
    if (!user?.id) {
      setError("Please log in to join challenges.")
      return
    }

    if (joining.includes(challengeId)) return

    setJoining((prev) => [...prev, challengeId])
    setError("")
    setSuccess("")

    try {
      const result = await joinChallenge(challengeId, user.id)
      setSuccess(result?.message || "Joined challenge")
      await refreshChallenges()
    } catch (err) {
      console.error("Failed to join challenge", err)
      const message =
        err?.response?.data?.error || err?.message || "Unable to join challenge."
      setError(message)
    } finally {
      setJoining((prev) => prev.filter((id) => id !== challengeId))
    }
  }

  const handleCancelJoin = async (challengeId) => {
    if (!user?.id) {
      setError("Please log in to manage your requests.")
      return
    }

    if (canceling.includes(challengeId)) return

    setCanceling((prev) => [...prev, challengeId])
    setError("")
    setSuccess("")

    try {
      await cancelJoinRequest(challengeId, user.id)
      setSuccess("Join request canceled.")
      await refreshChallenges()
    } catch (err) {
      console.error("Failed to cancel join request", err)
      const message =
        err?.response?.data?.error || err?.message || "Unable to cancel request."
      setError(message)
    } finally {
      setCanceling((prev) => prev.filter((id) => id !== challengeId))
    }
  }

  const handleDecision = async (challengeId, memberId, action) => {
    if (!user?.id) {
      setError("Please log in to manage requests.")
      return
    }

    setDeciding((prev) => ({ ...prev, [memberId]: true }))
    setError("")
    setSuccess("")

    try {
      await decideJoinRequest(challengeId, memberId, user.id, action)
      setSuccess(
        action === "approve" ? "Request approved and member added." : "Request rejected."
      )
      await refreshChallenges()
    } catch (err) {
      console.error("Failed to process request", err)
      const message = err?.response?.data?.error || err?.message || "Unable to update request."
      setError(message)
    } finally {
      setDeciding((prev) => ({ ...prev, [memberId]: false }))
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()

    if (!user?.id) {
      setError("Please log in to create a challenge.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        requiresApproval: form.requiresApproval,
        creatorId: user.id,
        invites: form.invites,
      }

      const created = await createChallenge(payload)
      setChallenges((prev) => [created, ...prev])
      setForm(initialFormState)
      setShowModal(false)
      setSuccess("Challenge created and saved to the community list.")
    } catch (err) {
      console.error("Failed to create challenge", err)
      const message =
        err?.response?.data?.error || err?.message || "Unable to create challenge."
      setError(message)
    }
  }

  const toggleInvite = (friendId) => {
    setForm((prev) => {
      const invites = prev.invites.includes(friendId)
        ? prev.invites.filter((id) => id !== friendId)
        : [...prev.invites, friendId]

      return { ...prev, invites }
    })
  }

  const membershipStatus = (challenge) => {
    if (!user?.id || !challenge?.participants) return null
    const membership = challenge.participants.find((participant) => participant.id === user.id)
    return membership?.UserGroupChallenge?.status || null
  }

  const membershipRole = (challenge) => {
    if (!user?.id || !challenge?.participants) return null
    const membership = challenge.participants.find((participant) => participant.id === user.id)
    return membership?.UserGroupChallenge?.role || null
  }

  const canChat = (challenge) => {
    const status = membershipStatus(challenge)
    const role = membershipRole(challenge)
    return status === "accepted" || role === "creator"
  }

  const formattedChallenges = useMemo(
    () =>
      challenges.map((challenge) => ({
        ...challenge,
        participantCount: (challenge.participants || []).filter(
          (participant) => participant?.UserGroupChallenge?.status !== "invited"
        ).length,
        pendingRequests: (challenge.participants || []).filter(
          (participant) => participant?.UserGroupChallenge?.status === "pending"
        ),
      })),
    [challenges]
  )

  const renderJoinButton = (challenge) => {
    const status = membershipStatus(challenge)
    const role = membershipRole(challenge)
    const requiresApproval = challenge.approval_required

    if (role === "creator") {
      return <CBadge color="success">You created this</CBadge>
    }

    if (status === "accepted") {
      return (
        <CBadge color="success" className="d-inline-flex align-items-center gap-2">
          <CIcon icon={cilCheckCircle} /> Joined
        </CBadge>
      )
    }

    if (status === "pending") {
      return (
        <div className="d-flex align-items-center gap-2">
          <CBadge color="warning" className="px-3 py-2">Pending approval</CBadge>
          <CButton
            color="danger"
            size="sm"
            variant="outline"
            disabled={canceling.includes(challenge.id)}
            onClick={() => handleCancelJoin(challenge.id)}
          >
            {canceling.includes(challenge.id) ? <CSpinner size="sm" /> : "Cancel"}
          </CButton>
        </div>
      )
    }

    if (status === "invited") {
      return (
        <CButton
          color="primary"
          size="sm"
          disabled={joining.includes(challenge.id)}
          onClick={() => handleJoin(challenge.id)}
        >
          {joining.includes(challenge.id) ? <CSpinner size="sm" /> : "Accept invite"}
        </CButton>
      )
    }

    return (
      <CButton
        color="primary"
        size="sm"
        disabled={joining.includes(challenge.id)}
        onClick={() => handleJoin(challenge.id)}
      >
        {joining.includes(challenge.id)
          ? <CSpinner size="sm" />
          : requiresApproval
            ? "Request to join"
            : "Join challenge"}
      </CButton>
    )
  }

  const openChat = (challenge) => {
    if (!user?.id) {
      setError("Please log in to chat with challenge members.")
      return
    }

    if (!canChat(challenge)) {
      setError("Join this challenge to chat with the group.")
      return
    }

    setChatChallenge(challenge)
    setChatMessages([])
    setChatText("")
    setChatError("")
    setChatAttachment(null)
    setChatLocation(null)
  }

  useEffect(() => {
    if (!chatChallenge?.id || !user?.id) return

    const loadMessages = async () => {
      try {
        setChatLoading(true)
        setChatError("")
        const data = await fetchChallengeMessages(chatChallenge.id, user.id)
        setChatMessages(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Failed to load chat messages", err)
        const message =
          err?.response?.data?.error || err?.message || "Unable to load chat messages."
        setChatError(message)
      } finally {
        setChatLoading(false)
      }
    }

    loadMessages()
  }, [chatChallenge?.id, user?.id])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const handleSendChat = async (event) => {
    event.preventDefault()

    if (
      !chatChallenge?.id ||
      !user?.id ||
      (!chatText.trim() && !chatAttachment && !chatLocation)
    )
      return

    try {
      setSendingChat(true)
      const content = chatAttachment || chatLocation
        ? JSON.stringify({
            text: chatText.trim() || undefined,
            attachment: chatAttachment || undefined,
            location: chatLocation || undefined,
          })
        : chatText.trim()
      const created = await sendChallengeMessage(chatChallenge.id, user.id, content)
      setChatMessages((prev) => [...prev, created])
      setChatText("")
      setChatAttachment(null)
      setChatLocation(null)
    } catch (err) {
      console.error("Failed to send chat message", err)
      const message = err?.response?.data?.error || err?.message || "Could not send message."
      setChatError(message)
    } finally {
      setSendingChat(false)
    }
  }

  const closeChat = () => {
    setChatChallenge(null)
    setChatMessages([])
    setChatText("")
    setChatError("")
    setChatAttachment(null)
    setChatLocation(null)
  }

  return (
    <>
      <CRow className="justify-content-center mt-4">
        <CCol xs={12} lg={10} xl={8}>
          {error && <CAlert color="danger">{error}</CAlert>}
          {success && <CAlert color="success">{success}</CAlert>}

          <CCard className="community-section-card border-0 subtle-bg">
            <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2 bg-transparent border-0 pt-4 pb-0">
              <div>
                <p className="text-uppercase small text-body-secondary mb-1">Group Challenges</p>
                <h4 className="mb-1">Team up to reach milestones faster</h4>
                <p className="text-body-secondary mb-0">
                  Create a challenge, invite friends, and decide whether members need approval to join.
                </p>
              </div>
              <CButton color="primary" onClick={() => setShowModal(true)} disabled={!isAuthenticated} className="rounded-pill px-4">
                <CIcon icon={cilPlus} className="me-2" /> New Challenge
              </CButton>
            </CCardHeader>
            <CCardBody>
              {!isAuthenticated && (
                <CAlert color="info" className="mb-3">
                  Log in to create or join challenges and invite your friends.
                </CAlert>
              )}

              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <CSpinner />
                </div>
              ) : formattedChallenges.length === 0 ? (
                <div className="text-center text-body-secondary py-4">
                  No challenges yet. Be the first to start one!
                </div>
              ) : (
                <CListGroup className="rounded-4 overflow-hidden">
                  {formattedChallenges.map((challenge) => (
                    <CListGroupItem
                      key={challenge.id}
                      className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 p-3"
                    >
                      <div className="me-md-3">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h5 className="mb-0">{challenge.title}</h5>
                          {challenge.approval_required && (
                            <CBadge color="warning" shape="rounded-pill">
                              Approval required
                            </CBadge>
                          )}
                        </div>
                        <p className="mb-1 text-body-secondary">{challenge.description || "No description provided."}</p>
                        <div className="small text-body-secondary">
                          {challenge.start_date} → {challenge.end_date} · {challenge.participantCount} member
                          {challenge.participantCount === 1 ? "" : "s"}
                        </div>

                        {membershipRole(challenge) === "creator" &&
                          challenge.pendingRequests?.length > 0 && (
                            <div className="mt-3">
                              <div className="fw-semibold mb-2">Pending requests</div>
                              <div className="d-flex flex-column gap-2">
                                {challenge.pendingRequests.map((participant) => (
                                  <div
                                    key={participant.id}
                                    className="d-flex align-items-center justify-content-between border rounded px-3 py-2"
                                  >
                                    <div>
                                      <div className="fw-semibold">
                                        {participant.name || participant.email || "New member"}
                                      </div>
                                      <div className="small text-body-secondary">Awaiting your approval</div>
                                    </div>
                                    <div className="d-flex gap-2">
                                      <CButton
                                        color="success"
                                        size="sm"
                                        variant="outline"
                                        disabled={Boolean(deciding[participant.id])}
                                        onClick={() =>
                                          handleDecision(challenge.id, participant.id, "approve")
                                        }
                                      >
                                        {deciding[participant.id] ? (
                                          <CSpinner size="sm" />
                                        ) : (
                                          "Approve"
                                        )}
                                      </CButton>
                                      <CButton
                                        color="danger"
                                        size="sm"
                                        variant="outline"
                                        disabled={Boolean(deciding[participant.id])}
                                        onClick={() => handleDecision(challenge.id, participant.id, "reject")}
                                      >
                                        {deciding[participant.id] ? <CSpinner size="sm" /> : "Reject"}
                                      </CButton>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                      <div className="text-md-end w-100 w-md-auto d-flex align-items-center gap-2 justify-content-between">
                        <div className="text-body-secondary small">
                          {challenge.creator?.name ? `Host: ${challenge.creator.name}` : ""}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <CButton
                            color="secondary"
                            variant="outline"
                            size="sm"
                            disabled={!canChat(challenge) || !isAuthenticated}
                            onClick={() => openChat(challenge)}
                            className="rounded-pill"
                          >
                            <CIcon icon={cilChatBubble} className="me-2" />
                            {canChat(challenge) ? "Open chat" : "Join to chat"}
                          </CButton>
                          {renderJoinButton(challenge)}
                        </div>
                      </div>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal
        alignment="center"
        visible={showModal}
        onClose={() => setShowModal(false)}
        scrollable
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>Create a new challenge</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCreate}>
          <CModalBody>
            <CFormInput
              type="text"
              label="Title"
              placeholder="e.g. Run 10km this week"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
              className="mb-3"
            />

            <CFormTextarea
              label="Description"
              rows={3}
              placeholder="Share the rules or motivation for this challenge"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="mb-3"
            />

            <CRow className="g-3 mb-3">
              <CCol md={6}>
                <CFormInput
                  type="date"
                  label="Start date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  type="date"
                  label="End date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  required
                />
              </CCol>
            </CRow>

            <CFormSwitch
              label="Require approval to join"
              checked={form.requiresApproval}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requiresApproval: event.target.checked }))
              }
              className="mb-4"
            />

            <div className="mb-2 fw-semibold">Invite friends (optional)</div>
            {loadingFriends ? (
              <div className="d-flex align-items-center gap-2 text-body-secondary mb-2">
                <CSpinner size="sm" /> Loading friends...
              </div>
            ) : friends.length === 0 ? (
              <p className="text-body-secondary">No friends found to invite yet.</p>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {friends.map((friend) => (
                  <CFormCheck
                    key={friend.id}
                    id={`invite-${friend.id}`}
                    label={friend.name || friend.email || `Friend #${friend.id}`}
                    checked={form.invites.includes(friend.id)}
                    onChange={() => toggleInvite(friend.id)}
                  />
                ))}
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={!isAuthenticated}>
              Create challenge
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal
        alignment="center"
        visible={Boolean(chatChallenge)}
        onClose={closeChat}
        scrollable
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>
            <div className="d-flex flex-column">
              <span>Challenge chat</span>
              <small className="text-body-secondary">
                {chatChallenge?.title || "Group challenge"}
              </small>
            </div>
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {chatError && <CAlert color="danger">{chatError}</CAlert>}
          {!chatChallenge || !canChat(chatChallenge) ? (
            <CAlert color="info">Join this challenge to chat with other members.</CAlert>
          ) : (
            <>
              <div
                className="border rounded p-3 mb-3 bg-light-subtle"
                style={{ maxHeight: 360, overflowY: "auto" }}
              >
                {chatLoading ? (
                  <div className="d-flex justify-content-center py-4">
                    <CSpinner />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center text-body-secondary py-3">
                    No messages yet. Say hello to get the conversation started!
                  </div>
                ) : (
                  chatMessages.map((message) => {
                    const isMine = Number(message.sender_id) === Number(user?.id)
                    const parsedContent = parseChallengeMessage(message.content)
                    return (
                      <div
                        key={message.id}
                        className={`d-flex ${isMine ? "justify-content-end" : "justify-content-start"} mb-3`}
                      >
                        <div
                          className={`p-3 rounded-3 shadow-sm ${
                            isMine ? "bg-primary text-white" : "bg-white border"
                          }`}
                          style={{ maxWidth: "80%" }}
                        >
                          <div className="small fw-semibold mb-1">
                            {isMine ? "You" : message.sender?.name || "Teammate"}
                          </div>
                          {parsedContent.text && (
                            <div style={{ whiteSpace: "pre-wrap" }}>{parsedContent.text}</div>
                          )}
                          {parsedContent.attachment && (
                            <div className="mt-2">
                              <div className="small fw-semibold mb-1">Shared image</div>
                              <img
                                src={parsedContent.attachment.dataUrl}
                                alt={parsedContent.attachment.name || "Shared image"}
                                className="img-fluid rounded-3 border"
                              />
                              {parsedContent.attachment.name && (
                                <div className={`small mt-1 ${isMine ? "text-white-50" : "text-body-secondary"}`}>
                                  {parsedContent.attachment.name}
                                </div>
                              )}
                            </div>
                          )}
                          {parsedContent.location && (
                            <div className="d-flex align-items-start gap-2 mt-1">
                              <CIcon icon={cilLocationPin} />
                              <div>
                                <div className="small fw-semibold">Shared location</div>
                                <a
                                  href={`https://maps.google.com/?q=${parsedContent.location.latitude},${parsedContent.location.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={isMine ? "text-white" : "text-primary"}
                                >
                                  Open in Maps
                                </a>
                                {parsedContent.location.label && (
                                  <div className={`small ${isMine ? "text-white-50" : "text-body-secondary"}`}>
                                    {parsedContent.location.label}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className={`small mt-2 ${isMine ? "text-white-50" : "text-body-secondary"}`}>
                            {new Date(message.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              <CForm onSubmit={handleSendChat} className="d-flex flex-column gap-2">
                {(chatAttachment || chatLocation) && (
                  <div className="border rounded-3 p-3 bg-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="fw-semibold">Sharing extras</div>
                      <CButton
                        size="sm"
                        color="link"
                        className="text-decoration-none"
                        onClick={() => {
                          setChatAttachment(null)
                          setChatLocation(null)
                        }}
                      >
                        Clear
                      </CButton>
                    </div>
                    {chatAttachment && (
                      <div className="mb-2">
                        <div className="small text-body-secondary">Image preview</div>
                        <img
                          src={chatAttachment.dataUrl}
                          alt={chatAttachment.name || "Attachment"}
                          className="img-fluid rounded-3 border"
                        />
                        {chatAttachment.name && (
                          <div className="small text-body-secondary mt-1">{chatAttachment.name}</div>
                        )}
                      </div>
                    )}
                    {chatLocation && (
                      <div className="d-flex align-items-start gap-2">
                        <CIcon icon={cilLocationPin} className="text-primary" />
                        <div>
                          <div className="fw-semibold">Location ready</div>
                          <div className="small text-body-secondary">
                            {chatLocation.latitude.toFixed(4)}, {chatLocation.longitude.toFixed(4)}
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${chatLocation.latitude},${chatLocation.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="small"
                          >
                            Preview on map
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="d-flex gap-2 flex-wrap">
                  <CButton
                    type="button"
                    variant="outline"
                    color="secondary"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={chatLoading}
                  >
                    <CIcon icon={cilImage} className="me-2" /> Image
                  </CButton>
                  <CButton
                    type="button"
                    variant="outline"
                    color="secondary"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        setChatError("Location is not supported in this browser.")
                        return
                      }
                      setChatLocating(true)
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setChatLocation({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                          })
                          setChatLocating(false)
                        },
                        () => {
                          setChatError("Unable to fetch your location right now.")
                          setChatLocating(false)
                        }
                      )
                    }}
                    disabled={chatLoading || chatLocating}
                  >
                    {chatLocating ? <CSpinner size="sm" /> : <CIcon icon={cilLocationPin} className="me-2" />} Location
                  </CButton>
                </div>

                <CInputGroup>
                  <CFormInput
                    placeholder="Share an update with the group"
                    value={chatText}
                    onChange={(event) => setChatText(event.target.value)}
                    disabled={chatLoading}
                  />
                  <CButton
                    type="submit"
                    color="primary"
                    disabled={
                      sendingChat ||
                      chatLocating ||
                      (!chatText.trim() && !chatAttachment && !chatLocation)
                    }
                  >
                    {sendingChat ? <CSpinner size="sm" /> : <CIcon icon={cilSend} className="me-2" />}Send
                  </CButton>
                </CInputGroup>
              </CForm>
              <input
                type="file"
                accept="image/*"
                hidden
                ref={chatFileInputRef}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  if (file.size > 2 * 1024 * 1024) {
                    setChatError("Please choose an image smaller than 2MB.")
                    return
                  }
                  const reader = new FileReader()
                  reader.onloadend = () => setChatAttachment({ name: file.name, dataUrl: reader.result })
                  reader.readAsDataURL(file)
                  event.target.value = ""
                }}
              />
            </>
          )}
        </CModalBody>
      </CModal>
    </>
  )
}

export default GroupChallenges
