import React, { useEffect, useMemo, useState } from "react";
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
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
} from "@coreui/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHabits } from "../../services/habits";
import { getSchedules } from "../../services/schedules";
import {
  getTodayProgressLogs,
  logHabitProgress,
  updateHabitProgressCount,
} from "../../services/progress";
import { formatPercent, getProgressAnalytics } from "../../services/analytics";
import { fetchCalendarOverview } from "../../services/calendar";

const Dashboard = () => {
  const [habits, setHabits] = useState([]);
  const [todayCounts, setTodayCounts] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [calendarOverview, setCalendarOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editCounts, setEditCounts] = useState({ done: 0, missed: 0 });

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "{}"),
    []
  );

  const rowsToCounts = (rows) => {
    return rows.reduce((acc, row) => {
      const hid = row.habit_id;
      if (!acc[hid]) {
        acc[hid] = { done: 0, missed: 0 };
      }
      if (row.status === "done") {
        acc[hid].done += 1;
      } else if (row.status === "missed") {
        acc[hid].missed += 1;
      }
      return acc;
    }, {});
  };

  const loadTodayProgress = async () => {
    try {
      if (!user?.id) return;
      const rows = await getTodayProgressLogs(user.id);
      setTodayCounts(rowsToCounts(rows));
    } catch (err) {
      console.warn("⚠️ Failed to fetch today’s progress:", err);
    }
  };

  useEffect(() => {
    const loadCore = async () => {
      try {
        if (!user?.id) {
          setError("Please login first");
          setLoading(false);
          return;
        }

        setLoading(true);
        const [habitData, progressRows] = await Promise.all([
          getHabits(user.id),
          getTodayProgressLogs(user.id),
        ]);

        setHabits(habitData);
        setTodayCounts(rowsToCounts(progressRows));
      } catch (err) {
        console.error("❌ Error loading dashboard essentials", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadCore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const loadAnalytics = async () => {
      try {
        const data = await getProgressAnalytics(user.id);
        setAnalytics(data);
      } catch (err) {
        console.error("⚠️ Failed to fetch analytics for dashboard", err);
        setAnalyticsError("We couldn't refresh your analytics just now.");
      }
    };

    const loadSchedules = async () => {
      try {
        const [scheduleData, calendarData] = await Promise.all([
          getSchedules(user.id),
          fetchCalendarOverview(user.id, { days: 21 }),
        ]);
        setSchedules(Array.isArray(scheduleData) ? scheduleData : []);
        setCalendarOverview(calendarData || null);
      } catch (err) {
        console.warn("⚠️ Unable to load schedules or calendar", err);
      }
    };

    loadAnalytics();
    loadSchedules();
  }, [user?.id]);

  const overallToday = useMemo(() => {
    const aggregate = Object.values(todayCounts).reduce(
      (totals, { done, missed }) => ({
        done: totals.done + done,
        missed: totals.missed + missed,
      }),
      { done: 0, missed: 0 }
    );
    const totalChecks = aggregate.done + aggregate.missed;
    const completionRate = totalChecks
      ? Math.round((aggregate.done / totalChecks) * 100)
      : 0;
    return { ...aggregate, completionRate, totalChecks };
  }, [todayCounts]);

  const attentionHabits = useMemo(() => {
    const analyticHabits = analytics?.habits ?? [];
    return analyticHabits
      .filter((h) => (h.totals.done + h.totals.missed > 0 ? true : false))
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 3);
  }, [analytics]);

  const leaderboard = useMemo(
    () => analytics?.summary?.habitLeaderboard ?? [],
    [analytics]
  );

  const trend = useMemo(
    () => analytics?.summary?.dailyTrend?.slice(-10) ?? [],
    [analytics]
  );

  const upcomingPlans = useMemo(() => {
    const schedulePlans = schedules
      .map((schedule) => {
        const startDate = schedule.day
          ? new Date(`${schedule.day}T${schedule.starttime || "00:00"}`)
          : null;
        const endDate = schedule.day && schedule.endtime
          ? new Date(`${schedule.day}T${schedule.endtime}`)
          : null;
        return {
          id: `schedule-${schedule.id}`,
          title: schedule.habit?.title || schedule.custom_title || "Untitled",
          startDate,
          endDate,
          repeat: schedule.repeat,
          notes: schedule.notes,
          type: "habit",
        };
      })
      .filter(
        (item) =>
          item.startDate instanceof Date &&
          !Number.isNaN(item.startDate?.getTime())
      );

    const calendarPlans = (calendarOverview?.events ?? [])
      .map((event) => ({
        id: `calendar-${event.id}`,
        title: event.title,
        startDate: event.start_time ? new Date(event.start_time) : null,
        endDate: event.end_time ? new Date(event.end_time) : null,
        notes: event.description,
        type: "calendar",
        provider: event.source,
        allDay: event.all_day,
        location: event.location,
      }))
      .filter(
        (item) =>
          item.startDate instanceof Date &&
          !Number.isNaN(item.startDate?.getTime())
      );

    return [...schedulePlans, ...calendarPlans]
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, 5);
  }, [schedules, calendarOverview]);

  const startEdit = (habitId) => {
    const current = todayCounts[habitId] ?? { done: 0, missed: 0 };
    setEditingHabitId(habitId);
    setEditCounts(current);
  };

  const cancelEdit = () => {
    setEditingHabitId(null);
    setEditCounts({ done: 0, missed: 0 });
  };

  const submitEdit = async (habitId) => {
    if (!user?.id) return;
    try {
      const { done, missed } = editCounts;
      await Promise.all([
        updateHabitProgressCount(habitId, {
          userId: user.id,
          status: "done",
          targetCount: Number(done) || 0,
        }),
        updateHabitProgressCount(habitId, {
          userId: user.id,
          status: "missed",
          targetCount: Number(missed) || 0,
        }),
      ]);
      await loadTodayProgress();
      cancelEdit();
    } catch (err) {
      console.error("❌ Failed to update counts", err);
      alert("Couldn't save the updated counts. Please try again.");
    }
  };

  const handleQuickLog = async (habitId, status) => {
    if (!user?.id) return;
    try {
      await logHabitProgress(habitId, { userId: user.id, status });
      await loadTodayProgress();
      cancelEdit();
    } catch (err) {
      console.error("❌ Server error logging progress", err);
      alert("Failed to log progress. Please try again.");
    }
  };

  const renderSummaryCard = (title, value, helper) => (
    <CCard className="h-100">
      <CCardHeader className="fw-semibold">{title}</CCardHeader>
      <CCardBody>
        <div className="display-6 mb-2">{value}</div>
        {helper && <div className="text-body-secondary small">{helper}</div>}
      </CCardBody>
    </CCard>
  );

  const formatDateTime = (date) => {
    if (!date) return "—";
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="mt-4">
      <h2 className="mb-4">Today at a Glance</h2>

      {loading && (
        <div className="d-flex justify-content-center my-5">
          <CSpinner color="primary" />
        </div>
      )}

      {!loading && error && <CAlert color="danger">{error}</CAlert>}

      {!loading && !error && (
        <>
          <CRow className="g-4 mb-4">
            <CCol xs={12} md={6} xl={3}>
              {renderSummaryCard(
                "Check-ins Logged",
                overallToday.totalChecks,
                overallToday.totalChecks
                  ? `${overallToday.done} done · ${overallToday.missed} missed`
                  : "Log progress to see today's breakdown"
              )}
            </CCol>
            <CCol xs={12} md={6} xl={3}>
              {renderSummaryCard(
                "Completion Rate",
                `${overallToday.completionRate}%`,
                "Goal: keep it above 80%"
              )}
            </CCol>
            <CCol xs={12} md={6} xl={3}>
              {renderSummaryCard(
                "Active Habits",
                habits.length,
                habits.length
                  ? `${habits.filter((h) => (todayCounts[h.id]?.done ?? 0) > 0).length} completed today`
                  : "Create a habit to get started"
              )}
            </CCol>
            <CCol xs={12} md={6} xl={3}>
              {renderSummaryCard(
                "Best Streak",
                analytics?.summary?.streakLeader
                  ? `${analytics.summary.streakLeader.streak.best} days`
                  : "—",
                analytics?.summary?.streakLeader
                  ? analytics.summary.streakLeader.habitName
                  : analyticsError || "Build momentum to unlock streak insights"
              )}
            </CCol>
          </CRow>

          <CRow className="g-4 mb-4">
            <CCol xs={12} lg={7}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">
                  Today's Habit Controls
                </CCardHeader>
                <CCardBody>
                  {habits.length === 0 && (
                    <CAlert color="info" className="mb-0">
                      Add a habit from the planner to start tracking your day.
                    </CAlert>
                  )}

                  {habits.map((habit) => {
                    const counts = todayCounts[habit.id] ?? { done: 0, missed: 0 };
                    const total = counts.done + counts.missed;
                    const rate = total ? Math.round((counts.done / total) * 100) : 0;
                    const inEdit = editingHabitId === habit.id;

                    return (
                      <div
                        key={habit.id}
                        className="py-3 border-bottom d-flex flex-column gap-3"
                      >
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                          <div>
                            <div className="fw-semibold">{habit.title || habit.name}</div>
                            {habit.description && (
                              <div className="text-body-secondary small">
                                {habit.description}
                              </div>
                            )}
                          </div>
                          <div className="text-nowrap">
                            <CBadge color={rate >= 80 ? "success" : rate >= 50 ? "warning" : "danger"}>
                              {rate}% success today
                            </CBadge>
                          </div>
                        </div>

                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                          <div className="flex-grow-1">
                            <CProgress height={10} className="mb-2">
                              <CProgressBar
                                color="success"
                                value={total ? (counts.done / total) * 100 : 0}
                              />
                            </CProgress>
                            <div className="text-body-secondary small">
                              {counts.done} done · {counts.missed} missed today
                            </div>
                          </div>

                          {!inEdit && (
                            <CButtonGroup size="sm">
                              <CButton
                                color="danger"
                                onClick={() => handleQuickLog(habit.id, "missed")}
                              >
                                Missed
                              </CButton>
                              <CButton
                                color="success"
                                onClick={() => handleQuickLog(habit.id, "done")}
                              >
                                Done
                              </CButton>
                              <CButton
                                color="secondary"
                                variant="outline"
                                onClick={() => startEdit(habit.id)}
                              >
                                Adjust
                              </CButton>
                            </CButtonGroup>
                          )}

                          {inEdit && (
                            <div className="flex-grow-1">
                              <CForm
                                className="d-flex flex-column flex-lg-row gap-2"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  submitEdit(habit.id);
                                }}
                              >
                                <CInputGroup>
                                  <CInputGroupText>Done</CInputGroupText>
                                  <CFormInput
                                    type="number"
                                    min={0}
                                    value={editCounts.done}
                                    onChange={(event) =>
                                      setEditCounts((prev) => ({
                                        ...prev,
                                        done: event.target.value,
                                      }))
                                    }
                                  />
                                </CInputGroup>
                                <CInputGroup>
                                  <CInputGroupText>Missed</CInputGroupText>
                                  <CFormInput
                                    type="number"
                                    min={0}
                                    value={editCounts.missed}
                                    onChange={(event) =>
                                      setEditCounts((prev) => ({
                                        ...prev,
                                        missed: event.target.value,
                                      }))
                                    }
                                  />
                                </CInputGroup>
                                <CButtonGroup size="sm" className="align-self-start">
                                  <CButton color="primary" type="submit">
                                    Save
                                  </CButton>
                                  <CButton
                                    color="secondary"
                                    variant="outline"
                                    type="button"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </CButton>
                                </CButtonGroup>
                              </CForm>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol xs={12} lg={5}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">Momentum Trend</CCardHeader>
                <CCardBody style={{ height: 320 }}>
                  {trend.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="completed"
                          name="Completed"
                          stroke="#2eb85c"
                          fill="rgba(46, 184, 92, 0.2)"
                        />
                        <Area
                          type="monotone"
                          dataKey="missed"
                          name="Missed"
                          stroke="#e55353"
                          fill="rgba(229, 83, 83, 0.2)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-body-secondary text-center">
                      Not enough data yet. Keep logging to unlock your trendline.
                    </div>
                  )}
                  {analyticsError && (
                    <CAlert color="warning" className="mt-3 mb-0">
                      {analyticsError}
                    </CAlert>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow className="g-4">
            <CCol xs={12} lg={6}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">
                  Focus Habits
                </CCardHeader>
                <CCardBody>
                  {attentionHabits.length === 0 ? (
                    <div className="text-body-secondary">
                      Your habits are waiting for more history before we can make
                      personalized suggestions.
                    </div>
                  ) : (
                    <CListGroup flush>
                      {attentionHabits.map((habit) => (
                        <CListGroupItem
                          key={habit.habitId}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <div className="fw-semibold">{habit.habitName}</div>
                            <div className="small text-body-secondary">
                              {habit.recent.completionRate}% completion last 7 days ·
                              best streak {habit.streak.best} days
                            </div>
                          </div>
                          <CBadge color="warning">
                            {formatPercent(habit.successRate)} lifetime
                          </CBadge>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol xs={12} lg={6}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">
                  Upcoming Schedule
                </CCardHeader>
                <CCardBody>
                  {upcomingPlans.length === 0 ? (
                    <div className="text-body-secondary">
                      No plans on the calendar. Add routines from My Schedule or
                      sync a calendar to see them here.
                    </div>
                  ) : (
                    <CListGroup flush>
                      {upcomingPlans.map((plan) => (
                        <CListGroupItem key={plan.id} className="d-flex flex-column gap-1">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div>
                              <div className="fw-semibold">{plan.title}</div>
                              <div className="small text-body-secondary">
                                {formatDateTime(plan.startDate)}
                                {plan.type === "habit" && plan.repeat
                                  ? ` · ${plan.repeat.toLowerCase()}`
                                  : ""}
                                {plan.type === "calendar" && plan.provider
                                  ? ` · ${plan.provider}`
                                  : ""}
                                {plan.allDay ? " · All day" : ""}
                              </div>
                            </div>
                            <CBadge color={plan.type === "habit" ? "success" : "info"}>
                              {plan.type === "habit" ? "Habit" : "Calendar"}
                            </CBadge>
                          </div>
                          {plan.notes && (
                            <div className="small text-body-secondary">{plan.notes}</div>
                          )}
                          {plan.location && (
                            <div className="small text-body-secondary">{plan.location}</div>
                          )}
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  )}
                  {calendarOverview?.summary?.nextFreeDay && (
                    <div className="small text-body-secondary mt-3">
                      Next light day: {" "}
                      {new Date(calendarOverview.summary.nextFreeDay).toLocaleDateString()}
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {leaderboard.length > 0 && (
            <CRow className="g-4 mt-4">
              <CCol xs={12}>
                <CCard>
                  <CCardHeader className="fw-semibold">
                    Habit Leaderboard
                  </CCardHeader>
                  <CCardBody>
                    <CListGroup flush>
                      {leaderboard.map((entry, index) => (
                        <CListGroupItem
                          key={entry.habitId}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div className="d-flex align-items-center gap-3">
                            <CBadge color="primary">#{index + 1}</CBadge>
                            <div>
                              <div className="fw-semibold">{entry.habitName}</div>
                              <div className="small text-body-secondary">
                                Best streak {entry.bestStreak} days · Current streak {" "}
                                {entry.currentStreak} days
                              </div>
                            </div>
                          </div>
                          <CBadge color="success">
                            {entry.successRate}% success
                          </CBadge>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;