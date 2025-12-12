import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CBadge,
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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHabits } from "../../services/habits";
import { formatPercent, getProgressAnalytics } from "../../services/analytics";
import { getTodayProgressLogs } from "../../services/progress";
import { useDataRefresh, REFRESH_SCOPES } from "../../utils/refreshBus";

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const ProgressTracker = () => {
  const [habits, setHabits] = useState([]);
  const [err, setErr] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsErr, setAnalyticsErr] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [todayCounts, setTodayCounts] = useState({});

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;

  const loadHabits = useCallback(async () => {
    if (!userId) {
      setErr("Please login to track progress");
      return;
    }
    try {
      const data = await getHabits(userId);
      setHabits(data);
      setErr("");
    } catch (error) {
      console.error("Failed to load habits", error);
      setErr("Failed to load habits");
    }
  }, [userId]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const loadAnalytics = useCallback(
    async (options = { showSpinner: true }) => {
      const showSpinner = options?.showSpinner ?? true;
      if (!userId) {
        setAnalyticsLoading(false);
        return;
      }
      try {
        if (showSpinner) {
          setAnalyticsLoading(true);
        }
        const payload = await getProgressAnalytics(userId);
        setAnalytics(payload);
        setAnalyticsErr("");
      } catch (error) {
        console.error("Failed to load analytics", error);
        setAnalyticsErr("Unable to load analytics insights right now.");
      } finally {
        if (showSpinner) {
          setAnalyticsLoading(false);
        }
      }
    },
    [userId]
  );

  const loadTodayCounts = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const rows = await getTodayProgressLogs(userId);
      const counts = rows.reduce((acc, row) => {
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
      setTodayCounts(counts);
      setErr("");
    } catch (error) {
      console.error("Failed to load today's progress", error);
      setErr("Unable to load today's check-ins right now.");
    }
  }, [userId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadTodayCounts();
  }, [loadTodayCounts]);

  useDataRefresh(
    [REFRESH_SCOPES.HABITS, REFRESH_SCOPES.PROGRESS, REFRESH_SCOPES.ANALYTICS],
    useCallback(() => {
      loadHabits();
      loadAnalytics({ showSpinner: false });
      loadTodayCounts();
    }, [loadAnalytics, loadHabits, loadTodayCounts]),
  );

  const habitStatsMap = useMemo(() => {
    if (!analytics?.habits) return {};
    return analytics.habits.reduce((acc, item) => {
      acc[item.habitId] = item;
      return acc;
    }, {});
  }, [analytics]);

  const summary = analytics?.summary;
  const dailyTrend = summary?.dailyTrend ?? [];
  const momentumTrend = useMemo(() => dailyTrend, [dailyTrend]);
  const leaderboard = summary?.habitLeaderboard ?? [];

  const statusBadgeColor = (rate) => {
    if (rate >= 80) return "success";
    if (rate >= 50) return "warning";
    return "danger";
  };

  return (
    <div className="mt-4">
      <CRow className="g-4">
        <CCol xs={12}>
          <CCard>
            <CCardHeader>📈 Progress Tracker</CCardHeader>
            <CCardBody>
              {err && <CAlert color="danger">{err}</CAlert>}
              {analyticsErr && <CAlert color="warning">{analyticsErr}</CAlert>}

              {analyticsLoading ? (
                <div className="d-flex justify-content-center my-4">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <>
                  <CRow className="g-3 mb-4">
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            Overall completion
                          </div>
                          <div className="display-6">
                            {formatPercent(summary?.completionRate ?? 0)}
                          </div>
                          <div className="text-body-secondary small">
                            {summary?.totalCheckIns
                              ? `${summary.totalDone} done · ${summary.totalMissed} missed`
                              : "Log a check-in to begin"}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            Longest streak
                          </div>
                          <div className="display-6">
                            {summary?.streakLeader
                              ? `${summary.streakLeader.streak.best} days`
                              : "0 days"}
                          </div>
                          <div className="text-body-secondary small">
                            {summary?.streakLeader
                              ? summary.streakLeader.habitName
                              : "Stay consistent to build streaks"}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            Most productive day
                          </div>
                          <div className="display-6">
                            {summary?.peakDay
                              ? formatDate(summary.peakDay.date)
                              : "—"}
                          </div>
                          <div className="text-body-secondary small">
                            {summary?.peakDay
                              ? `${summary.peakDay.completed} completions`
                              : "Track activity to discover yours"}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            Active habits
                          </div>
                          <div className="display-6">
                            {summary?.totalHabits ?? habits.length}
                          </div>
                          <div className="text-body-secondary small">
                            {habits.length
                              ? `${habits.length} tracked`
                              : "Add a habit to get started"}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>

                  <CRow className="g-4 mb-4">
                    <CCol xs={12} lg={7}>
                      <CCard className="h-100">
                        <CCardHeader className="fw-semibold">
                          Lifetime momentum
                        </CCardHeader>
                        <CCardBody style={{ height: 280 }}>
                          {momentumTrend.length ? (
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                              minWidth={200}
                              minHeight={200}
                            >
                              <AreaChart data={momentumTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={formatDate} />
                                <YAxis allowDecimals={false} />
                                <Tooltip labelFormatter={formatDate} />
                                <Legend />
                                <Area
                                  type="monotone"
                                  dataKey="completed"
                                  name="Completed"
                                  stroke="#2eb85c"
                                  fill="#2eb85c33"
                                />
                                <Area
                                  type="monotone"
                                  dataKey="missed"
                                  name="Missed"
                                  stroke="#e55353"
                                  fill="#e5535333"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="text-body-secondary text-center my-5">
                              Keep logging progress to see your lifetime momentum.
                            </div>
                          )}
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} lg={5}>
                      <CCard className="h-100">
                        <CCardHeader className="fw-semibold">
                          Consistency leaders
                        </CCardHeader>
                        <CCardBody style={{ height: 280 }}>
                          {leaderboard.length ? (
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                              minWidth={200}
                              minHeight={200}
                            >
                              <BarChart data={leaderboard}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="habitName" hide />
                                <YAxis domain={[0, 100]} />
                                <Tooltip
                                  formatter={(value) => `${value}% success`}
                                  labelFormatter={(label) => label}
                                />
                                <Legend />
                                <Bar
                                  dataKey="successRate"
                                  name="Success rate"
                                  fill="#39f"
                                  radius={[6, 6, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="text-body-secondary text-center my-5">
                              Complete habits to populate your leaderboard.
                            </div>
                          )}
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>

                  <CListGroup className="mb-2">
                    {habits.length === 0 && (
                      <CListGroupItem>No habits yet</CListGroupItem>
                    )}
                    {habits.map((habit) => {
                      const stats = habitStatsMap[habit.id] || {};
                      const counts = todayCounts[habit.id] || { done: 0, missed: 0 };
                      const todayTotal = counts.done + counts.missed;
                      const todayCompletionRate = todayTotal
                        ? Math.round((counts.done / todayTotal) * 100)
                        : 0;
                      const lifetimeTotal =
                        (stats.totals?.done ?? 0) + (stats.totals?.missed ?? 0);
                      const donePercent = lifetimeTotal
                        ? Math.round(((stats.totals?.done ?? 0) / lifetimeTotal) * 100)
                        : 0;
                      const missedPercent = lifetimeTotal
                        ? Math.round(((stats.totals?.missed ?? 0) / lifetimeTotal) * 100)
                        : 0;

                      return (
                        <CListGroupItem key={habit.id} className="py-3">
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-semibold">
                                {habit.title || habit.name}
                              </div>
                              <div className="text-body-secondary small">
                                Current streak: {stats.streak?.current ?? 0} days ·
                                Overall success:
                                {" "}
                                {formatPercent(stats.successRate ?? 0)}
                              </div>
                              <div className="text-body-secondary small">
                                Lifetime: {stats.totals?.done ?? 0} done /
                                {" "}
                                {stats.totals?.missed ?? 0} missed
                              </div>
                              <div className="text-body-secondary small">
                                Today: {counts.done} done · {counts.missed} missed
                                {todayTotal > 0
                                  ? ` · ${todayCompletionRate}% completion`
                                  : ""}
                              </div>
                            </div>
                            <div className="text-end">
                              <CBadge
                                color={statusBadgeColor(stats.successRate ?? 0)}
                                className="mb-2"
                              >
                                {formatPercent(stats.successRate ?? 0)} success
                              </CBadge>
                              <div className="text-body-secondary small">
                                {todayTotal > 0
                                  ? `${formatPercent(todayCompletionRate)} today`
                                  : "Log today to see completion"}
                              </div>
                            </div>
                          </div>

                          <CProgress className="mt-3" height={12}>
                            <CProgressBar
                              color="success"
                              value={donePercent}
                              title={`Done: ${stats.totals?.done ?? 0}`}
                            />
                            <CProgressBar
                              color="danger"
                              value={missedPercent}
                              title={`Missed: ${stats.totals?.missed ?? 0}`}
                            />
                          </CProgress>
                          <div className="d-flex justify-content-between text-body-secondary small mt-1">
                            <span>{stats.totals?.done ?? 0} completed</span>
                            <span>{stats.totals?.missed ?? 0} missed</span>
                          </div>
                        </CListGroupItem>
                      );
                    })}
                  </CListGroup>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default ProgressTracker;
