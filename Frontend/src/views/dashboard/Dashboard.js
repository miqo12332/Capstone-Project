import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CFormTextarea,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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
import { getTodayProgressLogs, updateHabitProgressCount } from "../../services/progress";
import { formatPercent, getProgressAnalytics } from "../../services/analytics";
import { fetchCalendarOverview } from "../../services/calendar";
import {
  fetchAssistantProfile,
  fetchAssistantSummary,
  saveAssistantProfile,
} from "../../services/assistant";
import { sendReasoningRequest } from "../../services/ai";
import { useDataRefresh, REFRESH_SCOPES } from "../../utils/refreshBus";

const Dashboard = () => {
  const [habits, setHabits] = useState([]);
  const [todayCounts, setTodayCounts] = useState({});
  const [todayStatus, setTodayStatus] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [calendarOverview, setCalendarOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [aiProfile, setAiProfile] = useState(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryAgent, setAiSummaryAgent] = useState(null);
  const [aiSummaryError, setAiSummaryError] = useState("");
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [patternInsights, setPatternInsights] = useState([]);
  const [patternRecommendation, setPatternRecommendation] = useState("");
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternError, setPatternError] = useState("");
  const [noteModal, setNoteModal] = useState({
    open: false,
    habitId: null,
    status: null,
    habitTitle: "",
    note: "",
  });
  const statusClickTimers = useRef({});
  const navigate = useNavigate();

  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "{}"),
    []
  );

  const parseTodayRows = useCallback((rows) => {
    return rows.reduce(
      (acc, row) => {
        const hid = row.habit_id;
        if (!hid) return acc;

        if (!acc.counts[hid]) {
          acc.counts[hid] = { done: 0, missed: 0 };
        }

        if (row.status === "done") {
          acc.counts[hid].done += 1;
          acc.status[hid] = { status: "done", note: row.reason || row.note || "" };
        } else if (row.status === "missed") {
          acc.counts[hid].missed += 1;
          acc.status[hid] = { status: "missed", note: row.reason || row.note || "" };
        }

        return acc;
      },
      { counts: {}, status: {} },
    );
  }, []);

  const loadTodayProgress = useCallback(async () => {
    try {
      if (!user?.id) return;
      const rows = await getTodayProgressLogs(user.id);
      const parsed = parseTodayRows(rows);
      setTodayCounts(parsed.counts);
      setTodayStatus(parsed.status);
    } catch (err) {
      console.warn("⚠️ Failed to fetch today’s progress:", err);
    }
  }, [parseTodayRows, user?.id]);

  const loadCore = useCallback(async () => {
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
      const parsed = parseTodayRows(progressRows);
      setTodayCounts(parsed.counts);
      setTodayStatus(parsed.status);
    } catch (err) {
      console.error("❌ Error loading dashboard essentials", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [parseTodayRows, user?.id]);

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getProgressAnalytics(user.id);
      setAnalytics(data);
    } catch (err) {
      console.error("⚠️ Failed to fetch analytics for dashboard", err);
      setAnalyticsError("We couldn't refresh your analytics just now.");
    }
  }, [user?.id]);

  const loadSchedules = useCallback(async () => {
    if (!user?.id) return;
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
  }, [user?.id]);

  useEffect(() => {
    loadCore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCore]);

  useEffect(() => {
    loadAnalytics();
    loadSchedules();
  }, [loadAnalytics, loadSchedules]);

  const loadAiProfileMemory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchAssistantProfile(user.id);
      setAiProfile(data);
      if (data?.about) {
        setAiNote(data.about);
      }
    } catch (err) {
      console.warn("⚠️ Unable to load AI memory", err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAiProfileMemory();
  }, [loadAiProfileMemory]);

  useDataRefresh(
    [REFRESH_SCOPES.HABITS, REFRESH_SCOPES.SCHEDULES, REFRESH_SCOPES.PROGRESS, REFRESH_SCOPES.ANALYTICS],
    useCallback(() => {
      loadCore();
      loadAnalytics();
      loadSchedules();
    }, [loadAnalytics, loadCore, loadSchedules]),
  );

  const loadAiSummary = useCallback(async () => {
    if (!user?.id) return;

    setAiSummaryLoading(true);
    setAiSummaryError("");
    setAiSummary("");

    try {
      const data = await fetchAssistantSummary(user.id);
      setAiSummary(data.summary || "");
      setAiSummaryAgent(data.agent || null);
    } catch (err) {
      console.error("⚠️ Unable to load AI summary", err);
      setAiSummaryError(
        err?.response?.data?.error || "We couldn't fetch your AI summary right now."
      );
    } finally {
      setAiSummaryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (aiSummaryOpen) {
      setAiSummary("");
      loadAiSummary();
    }
  }, [aiSummaryOpen, loadAiSummary]);

  const saveAiNote = async (event) => {
    event.preventDefault();
    if (!user?.id || !aiNote.trim()) {
      setAiError("Share one thing the AI should remember about you.");
      return;
    }

    setAiSaving(true);
    setAiError("");

    try {
      const data = await saveAssistantProfile(user.id, aiNote.trim());
      setAiProfile(data);
      setAiModalOpen(false);
    } catch (err) {
      console.error("❌ Failed to save AI memory", err);
      setAiError(
        err?.response?.data?.error || "We couldn't save this note right now."
      );
    } finally {
      setAiSaving(false);
    }
  };

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

  const getHabitStatus = useCallback(
    (habitId) => {
      const explicitStatus = todayStatus[habitId]?.status;
      if (explicitStatus) return explicitStatus;

      if (todayCounts[habitId]?.done) return "done";
      if (todayCounts[habitId]?.missed) return "missed";

      return null;
    },
    [todayCounts, todayStatus],
  );

  const applyTodayStatus = useCallback(
    async (habitId, status, note = "") => {
      if (!user?.id || !habitId) return;

      const trimmedNote = note?.trim() || "";

      await Promise.all([
        updateHabitProgressCount(habitId, {
          userId: user.id,
          status: "done",
          targetCount: status === "done" ? 1 : 0,
          note: status === "done" ? trimmedNote || null : null,
        }),
        updateHabitProgressCount(habitId, {
          userId: user.id,
          status: "missed",
          targetCount: status === "missed" ? 1 : 0,
          note: status === "missed" ? trimmedNote || null : null,
        }),
      ]);

      await loadTodayProgress();
    },
    [loadTodayProgress, user?.id],
  );

  const handleDoneClick = async (habitId) => {
    if (getHabitStatus(habitId) === "done") return;

    try {
      await applyTodayStatus(habitId, "done");
    } catch (err) {
      console.error("❌ Server error logging progress", err);
      alert("Failed to log progress. Please try again.");
    }
  };

  const handleMissedClick = async (habitId) => {
    if (getHabitStatus(habitId) === "missed") return;

    try {
      await applyTodayStatus(habitId, "missed");
    } catch (err) {
      console.error("❌ Failed to log missed progress", err);
      alert("Failed to log progress. Please try again.");
    }
  };

  const openDescriptionModal = (habit, status) => {
    if (!status) return;

    const noteDetails = todayStatus[habit.id];

    setNoteModal({
      open: true,
      habitId: habit.id,
      status,
      habitTitle: habit.title || habit.name || "Habit",
      note: noteDetails?.status === status ? noteDetails?.note || "" : "",
    });
  };

  const closeDescriptionModal = () => {
    setNoteModal({
      open: false,
      habitId: null,
      status: null,
      habitTitle: "",
      note: "",
    });
  };

  const submitDescription = async () => {
    if (!noteModal.habitId || !noteModal.status) return;

    try {
      await applyTodayStatus(noteModal.habitId, noteModal.status, noteModal.note);
      closeDescriptionModal();
    } catch (err) {
      console.error("❌ Failed to save description", err);
      alert("We couldn't save that description. Please try again.");
    }
  };

  const renderSummaryCard = (title, value, helper) => (
    <CCard className="h-100 elevated-card metric-card">
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

  useEffect(() => {
    return () => {
      Object.values(statusClickTimers.current || {}).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const scheduleStatusAction = (habit, status) => {
    const key = `${habit.id}-${status}`;
    if (statusClickTimers.current[key]) {
      clearTimeout(statusClickTimers.current[key]);
    }

    statusClickTimers.current[key] = setTimeout(() => {
      statusClickTimers.current[key] = null;
      if (status === "done") {
        handleDoneClick(habit.id);
      } else if (status === "missed") {
        handleMissedClick(habit.id);
      }
    }, 200);
  };

  const handleStatusDoubleClick = (event, habit, status) => {
    event.preventDefault();
    const key = `${habit.id}-${status}`;
    if (statusClickTimers.current[key]) {
      clearTimeout(statusClickTimers.current[key]);
      statusClickTimers.current[key] = null;
    }
    openDescriptionModal(habit, status);
  };

  const formatTrendLabel = (entry) => {
    if (!entry) return "recent day";

    const date = entry.date || entry.day || entry.label;
    if (!date) return "recent day";

    const parsed = new Date(date);
    if (parsed.toString() !== "Invalid Date") {
      return parsed.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    return String(date);
  };

  const deriveLocalPattern = useCallback(() => {
    if (!analytics || !Array.isArray(analytics?.habits) || analytics.habits.length === 0) {
      return {
        insights: [],
        recommendation: "",
        error: "We need more habit history before patterns can be detected.",
      };
    }

    const recentDays = (analytics?.summary?.dailyTrend ?? []).slice(-14);
    const insights = [];

    const missedHeavy = recentDays.filter((day) => (Number(day.missed) || 0) > (Number(day.completed) || 0));
    if (missedHeavy.length > 0) {
      const sample = missedHeavy.slice(0, 2).map((day) => formatTrendLabel(day)).join(", ");
      insights.push(`Missed more check-ins than completed on ${sample}${missedHeavy.length > 2 ? " and more" : ""}.`);
    }

    const strongStreakHabit = analytics.habits.reduce((best, habit) => {
      const bestStreak = habit?.streak?.best ?? 0;
      return bestStreak > (best?.streak?.best ?? -1) ? habit : best;
    }, null);

    if (strongStreakHabit?.habitName) {
      insights.push(
        `Strong streak: ${strongStreakHabit.habitName} has a best streak of ${strongStreakHabit.streak?.best || 0} days (current ${
          strongStreakHabit.streak?.current || 0
        }).`
      );
    }

    const bestDay = recentDays.reduce((best, day) => {
      const completed = Number(day.completed) || 0;
      const missed = Number(day.missed) || 0;
      const total = completed + missed;
      const rate = total ? Math.round((completed / total) * 100) : 0;

      if (!best || rate > best.rate) {
        return { ...day, rate };
      }
      return best;
    }, null);

    if (bestDay) {
      insights.push(`Best completion day: ${formatTrendLabel(bestDay)} with ${bestDay.rate}% completion.`);
    }

    const weakHabit = analytics.habits
      .filter((habit) => (habit?.totals?.done || 0) + (habit?.totals?.missed || 0) > 0)
      .reduce((weakest, habit) => {
        const success = habit.successRate ?? 0;
        return success < (weakest?.successRate ?? 101) ? habit : weakest;
      }, null);

    if (weakHabit?.habitName) {
      insights.push(
        `Weak spot: ${weakHabit.habitName} sits at ${formatPercent(weakHabit.successRate ?? 0)} success (${weakHabit?.totals?.done || 0} done / ${
          weakHabit?.totals?.missed || 0
        } missed).`
      );
    }

    let recommendation = "Keep logging to reveal more personalized recommendations.";

    if (weakHabit?.habitName && bestDay) {
      recommendation = `Aim ${weakHabit.habitName} on ${formatTrendLabel(bestDay)}, when you're already hitting ${bestDay.rate}% completion, and set a reminder to prevent misses.`;
    } else if (missedHeavy.length > 0) {
      recommendation = "Add a backup slot on your most-missed day and pre-commit to a quick 2-minute version to keep momentum.";
    } else if (strongStreakHabit?.habitName) {
      recommendation = `Protect your ${strongStreakHabit.habitName} streak by pairing it with a calendar block and keeping the setup ready the night before.`;
    }

    return { insights, recommendation, bestDay, weakHabit, strongStreakHabit, missedHeavy };
  }, [analytics]);

  const parseAiPatternResponse = (reply) => {
    if (!reply) return { insights: [], recommendation: "" };

    try {
      const parsed = JSON.parse(reply);
      const parsedInsights = Array.isArray(parsed?.insights) ? parsed.insights.filter(Boolean) : [];
      const parsedRecommendation = typeof parsed?.recommendation === "string" ? parsed.recommendation : "";

      if (parsedInsights.length || parsedRecommendation) {
        return { insights: parsedInsights, recommendation: parsedRecommendation };
      }
    } catch (err) {
      // fall through to text parsing
    }

    const lines = reply
      .split(/\n+/)
      .map((line) => line.trim().replace(/^[-•]\s*/, ""))
      .filter(Boolean);

    const recommendation = lines.pop() || "";
    return { insights: lines, recommendation };
  };

  const analyzeHabitPatterns = useCallback(async () => {
    setPatternModalOpen(true);
    setPatternLoading(true);
    setPatternError("");

    const localPattern = deriveLocalPattern();
    if (localPattern.error) {
      setPatternInsights([]);
      setPatternRecommendation("");
      setPatternError(localPattern.error);
      setPatternLoading(false);
      return;
    }

    try {
      const snapshot = {
        habits: analytics?.habits ?? [],
        dailyTrend: (analytics?.summary?.dailyTrend ?? []).slice(-21),
        streaks: analytics?.summary?.streakLeader ?? null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await sendReasoningRequest({
        snapshot,
        insightText:
          "Analyze the habit history to flag missed days, strong streaks, best completion windows, and weak habits. Respond as JSON with {\"insights\":[short bullets],\"recommendation\":\"one actionable tip\"}.",
        history: [
          {
            role: "user",
            content: "Detect habit patterns from analytics and propose one action to improve consistency.",
          },
        ],
      });

      const aiPattern = parseAiPatternResponse(response?.reply);

      setPatternInsights(aiPattern.insights.length ? aiPattern.insights : localPattern.insights);
      setPatternRecommendation(aiPattern.recommendation || localPattern.recommendation);
    } catch (err) {
      console.error("⚠️ Unable to fetch AI pattern detection", err);
      setPatternError(err?.message || "We couldn't get AI-generated patterns right now.");
      setPatternInsights(localPattern.insights);
      setPatternRecommendation(localPattern.recommendation);
    } finally {
      setPatternLoading(false);
    }
  }, [analytics?.habits, analytics?.summary?.dailyTrend, analytics?.summary?.streakLeader, deriveLocalPattern]);

  const streakSnapshot = analytics?.summary?.streakLeader?.streak;

  const nextUp = upcomingPlans[0];

  const welcomeName = user?.name || user?.username || "there";

  return (
    <div className="dashboard-page">
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(46, 184, 92, 0.35); }
          70% { box-shadow: 0 0 0 18px rgba(46, 184, 92, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 184, 92, 0); }
        }
      `}</style>

      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Personal hub</p>
          <h2 className="hero-title">Welcome back, {welcomeName} 👋</h2>
          <p className="hero-subtitle">
            Track habits, review your streaks, and glide through today with a calmer, cleaner workspace.
          </p>
          <div className="d-flex flex-wrap gap-2 mt-3">
            {quickActions.map((action) => (
              <CButton
                key={action.path}
                color="primary"
                className="action-chip"
                onClick={() => navigate(action.path)}
              >
                <span className="me-2">{action.icon}</span>
                {action.label}
              </CButton>
            ))}
            <CButton
              color="success"
              className="action-chip"
              onClick={() => {
                setAiSummaryAgent(null);
                setAiSummaryError("");
                setAiSummaryOpen(true);
              }}
            >
              🧠 AI summary
            </CButton>
            <CButton
              color="light"
              className="action-chip text-primary"
              variant="ghost"
              onClick={() => navigate("/planner")}
            >
              ✨ Open planner
            </CButton>
            <CButton
              color="info"
              className="action-chip text-white"
              onClick={() => {
                setAiError("");
                setAiModalOpen(true);
              }}
            >
              🤖 AI about me
            </CButton>
          </div>
        </div>
        <div className="hero-card">
          <div className="small text-body-secondary">Today's completion</div>
          <div className="display-5 fw-semibold text-primary mb-2">
            {overallToday.completionRate}%
          </div>
          <CProgress height={10} className="soft-progress mb-3">
            <CProgressBar color="primary" value={overallToday.completionRate} />
          </CProgress>
          <div className="d-flex justify-content-between text-body-secondary small">
            <span>{overallToday.done} done</span>
            <span>{overallToday.missed} missed</span>
          </div>
          {streakSnapshot?.current && (
            <div className="mt-3 rounded-3 soft-pill bg-success bg-opacity-10 text-success">
              🔥 {streakSnapshot.current}-day streak · Best {streakSnapshot.best} days
            </div>
          )}
        </div>
      </div>

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
            <CCol xs={12} lg={4}>
              <CCard className="h-100 elevated-card">
                <CCardHeader className="fw-semibold">Next up today</CCardHeader>
                <CCardBody>
                  {nextUp ? (
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex align-items-start gap-2">
                        <div className="icon-pill">⏱️</div>
                        <div>
                          <div className="fw-semibold">{nextUp.title}</div>
                          <div className="text-body-secondary small">
                            {formatDateTime(nextUp.startDate)}
                            {nextUp.endDate
                              ? ` – ${nextUp.endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                              : ""}
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
                      </div>
                      <div className="muted-tile">
                        Plan ahead: align this block with your highest energy window.
                      </div>
                    </div>
                  ) : (
                    <div className="text-body-secondary">
                      No events or habits scheduled. Use Quick actions to add one.
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} lg={5}>
              <CCard className="h-100 elevated-card">
                <CCardHeader className="fw-semibold">Momentum snapshot</CCardHeader>
                <CCardBody>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
                    <div>
                      <div className="text-body-secondary small">Completion today</div>
                      <div className="display-6">{overallToday.completionRate}%</div>
                    </div>
                    <CBadge color={overallToday.completionRate >= 80 ? "success" : "warning"}>
                      {overallToday.done} done
                    </CBadge>
                  </div>
                  <CProgress height={10} className="mb-3 soft-progress">
                    <CProgressBar
                      color="success"
                      value={overallToday.completionRate}
                      aria-label="Today's completion"
                    />
                  </CProgress>
                  <div className="small text-body-secondary mb-2">
                    {streakSnapshot?.current
                      ? `Current streak: ${streakSnapshot.current} days · Best: ${streakSnapshot.best} days`
                      : "Build a streak by logging two days in a row."}
                  </div>
                  <div className="muted-tile">
                    Tip: keep habits above 80% and batch them next to calendar breaks.
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} lg={3}>
              <CCard className="h-100 elevated-card">
                <CCardHeader className="fw-semibold">Daily AI Tip</CCardHeader>
                <CCardBody>
                  <div className="ai-tile">
                    <div className="ai-icon">💡</div>
                    <div>
                      <div className="fw-semibold mb-1">One-sentence boost</div>
                      <div className="text-body-secondary">{todayTip}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-body-secondary text-uppercase small fw-semibold">
                      AI remembers you
                    </div>
                    {aiProfile?.summary ? (
                      <>
                        <div className="fw-semibold mt-1">{aiProfile.summary}</div>
                        <div className="text-body-secondary small">
                          Updated {new Date(aiProfile.updatedAt).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <div className="text-body-secondary small">
                        Share a quick note so the AI can personalize your tips.
                      </div>
                    )}
                    <CButton
                      size="sm"
                      color="link"
                      className="px-0 mt-1"
                      onClick={() => {
                        setAiError("");
                        setAiModalOpen(true);
                      }}
                    >
                      Update what it knows about you
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow className="g-4 mb-4">
            <CCol xs={12} lg={7}>
              <CCard className="h-100 elevated-card">
                <CCardHeader className="fw-semibold">
                  Today's Habit Controls
                </CCardHeader>
                <CCardBody>
                  {habits.length === 0 && (
                    <CAlert color="info" className="mb-0">
                      Add a habit from the planner to start tracking your day.
                    </CAlert>
                  )}

                  <div className="text-body-secondary small mb-3">
                    Double-click a status to add a description, just like in My Habits.
                  </div>

                  {habits.map((habit) => {
                    const counts = todayCounts[habit.id] ?? { done: 0, missed: 0 };
                    const total = counts.done + counts.missed;
                    const rate = total ? Math.round((counts.done / total) * 100) : 0;
                    const status = getHabitStatus(habit.id);

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
                              {status
                                ? `Marked ${status} today${
                                    todayStatus[habit.id]?.note ? ` • ${todayStatus[habit.id]?.note}` : ""
                                  }`
                                : "Waiting for today's check-in."}
                            </div>
                          </div>

                          <CButtonGroup size="sm">
                            <CButton
                              color="danger"
                              variant={status === "missed" ? undefined : "outline"}
                              active={status === "missed"}
                              onClick={() => scheduleStatusAction(habit, "missed")}
                              onDoubleClick={(event) =>
                                handleStatusDoubleClick(event, habit, "missed")
                              }
                            >
                              Missed
                            </CButton>
                            <CButton
                              color="success"
                              variant={status === "done" ? undefined : "outline"}
                              active={status === "done"}
                              onClick={() => scheduleStatusAction(habit, "done")}
                              onDoubleClick={(event) => handleStatusDoubleClick(event, habit, "done")}
                            >
                              Done
                            </CButton>
                          </CButtonGroup>
                        </div>
                      </div>
                    );
                  })}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol xs={12} lg={5}>
              <CCard className="h-100 elevated-card">
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
              <CCard className="h-100 elevated-card">
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
              <CCard className="h-100 elevated-card">
                <CCardHeader className="fw-semibold">All caught up</CCardHeader>
                <CCardBody className="d-flex flex-column flex-lg-row align-items-center gap-3">
                  <div
                    className={`status-badge ${allCaughtUp ? "bg-success text-white" : "bg-body"}`}
                    style={{ animation: allCaughtUp ? "pulseGlow 1.6s ease-in-out infinite" : undefined }}
                  >
                    {allCaughtUp ? "✅" : "⏳"}
                  </div>
                  <div className="text-center text-lg-start">
                    <div className="fw-semibold mb-1">
                      {allCaughtUp ? "You're all set" : "Keep logging today"}
                    </div>
                    <div className="text-body-secondary">
                      {allCaughtUp
                        ? "You've logged everything for today and have no upcoming events."
                        : "Log a check-in or align a habit with your next free block."}
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={12} lg={5}>
              <CCard className="h-100 elevated-card">
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

          <CRow className="g-4">
            <CCol xs={12} lg={6}>
              <CCard className="h-100 elevated-card">
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
              <CCard className="h-100 elevated-card">
                <CCardHeader className="fw-semibold">Habit Leaderboard</CCardHeader>
                <CCardBody>
                  {leaderboard.length > 0 ? (
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
                  ) : (
                    <div className="text-body-secondary">
                      Keep logging to surface your top-performing habits.
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </>
      )}

      <CModal alignment="center" visible={noteModal.open} onClose={closeDescriptionModal}>
        <CModalHeader closeButton>
          <CModalTitle>Add a description for today</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-flex flex-column gap-3">
          <div className="text-muted">
            {noteModal.habitTitle} · {noteModal.status}
          </div>
          <CFormTextarea
            rows={3}
            value={noteModal.note}
            onChange={(event) =>
              setNoteModal((prev) => ({
                ...prev,
                note: event.target.value,
              }))
            }
            placeholder={`Description for today's ${noteModal.status || ""} log (optional).`}
          />
          <div className="text-body-secondary small">
            Notes stay connected to your My Habits descriptions for this exact status.
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeDescriptionModal}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={submitDescription}>
            Save description
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        alignment="center"
        visible={patternModalOpen}
        onClose={() => setPatternModalOpen(false)}
      >
        <CModalHeader closeButton>AI pattern detection</CModalHeader>
        <CModalBody>
          {patternLoading ? (
            <div className="d-flex align-items-center gap-3 text-body-secondary">
              <CSpinner size="sm" />
              <span>Scanning your habit history for trends...</span>
            </div>
          ) : patternError ? (
            <CAlert color="warning" className="mb-0">
              {patternError}
            </CAlert>
          ) : (
            <>
              <p className="text-body-secondary small">
                Insights from your recent progress logs—misses, streaks, timing, and weaker habits.
              </p>
              {patternInsights.length > 0 ? (
                <CListGroup flush className="mb-3">
                  {patternInsights.map((insight, index) => (
                    <CListGroupItem key={index}>{insight}</CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <div className="text-body-secondary mb-3">
                  No clear patterns yet. Keep logging to train the detector.
                </div>
              )}
              <div className="fw-semibold">Actionable recommendation</div>
              <div className="text-body-secondary">
                {patternRecommendation || "Keep building history to unlock tailored guidance."}
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <div className="text-body-secondary small">Refresh after new check-ins to update your insights.</div>
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="outline" onClick={() => setPatternModalOpen(false)}>
              Close
            </CButton>
            <CButton color="primary" onClick={analyzeHabitPatterns} disabled={patternLoading}>
              Refresh insights
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      <CModal
        alignment="center"
        visible={aiSummaryOpen}
        onClose={() => setAiSummaryOpen(false)}
      >
        <CModalHeader closeButton>AI journey summary</CModalHeader>
        <CModalBody>
          {aiSummaryAgent && (
            <CAlert
              color={aiSummaryAgent.ready ? "info" : "warning"}
              className="mb-3"
            >
              {aiSummaryAgent.ready
                ? `Powered by ${aiSummaryAgent.provider || "AI"}${
                    aiSummaryAgent.model ? ` (${aiSummaryAgent.model})` : ""
                  }`
                : aiSummaryAgent.reason ||
                  "AI summary is using the fallback coach."}
            </CAlert>
          )}

          {aiSummaryError && (
            <CAlert color="danger" className="mb-3">
              {aiSummaryError}
            </CAlert>
          )}

          {aiSummaryLoading ? (
            <div className="d-flex align-items-center gap-3 text-body-secondary">
              <CSpinner size="sm" />
              <span>Analyzing your habits, schedules, and logs...</span>
            </div>
          ) : aiSummary ? (
            <div className="text-break" style={{ whiteSpace: "pre-wrap" }}>
              {aiSummary}
            </div>
          ) : (
            <div className="text-body-secondary">
              No summary yet. Try again in a moment.
            </div>
          )}
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <div className="text-body-secondary small">
            Pulls from your latest habits, progress logs, schedules, and AI
            memories.
          </div>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setAiSummaryOpen(false)}
          >
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        alignment="center"
        visible={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      >
        <CModalHeader closeButton>Teach the AI about you</CModalHeader>
        <CModalBody>
          <p className="text-body-secondary">
            Share one or two details about your goals, routines, or coaching style.
            The AI will store a tiny summary and use it for future tips.
          </p>

          {aiError && (
            <CAlert color="danger" className="mb-3">
              {aiError}
            </CAlert>
          )}

          <CForm onSubmit={saveAiNote}>
            <CFormTextarea
              rows={4}
              placeholder="Example: I'm aiming to build a morning writing habit, prefer gentle reminders, and evenings are usually busy."
              value={aiNote}
              onChange={(event) => setAiNote(event.target.value)}
              disabled={aiSaving}
            />
            <div className="d-flex justify-content-between align-items-center mt-3 gap-2 flex-wrap">
              <div className="text-body-secondary small">
                AI will keep a short note like a memory for you.
              </div>
              <div className="d-flex gap-2 ms-auto">
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  disabled={aiSaving}
                  onClick={() => setAiModalOpen(false)}
                >
                  Cancel
                </CButton>
                <CButton type="submit" color="primary" disabled={aiSaving}>
                  {aiSaving ? <CSpinner size="sm" /> : "Save for the AI"}
                </CButton>
              </div>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <div className="text-body-secondary small">
            The note stays private to your account and guides the coach on this page.
          </div>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default Dashboard;