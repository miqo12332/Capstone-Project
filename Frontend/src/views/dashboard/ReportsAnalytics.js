import React, { useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CListGroup,
  CListGroupItem,
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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

const ReportsAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    if (!stored?.id) {
      setError("Please login to view your analytics.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const payload = await getProgressAnalytics(stored.id);
        setAnalytics(payload);
      } catch (err) {
        console.error("Error fetching progress analytics", err);
        setError("Failed to load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = analytics?.summary;
  const habits = analytics?.habits ?? [];
  const leaderboard = summary?.habitLeaderboard ?? [];
  const dailyTrend = summary?.dailyTrend ?? [];

  const interestingFacts = useMemo(() => {
    if (!summary) return [];

    const facts = [];
    if (summary.totalCheckIns) {
      facts.push(
        `You logged ${summary.totalCheckIns} total check-ins across ${summary.totalHabits} habits.`
      );
    }
    if (summary.peakDay) {
      facts.push(
        `Your most productive day was ${formatDate(summary.peakDay.date)} with ${summary.peakDay.completed} completions.`
      );
    }
    if (summary.streakLeader) {
      const leader = summary.streakLeader;
      facts.push(
        `${leader.habitName} holds the longest streak at ${leader.streak.best} days (current streak: ${leader.streak.current} days).`
      );
    }
    if (summary.totalMissed) {
      facts.push(
        `You bounced back from ${summary.totalMissed} missed check-ins—keep the momentum going!`
      );
    }
    if (leaderboard.length) {
      const topHabit = leaderboard[0];
      facts.push(
        `${topHabit.habitName} is your most consistent habit with a ${topHabit.successRate}% success rate.`
      );
    }

    return facts;
  }, [summary, leaderboard]);

  const renderSummaryCard = (title, value, subtitle) => (
    <CCard className="h-100">
      <CCardHeader className="fw-semibold">{title}</CCardHeader>
      <CCardBody className="text-center">
        <div className="display-6">{value}</div>
        {subtitle && (
          <div className="text-body-secondary small mt-2">{subtitle}</div>
        )}
      </CCardBody>
    </CCard>
  );

  const statusBadgeColor = (rate) => {
    if (rate >= 80) return "success";
    if (rate >= 50) return "warning";
    return "danger";
  };

  return (
    <div className="mt-4">
      <h2 className="mb-4">Progress Analytics</h2>

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
                "Completion Rate",
                formatPercent(summary?.completionRate ?? 0),
                summary?.totalCheckIns
                  ? `${summary.totalDone} done · ${summary.totalMissed} missed`
                  : "No check-ins logged yet"
              )}
            </CCol>
            <CCol xs={12} md={6} xl={3}>
              {renderSummaryCard(
                "Peak Productivity",
                summary?.peakDay
                  ? `${summary.peakDay.completed} completions`
                  : "—",
                summary?.peakDay
                  ? `on ${formatDate(summary.peakDay.date)}`
                  : "Log progress to discover your power days"
              )}
            </CCol>
            <CCol xs={12} md={6} xl={3}>
              {renderSummaryCard(
                "Streak Leader",
                summary?.streakLeader
                  ? `${summary.streakLeader.habitName}`
                  : "—",
                summary?.streakLeader
                  ? `${summary.streakLeader.streak.best}-day best streak`
                  : "Build a streak to see it here"
              )}
            </CCol>
            <CCol xs={12} md={6} xl={3}>
              {renderSummaryCard(
                "Active Habits",
                summary?.totalHabits ?? 0,
                summary?.totalHabits
                  ? `${summary.totalHabits} habits tracked`
                  : "Start by creating a habit"
              )}
            </CCol>
          </CRow>

          <CRow className="g-4 mb-4">
            <CCol xs={12} lg={7}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">
                  Daily Momentum
                </CCardHeader>
                <CCardBody style={{ height: 320 }}>
                  {dailyTrend.length ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={200}
                      minHeight={200}
                    >
                      <AreaChart data={dailyTrend}>
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
                      No progress logs yet. Check in with a habit to unlock
                      your analytics timeline.
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol xs={12} lg={5}>
              <CCard className="h-100">
                <CCardHeader className="fw-semibold">
                  Consistency Leaderboard
                </CCardHeader>
                <CCardBody style={{ height: 320 }}>
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
                      Keep tracking habits to build your leaderboard.
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {interestingFacts.length > 0 && (
            <CCard className="mb-4">
              <CCardHeader className="fw-semibold">
                Highlights & Fast Facts
              </CCardHeader>
              <CCardBody>
                <CListGroup flush>
                  {interestingFacts.map((fact, idx) => (
                    <CListGroupItem key={idx}>{fact}</CListGroupItem>
                  ))}
                </CListGroup>
              </CCardBody>
            </CCard>
          )}

          <CRow className="g-4">
            {habits.map((habit) => (
              <CCol key={habit.habitId} xs={12} md={6} xl={4}>
                <CCard className="h-100">
                  <CCardHeader className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">{habit.habitName}</span>
                    <CBadge color={statusBadgeColor(habit.successRate)}>
                      {formatPercent(habit.successRate)}
                    </CBadge>
                  </CCardHeader>
                  <CCardBody>
                    <div className="text-body-secondary small mb-3">
                      {habit.totals.done} completed · {habit.totals.missed} missed
                    </div>

                    {habit.productivity.length ? (
                      <div style={{ height: 160 }} className="mb-3">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          minWidth={200}
                          minHeight={200}
                        >
                          <LineChart data={habit.productivity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} />
                            <YAxis allowDecimals={false} />
                            <Tooltip labelFormatter={formatDate} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="completed"
                              name="Completed"
                              stroke="#2eb85c"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="missed"
                              name="Missed"
                              stroke="#e55353"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-body-secondary small fst-italic mb-3">
                        No activity logged for this habit yet.
                      </div>
                    )}

                    <CListGroup flush className="small">
                      <CListGroupItem className="px-0">
                        Current streak: {habit.streak.current} days
                      </CListGroupItem>
                      <CListGroupItem className="px-0">
                        Best streak: {habit.streak.best} days
                      </CListGroupItem>
                      <CListGroupItem className="px-0">
                        Best day:
                        {" "}
                        {habit.bestDay
                          ? `${formatDate(habit.bestDay.date)} · ${
                              habit.bestDay.net >= 0 ? "+" : ""
                            }${habit.bestDay.net}`
                          : "—"}
                      </CListGroupItem>
                      <CListGroupItem className="px-0">
                        Last 7-day success: {formatPercent(habit.recent.completionRate)}
                        {" "}
                        ({habit.recent.done} done / {habit.recent.missed} missed)
                      </CListGroupItem>
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        </>
      )}
    </div>
  );
};

export default ReportsAnalytics;
