import React, { useContext, useEffect, useRef, useState } from "react";
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
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSend, cilSpeech, cilStorage, cilUser } from "@coreui/icons";

import { AuthContext } from "../../context/AuthContext";
import { fetchAiChatHistory, sendAiChatMessage } from "../../services/aiChat";

const roleConfig = {
  user: { color: "primary", label: "You", icon: cilUser },
  assistant: { color: "info", label: "AI", icon: cilSpeech },
};

const MessageBubble = ({ entry }) => {
  const config = roleConfig[entry.role] || roleConfig.assistant;

  return (
    <div className="d-flex gap-2 mb-3 align-items-start">
      <CAvatar color={config.color} textColor="white">
        <CIcon icon={config.icon} />
      </CAvatar>
      <div>
        <small className="text-uppercase text-medium-emphasis fw-semibold">
          {config.label}
        </small>
        <div className="p-3 rounded-4 bg-body-secondary">{entry.content}</div>
      </div>
    </div>
  );
};

const KnowledgeCard = ({ context }) => {
  const tables = context?.dbOverview || [];
  const userProfile = context?.userContext?.profile;

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center gap-2">
        <CIcon icon={cilStorage} className="text-info" />
        <div>
          <div className="fw-semibold">AI Knowledge</div>
          <small className="text-medium-emphasis">
            The assistant reads your user profile and every database table.
          </small>
        </div>
      </CCardHeader>
      <CCardBody>
        {userProfile ? (
          <div className="mb-3">
            <div className="fw-semibold">User context</div>
            <div className="text-medium-emphasis">
              {userProfile.name || "Unknown user"} – {userProfile.primary_goal || "no primary goal set"}
            </div>
          </div>
        ) : (
          <div className="text-medium-emphasis mb-3">No user details loaded yet.</div>
        )}

        <div className="fw-semibold mb-2">Database tables</div>
        {tables.length ? (
          <div className="d-flex flex-wrap gap-2">
            {tables.slice(0, 10).map((table) => (
              <CBadge key={table.name} color="light" textColor="dark">
                {table.name} ({table.rowCount})
              </CBadge>
            ))}
          </div>
        ) : (
          <div className="text-medium-emphasis">Tables will appear after you start chatting.</div>
        )}
      </CCardBody>
    </CCard>
  );
};

const AiChat = () => {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [context, setContext] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const loadHistory = async () => {
    if (!user?.id) return;
    setError(null);
    setInitialLoading(true);
    try {
      const data = await fetchAiChatHistory(user.id);
      setHistory(data.history || []);
    } catch (err) {
      console.error("Failed to load AI chat", err);
      setError("Unable to load AI chat history right now.");
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!user?.id || !message.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const data = await sendAiChatMessage(user.id, message.trim());
      setHistory(data.history || []);
      setContext(data.context || null);
      setMessage("");
    } catch (err) {
      console.error("Failed to send AI message", err);
      setError("Something went wrong sending your message. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const promptExamples = [
    "How are my habits progressing this week?",
    "What tables store my notifications and schedules?",
    "Summarize my goals and suggest a next action.",
  ];

  return (
    <CRow>
      <CCol md={8}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold">AI chat</div>
              <small className="text-medium-emphasis">
                Ask anything — the AI can see your profile and every database table.
              </small>
            </div>
            <CBadge color="info">Live</CBadge>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            {initialLoading ? (
              <div className="text-center py-4">
                <CSpinner color="info" />
              </div>
            ) : (
              <div className="mb-4" style={{ minHeight: 320 }}>
                {history.length ? (
                  history.map((entry) => <MessageBubble key={entry.id} entry={entry} />)
                ) : (
                  <div className="text-medium-emphasis text-center py-5">
                    Start the conversation to see the AI's replies.
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}

            <CForm onSubmit={handleSend} className="mt-3">
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSpeech} />
                </CInputGroupText>
                <CFormTextarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask the AI anything about your data"
                  disabled={loading}
                />
              </CInputGroup>
              <div className="d-flex align-items-center justify-content-between mt-2">
                <div className="d-flex gap-2 flex-wrap">
                  {promptExamples.map((prompt) => (
                    <CBadge
                      key={prompt}
                      color="light"
                      textColor="dark"
                      role="button"
                      onClick={() => setMessage(prompt)}
                    >
                      {prompt}
                    </CBadge>
                  ))}
                </div>
                <CButton type="submit" color="info" disabled={loading}>
                  {loading ? (
                    <>
                      <CSpinner size="sm" className="me-2" /> Sending
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSend} className="me-2" /> Send
                    </>
                  )}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <KnowledgeCard context={context} />
      </CCol>
    </CRow>
  );
};

export default AiChat;
