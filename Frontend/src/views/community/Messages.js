import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  CAlert,
  CAvatar,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
  CTooltip,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilChatBubble,
  cilImage,
  cilLocationPin,
  cilSend,
  cilUser,
} from "@coreui/icons"
import { AuthContext } from "../../context/AuthContext"
import {
  fetchConversation,
  fetchThreads,
  markConversationRead,
  sendMessage,
} from "../../services/messages"
import { fetchFriends } from "../../services/friends"

const truncate = (text, length = 60) => {
  if (!text) return ""
  return text.length > length ? `${text.slice(0, length)}…` : text
}

const parseMessageContent = (content) => {
  if (!content) return { text: "" }

  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === "object") {
      return {
        text: parsed.text || "",
        attachment: parsed.attachment || null,
        location: parsed.location || null,
        isRich: true,
      }
    }
  } catch (err) {
    return { text: content, attachment: null, location: null }
  }

  return { text: content, attachment: null, location: null }
}

const Messages = () => {
  const { user } = useContext(AuthContext)
  const [threads, setThreads] = useState([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [activeUser, setActiveUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [composer, setComposer] = useState("")
  const bottomRef = useRef(null)
  const [contacts, setContacts] = useState([])
  const [attachment, setAttachment] = useState(null)
  const [locationPayload, setLocationPayload] = useState(null)
  const [locating, setLocating] = useState(false)
  const fileInputRef = useRef(null)

  const emptyState = useMemo(
    () => (
      <div className="text-center py-5 text-muted">
        <CIcon icon={cilChatBubble} size="3xl" className="mb-3 text-primary" />
        <div className="fw-semibold">Select a friend to start chatting</div>
        <div className="small">Keep in touch, share tips, and celebrate wins together.</div>
      </div>
    ),
    []
  )

  useEffect(() => {
    if (!user?.id) return
    const loadThreads = async () => {
      try {
        setLoadingThreads(true)
        const [threadData, friendData] = await Promise.all([
          fetchThreads(user.id),
          fetchFriends(user.id),
        ])

        const existingThreads = Array.isArray(threadData) ? threadData : []
        const friends = Array.isArray(friendData) ? friendData : []

        const friendThreads = friends
          .filter((friend) => !existingThreads.find((t) => t.user?.id === friend.id))
          .map((friend) => ({
            user: {
              id: friend.id,
              name: friend.name,
              email: friend.email,
              avatar: friend.avatar,
            },
            lastMessage: null,
            unread: 0,
          }))

        setContacts(friends)
        setThreads([...existingThreads, ...friendThreads])
      } catch (err) {
        console.error("Failed to load threads", err)
        setError("Could not load conversations right now.")
      } finally {
        setLoadingThreads(false)
      }
    }

    loadThreads()
  }, [user?.id])

  useEffect(() => {
    if (!activeUser || !user?.id) return

    const loadMessages = async () => {
      try {
        setLoadingMessages(true)
        const data = await fetchConversation(user.id, activeUser.id)
        setMessages(Array.isArray(data) ? data : [])
        await markConversationRead(user.id, activeUser.id)
        setThreads((prev) =>
          prev.map((thread) =>
            thread.user?.id === activeUser.id ? { ...thread, unread: 0 } : thread
          )
        )
      } catch (err) {
        console.error("Failed to load conversation", err)
        setError("Unable to load messages right now.")
      } finally {
        setLoadingMessages(false)
      }
    }

    loadMessages()
  }, [activeUser, user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (event) => {
    event.preventDefault()
    if ((!composer.trim() && !attachment && !locationPayload) || !activeUser) return

    try {
      setSending(true)
      setError("")
      const payloadContent = attachment || locationPayload
        ? JSON.stringify({
            text: composer.trim() || undefined,
            attachment: attachment || undefined,
            location: locationPayload || undefined,
          })
        : composer.trim()
      const created = await sendMessage(user.id, {
        recipientId: activeUser.id,
        content: payloadContent,
      })
      setMessages((prev) => [...prev, created])
      setThreads((prev) => {
        const without = prev.filter((thread) => thread.user?.id !== activeUser.id)
        return [
          {
            user: activeUser,
            lastMessage: created,
            unread: 0,
          },
          ...without,
        ]
      })
      setComposer("")
      setAttachment(null)
      setLocationPayload(null)
    } catch (err) {
      console.error("Failed to send message", err)
      const message =
        err?.response?.data?.error || err?.message || "Could not send message."
      setError(message)
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <CAlert color="info" className="mt-4 community-section-card subtle-bg">
        Please log in to start chatting with your friends.
      </CAlert>
    )
  }

  return (
    <CRow className="mt-4">
      <CCol md={4} className="mb-4">
        <CCard className="h-100 community-section-card border-0">
          <CCardHeader className="bg-transparent border-0 d-flex align-items-center justify-content-between">
            <span className="fw-semibold">Conversations</span>
            {loadingThreads && <CSpinner size="sm" />}
          </CCardHeader>
          <CCardBody className="p-0">
            {loadingThreads ? (
              <div className="py-4 text-center text-muted">Loading chats…</div>
            ) : threads.length === 0 ? (
              <div className="py-4 text-center text-muted px-3">
                You have no conversations yet. {contacts.length > 0
                  ? `You have ${contacts.length} friend${contacts.length === 1 ? "" : "s"} ready to cheer on.`
                  : "Find friends to start a chat and keep each other motivated."}
              </div>
            ) : (
              <CListGroup flush className="rounded-0">
                {threads.map((thread) => {
                  const parsedPreview = parseMessageContent(thread.lastMessage?.content || "")
                  const previewText = parsedPreview.attachment
                    ? "Shared an image"
                    : parsedPreview.location
                      ? "Shared a location"
                      : truncate(parsedPreview.text || "Say hi")
                  return (
                    <CListGroupItem
                      key={thread.user?.id}
                      as="button"
                      active={activeUser?.id === thread.user?.id}
                      onClick={() => setActiveUser(thread.user)}
                      className="d-flex justify-content-between align-items-start border-0 border-bottom"
                    >
                      <div className="d-flex align-items-start gap-3">
                        <CAvatar color="primary" text={thread.user?.name?.[0] || "?"}>
                          <CIcon icon={cilUser} />
                        </CAvatar>
                        <div>
                          <div className="fw-semibold">{thread.user?.name || "Friend"}</div>
                          <div className="small text-muted">{previewText || "Say hi"}</div>
                        </div>
                      </div>
                      {thread.unread > 0 && (
                        <CBadge color="danger" shape="rounded-pill">
                          {thread.unread}
                        </CBadge>
                      )}
                    </CListGroupItem>
                  )
                })}
              </CListGroup>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={8}>
        <CCard className="h-100 community-section-card border-0">
          <CCardHeader className="bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">
                {activeUser ? activeUser.name : "Pick a conversation"}
              </div>
              <div className="small text-muted">
                {activeUser
                  ? "Share updates, swap tips, and keep one another accountable."
                  : "Your messages will appear here."}
              </div>
            </div>
          </CCardHeader>
          <CCardBody className="d-flex flex-column subtle-bg" style={{ minHeight: 420 }}>
            {error && <CAlert color="danger">{error}</CAlert>}
            {activeUser ? (
              <div className="flex-grow-1 overflow-auto pe-2" style={{ maxHeight: 420 }}>
                {loadingMessages ? (
                  <div className="text-center text-muted py-4">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    Start the conversation with a friendly note!
                  </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = Number(msg.sender_id) === Number(user.id)
                      const parsedContent = parseMessageContent(msg.content)
                      return (
                        <div
                          key={msg.id}
                          className={`d-flex ${isMine ? "justify-content-end" : "justify-content-start"} mb-3`}
                        >
                          <div
                            className={`p-3 rounded-4 shadow-sm ${
                              isMine ? "bg-primary text-white" : "bg-white border"
                            }`}
                            style={{ maxWidth: "80%" }}
                          >
                            <div className="small fw-semibold mb-1">
                              {isMine ? "You" : msg.sender?.name || "Friend"}
                            </div>
                            {parsedContent.text && (
                              <div className="mb-1" style={{ whiteSpace: "pre-wrap" }}>
                                {parsedContent.text}
                              </div>
                            )}
                            {parsedContent.attachment && (
                              <div className="mb-2">
                                <div className="small fw-semibold mb-1">Shared image</div>
                                <img
                                  src={parsedContent.attachment.dataUrl}
                                  alt={parsedContent.attachment.name || "Shared image"}
                                  className="img-fluid rounded-3 border"
                                />
                                {parsedContent.attachment.name && (
                                  <div className={`small mt-1 ${isMine ? "text-white-50" : "text-muted"}`}>
                                    {parsedContent.attachment.name}
                                  </div>
                                )}
                              </div>
                            )}
                            {parsedContent.location && (
                              <div className="d-flex align-items-start gap-2">
                                <CIcon icon={cilLocationPin} />
                                <div>
                                  <div className="small fw-semibold mb-1">Shared location</div>
                                  <a
                                    href={`https://maps.google.com/?q=${parsedContent.location.latitude},${parsedContent.location.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={isMine ? "text-white" : "text-primary"}
                                  >
                                    Open in Maps
                                  </a>
                                  {parsedContent.location.label && (
                                    <div className={`small ${isMine ? "text-white-50" : "text-muted"}`}>
                                      {parsedContent.location.label}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className={`small ${isMine ? "text-white-50" : "text-muted"}`}>
                              {new Date(msg.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                <div ref={bottomRef} />
              </div>
            ) : (
              emptyState
            )}

              <div className="pt-3 border-top mt-3">
                <CForm onSubmit={handleSend}>
                  {(attachment || locationPayload) && (
                    <div className="border rounded-4 p-3 mb-2 bg-white">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="fw-semibold">Ready to share</div>
                        <CButton
                          size="sm"
                          color="link"
                          className="text-decoration-none"
                          onClick={() => {
                            setAttachment(null)
                            setLocationPayload(null)
                          }}
                        >
                          Clear
                        </CButton>
                      </div>
                      {attachment && (
                        <div className="mb-2">
                          <div className="small text-muted">Image preview</div>
                          <img
                            src={attachment.dataUrl}
                            alt={attachment.name || "Attachment"}
                            className="img-fluid rounded-3 border"
                          />
                          {attachment.name && (
                            <div className="small text-muted mt-1">{attachment.name}</div>
                          )}
                        </div>
                      )}
                      {locationPayload && (
                        <div className="d-flex align-items-start gap-2">
                          <CIcon icon={cilLocationPin} className="text-primary" />
                          <div>
                            <div className="fw-semibold">Location locked in</div>
                            <div className="small text-muted">
                              {locationPayload.latitude.toFixed(4)}, {locationPayload.longitude.toFixed(4)}
                            </div>
                            <a
                              href={`https://maps.google.com/?q=${locationPayload.latitude},${locationPayload.longitude}`}
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

                  <div className="d-flex gap-2 align-items-center">
                    <CButton
                      type="button"
                      variant="outline"
                      color="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!activeUser || sending}
                    >
                      <CIcon icon={cilImage} className="me-2" /> Image
                    </CButton>
                    <CButton
                      type="button"
                      variant="outline"
                      color="secondary"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          setError("Location is not supported in this browser.")
                          return
                        }
                        setLocating(true)
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setLocationPayload({
                              latitude: position.coords.latitude,
                              longitude: position.coords.longitude,
                              accuracy: position.coords.accuracy,
                            })
                            setLocating(false)
                          },
                          () => {
                            setError("Unable to fetch your location. Please try again.")
                            setLocating(false)
                          }
                        )
                      }}
                      disabled={!activeUser || sending || locating}
                    >
                      {locating ? <CSpinner size="sm" /> : <CIcon icon={cilLocationPin} className="me-2" />} Location
                    </CButton>
                    <CFormInput
                      placeholder={
                        activeUser
                          ? `Message ${activeUser.name || "your friend"}`
                          : "Select a thread to start chatting"
                      }
                      disabled={!activeUser || sending}
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                    />
                    <CTooltip content="Send message">
                      <span>
                        <CButton
                          type="submit"
                          color="primary"
                          disabled={
                            !activeUser ||
                            sending ||
                            locating ||
                            (!composer.trim() && !attachment && !locationPayload)
                          }
                        >
                          {sending ? <CSpinner size="sm" /> : <CIcon icon={cilSend} />}
                        </CButton>
                      </span>
                    </CTooltip>
                  </div>
                </CForm>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={fileInputRef}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) {
                      setError("Please choose an image smaller than 2MB.")
                      return
                    }
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setAttachment({ name: file.name, dataUrl: reader.result })
                    }
                    reader.readAsDataURL(file)
                    event.target.value = ""
                  }}
                />
              </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Messages
