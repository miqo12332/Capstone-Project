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
  CFormSelect,
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

const TIMEFRAMES = {
  weekly: { label: "Weekly", days: 7, description: "Last 7 days" },
  monthly: { label: "Monthly", days: 30, description: "Last 30 days" },
  yearly: { label: "Yearly", days: 365, description: "Last 12 months" },
};

const buildTimeframeSeries = (productivity = [], timeframeKey = "weekly") => {
  const config = TIMEFRAMES[timeframeKey] || TIMEFRAMES.weekly;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const map = new Map(
    productivity.map((entry) => [entry.date, { ...entry }])
  );

  const series = [];
  for (let i = config.days - 1; i >= 0; i -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - i);
    const iso = current.toISOString().slice(0, 10);
    const existing = map.get(iso) || {};

    const completed = existing.completed ?? 0;
    const missed = existing.missed ?? 0;
    const net = existing.net ?? completed - missed;

    series.push({ date: iso, completed, missed, net });
  }

  return series;
};

const ProgressTracker = () => {
  const [habits, setHabits] = useState([]);
  const [err, setErr] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsErr, setAnalyticsErr] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [todayCounts, setTodayCounts] = useState({});
  const [selectedHabitId, setSelectedHabitId] = useState(null);
  const [timeframe, setTimeframe] = useState("weekly");

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

  useEffect(() => {
    if (!selectedHabitId && habits.length) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

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

  const selectedHabitStats = useMemo(
    () => (selectedHabitId ? habitStatsMap[selectedHabitId] : null),
    [habitStatsMap, selectedHabitId]
  );

  const selectedHabitName = useMemo(() => {
    const fromHabitList = habits.find((h) => h.id === selectedHabitId);
    return (
      selectedHabitStats?.habitName ||
      fromHabitList?.title ||
      fromHabitList?.name ||
      "Choose a habit"
    );
  }, [habits, selectedHabitId, selectedHabitStats]);

  const timeframeSeries = useMemo(() => {
    if (!selectedHabitId) return [];
    return buildTimeframeSeries(selectedHabitStats?.productivity, timeframe);
  }, [selectedHabitId, selectedHabitStats, timeframe]);

  const timeframeTotals = useMemo(() => {
    const done = timeframeSeries.reduce((sum, day) => sum + day.completed, 0);
    const missed = timeframeSeries.reduce((sum, day) => sum + day.missed, 0);
    const total = done + missed;
    const completionRate = total ? Math.round((done / total) * 100) : 0;
    const activeDays = timeframeSeries.filter((day) => day.completed || day.missed)
      .length;
    return { done, missed, total, completionRate, activeDays };
  }, [timeframeSeries]);

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
                  <CRow className="g-3 align-items-end mb-3">
                    <CCol xs={12} md={7} lg={8} xl={9}>
                      <div className="text-body-secondary small mb-1">
                        Focused habit
                      </div>
                      <CFormSelect
                        value={selectedHabitId || ""}
                        onChange={(e) =>
                          setSelectedHabitId(Number(e.target.value) || null)
                        }
                        aria-label="Choose a habit to view statistics"
                      >
                        <option value="">Select a habit</option>
                        {habits.map((habit) => (
                          <option key={habit.id} value={habit.id}>
                            {habit.title || habit.name}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol
                      xs={12}
                      md={5}
                      lg={4}
                      xl={3}
                      className="d-flex justify-content-md-end"
                    >
                      <div className="d-flex flex-wrap gap-2 w-100 justify-content-end">
                        <div className="text-body-secondary small align-self-center">
                          Range
                        </div>
                        <CButtonGroup role="group" aria-label="Timeframe selector">
                          {Object.entries(TIMEFRAMES).map(([key, meta]) => (
                            <CButton
                              key={key}
                              color="primary"
                              variant={timeframe === key ? undefined : "outline"}
                              onClick={() => setTimeframe(key)}
                              active={timeframe === key}
                              size="sm"
                            >
                              {meta.label}
                            </CButton>
                          ))}
                        </CButtonGroup>
                      </div>
                    </CCol>
                  </CRow>

                  <CRow className="g-3 mb-4">
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            {TIMEFRAMES[timeframe]?.label} completion
                          </div>
                          <div className="display-6">
                            {formatPercent(timeframeTotals.completionRate ?? 0)}
                          </div>
                          <div className="text-body-secondary small">
                            {timeframeTotals.total
                              ? `${timeframeTotals.done} done · ${timeframeTotals.missed} missed`
                              : "Track this habit in the selected range"}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            {selectedHabitName} streak
                          </div>
                          <div className="display-6">
                            {selectedHabitStats?.streak?.current
                              ? `${selectedHabitStats.streak.current} days`
                              : "0 days"}
                          </div>
                          <div className="text-body-secondary small">
                            Best: {selectedHabitStats?.streak?.best ?? 0} days
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            Most productive day ({TIMEFRAMES[timeframe]?.label})
                          </div>
                          <div className="display-6">
                            {(() => {
                              const productiveDay = timeframeSeries.reduce(
                                (best, day) =>
                                  day.completed > (best?.completed ?? 0) ? day : best,
                                null
                              );
                              return productiveDay?.completed
                                ? formatDate(productiveDay.date)
                                : "—";
                            })()}
                          </div>
                          <div className="text-body-secondary small">
                            {(() => {
                              const productiveDay = timeframeSeries.reduce(
                                (best, day) =>
                                  day.completed > (best?.completed ?? 0) ? day : best,
                                null
                              );
                              return productiveDay?.completed
                                ? `${productiveDay.completed} completions`
                                : "Log more days to uncover this";
                            })()}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CCard className="h-100 bg-body-tertiary">
                        <CCardBody className="text-center">
                          <div className="text-body-secondary small">
                            Active days in range
                          </div>
                          <div className="display-6">
                            {timeframeTotals.activeDays ?? 0}
                          </div>
                          <div className="text-body-secondary small">
                            {timeframeSeries.length}
                            {" "}
                            days monitored · {selectedHabitName}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>

                  <CRow className="g-4 mb-4">
                    <CCol xs={12} lg={8}>
                      <CCard className="h-100">
                        <CCardHeader className="fw-semibold d-flex justify-content-between align-items-center flex-wrap gap-2">
                          <span>
                            {selectedHabitName} · {TIMEFRAMES[timeframe]?.description}
                          </span>
                          <span className="text-body-secondary small">
                            {formatPercent(timeframeTotals.completionRate ?? 0)}
                            {" completion"}
                            {timeframeTotals.total
                              ? ` · ${timeframeTotals.done} done · ${timeframeTotals.missed} missed`
                              : " · Track this habit to populate stats"}
                          </span>
                        </CCardHeader>
                        <CCardBody style={{ height: 280 }}>
                          {timeframeSeries.length ? (
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                              minWidth={200}
                              minHeight={200}
                            >
                              <AreaChart data={timeframeSeries}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={formatDate} />
                                <YAxis allowDecimals={false} domain={[0, 1]} ticks={[0, 1]} />
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
                              Log progress for this habit to visualize how you perform
                              over time.
                            </div>
                          )}
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xs={12} lg={4}>
                      <CCard className="h-100">
                        <CCardHeader className="fw-semibold d-flex justify-content-between align-items-center">
                          <span>Habit consistency snapshot</span>
                          <span className="text-body-secondary small">
                            {TIMEFRAMES[timeframe]?.description}
                          </span>
                        </CCardHeader>
                        <CCardBody style={{ height: 280 }}>
                          {selectedHabitId && timeframeSeries.length ? (
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                              minWidth={200}
                              minHeight={200}
                            >
                              <BarChart
                                data={[
                                  {
                                    habitName: selectedHabitName,
                                    successRate: timeframeTotals.completionRate,
                                  },
                                ]}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="habitName" />
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
                              Select a habit and log days in this range to see its
                              consistency.
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
                    {!selectedHabitId && habits.length > 0 && (
                      <CListGroupItem>
                        Choose a habit above to view detailed statistics.
                      </CListGroupItem>
                    )}
                    {habits
                      .filter((habit) => !selectedHabitId || habit.id === selectedHabitId)
                      .map((habit) => {
                        const stats = habitStatsMap[habit.id] || {};
                        const counts = todayCounts[habit.id] || { done: 0, missed: 0 };
                        const todayTotal = counts.done + counts.missed;
                        const todayCompletionRate = todayTotal
                          ? Math.round((counts.done / todayTotal) * 100)
                          : 0;
                        const rangeDone =
                          habit.id === selectedHabitId
                            ? timeframeTotals.done
                            : stats.totals?.done ?? 0;
                        const rangeMissed =
                          habit.id === selectedHabitId
                            ? timeframeTotals.missed
                            : stats.totals?.missed ?? 0;
                        const rangeTotal = rangeDone + rangeMissed;
                        const donePercent = rangeTotal
                          ? Math.round((rangeDone / rangeTotal) * 100)
                          : 0;
                        const missedPercent = rangeTotal
                          ? Math.round((rangeMissed / rangeTotal) * 100)
                          : 0;
                        const rangeCompletionRate = rangeTotal
                          ? Math.round((rangeDone / rangeTotal) * 100)
                          : 0;

                        return (
                          <CListGroupItem key={habit.id} className="py-3">
                            <div className="d-flex justify-content-between align-items-start gap-3">
                              <div>
                                <div className="fw-semibold">
                                  {habit.title || habit.name}
                                </div>
                                <div className="text-body-secondary small">
                                  {TIMEFRAMES[timeframe]?.label ?? "Range"}: {rangeDone} done /
                                  {" "}
                                  {rangeMissed} missed
                                </div>
                                <div className="text-body-secondary small">
                                  Current streak: {stats.streak?.current ?? 0} days ·
                                  Range success:
                                  {" "}
                                  {formatPercent(rangeCompletionRate)}
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
                                  color={statusBadgeColor(rangeCompletionRate)}
                                  className="mb-2"
                                >
                                  {formatPercent(rangeCompletionRate)} success
                                </CBadge>
                                <div className="text-body-secondary small">
                                  {TIMEFRAMES[timeframe]?.description || "Selected range"}
                                </div>
                              </div>
                            </div>

                            <CProgress className="mt-3" height={12}>
                              <CProgressBar
                                color="success"
                                value={donePercent}
                                title={`Done: ${rangeDone}`}
                              />
                              <CProgressBar
                                color="danger"
                                value={missedPercent}
                                title={`Missed: ${rangeMissed}`}
                              />
                            </CProgress>
                            <div className="d-flex justify-content-between text-body-secondary small mt-1">
                              <span>{rangeDone} completed</span>
                              <span>{rangeMissed} missed</span>
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
