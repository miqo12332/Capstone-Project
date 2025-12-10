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

const CoachSummaryCard = ({ summary }) => {
  const focusArea = summary?.profile?.focusArea || "Choose a focus";
  const nextHabit =
    summary?.upcoming?.[0]?.habitTitle || "Add an upcoming session";
  const completionRate = summary?.progress?.completionRate ?? 0;

  return (
    <div className="mb-3 p-3 rounded-4 border bg-body-tertiary">
      <div className="d-flex flex-wrap align-items-center gap-3 justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <CAvatar color="primary" textColor="white">
            <CIcon icon={cilLightbulb} />
          </CAvatar>
          <div>
            <div className="text-uppercase small text-body-secondary fw-semibold">
              Focus
            </div>
            <div className="fw-semibold">{focusArea}</div>
            <small className="text-medium-emphasis">{nextHabit}</small>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <CAvatar color="info" textColor="white">
            <CIcon icon={cilCalendar} />
          </CAvatar>
          <div>
            <div className="text-uppercase small text-body-secondary fw-semibold">
              Goal
            </div>
            <div className="fw-semibold">
              {summary?.profile?.goal || "Set a goal to personalize your chat"}
            </div>
            <small className="text-medium-emphasis">
              {summary?.profile?.name || "Your coach"}
            </small>
          </div>
        </div>
        <CBadge
          color="primary"
          className="px-3 py-2 bg-opacity-15 text-primary text-center rounded-pill"
        >
          {completionRate}% complete
        </CBadge>
      </div>
    </div>
  );
};

const HabitCoach = () => {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [coach, setCoach] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createdHabitNotice, setCreatedHabitNotice] = useState(null);
  const bottomRef = useRef(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    setInitialLoading(true);
    try {
      const data = await fetchAssistantHistory(user.id);
      setHistory(data.history || []);
      setSummary(data.summary || null);
      setCoach(data.agent || null);
    } catch (err) {
      console.error("Failed to load coach history", err);
      setError("Unable to load your habit coach right now. Please retry.");
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
    setCreatedHabitNotice(null);
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
      setCoach(data.agent || null);
      if (data.createdHabit) {
        setCreatedHabitNotice({
          title: data.createdHabit.title,
          category: data.createdHabit.category,
        });
      }
    } catch (err) {
      console.error("Coach reply failed", err);
      setError("I couldn't reach the coach. Try again in a moment.");
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
      <div key={entry.id} className="d-flex gap-3 align-items-start mb-3">
        <CAvatar color={avatarColor} textColor="white">
          <CIcon icon={isAssistant ? cilLightbulb : cilChatBubble} />
        </CAvatar>
        <div className="flex-grow-1">
          <div
            className={`p-3 rounded-4 border ${
              isAssistant ? "bg-body-secondary" : "bg-white shadow-sm"
            }`}
          >
            <div className="d-flex justify-content-between align-items-center gap-3">
              <span className="fw-semibold text-capitalize">
                {isAssistant ? "StepHabit Coach" : summary?.profile?.name || "You"}
              </span>
              <small className="text-medium-emphasis">{formatTime(entry.createdAt)}</small>
            </div>
            <div className="mt-2 text-break" style={{ whiteSpace: "pre-wrap" }}>
              {entry.content}
            </div>
            {entry.keywords?.keywords && entry.keywords.keywords.length > 0 && (
              <div className="mt-3 d-flex flex-wrap gap-2">
                {entry.keywords.keywords.map((keyword, index) => (
                  <CBadge color="light" textColor="dark" key={`${entry.id}-${index}`}>
                    #{keyword.keyword || keyword}
                  </CBadge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!user?.id) {
    return (
      <CRow>
        <CCol>
          <CAlert color="info">
            Sign in to meet your personal habit coach.
          </CAlert>
        </CCol>
      </CRow>
    );
  }

  return (
    <>
      <div className="mb-4 position-relative overflow-hidden rounded-4 border bg-body-tertiary p-4 p-md-5">
        <div
          className="position-absolute top-0 end-0 opacity-25"
          style={{ height: "120px", width: "120px", background: "radial-gradient(circle, #3b82f6 0, transparent 70%)" }}
          aria-hidden
        />
        <div className="d-flex flex-column gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2 text-uppercase small text-primary fw-semibold">
            <span>Dashboard</span>
            <span className="text-body-secondary">›</span>
            <span>Planner</span>
            <span className="text-body-secondary">›</span>
            <span>Habits</span>
            <span className="text-body-secondary">›</span>
            <span className="text-dark">Habit Coach</span>
          </div>
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
            <div>
              <h3 className="mb-2">Habit Coach</h3>
              <p className="text-medium-emphasis mb-0">
                A dedicated coaching space built for planning, reflection, and momentum without distractions.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <CBadge color="primary" className="rounded-pill px-3 py-2 text-white">
                {summary?.profile?.goal ? `Goal: ${summary.profile.goal}` : "Set your goal"}
              </CBadge>
              <CBadge color="light" textColor="dark" className="rounded-pill px-3 py-2">
                {summary?.profile?.focusArea || "No focus set"}
              </CBadge>
            </div>
          </div>
        </div>
      </div>

      <CRow className="g-4">
        <CCol lg={4} className="d-flex flex-column gap-3">
          <CoachSummaryCard summary={summary} />

          <CCard className="shadow-sm border-0">
            <CCardHeader className="bg-white">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilChatBubble} className="text-primary" />
                <span className="fw-semibold">Quick prompts</span>
              </div>
            </CCardHeader>
            <CCardBody>
              <p className="text-medium-emphasis small">
                Choose a prompt to start faster. Your coach will tailor replies using your latest habits.
              </p>
              <div className="d-flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <CButton
                    key={prompt}
                    color="light"
                    className="rounded-pill text-start"
                    onClick={() => applyPrompt(prompt)}
                  >
                    {prompt}
                  </CButton>
                ))}
              </div>
            </CCardBody>
          </CCard>

          <InsightSection
            title="Personal Snapshot"
            icon={cilChartLine}
            description="Updated every time you chat so the coach keeps learning."
            items={summary
              ? [
                  {
                    title:
                      summary.profile?.goal || "Set your primary goal to tailor support",
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
                ]
              : []}
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

        <CCol lg={8}>
          <CCard className="shadow-lg border-0 overflow-hidden h-100">
            <CCardHeader className="bg-white border-0 py-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div className="d-flex align-items-center gap-3">
                  <CAvatar color="primary" textColor="white" size="lg">
                    <CIcon icon={cilLightbulb} />
                  </CAvatar>
                  <div>
                    <h5 className="mb-0">Habit Coach Space</h5>
                    <small className="text-medium-emphasis">
                      Stay focused on one guided conversation at a time.
                    </small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {initialLoading && <CSpinner size="sm" color="primary" />}
                  <CBadge color={coach?.ready ? "success" : "warning"} className="rounded-pill px-3 py-2">
                    {coach?.ready ? "Live" : "Standby"}
                  </CBadge>
                </div>
              </div>
            </CCardHeader>

            <CCardBody className="bg-body-tertiary p-4 d-flex flex-column gap-3 h-100">
              {coach && (
                <CAlert color={coach.ready ? "primary" : "warning"} className="mb-0 border-0 shadow-sm">
                  {coach.ready ? (
                    <>
                      Powered by {coach.provider || "our coaching engine"}
                      {coach.model ? ` (${coach.model})` : ""}. I analyse your journey before every reply.
                    </>
                  ) : (
                    coach.reason ||
                    "Live coaching is momentarily offline. You're seeing our smart guidance instead."
                  )}
                </CAlert>
              )}
              {createdHabitNotice && (
                <CAlert color="success" className="mb-0 border-0 shadow-sm">
                  Added <strong>{createdHabitNotice.title}</strong> to your habits
                  {createdHabitNotice.category ? ` · ${createdHabitNotice.category}` : ""}. You can review and adjust it in
                  the Habits module anytime.
                </CAlert>
              )}
              {error && (
                <CAlert color="danger" className="mb-0">
                  {error}
                </CAlert>
              )}

              <div className="p-3 rounded-4 border bg-white shadow-sm flex-grow-1 d-flex flex-column">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <CIcon icon={cilSend} className="text-primary" />
                    <span className="fw-semibold">Conversation</span>
                  </div>
                  <small className="text-medium-emphasis">Draft your message and the coach replies instantly.</small>
                </div>

                <div
                  className="rounded-4 border bg-body-tertiary p-3 flex-grow-1"
                  style={{ minHeight: "260px", maxHeight: "400px" }}
                >
                  {initialLoading ? (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <CSpinner color="primary" />
                    </div>
                  ) : history.length ? (
                    <div className="overflow-auto h-100">
                      {history.map((entry) => renderMessage(entry))}
                      <div ref={bottomRef} />
                    </div>
                  ) : (
                    <div className="text-center text-medium-emphasis py-5">
                      <CIcon icon={cilLightbulb} size="2xl" className="mb-3" />
                      <h6 className="fw-semibold">Start the conversation</h6>
                      <p className="mb-0">
                        Share what you need help with today and I will guide your next steps.
                      </p>
                    </div>
                  )}
                </div>

                <CForm onSubmit={handleSubmit} className="mt-3">
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
                  <small className="d-block mt-2 text-medium-emphasis">
                    Keep it simple—share how your day is going, and the coach will respond with one clear next step.
                  </small>
                </CForm>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default HabitCoach;
