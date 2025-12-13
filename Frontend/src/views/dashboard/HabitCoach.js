import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilCalendar,
  cilClock,
  cilSend,
  cilSpeech,
  cilStorage,
  cilUser,
} from "@coreui/icons";

import { AuthContext } from "../../context/AuthContext";
import {
  deleteAiChatHistory,
  fetchAiChatHistory,
  sendAiChatMessage,
} from "../../services/aiChat";
import { getSchedules } from "../../services/schedules";
import { emitDataRefresh, REFRESH_SCOPES, useDataRefresh } from "../../utils/refreshBus";

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
          <div className="fw-semibold">Coach Knowledge</div>
          <small className="text-medium-emphasis">
            HabitCoach reads your user profile, recent chat, and every database table.
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

const formatScheduleTime = (entry) => {
  const start = entry.day ? new Date(`${entry.day}T${entry.starttime || "00:00"}`) : null;
  if (!start || Number.isNaN(start.getTime())) return "Time to confirm";

  const base = start.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  return entry.endtime ? `${base} — ${entry.endtime}` : base;
};

const SchedulePeekCard = ({ schedules, loading, error, onRefresh }) => (
  <CCard className="mb-4">
    <CCardHeader className="d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2">
        <CIcon icon={cilCalendar} className="text-primary" />
        <div>
          <div className="fw-semibold">My schedule overview</div>
          <small className="text-medium-emphasis">
            See existing events so HabitCoach can avoid overlaps.
          </small>
        </div>
      </div>
      <CButton color="light" size="sm" disabled={loading} onClick={onRefresh}>
        {loading ? <CSpinner size="sm" /> : "Refresh"}
      </CButton>
    </CCardHeader>
    <CCardBody>
      {error && (
        <CAlert color="warning" className="mb-3">
          {error}
        </CAlert>
      )}
      {loading ? (
        <div className="d-flex justify-content-center py-3">
          <CSpinner color="primary" />
        </div>
      ) : schedules.length ? (
        <CListGroup flush>
          {schedules.map((entry) => {
            const title =
              entry.habit?.title || entry.custom_title || entry.title || entry.notes || "Scheduled session";

            return (
              <CListGroupItem
                key={`${entry.type || "habit"}-${entry.id}-${entry.starttime}`}
                className="d-flex justify-content-between align-items-start"
              >
                <div>
                  <div className="fw-semibold">{title}</div>
                  <div className="text-medium-emphasis small d-flex align-items-center gap-1">
                    <CIcon icon={cilClock} className="text-primary" />
                    <span>{formatScheduleTime(entry)}</span>
                  </div>
                  {entry.notes && <div className="text-medium-emphasis small mt-1">{entry.notes}</div>}
                </div>
                <div className="d-flex flex-column gap-1 align-items-end">
                  <CBadge color={entry.type === "custom" ? "secondary" : "primary"} shape="rounded-pill">
                    {entry.type === "custom" ? "busy" : "habit"}
                  </CBadge>
                  {entry.repeat && (
                    <CBadge color="light" textColor="dark" shape="rounded-pill">
                      {entry.repeat}
                    </CBadge>
                  )}
                </div>
              </CListGroupItem>
            );
          })}
        </CListGroup>
      ) : (
        <div className="text-medium-emphasis small">
          No upcoming events yet. Ask HabitCoach to add one or visit your Planner.
        </div>
      )}
    </CCardBody>
  </CCard>
);

const HabitCoach = () => {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [context, setContext] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const bottomRef = useRef(null);

  const sortSchedules = useCallback(
    (entries) =>
      [...entries].sort((a, b) => {
        const startA = a.day ? new Date(`${a.day}T${a.starttime || "00:00"}`).getTime() : 0;
        const startB = b.day ? new Date(`${b.day}T${b.starttime || "00:00"}`).getTime() : 0;
        return startA - startB;
      }),
    []
  );

  const loadSchedules = useCallback(async () => {
    if (!user?.id) return;
    setScheduleError(null);
    setScheduleLoading(true);
    try {
      const data = await getSchedules(user.id);
      setSchedules(sortSchedules(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Failed to load schedules for HabitCoach", err);
      setScheduleError("Unable to load your scheduled events right now.");
    } finally {
      setScheduleLoading(false);
    }
  }, [sortSchedules, user?.id]);

  const visibleSchedules = useMemo(() => sortSchedules(schedules).slice(0, 6), [schedules, sortSchedules]);

  const loadHistory = async () => {
    if (!user?.id) return;
    setError(null);
    setInitialLoading(true);
    try {
      const data = await fetchAiChatHistory(user.id);
      setHistory(data.history || []);
    } catch (err) {
      console.error("Failed to load HabitCoach", err);
      setError("Unable to load your coach history right now.");
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  useDataRefresh([REFRESH_SCOPES.SCHEDULES], loadSchedules);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSend = async (event) => {
    event?.preventDefault();

    const trimmedMessage = message.trim();
    if (!user?.id || !trimmedMessage) return;

    setError(null);
    setLoading(true);

    const previousHistory = history;

    setHistory((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmedMessage,
        createdAt: new Date().toISOString(),
      },
    ]);

    setMessage("");

    try {
      const data = await sendAiChatMessage(user.id, trimmedMessage);
      setHistory(data.history || []);
      setContext(data.context || null);

      if (Array.isArray(data.context?.userContext?.schedules)) {
        setSchedules(sortSchedules(data.context.userContext.schedules));
      }

      if (data.createdHabit?.id) {
        emitDataRefresh(REFRESH_SCOPES.HABITS, {
          reason: "habit-added-by-coach",
          habitId: data.createdHabit.id,
        });
      }

      if (data.createdSchedule?.id) {
        setSchedules((prev) => sortSchedules([...prev, data.createdSchedule]));
        emitDataRefresh(REFRESH_SCOPES.SCHEDULES, {
          reason: "schedule-added-by-coach",
          scheduleId: data.createdSchedule.id,
        });
      }
    } catch (err) {
      console.error("Failed to send coach message", err);
      setError("Something went wrong sending your message. Try again.");
      // Reload the last known history to avoid showing stuck optimistic messages
      setHistory(previousHistory);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!user?.id) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteAiChatHistory(user.id);
      setHistory([]);
      setContext(null);
    } catch (err) {
      console.error("Failed to delete coach history", err);
      setError("Unable to delete your coach history right now.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const promptExamples = [
    "Catch me up on my habits and what's new.",
    "Give me one next step based on my goals.",
    "Look at my tables and suggest what to improve.",
  ];

  return (
    <>
      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <div>
                <div className="fw-semibold">HabitCoach</div>
                <small className="text-medium-emphasis">
                  Ask anything — HabitCoach follows your conversation and can see your profile plus every table.
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <CButton
                  color="danger"
                  variant="outline"
                  size="sm"
                  disabled={loading || initialLoading || deleting}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete conversation
                </CButton>
                <CBadge color="info">Live</CBadge>
              </div>
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
                    placeholder="Ask HabitCoach anything about your habits"
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
                  <CButton type="submit" color="info" disabled={loading} onClick={handleSend}>
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
          <SchedulePeekCard
            schedules={visibleSchedules}
            loading={scheduleLoading}
            error={scheduleError}
            onRefresh={loadSchedules}
          />
        </CCol>
      </CRow>

      <CModal
        visible={showDeleteConfirm}
        onClose={() => (!deleting ? setShowDeleteConfirm(false) : null)}
        alignment="center"
      >
        <CModalHeader closeButton={!deleting}>
          <CModalTitle>Delete conversation</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete your entire HabitCoach conversation? This will remove all chat
          messages.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
            No
          </CButton>
          <CButton color="danger" disabled={deleting} onClick={handleDeleteConversation}>
            {deleting ? (
              <>
                <CSpinner size="sm" className="me-2" /> Deleting
              </>
            ) : (
              "Yes, delete"
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default HabitCoach;
