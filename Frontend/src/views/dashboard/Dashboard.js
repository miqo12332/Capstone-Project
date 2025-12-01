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
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  Line,
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
import { promptMissedReflection } from "../../utils/reflection";

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
  const navigate = useNavigate();

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

  const weeklyTrend = useMemo(() => {
    let streak = 0;
    return trend.slice(-7).map((day) => {
      const completed = Number(day.completed) || 0;
      const missed = Number(day.missed) || 0;
      const total = completed + missed;
      streak = missed > 0 ? 0 : total > 0 ? streak + 1 : streak;
      return {
        ...day,
        completionRate: total ? Math.round((completed / total) * 100) : 0,
        runningStreak: streak,
      };
    });
  }, [trend]);

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
          type: "timeblock",
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

  const handleQuickLog = async (habitId, status, habitTitle) => {
    if (!user?.id) return;
    try {
      const payload = { userId: user.id, status };
      if (status === "missed") {
        const reason = promptMissedReflection(habitTitle);
        if (!reason) return;
        payload.reason = reason;
      }
      await logHabitProgress(habitId, payload);
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

  const dailyTips = [
    "Stack a new habit onto an existing routine to make it effortless.",
    "Micro-wins beat big streaks—aim for a two-minute start today.",
    "Protect your energy: schedule focus habits next to light tasks.",
    "Use a calendar reminder to close the loop on one habit today.",
    "Visual cues work—place what you need for your next habit in sight.",
    "Review your toughest habit and plan a backup time slot now.",
    "Reward consistency, not perfection—celebrate showing up today.",
  ];

  const todayTip = useMemo(() => {
    const index = new Date().getDay();
    return dailyTips[index % dailyTips.length];
  }, []);

  const allCaughtUp = useMemo(() => {
    const allCompleted =
      habits.length > 0 &&
      habits.every((habit) => {
        const counts = todayCounts[habit.id] ?? { done: 0, missed: 0 };
        return counts.missed === 0 && counts.done > 0;
      });
    return allCompleted && overallToday.missed === 0 && upcomingPlans.length === 0;
  }, [habits, overallToday.missed, todayCounts, upcomingPlans]);

  const quickActions = [
    { label: "Add Habit", icon: "➕", path: "/addhabit" },
    { label: "Add Schedule", icon: "📅", path: "/schedules" },
    { label: "Log Progress", icon: "📝", path: "/progress-tracker" },
  ];

  const streakSnapshot = analytics?.summary?.streakLeader?.streak;

  const nextUp = upcomingPlans[0];

  return (
    <div className="mt-4">
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(46, 184, 92, 0.35); }
          70% { box-shadow: 0 0 0 18px rgba(46, 184, 92, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 184, 92, 0); }
        }
      `}</style>
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
            <CCol xs={12} lg={5}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">Quick actions</CCardHeader>
                <CCardBody>
                  <div className="d-flex flex-wrap gap-2">
                    {quickActions.map((action) => (
                      <CButton
                        key={action.path}
                        color="primary"
                        variant="outline"
                        onClick={() => navigate(action.path)}
                      >
                        <span className="me-2">{action.icon}</span>
                        {action.label}
                      </CButton>
                    ))}
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} lg={4}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">Next up today</CCardHeader>
                <CCardBody>
                  {nextUp ? (
                    <div className="d-flex flex-column gap-1">
                      <div className="fw-semibold">{nextUp.title}</div>
                      <div className="text-body-secondary small">
                        {formatDateTime(nextUp.startDate)}
                        {nextUp.endDate ? ` – ${nextUp.endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
                        {nextUp.type === "calendar" && nextUp.provider
                          ? ` · ${nextUp.provider}`
                          : nextUp.type === "timeblock" && nextUp.repeat
                            ? ` · ${nextUp.repeat}`
                            : ""}
                      </div>
                      {nextUp.notes && (
                        <div className="small text-body-secondary">{nextUp.notes}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-body-secondary">
                      No events or habits scheduled. Use Quick actions to add one.
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} lg={3}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">Momentum snapshot</CCardHeader>
                <CCardBody>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div>
                      <div className="text-body-secondary small">Completion today</div>
                      <div className="display-6">{overallToday.completionRate}%</div>
                    </div>
                    <CBadge color={overallToday.completionRate >= 80 ? "success" : "warning"}>
                      {overallToday.done} done
                    </CBadge>
                  </div>
                  <CProgress height={10} className="mb-3">
                    <CProgressBar
                      color="success"
                      value={overallToday.completionRate}
                      aria-label="Today's completion"
                    />
                  </CProgress>
                  <div className="small text-body-secondary">
                    {streakSnapshot?.current
                      ? `Current streak: ${streakSnapshot.current} days · Best: ${streakSnapshot.best} days`
                      : "Build a streak by logging two days in a row."}
                  </div>
                </CCardBody>
              </CCard>
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
                                onClick={() =>
                                  handleQuickLog(
                                    habit.id,
                                    "missed",
                                    habit.title || habit.name
                                  )
                                }
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
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

            <CCol xs={12} lg={5}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">
                  Weekly streak & completion
                </CCardHeader>
                <CCardBody style={{ height: 280 }}>
                  {weeklyTrend.length ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                      <ComposedChart data={weeklyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="completionRate"
                          name="Completion %"
                          fill="#39f"
                          radius={[6, 6, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="runningStreak"
                          name="Running streak"
                          stroke="#2eb85c"
                          strokeWidth={3}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-body-secondary text-center my-5">
                      Complete check-ins this week to unlock your streak graph.
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow className="g-4 mb-4">
            <CCol xs={12} lg={7}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">Daily AI Tip</CCardHeader>
                <CCardBody>
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #321fdb, #39f)",
                        display: "grid",
                        placeItems: "center",
                        color: "white",
                        fontSize: 24,
                        boxShadow: "0 10px 30px rgba(50, 31, 219, 0.25)",
                      }}
                    >
                      💡
                    </div>
                    <div>
                      <div className="fw-semibold mb-1">One-sentence boost</div>
                      <div className="text-body-secondary">{todayTip}</div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
            {allCaughtUp && (
              <CCol xs={12} lg={5}>
                <CCard className="h-100 text-center">
                  <CCardHeader className="fw-semibold">All caught up</CCardHeader>
                  <CCardBody className="d-flex flex-column align-items-center gap-3">
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #2eb85c, #7dd56f)",
                        display: "grid",
                        placeItems: "center",
                        color: "white",
                        fontSize: 36,
                        animation: "pulseGlow 1.6s ease-in-out infinite",
                      }}
                    >
                      ✅
                    </div>
                    <div className="fw-semibold">Great job!</div>
                    <div className="text-body-secondary">
                      You've logged everything for today and have no upcoming events.
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            )}
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
                <CCardHeader className="fw-semibold">Busy times & plans</CCardHeader>
                <CCardBody>
                  {upcomingPlans.length === 0 ? (
                    <div className="text-body-secondary">
                      No saved time blocks yet. Add your busy times in My Schedule or
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
                                {plan.type === "timeblock" && plan.repeat
                                  ? ` · ${plan.repeat.toLowerCase()}`
                                  : ""}
                                {plan.type === "calendar" && plan.provider
                                  ? ` · ${plan.provider}`
                                  : ""}
                                {plan.allDay ? " · All day" : ""}
                              </div>
                            </div>
                            <CBadge color={plan.type === "calendar" ? "info" : "success"}>
                              {plan.type === "calendar" ? "Calendar" : "Time block"}
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