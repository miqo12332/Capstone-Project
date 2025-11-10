import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CListGroup,
  CListGroupItem,
  CProgress,
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
  const [progress, setProgress] = useState({});
  const [err, setErr] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsErr, setAnalyticsErr] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setErr("Please login to track progress");
      return;
    }

    (async () => {
      try {
        const data = await getHabits(userId);
        setHabits(data);
        setErr("");
      } catch (error) {
        console.error("Failed to load habits", error);
        setErr("Failed to load habits");
      }
    })();
  }, [userId]);

  const loadAnalytics = useCallback(async () => {
    if (!userId) {
      setAnalyticsLoading(false);
      return;
    }
    try {
      setAnalyticsLoading(true);
      const payload = await getProgressAnalytics(userId);
      setAnalytics(payload);
      setAnalyticsErr("");
    } catch (error) {
      console.error("Failed to load analytics", error);
      setAnalyticsErr("Unable to load analytics insights right now.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const habitStatsMap = useMemo(() => {
    if (!analytics?.habits) return {};
    return analytics.habits.reduce((acc, item) => {
      acc[item.habitId] = item;
      return acc;
    }, {});
  }, [analytics]);

  const summary = analytics?.summary;
  const dailyTrend = summary?.dailyTrend ?? [];
  const recentDaily = useMemo(
    () => dailyTrend.slice(-7),
    [dailyTrend]
  );
  const leaderboard = summary?.habitLeaderboard ?? [];

  const markStatus = async (habitId, status) => {
    if (!userId) return;
    try {
      setSaving(true);
      const res = await fetch(
        `http://localhost:5001/api/progress/${habitId}/log`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            status,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update progress");
      }
      setProgress((prev) => ({ ...prev, [habitId]: data.row?.status || status }));
      await loadAnalytics();
    } catch (actionErr) {
      console.error("Failed to update progress", actionErr);
      setErr("Failed to update progress");
    } finally {
      setSaving(false);
    }
  };

  const statusBadgeColor = (rate) => {
    if (rate >= 80) return "success";
    if (rate >= 50) return "warning";
    return "danger";
  };

  const formatStatusLabel = (status) => {
    if (!status) return "Pending";
    return status === "done"
      ? "Done"
      : status === "missed"
      ? "Missed"
      : status;
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
                          Recent momentum (last 7 days)
                        </CCardHeader>
                        <CCardBody style={{ height: 280 }}>
                          {recentDaily.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={recentDaily}>
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
                              Keep logging progress to see your weekly momentum.
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
                            <ResponsiveContainer width="100%" height="100%">
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
                      const recent = stats.recent || {
                        completionRate: 0,
                        done: 0,
                        missed: 0,
                      };

                      return (
                        <CListGroupItem key={habit.id} className="py-3">
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-semibold">
                                {habit.title || habit.name}
                              </div>
                              <div className="text-body-secondary small">
                                Current streak: {stats.streak?.current ?? 0} days ·
                                Last 7-day success:
                                {" "}
                                {formatPercent(recent.completionRate ?? 0)}
                              </div>
                              <div className="text-body-secondary small">
                                Lifetime: {stats.totals?.done ?? 0} done /
                                {" "}
                                {stats.totals?.missed ?? 0} missed
                              </div>
                            </div>
                            <CBadge color={statusBadgeColor(stats.successRate ?? 0)}>
                              {formatPercent(stats.successRate ?? 0)}
                            </CBadge>
                          </div>

                          <CProgress
                            thin
                            className="mt-3"
                            color={statusBadgeColor(stats.successRate ?? 0)}
                            value={stats.successRate ?? 0}
                          />

                          <div className="d-flex justify-content-between align-items-center mt-3">
                            <div className="text-body-secondary small">
                              Last action: {formatStatusLabel(progress[habit.id])}
                            </div>
                            <div className="d-flex gap-2">
                              <CButton
                                color="danger"
                                size="sm"
                                disabled={saving}
                                onClick={() => markStatus(habit.id, "missed")}
                              >
                                Mark missed
                              </CButton>
                              <CButton
                                color="success"
                                size="sm"
                                disabled={saving}
                                onClick={() => markStatus(habit.id, "done")}
                              >
                                Mark done
                              </CButton>
                            </div>
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
