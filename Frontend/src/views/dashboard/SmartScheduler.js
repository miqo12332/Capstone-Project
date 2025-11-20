import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CListGroup,
  CListGroupItem,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilBolt,
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilLightbulb,
  cilList,
  cilLoopCircular,
} from "@coreui/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSmartSchedulerInsights, autoPlanSmartSession } from "../../services/smartScheduler";

const SmartScheduler = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [days, setDays] = useState(7);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [planningId, setPlanningId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadInsights = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    setRefreshing(true);
    try {
      const data = await getSmartSchedulerInsights(user.id, days);
      setInsights(data);
    } catch (err) {
      console.error("❌ Failed to load smart scheduler", err);
      setError("We couldn't analyse your schedule. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, days]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const densityData = useMemo(() => insights?.density ?? [], [insights]);
  const freeWindows = insights?.freeWindows ?? [];
  const overlaps = insights?.overlaps ?? [];
  const suggestions = insights?.suggestions ?? [];
  const upcoming = insights?.upcoming ?? [];

  const planSuggestion = async (suggestion) => {
    if (!user?.id) return;
    setFeedback(null);
    try {
      setPlanningId(`${suggestion.habitId}-${suggestion.date}-${suggestion.start}`);
      await autoPlanSmartSession({
        userId: user.id,
        habitId: suggestion.habitId,
        day: suggestion.date,
        starttime: `${suggestion.start}:00`,
        endtime: suggestion.end ? `${suggestion.end}:00` : null,
        notes: suggestion.reason,
      });
      setFeedback({ type: "success", message: `${suggestion.habitName} scheduled on ${suggestion.date}.` });
      await loadInsights();
    } catch (err) {
      console.error("❌ Failed to plan suggestion", err);
      const message = err?.response?.data?.error || "We couldn't create that schedule.";
      setFeedback({ type: "danger", message });
    } finally {
      setPlanningId(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-5 text-center">
        <CSpinner color="primary" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="pt-4">
        <CAlert color="danger">{error || "No scheduler insights available."}</CAlert>
      </div>
    );
  }

  return (
    <CRow className="g-4 py-3">
      <CCol xs={12}>
        {error && <CAlert color="danger">{error}</CAlert>}
        {feedback && (
          <CAlert color={feedback.type} dismissible onClose={() => setFeedback(null)}>
            {feedback.message}
          </CAlert>
        )}
      </CCol>

      <CCol xs={12}>
        <CCard className="border-0 shadow-sm">
          <CCardHeader className="d-flex flex-wrap gap-3 align-items-center justify-content-between bg-gradient-info text-white">
            <div className="d-flex align-items-center gap-3">
              <CIcon icon={cilLightbulb} size="xl" />
              <div>
                <div className="text-uppercase fw-semibold small opacity-75">
                  Smart Scheduler
                </div>
                <h4 className="mb-0">Optimise the next {insights.horizonDays} days</h4>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <CButtonGroup size="sm">
                {[7, 10, 14].map((option) => (
                  <CButton
                    key={option}
                    color={days === option ? "primary" : "light"}
                    className={days === option ? "text-white" : "text-primary"}
                    onClick={() => setDays(option)}
                    disabled={refreshing}
                  >
                    {option} days
                  </CButton>
                ))}
              </CButtonGroup>
              <CButton
                color="light"
                variant="outline"
                size="sm"
                onClick={loadInsights}
                disabled={refreshing}
                className="text-primary"
              >
                {refreshing ? (
                  <span className="d-flex align-items-center gap-2">
                    <CSpinner size="sm" /> Refreshing
                  </span>
                ) : (
                  <span className="d-flex align-items-center gap-2">
                    <CIcon icon={cilLoopCircular} /> Refresh
                  </span>
                )}
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={3}>
                <div className="p-3 border rounded h-100">
                  <div className="text-uppercase text-muted small fw-semibold">
                    Habits tracked
                  </div>
                  <div className="fs-4 fw-semibold">{insights.summary.totalHabits}</div>
                  <div className="text-body-secondary small">Active habits ready for scheduling</div>
                </div>
              </CCol>
              <CCol md={3}>
                <div className="p-3 border rounded h-100">
                  <div className="text-uppercase text-muted small fw-semibold">
                    Sessions planned
                  </div>
                  <div className="fs-4 fw-semibold">{insights.summary.scheduledSessions}</div>
                  <div className="text-body-secondary small">Across the next {insights.horizonDays} days</div>
                </div>
              </CCol>
              <CCol md={3}>
                <div className="p-3 border rounded h-100">
                  <div className="text-uppercase text-muted small fw-semibold">
                    Free windows
                  </div>
                  <div className="fs-4 fw-semibold text-success">{insights.summary.freeWindows}</div>
                  <div className="text-body-secondary small">Ideal slots waiting to be claimed</div>
                </div>
              </CCol>
              <CCol md={3}>
                <div className="p-3 border rounded h-100">
                  <div className="text-uppercase text-muted small fw-semibold">
                    Conflicts
                  </div>
                  <div className="fs-4 fw-semibold text-danger">{insights.summary.overlaps}</div>
                  <div className="text-body-secondary small">Adjust to avoid double booking</div>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={8}>
        <CCard className="border-0 shadow-sm mb-4">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Scheduling density
          </CCardHeader>
          <CCardBody style={{ height: "320px" }}>
            {densityData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={densityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value, key) => [`${value}`, key === "entries" ? "Sessions" : "Minutes"]} />
                  <Bar dataKey="entries" name="Sessions" fill="#321fdb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="minutes" name="Minutes scheduled" fill="#39f" radius={[6, 6, 0, 0]} opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-body-secondary">Add schedules to see how your week fills out.</div>
            )}
          </CCardBody>
        </CCard>

        <CCard className="border-0 shadow-sm">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Upcoming sessions
          </CCardHeader>
          <CCardBody className="p-0">
            {upcoming.length ? (
              <CListGroup flush>
                {upcoming.map((item) => (
                  <CListGroupItem key={`${item.id}`} className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold">{item.title}</div>
                      <div className="text-body-secondary small">
                        <CIcon icon={cilCalendar} className="text-primary me-2" />
                        {item.day} · {item.starttime?.slice(0, 5)}
                        {item.endtime ? ` - ${item.endtime.slice(0, 5)}` : ""}
                      </div>
                    </div>
                    <div className="text-end">
                      {item.successRate != null && (
                        <div className="small text-muted">Success: {item.successRate}%</div>
                      )}
                      {item.streak && (
                        <div className="small text-muted">Streak: {item.streak.current}</div>
                      )}
                    </div>
                  </CListGroupItem>
                ))}
              </CListGroup>
            ) : (
              <div className="p-4 text-body-secondary">No sessions planned yet. Start with a smart suggestion below.</div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={4}>
        <CCard className="border-0 shadow-sm mb-4">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Conflict radar
          </CCardHeader>
          <CCardBody>
            {overlaps.length ? (
              <div className="d-flex flex-column gap-3">
                {overlaps.map((conflict, index) => (
                  <div key={`${conflict.day}-${index}`} className="p-3 border rounded">
                    <div className="fw-semibold">
                      <CIcon icon={cilBolt} className="text-danger me-2" />
                      {conflict.day}
                    </div>
                    <div className="text-body-secondary small mt-2">
                      {conflict.first.habit?.title || `Habit ${conflict.first.habit_id}`} overlaps with {conflict.second.habit?.title || `Habit ${conflict.second.habit_id}`}
                    </div>
                    <CBadge color="danger" className="mt-2">{conflict.overlapMinutes} minutes overlap</CBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-body-secondary">No clashes detected — great job!</div>
            )}
          </CCardBody>
        </CCard>

        <CCard className="border-0 shadow-sm">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Open windows
          </CCardHeader>
          <CCardBody className="p-0">
            {freeWindows.length ? (
              <CListGroup flush>
                {freeWindows.slice(0, 6).map((slot) => (
                  <CListGroupItem key={`${slot.date}-${slot.start}`}>
                    <div className="fw-semibold">{slot.date}</div>
                    <div className="text-body-secondary small mt-1">
                      <CIcon icon={cilClock} className="text-primary me-2" />
                      {slot.start} - {slot.end}
                    </div>
                    <CBadge color="success" className="mt-2">{slot.durationMinutes} min free</CBadge>
                  </CListGroupItem>
                ))}
              </CListGroup>
            ) : (
              <div className="p-4 text-body-secondary">Your upcoming days are fully booked.</div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard className="border-0 shadow-sm">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Smart suggestions
          </CCardHeader>
          <CCardBody>
            {suggestions.length ? (
              <CRow className="g-3">
                {suggestions.map((suggestion) => {
                  const isPlanning =
                    planningId === `${suggestion.habitId}-${suggestion.date}-${suggestion.start}`;
                  return (
                    <CCol md={4} key={`${suggestion.habitId}-${suggestion.date}-${suggestion.start}`}>
                      <div className="p-3 border rounded h-100 d-flex flex-column gap-3">
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <CIcon icon={cilList} className="text-primary" />
                            <span className="fw-semibold">{suggestion.habitName}</span>
                          </div>
                          <div className="text-body-secondary small mt-1">
                            {suggestion.date} · {suggestion.start} - {suggestion.end}
                          </div>
                        </div>
                        <div className="text-body-secondary small flex-grow-1">{suggestion.reason}</div>
                        <div>
                          <CProgress thin>
                            <CProgressBar color="primary" value={suggestion.confidence}>
                              <span className="small fw-semibold">Confidence {suggestion.confidence}%</span>
                            </CProgressBar>
                          </CProgress>
                          <CButton
                            color="primary"
                            className="mt-3 w-100 d-flex align-items-center justify-content-center gap-2"
                            disabled={isPlanning}
                            onClick={() => planSuggestion(suggestion)}
                          >
                            {isPlanning ? <CSpinner size="sm" /> : <CIcon icon={cilCheckCircle} />}
                            Schedule it
                          </CButton>
                        </div>
                      </div>
                    </CCol>
                  );
                })}
              </CRow>
            ) : (
              <div className="text-body-secondary">We'll surface automated plans once we detect habits that need a new slot.</div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default SmartScheduler;
