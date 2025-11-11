import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
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
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilChatBubble,
  cilLightbulb,
  cilSend,
  cilStar,
  cilCalendar,
  cilChartLine,
} from "@coreui/icons";
import { AuthContext } from "../../context/AuthContext";
import {
  fetchAssistantHistory,
  sendAssistantMessage,
} from "../../services/assistant";

const avatarColors = {
  user: "primary",
  assistant: "info",
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const InsightSection = ({ title, icon, description, items, empty }) => (
  <CCard className="mb-4 shadow-sm">
    <CCardHeader className="d-flex align-items-center gap-2">
      <CIcon icon={icon} size="lg" className="text-primary" />
      <div>
        <h6 className="mb-0 fw-semibold">{title}</h6>
        {description && (
          <small className="text-medium-emphasis">{description}</small>
        )}
      </div>
    </CCardHeader>
    <CCardBody>
      {items && items.length ? (
        <ul className="list-unstyled mb-0">
          {items.map((item, index) => (
            <li key={index} className="mb-3">
              <div className="fw-semibold">{item.title}</div>
              {item.subtitle && (
                <div className="text-medium-emphasis small">{item.subtitle}</div>
              )}
              {item.badges && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                  {item.badges.map((badge) => (
                    <CBadge color="light" textColor="dark" key={badge}>
                      {badge}
                    </CBadge>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center text-medium-emphasis py-2">{empty}</div>
      )}
    </CCardBody>
  </CCard>
);

const AICompanion = () => {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    setInitialLoading(true);
    try {
      const data = await fetchAssistantHistory(user.id);
      setHistory(data.history || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to load assistant history", err);
      setError("Unable to load your AI companion right now. Please retry.");
    } finally {
      setInitialLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const quickPrompts = useMemo(() => {
    const prompts = [
      "Help me prioritise my habits today",
      "Share a motivational boost",
      "Suggest a reflection for my journey",
    ];

    if (summary?.profile?.goal) {
      prompts.unshift(`What can I do today for ${summary.profile.goal}?`);
    }

    if (summary?.topKeywords?.length) {
      prompts.push(
        `Any ideas about ${summary.topKeywords[0].keyword} this week?`
      );
    }

    if (summary?.upcoming?.length) {
      const next = summary.upcoming[0];
      prompts.push(`How do I prepare for ${next.habitTitle}?`);
    }

    return Array.from(new Set(prompts)).slice(0, 5);
  }, [summary]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id || !message.trim()) return;

    setError(null);
    setLoading(true);
    const optimisticHistory = [
      ...history,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      },
    ];
    setHistory(optimisticHistory);
    setMessage("");

    try {
      const data = await sendAssistantMessage(user.id, message.trim());
      setHistory(data.history || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Assistant reply failed", err);
      setError("I couldn't reach the assistant. Try again in a moment.");
      setHistory(history);
    } finally {
      setLoading(false);
    }
  };

  const applyPrompt = (prompt) => {
    setMessage(prompt);
  };

  const renderMessage = (entry) => {
    const isAssistant = entry.role === "assistant";
    const avatarColor = avatarColors[isAssistant ? "assistant" : "user"];

    return (
      <CListGroupItem
        key={entry.id}
        className={`border-0 px-3 py-3 ${
          isAssistant ? "bg-body-secondary" : "bg-transparent"
        }`}
      >
        <div className="d-flex gap-3">
          <CAvatar color={avatarColor} textColor="white">
            <CIcon icon={isAssistant ? cilLightbulb : cilChatBubble} />
          </CAvatar>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold text-capitalize">
                {isAssistant ? "StepHabit Coach" : summary?.profile?.name || "You"}
              </span>
              <small className="text-medium-emphasis">
                {formatTime(entry.createdAt)}
              </small>
            </div>
            <div className="mt-2 text-break" style={{ whiteSpace: "pre-wrap" }}>
              {entry.content}
            </div>
            {entry.keywords?.keywords && entry.keywords.keywords.length > 0 && (
              <div className="mt-2 d-flex flex-wrap gap-2">
                {entry.keywords.keywords.map((keyword, index) => (
                  <CBadge color="light" textColor="dark" key={`${entry.id}-${index}`}>
                    #{keyword.keyword || keyword}
                  </CBadge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CListGroupItem>
    );
  };

  if (!user?.id) {
    return (
      <CRow>
        <CCol>
          <CAlert color="info">
            Sign in to meet your personal AI companion.
          </CAlert>
        </CCol>
      </CRow>
    );
  }

  return (
    <CRow className="g-4">
      <CCol xs={12} xl={8}>
        <CCard className="shadow-sm h-100">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">AI Companion</h5>
              <small className="text-medium-emphasis">
                A coach that learns from your journey and adapts every day.
              </small>
            </div>
            {initialLoading && <CSpinner size="sm" color="primary" />}
          </CCardHeader>
          <CCardBody className="d-flex flex-column">
            {error && (
              <CAlert color="danger" className="mb-3">
                {error}
              </CAlert>
            )}

            <div className="mb-3">
              <div className="d-flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <CBadge
                    key={prompt}
                    color="primary"
                    className="bg-opacity-10 text-primary py-2 px-3"
                    role="button"
                    onClick={() => applyPrompt(prompt)}
                  >
                    {prompt}
                  </CBadge>
                ))}
              </div>
            </div>

            <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: "520px" }}>
              {initialLoading ? (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <CSpinner color="primary" />
                </div>
              ) : history.length ? (
                <CListGroup className="border-0">
                  {history.map((entry) => renderMessage(entry))}
                  <div ref={bottomRef} />
                </CListGroup>
              ) : (
                <div className="text-center text-medium-emphasis py-5">
                  <CIcon icon={cilLightbulb} size="2xl" className="mb-3" />
                  <h6 className="fw-semibold">Start the conversation</h6>
                  <p className="mb-0">
                    Share what you need help with today and I will guide your next
                    steps.
                  </p>
                </div>
              )}
            </div>

            <CForm onSubmit={handleSubmit} className="mt-auto">
              <CInputGroup className="align-items-start">
                <CInputGroupText className="bg-body-secondary">
                  <CIcon icon={cilChatBubble} />
                </CInputGroupText>
                <CFormTextarea
                  rows={2}
                  placeholder="Ask for coaching, planning help, or quick motivation..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={loading}
                />
                <CButton
                  type="submit"
                  color="primary"
                  disabled={loading || !message.trim()}
                  className="d-flex align-items-center gap-2"
                >
                  {loading ? (
                    <CSpinner size="sm" />
                  ) : (
                    <CIcon icon={cilSend} />
                  )}
                  <span>{loading ? "Thinking" : "Send"}</span>
                </CButton>
              </CInputGroup>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12} xl={4}>
        <InsightSection
          title="Personal Snapshot"
          icon={cilChartLine}
          description="Updated every time you chat so the assistant keeps learning."
          items={summary ? [
            {
              title: summary.profile?.goal || "Set your primary goal to tailor support",
              subtitle: `Focus area: ${summary.profile?.focusArea || "Not specified"}`,
              badges: [
                summary.profile?.commitment
                  ? `${summary.profile.commitment} daily`
                  : "Set a commitment",
                summary.profile?.supportPreference || "Choose support style",
              ],
            },
            {
              title: `Completion rate: ${summary.progress?.completionRate || 0}%`,
              subtitle: `${summary.progress?.completed || 0} wins · ${summary.progress?.missed || 0} misses recently`,
              badges: summary.topKeywords?.slice(0, 3).map((item) => `#${item.keyword}`),
            },
          ] : []}
          empty="Share a few thoughts to begin building your personal profile."
        />

        <InsightSection
          title="Habit Highlights"
          icon={cilStar}
          description="Where you're thriving and where we can focus next."
          items={summary?.progress?.habitSummaries?.slice(0, 3).map((habit) => ({
            title: habit.title,
            subtitle: `${habit.completionRate}% success · ${habit.completed} wins · ${habit.missed} misses`,
            badges: [
              `${habit.activeDays} active days`,
              habit.category || "Habit",
            ],
          }))}
          empty="Log progress to unlock habit-specific coaching."
        />

        <InsightSection
          title="Upcoming Focus"
          icon={cilCalendar}
          description="We'll nudge you ahead of key moments."
          items={summary?.upcoming?.map((item) => ({
            title: item.habitTitle,
            subtitle: `${item.day} · ${item.starttime}${
              item.endtime ? ` — ${item.endtime}` : ""
            } (${item.repeat})`,
            badges: item.notes ? [item.notes] : undefined,
          }))}
          empty="No upcoming sessions planned. Ask for scheduling tips!"
        />
      </CCol>
    </CRow>
  );
};

export default AICompanion;
