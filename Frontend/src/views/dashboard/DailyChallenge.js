import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
  CListGroup,
  CListGroupItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilBolt,
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilLoopCircular,
  cilLightbulb,
  cilWarning,
  cilSpeedometer,
} from "@coreui/icons";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDailyChallengeSummary } from "../../services/dailyChallenge";
import { logHabitProgress } from "../../services/progress";
import { promptMissedReflection } from "../../utils/reflection";

const formatPercent = (value) => `${Math.min(100, Math.max(0, value))}%`;

const DailyChallenge = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingState, setLoggingState] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    setRefreshing(true);
    try {
      const data = await getDailyChallengeSummary(user.id);
      setSummary(data);
    } catch (err) {
      console.error("❌ Failed to load daily challenge", err);
      setError("We couldn't load your daily challenge. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const focusHabit = summary?.focusHabit;

  const focusTrend = useMemo(() => {
    if (!focusHabit?.timeline?.length) return [];
    return focusHabit.timeline.slice(-10).map((day) => ({
      ...day,
      label: day.date.slice(5),
    }));
  }, [focusHabit]);

  const leaderboard = summary?.leaderboard ?? [];

  const handleLog = async (habitId, status = "done") => {
    const targetHabitId = habitId || focusHabit?.habitId;
    if (!user?.id || !targetHabitId) return;

    try {
      setLoggingState(`${targetHabitId}-${status}`);
      const payload = { userId: user.id, status };
      if (status === "missed") {
        const reason = promptMissedReflection(focusHabit?.title);
        if (!reason) {
          setLoggingState(null);
          return;
        }
        payload.reason = reason;
      }
      await logHabitProgress(targetHabitId, payload);
      await loadSummary();
    } catch (err) {
      console.error("❌ Failed to log progress", err);
      setError("We couldn't record that check-in. Please try again.");
    } finally {
      setLoggingState(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-5 text-center">
        <CSpinner color="primary" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="pt-4">
        <CAlert color="danger">{error || "No challenge data available."}</CAlert>
      </div>
    );
  }

  return (
    <CRow className="g-4 py-3">
      <CCol xs={12}>{error && <CAlert color="danger">{error}</CAlert>}</CCol>

      <CCol lg={8}>
        <CCard className="border-0 shadow-sm h-100">
          <CCardHeader className="bg-gradient-primary text-white d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <CIcon icon={cilBolt} size="xl" />
              <div>
                <div className="text-uppercase fw-semibold small opacity-75">
                  Daily Challenge
                </div>
                <h4 className="mb-0">
                  {focusHabit ? `Focus on ${focusHabit.name}` : "Pick your momentum habit"}
                </h4>
              </div>
            </div>
            <CButton
              color="light"
              variant="outline"
              size="sm"
              className="text-primary"
              onClick={loadSummary}
              disabled={refreshing}
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
          </CCardHeader>
          <CCardBody className="d-flex flex-column gap-4">
            {focusHabit ? (
              <div className="d-flex flex-column flex-lg-row gap-4">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div>
                      <div className="text-uppercase text-muted small fw-semibold">
                        Why this habit?
                      </div>
                      <p className="mb-0 text-body-secondary">{focusHabit.reason}</p>
                    </div>
                    <CBadge color="warning" className="text-dark">
                      {focusHabit.category || "Habit"}
                    </CBadge>
                  </div>

                  <CRow className="g-3">
                    <CCol sm={4}>
                      <div className="p-3 rounded bg-light border h-100">
                        <div className="small text-muted text-uppercase fw-semibold mb-2">
                          Today's progress
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <CIcon icon={cilCheckCircle} className="text-success" />
                          <span className="fs-4 fw-semibold">
                            {focusHabit.doneToday} / {focusHabit.targetForToday}
                          </span>
                        </div>
                        <CProgress className="mt-3" color="success" thin>
                          <CProgressBar value={(focusHabit.doneToday / focusHabit.targetForToday) * 100} />
                        </CProgress>
                        <div className="small text-muted mt-2">
                          Log {focusHabit.targetForToday - focusHabit.doneToday <= 0 ? "another win to go beyond" : `${focusHabit.targetForToday - focusHabit.doneToday} more win${focusHabit.targetForToday - focusHabit.doneToday === 1 ? "" : "s"}`} today.
                        </div>
                      </div>
                    </CCol>
                    <CCol sm={4}>
                      <div className="p-3 rounded bg-light border h-100">
                        <div className="small text-muted text-uppercase fw-semibold mb-2">
                          Streak
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <CIcon icon={cilSpeedometer} className="text-primary" />
                          <span className="fs-4 fw-semibold">
                            {focusHabit.streak.current} day{focusHabit.streak.current === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="small text-muted">
                          Personal best: {focusHabit.streak.best} day{focusHabit.streak.best === 1 ? "" : "s"}
                        </div>
                        <div className="small text-muted mt-2">
                          Success rate: {formatPercent(focusHabit.successRate)}
                        </div>
                      </div>
                    </CCol>
                    <CCol sm={4}>
                      <div className="p-3 rounded bg-light border h-100">
                        <div className="small text-muted text-uppercase fw-semibold mb-2">
                          Next window
                        </div>
                        {focusHabit.nextSchedule ? (
                          <div className="d-flex flex-column gap-1">
                            <div className="d-flex align-items-center gap-2">
                              <CIcon icon={cilCalendar} className="text-info" />
                              <span className="fw-semibold">{focusHabit.nextSchedule.day}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <CIcon icon={cilClock} className="text-info" />
                              <span>
                                {focusHabit.nextSchedule.starttime?.slice(0, 5)}
                                {focusHabit.nextSchedule.endtime
                                  ? ` - ${focusHabit.nextSchedule.endtime.slice(0, 5)}`
                                  : ""}
                              </span>
                            </div>
                            <div className="small text-muted">{focusHabit.nextSchedule.repeat}</div>
                          </div>
                        ) : (
                          <div className="text-body-secondary">
                            No upcoming slot yet — pair it with a free window below.
                          </div>
                        )}
                      </div>
                    </CCol>
                  </CRow>
                </div>
                <div className="rounded border bg-body p-3 flex-grow-1" style={{ minWidth: "260px" }}>
                  <div className="text-uppercase text-muted small fw-semibold mb-3">
                    Progress this week
                  </div>
                  {focusTrend.length ? (
                    <ResponsiveContainer width="100%" height={220} minWidth={200} minHeight={200}>
                      <AreaChart data={focusTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#321fdb" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#321fdb" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value, name) => [`${value}`, name === "completed" ? "Wins" : "Misses"]} />
                        <Area type="monotone" dataKey="completed" stroke="#321fdb" fill="url(#focusGradient)" name="completed" />
                        <Area type="monotone" dataKey="missed" stroke="#e55353" fill="rgba(229,83,83,0.15)" name="missed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-body-secondary">
                      Start logging wins to see your trend build up.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-body-secondary">
                Add a habit first to unlock personalised challenges.
              </div>
            )}

            <div className="d-flex flex-wrap gap-3">
              {summary.stats && (
                <div className="px-4 py-3 rounded bg-body-secondary bg-opacity-50 border">
                  <div className="small text-uppercase text-muted fw-semibold">Active habits</div>
                  <div className="fs-4 fw-semibold">{summary.stats.trackedHabits} / {summary.stats.totalHabits}</div>
                </div>
              )}
              {summary.today && (
                <div className="px-4 py-3 rounded bg-body-secondary bg-opacity-50 border">
                  <div className="small text-uppercase text-muted fw-semibold">Today's balance</div>
                  <div className="fs-5 fw-semibold text-success">
                    {summary.today.done} wins
                    <span className="text-body-secondary ms-2">
                      {summary.today.missed} misses
                    </span>
                  </div>
                </div>
              )}
              {summary.stats && (
                <div className="px-4 py-3 rounded bg-body-secondary bg-opacity-50 border">
                  <div className="small text-uppercase text-muted fw-semibold">Weekly completion</div>
                  <div className="fs-5 fw-semibold">{formatPercent(summary.stats.weeklyRate)}</div>
                </div>
              )}
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={4}>
        <CCard className="border-0 shadow-sm mb-4">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Micro challenges
          </CCardHeader>
          <CCardBody className="p-0">
            {summary.microChallenges?.length ? (
              <CListGroup flush className="mb-0">
                {summary.microChallenges.map((challenge) => {
                  const percent = challenge.progress?.percent ?? 0;
                  const current = challenge.progress?.current ?? 0;
                  const target = challenge.progress?.target ?? 0;
                  const isLogging = loggingState === `${challenge.habitId || focusHabit?.habitId}-done`;

                  return (
                    <CListGroupItem key={challenge.id} className="py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{challenge.title}</div>
                          <div className="text-body-secondary small">{challenge.description}</div>
                        </div>
                        <CBadge color="info" className="text-dark">{challenge.targetLabel}</CBadge>
                      </div>
                      <CProgress className="mt-3" thin color={percent >= 100 ? "success" : "primary"}>
                        <CProgressBar value={percent}>
                          <span className="small fw-semibold">{current} / {target}</span>
                        </CProgressBar>
                      </CProgress>
                      <div className="d-flex gap-2 mt-3">
                        <CButton
                          color="success"
                          size="sm"
                          className="d-flex align-items-center gap-2"
                          disabled={isLogging}
                          onClick={() => handleLog(challenge.habitId, "done")}
                        >
                          {isLogging ? <CSpinner size="sm" /> : <CIcon icon={cilCheckCircle} />}
                          Log win
                        </CButton>
                        <CButton
                          color="danger"
                          size="sm"
                          variant="outline"
                          className="d-flex align-items-center gap-2"
                          disabled={loggingState === `${challenge.habitId || focusHabit?.habitId}-missed`}
                          onClick={() => handleLog(challenge.habitId, "missed")}
                        >
                          {loggingState === `${challenge.habitId || focusHabit?.habitId}-missed` ? (
                            <CSpinner size="sm" />
                          ) : (
                            <CIcon icon={cilWarning} />
                          )}
                          Missed
                        </CButton>
                      </div>
                    </CListGroupItem>
                  );
                })}
              </CListGroup>
            ) : (
              <div className="p-4 text-body-secondary">
                Complete a habit to unlock mini challenges.
              </div>
            )}
          </CCardBody>
        </CCard>

        <CCard className="border-0 shadow-sm mb-4">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Opportunity windows
          </CCardHeader>
          <CCardBody>
            {summary.opportunityWindows?.length ? (
              <div className="d-flex flex-column gap-3">
                {summary.opportunityWindows.map((slot, index) => (
                  <div key={`${slot.date}-${slot.start}`} className="p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="fw-semibold">
                        <CIcon icon={cilClock} className="text-primary me-2" />
                        {slot.date}
                      </div>
                      <CBadge color={index === 0 ? "primary" : "light"} className="text-dark">
                        {slot.durationMinutes} min
                      </CBadge>
                    </div>
                    <div className="text-body-secondary small mt-2">
                      {slot.start} - {slot.end}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-body-secondary">Your calendar is full — consider freeing a slot.</div>
            )}
          </CCardBody>
        </CCard>

        <CCard className="border-0 shadow-sm">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Momentum leaderboard
          </CCardHeader>
          <CCardBody className="d-flex flex-column gap-3">
            {leaderboard.length ? (
              leaderboard.map((item) => (
                <div key={item.habitId} className="d-flex justify-content-between align-items-center p-2 border rounded">
                  <div>
                    <div className="fw-semibold">{item.name}</div>
                    <div className="text-body-secondary small">
                      Streak: {item.streak.current} (best {item.streak.best})
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-semibold">{formatPercent(item.successRate)}</div>
                    <div className="text-body-secondary small">
                      Weekly: {formatPercent(item.weekly.completionRate)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-body-secondary">No streaks yet — today's the day to start one.</div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard className="border-0 shadow-sm">
          <CCardHeader className="bg-body-secondary fw-semibold text-uppercase small">
            Insights & tips
          </CCardHeader>
          <CCardBody>
            {summary.insights?.length ? (
              <CRow className="g-3">
                {summary.insights.map((insight, idx) => (
                  <CCol md={4} key={idx}>
                    <div className="p-3 border rounded h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <CIcon icon={cilLightbulb} className="text-primary" />
                        <span className="fw-semibold">{insight.title}</span>
                      </div>
                      <div className="text-body-secondary small">{insight.body}</div>
                    </div>
                  </CCol>
                ))}
              </CRow>
            ) : (
              <div className="text-body-secondary">We'll surface personalised insights as you log more progress.</div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default DailyChallenge;
