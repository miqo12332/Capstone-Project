import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
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
  cilBell,
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilEnvelopeClosed,
  cilSend,
  cilSettings,
  cilTask,
} from "@coreui/icons";

import { AuthContext } from "../../context/AuthContext";
import {
  createNotification,
  fetchNotificationSummary,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
} from "../../services/notifications";

const priorityColorMap = {
  high: "danger",
  medium: "primary",
  low: "secondary",
};

const filterOptions = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "upcoming", label: "Upcoming" },
];

const initialComposeState = {
  title: "",
  message: "",
  category: "general",
  priority: "medium",
  scheduledFor: "",
};

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [compose, setCompose] = useState(initialComposeState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const loadNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [feed, summaryData] = await Promise.all([
        fetchNotifications(user.id, {
          filter,
          category: categoryFilter || undefined,
        }),
        fetchNotificationSummary(user.id),
      ]);
      setNotifications(feed.notifications || []);
      setSummary(summaryData.summary || feed.summary || null);
      setPreferences(summaryData.preferences || null);
    } catch (error) {
      console.error("Failed to load notifications", error);
      setFeedback({
        type: "danger",
        message: "We couldn't load your notifications. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, filter, categoryFilter]);

  const availableCategories = useMemo(() => {
    const categories = new Set();
    notifications.forEach((notification) => {
      if (notification.category) categories.add(notification.category);
    });
    return ["", ...Array.from(categories).sort()];
  }, [notifications]);

  const handleToggleRead = async (notification) => {
    try {
      const updated = await markNotificationRead(notification.id, !notification.isRead);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setSummary((current) =>
        current
          ? {
              ...current,
              unread: current.unread + (notification.isRead ? 1 : -1),
            }
          : current
      );
    } catch (error) {
      console.error("Failed to update notification", error);
      setFeedback({ type: "danger", message: "Couldn't update that notification." });
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setSummary((current) =>
        current
          ? {
              ...current,
              unread: 0,
              lastOpenedAt: new Date().toISOString(),
            }
          : current
      );
      setFeedback({ type: "success", message: "All caught up!" });
    } catch (error) {
      console.error("Failed to mark all read", error);
      setFeedback({ type: "danger", message: "We couldn't mark everything as read." });
    }
  };

  const handleRefresh = async () => {
    if (!user?.id) return;
    try {
      setRefreshing(true);
      await refreshNotifications(user.id);
      await loadNotifications();
      setFeedback({ type: "success", message: "Insights refreshed from your latest activity." });
    } catch (error) {
      console.error("Failed to refresh notifications", error);
      setFeedback({
        type: "danger",
        message: "Refresh failed. Try again after checking your connection.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleComposeChange = (field) => (event) => {
    const value = event.target.value;
    setCompose((prev) => ({ ...prev, [field]: value }));
  };

  const handleComposeSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      setFeedback({ type: "danger", message: "You need to be logged in to schedule reminders." });
      return;
    }
    if (!compose.message.trim()) {
      setFeedback({ type: "danger", message: "Please provide a reminder message." });
      return;
    }

    try {
      setIsSubmitting(true);
      await createNotification({
        user_id: user.id,
        title: compose.title || "Personal reminder",
        message: compose.message,
        category: compose.category,
        priority: compose.priority,
        scheduled_for: compose.scheduledFor || null,
      });
      setCompose(initialComposeState);
      await loadNotifications();
      setFeedback({ type: "success", message: "Reminder scheduled successfully." });
    } catch (error) {
      console.error("Failed to create notification", error);
      setFeedback({ type: "danger", message: "We couldn't schedule that reminder yet." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMetadata = (notification) => {
    const entries = [];
    if (notification.metadata?.missed !== undefined) {
      entries.push(`Missed ${notification.metadata.missed} time(s) recently.`);
    }
    if (notification.metadata?.completed !== undefined) {
      entries.push(`Completed ${notification.metadata.completed} time(s).`);
    }
    if (notification.metadata?.scheduleId) {
      entries.push(`Linked schedule #${notification.metadata.scheduleId}.`);
    }
    if (!entries.length) return null;
    return (
      <div className="text-medium-emphasis small mt-2">
        {entries.map((entry) => (
          <div key={entry}>{entry}</div>
        ))}
      </div>
    );
  };

  return (
    <CRow className="g-4">
      <CCol xl={8}>
        <CCard className="shadow-sm h-100">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h4 className="mb-0">Notification Center</h4>
              <small className="text-medium-emphasis">
                Stay on top of reminders, progress nudges, and schedule alerts.
              </small>
            </div>
            <div className="d-flex gap-2">
              <CButton color="secondary" variant="ghost" size="sm" onClick={handleMarkAllRead}>
                Mark all read
              </CButton>
              <CButton color="primary" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <CSpinner size="sm" /> : "Refresh insights"}
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {feedback && (
              <CAlert color={feedback.type} className="mb-4" dismissible>
                {feedback.message}
              </CAlert>
            )}

            <CRow className="g-3 mb-4">
              <CCol md={3}>
                <CCard className="bg-body-tertiary border-0 h-100">
                  <CCardBody>
                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilBell} className="text-primary me-2" />
                      <span className="text-medium-emphasis">Total</span>
                    </div>
                    <h3 className="mb-0">{summary?.total ?? 0}</h3>
                    <small className="text-medium-emphasis">notifications logged</small>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={3}>
                <CCard className="bg-body-tertiary border-0 h-100">
                  <CCardBody>
                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilEnvelopeClosed} className="text-danger me-2" />
                      <span className="text-medium-emphasis">Unread</span>
                    </div>
                    <h3 className="mb-0">{summary?.unread ?? 0}</h3>
                    <small className="text-medium-emphasis">needs your attention</small>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={3}>
                <CCard className="bg-body-tertiary border-0 h-100">
                  <CCardBody>
                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilClock} className="text-info me-2" />
                      <span className="text-medium-emphasis">Upcoming</span>
                    </div>
                    <h3 className="mb-0">{summary?.upcoming ?? 0}</h3>
                    <small className="text-medium-emphasis">scheduled reminders</small>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={3}>
                <CCard className="bg-body-tertiary border-0 h-100">
                  <CCardBody>
                    <div className="d-flex align-items-center mb-2">
                      <CIcon icon={cilCheckCircle} className="text-success me-2" />
                      <span className="text-medium-emphasis">Last opened</span>
                    </div>
                    <h6 className="mb-0">
                      {summary?.lastOpenedAt
                        ? new Date(summary.lastOpenedAt).toLocaleString()
                        : "Just now"}
                    </h6>
                    <small className="text-medium-emphasis">based on read activity</small>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            <CRow className="g-3 align-items-end mb-4">
              <CCol md={6}>
                <small className="text-medium-emphasis d-block mb-2">Filter by status</small>
                <CButtonGroup role="group">
                  {filterOptions.map((option) => (
                    <CButton
                      key={option.value}
                      color={filter === option.value ? "primary" : "secondary"}
                      variant={filter === option.value ? "" : "outline"}
                      size="sm"
                      onClick={() => setFilter(option.value)}
                    >
                      {option.label}
                    </CButton>
                  ))}
                </CButtonGroup>
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="notification-category">Category</CFormLabel>
                <CFormSelect
                  id="notification-category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="">All categories</option>
                  {availableCategories
                    .filter((category) => category)
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                </CFormSelect>
              </CCol>
              <CCol md={3} className="text-md-end">
                {preferences && (
                  <CBadge color="primary" className="mt-3 mt-md-0">
                    {preferences.email ? "Email" : "Email off"} • {preferences.push ? "Push" : "Push off"}
                  </CBadge>
                )}
              </CCol>
            </CRow>

            {loading ? (
              <div className="text-center py-5">
                <CSpinner color="primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-5 text-medium-emphasis">
                <CIcon icon={cilTask} size="xl" className="mb-3 text-primary" />
                <p className="mb-1">You're all caught up!</p>
                <small>Refresh insights or create a custom reminder to get started.</small>
              </div>
            ) : (
              <CListGroup className="mb-4">
                {notifications.map((notification) => (
                  <CListGroupItem
                    key={notification.id}
                    className={`border-0 rounded-3 mb-3 shadow-sm ${
                      notification.isRead ? "bg-body" : "bg-body-tertiary"
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="me-3 flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <strong>{notification.title}</strong>
                          <CBadge color={priorityColorMap[notification.priority] || "secondary"}>
                            {notification.priority}
                          </CBadge>
                          {notification.category && (
                            <CBadge color="secondary" variant="outline">
                              {notification.category}
                            </CBadge>
                          )}
                        </div>
                        <p className="mb-2 text-medium-emphasis">{notification.message}</p>
                        <div className="d-flex flex-wrap gap-3 small text-medium-emphasis">
                          <span>
                            <CIcon icon={cilCalendar} className="me-1" />
                            {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleString()
                              : "Just now"}
                          </span>
                          {notification.scheduledFor && (
                            <span>
                              <CIcon icon={cilClock} className="me-1" />
                              Scheduled for {new Date(notification.scheduledFor).toLocaleString()}
                            </span>
                          )}
                          {notification.readAt && (
                            <span>
                              <CIcon icon={cilCheckCircle} className="me-1" />
                              Read {new Date(notification.readAt).toLocaleString()}
                            </span>
                          )}
                          {notification.ctaUrl && (
                            <a href={`#${notification.ctaUrl}`} className="text-primary text-decoration-none">
                              Go to action
                            </a>
                          )}
                        </div>
                        {renderMetadata(notification)}
                      </div>
                      <div className="d-flex flex-column gap-2">
                        <CButton
                          color={notification.isRead ? "secondary" : "primary"}
                          variant={notification.isRead ? "outline" : ""}
                          size="sm"
                          onClick={() => handleToggleRead(notification)}
                        >
                          {notification.isRead ? "Mark unread" : "Mark read"}
                        </CButton>
                      </div>
                    </div>
                  </CListGroupItem>
                ))}
              </CListGroup>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CRow className="g-4">
          <CCol xs={12}>
            <CCard className="shadow-sm h-100">
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilSettings} className="text-primary me-2" />
                  Delivery preferences
                </div>
              </CCardHeader>
              <CCardBody>
                {preferences ? (
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <strong>Email updates:</strong> {preferences.email ? "Enabled" : "Muted"}
                    </li>
                    <li className="mb-2">
                      <strong>Push notifications:</strong> {preferences.push ? "Enabled" : "Muted"}
                    </li>
                    <li>
                      <strong>Timezone:</strong> {preferences.timezone}
                    </li>
                  </ul>
                ) : (
                  <p className="text-medium-emphasis mb-0">
                    We'll respect your settings once you configure them in the profile area.
                  </p>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12}>
            <CCard className="shadow-sm h-100">
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilSend} className="text-success me-2" />
                  Create custom reminder
                </div>
              </CCardHeader>
              <CCardBody>
                <CForm onSubmit={handleComposeSubmit}>
                  <CFormLabel htmlFor="compose-title">Title</CFormLabel>
                  <CFormInput
                    id="compose-title"
                    placeholder="Optional title"
                    value={compose.title}
                    onChange={handleComposeChange("title")}
                    className="mb-3"
                  />

                  <CFormLabel htmlFor="compose-message">Message</CFormLabel>
                  <CFormTextarea
                    id="compose-message"
                    rows={3}
                    placeholder="What would you like to be reminded about?"
                    value={compose.message}
                    onChange={handleComposeChange("message")}
                    className="mb-3"
                  />

                  <CRow className="g-3 mb-3">
                    <CCol sm={6}>
                      <CFormLabel htmlFor="compose-category">Category</CFormLabel>
                      <CFormSelect
                        id="compose-category"
                        value={compose.category}
                        onChange={handleComposeChange("category")}
                      >
                        <option value="general">General</option>
                        <option value="Schedule">Schedule</option>
                        <option value="Progress">Progress</option>
                        <option value="Wellness">Wellness</option>
                        <option value="Productivity">Productivity</option>
                      </CFormSelect>
                    </CCol>
                    <CCol sm={6}>
                      <CFormLabel htmlFor="compose-priority">Priority</CFormLabel>
                      <CFormSelect
                        id="compose-priority"
                        value={compose.priority}
                        onChange={handleComposeChange("priority")}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>

                  <CFormLabel htmlFor="compose-schedule">Optional schedule</CFormLabel>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilCalendar} />
                    </CInputGroupText>
                    <CFormInput
                      id="compose-schedule"
                      type="datetime-local"
                      value={compose.scheduledFor}
                      onChange={handleComposeChange("scheduledFor")}
                    />
                  </CInputGroup>

                  <div className="d-grid">
                    <CButton color="success" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <CSpinner size="sm" /> : "Schedule reminder"}
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12}>
            <CCard className="shadow-sm h-100">
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilTask} className="text-info me-2" />
                  Tips to stay current
                </div>
              </CCardHeader>
              <CCardBody>
                <ul className="list-unstyled mb-0 text-medium-emphasis small">
                  <li className="mb-2">Refresh insights after adjusting your schedule or streaks.</li>
                  <li className="mb-2">Use custom reminders to support upcoming travel or focus sprints.</li>
                  <li>Toggle categories above to zero in on progress vs. planning alerts.</li>
                </ul>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CCol>
    </CRow>
  );
};

export default Notifications;
