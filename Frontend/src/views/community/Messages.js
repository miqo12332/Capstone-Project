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
import { cilChatBubble, cilSend, cilUser } from "@coreui/icons"
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
    if (!composer.trim() || !activeUser) return

    try {
      setSending(true)
      setError("")
      const created = await sendMessage(user.id, {
        recipientId: activeUser.id,
        content: composer.trim(),
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
                {threads.map((thread) => (
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
                        <div className="small text-muted">
                          {truncate(thread.lastMessage?.content || "Say hi")}
                        </div>
                      </div>
                    </div>
                    {thread.unread > 0 && (
                      <CBadge color="danger" shape="rounded-pill">
                        {thread.unread}
                      </CBadge>
                    )}
                  </CListGroupItem>
                ))}
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
                          <div className="mb-1" style={{ whiteSpace: "pre-wrap" }}>
                            {msg.content}
                          </div>
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
              <CForm onSubmit={handleSend} className="d-flex gap-2 align-items-center">
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
                    <CButton type="submit" color="primary" disabled={!activeUser || sending || !composer.trim()}>
                      {sending ? <CSpinner size="sm" /> : <CIcon icon={cilSend} />}
                    </CButton>
                  </span>
                </CTooltip>
              </CForm>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Messages
