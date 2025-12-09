import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
  CTabContent,
  CTabPane,
  CProgress,
  CProgressBar,
  CFormSwitch,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilBolt,
  cilClock,
  cilChartLine,
  cilBadge,
  cilList,
  cilPencil,
  cilPlus,
  cilTrash,
} from "@coreui/icons"

import AddHabit from "./AddHabit"
import HabitLibrary from "./HabitLibrary"
import ProgressTracker from "./ProgressTracker"
import { getHabits, deleteHabit, updateHabit } from "../../services/habits"
import { logHabitProgress, getProgressHistory } from "../../services/progress"
import { promptMissedReflection } from "../../utils/reflection"
import { getDailyChallengeSummary } from "../../services/dailyChallenge"
import { getProgressAnalytics, formatPercent } from "../../services/analytics"
import { emitDataRefresh, REFRESH_SCOPES, useDataRefresh } from "../../utils/refreshBus"

const createEditDraft = (habit) => ({
  id: habit?.id,
  title: habit?.title || "",
  description: habit?.description || "",
  category: habit?.category || "",
  target_reps: habit?.target_reps ?? "",
  is_daily_goal: Boolean(habit?.is_daily_goal),
})

const DailyChallengeHighlight = ({ challenge, onLog, loggingState }) => {
  if (!challenge?.focusHabit) return null
  const focus = challenge.focusHabit
  const focusId = focus?.id || focus?.habitId
  const progressPercent = focus.targetForToday
    ? Math.min(100, Math.round((focus.doneToday / focus.targetForToday) * 100))
    : 0

  const isLoggingDone = loggingState === `${focusId}-done`
  const isLoggingMissed = loggingState === `${focusId}-missed`

  return (
    <CCard className="h-100 shadow-sm border-0 habits-panel challenge-card">
      <CCardHeader className="bg-gradient-primary text-white">
        <div className="d-flex align-items-center gap-3">
          <CIcon icon={cilBolt} size="lg" />
          <div>
            <div className="text-uppercase small fw-semibold opacity-75">
              Daily Challenge
            </div>
            <h5 className="mb-0">Focus: {focus.title || focus.name}</h5>
          </div>
        </div>
      </CCardHeader>
      <CCardBody className="d-flex flex-column gap-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="text-body-secondary small">Reason</div>
          {focus.category && (
            <CBadge color="warning" className="text-dark">
              {focus.category}
            </CBadge>
          )}
        </div>
        <p className="mb-0 text-body-secondary">{focus.reason}</p>
        <div className="bg-body-secondary rounded p-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-uppercase small text-muted">Today's progress</span>
            <span className="fw-semibold">{progressPercent}%</span>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <CBadge color="success">{focus.doneToday}</CBadge>
            <span className="text-muted small">of {focus.targetForToday} wins</span>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <CButton
            color="success"
            size="sm"
            className={`rounded-pill log-action log-done${isLoggingDone ? " is-logging" : ""}`}
            disabled={isLoggingDone}
            onClick={() => onLog(focus, "done")}
          >
            <span className="d-inline-flex align-items-center gap-2">
              {isLoggingDone && <CSpinner size="sm" color="light" />}
              <span>{isLoggingDone ? "Logging..." : "Log done"}</span>
            </span>
          </CButton>
          <CButton
            color="danger"
            size="sm"
            variant="outline"
            className={`rounded-pill log-action log-missed${isLoggingMissed ? " is-logging" : ""}`}
            disabled={isLoggingMissed}
            onClick={() => onLog(focus, "missed")}
          >
            <span className="d-inline-flex align-items-center gap-2">
              {isLoggingMissed && <CSpinner size="sm" color="danger" />}
              <CIcon icon={cilClock} className="opacity-75" />
              <span>{isLoggingMissed ? "Logging..." : "Log missed"}</span>
            </span>
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

const MyHabitsTab = ({ onAddClick, onProgressLogged }) => {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [challenge, setChallenge] = useState(null)
  const [challengeError, setChallengeError] = useState("")
  const [loggingState, setLoggingState] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editDraft, setEditDraft] = useState(createEditDraft({}))
  const [savingEdit, setSavingEdit] = useState(false)

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const userId = user?.id

  const loadHabits = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      setHabits([])
      return
    }
    try {
      setLoading(true)
      const data = await getHabits(userId)
      setHabits(Array.isArray(data) ? data : [])
      setFeedback(null)
    } catch (error) {
      console.error("Failed to load habits", error)
      setFeedback({ type: "danger", message: "Unable to load your habits." })
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadChallenge = useCallback(async () => {
    if (!userId) return
    try {
      const data = await getDailyChallengeSummary(userId)
      setChallenge(data)
      setChallengeError("")
    } catch (error) {
      console.error("Failed to load challenge", error)
      setChallenge(null)
      setChallengeError("Daily Challenge is temporarily unavailable.")
    }
  }, [userId])

  useEffect(() => {
    loadHabits()
    loadChallenge()
  }, [loadChallenge, loadHabits])

  useDataRefresh(
    [REFRESH_SCOPES.HABITS, REFRESH_SCOPES.PROGRESS],
    useCallback(() => {
      loadHabits()
      loadChallenge()
    }, [loadChallenge, loadHabits]),
  )

  useEffect(() => {
    if (!feedback) return undefined
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

  const handleLog = async (habit, status) => {
    const habitId = habit?.id || habit?.habitId
    if (!habitId || !userId) return
    const payload = { userId, status }
    if (status === "missed") {
      const reason = promptMissedReflection(habit.title || habit.name || habit.habitName)
      if (!reason) return
      payload.reason = reason
    }

    try {
      setLoggingState(`${habitId}-${status}`)
      await logHabitProgress(habitId, payload)
      if (typeof onProgressLogged === "function") {
        await onProgressLogged()
      }
      emitDataRefresh(REFRESH_SCOPES.PROGRESS, { habitId, status })
      emitDataRefresh(REFRESH_SCOPES.ANALYTICS, { habitId, status })
      setFeedback({
        type: "success",
        message: `Logged ${status} for ${habit.title || habit.name || habit.habitName}.`,
      })
    } catch (error) {
      console.error("Failed to log status", error)
      setFeedback({ type: "danger", message: "Could not record that action." })
    } finally {
      setLoggingState(null)
    }
  }

  const handleDelete = async (habitId) => {
    try {
      await deleteHabit(habitId)
      setHabits((prev) => prev.filter((h) => h.id !== habitId))
      emitDataRefresh(REFRESH_SCOPES.HABITS, { reason: "habit-deleted", habitId })
      setFeedback({ type: "success", message: "Habit deleted." })
    } catch (error) {
      console.error("Failed to delete", error)
      setFeedback({ type: "danger", message: "Unable to delete habit right now." })
    }
  }

  const startEdit = (habit) => {
    setEditDraft(createEditDraft(habit))
    setShowEditor(true)
  }

  const saveEdit = async () => {
    if (!editDraft.title || !editDraft.title.trim()) {
      setFeedback({ type: "danger", message: "Title is required." })
      return
    }
    try {
      setSavingEdit(true)
      const payload = {
        ...editDraft,
        title: editDraft.title.trim(),
        description: editDraft.description?.trim() || null,
        category: editDraft.category?.trim() || null,
        target_reps:
          editDraft.target_reps === "" || editDraft.target_reps === null
            ? null
            : Number(editDraft.target_reps),
      }
      const updated = await updateHabit(editDraft.id, payload)
      setHabits((prev) =>
        prev.map((habit) => (habit.id === updated.id ? { ...habit, ...updated } : habit)),
      )
      emitDataRefresh(REFRESH_SCOPES.HABITS, { reason: "habit-updated", habitId: updated.id })
      setShowEditor(false)
      setFeedback({ type: "success", message: "Habit updated." })
    } catch (error) {
      console.error("Failed to update habit", error)
      setFeedback({ type: "danger", message: "Could not save your changes." })
    } finally {
      setSavingEdit(false)
    }
  }

  const emptyState = useMemo(
    () => (
      <div className="text-center text-body-secondary py-5">
        <div className="display-6 mb-2">✨</div>
        <p className="mb-3">No habits yet. Create your first one to get started.</p>
        <CButton color="primary" onClick={onAddClick}>
          <CIcon icon={cilPlus} className="me-2" /> Add habit
        </CButton>
      </div>
    ),
    [onAddClick],
  )

  return (
    <div className="mt-3 habits-section">
      <CRow className="g-4">
        <CCol lg={4}>
          {challengeError && <CAlert color="warning">{challengeError}</CAlert>}
          <DailyChallengeHighlight
            challenge={challenge}
            onLog={handleLog}
            loggingState={loggingState}
          />
        </CCol>
        <CCol lg={8}>
          <CCard className="shadow-sm border-0 h-100 habits-panel">
            <CCardHeader className="d-flex align-items-center justify-content-between bg-white border-0">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilList} className="text-primary" />
                <span className="fw-semibold">My habits</span>
              </div>
              <div className="d-flex gap-2">
                <CButton color="primary" size="sm" variant="outline" className="rounded-pill" onClick={onAddClick}>
                  <CIcon icon={cilPlus} className="me-1" /> Add habit
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody className="d-flex flex-column gap-3">
              {feedback && <CAlert color={feedback.type}>{feedback.message}</CAlert>}
              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <CSpinner color="primary" />
                </div>
              ) : habits.length === 0 ? (
                emptyState
              ) : (
                <CListGroup flush className="habits-list">
                  {habits.map((habit) => (
                    <CListGroupItem key={habit.id} className="py-3 habit-item">
                      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                        <div className="d-flex flex-column gap-1">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-semibold habit-title">{habit.title}</span>
                            {habit.category && (
                              <CBadge color="info" className="text-uppercase small subtle-badge">
                                {habit.category}
                              </CBadge>
                            )}
                            {habit.is_daily_goal && <CBadge color="success">Daily</CBadge>}
                          </div>
                          <div className="text-body-secondary small">
                            {habit.description || "No description"}
                          </div>
                          {habit.target_reps ? (
                            <div className="text-body-secondary small mt-1">
                              🎯 Target: {habit.target_reps}
                            </div>
                          ) : null}
                        </div>
                        <div className="d-flex flex-wrap gap-2 habit-actions">
                          <CButton
                            size="sm"
                            color="success"
                            className={`rounded-pill log-action log-done${
                              loggingState === `${habit.id}-done` ? " is-logging" : ""
                            }`}
                            disabled={loggingState === `${habit.id}-done`}
                            onClick={() => handleLog(habit, "done")}
                          >
                            <span className="d-inline-flex align-items-center gap-2">
                              {loggingState === `${habit.id}-done` && <CSpinner size="sm" color="light" />}
                              <span>
                                {loggingState === `${habit.id}-done` ? "Logging..." : "Log done"}
                              </span>
                            </span>
                          </CButton>
                          <CButton
                            size="sm"
                            color="warning"
                            variant="outline"
                            className={`rounded-pill log-action log-missed${loggingState === `${habit.id}-missed` ? " is-logging" : ""}`}
                            disabled={loggingState === `${habit.id}-missed`}
                            onClick={() => handleLog(habit, "missed")}
                          >
                            <span className="d-inline-flex align-items-center gap-2">
                              {loggingState === `${habit.id}-missed` && <CSpinner size="sm" color="warning" />}
                              <CIcon icon={cilClock} className="opacity-75" />
                              <span>
                                {loggingState === `${habit.id}-missed` ? "Logging..." : "Log missed"}
                              </span>
                            </span>
                          </CButton>
                          <CButton
                            size="sm"
                            color="secondary"
                            variant="outline"
                            className="rounded-pill"
                            onClick={() => startEdit(habit)}
                          >
                            <CIcon icon={cilPencil} className="me-1" /> Edit
                          </CButton>
                          <CButton
                            size="sm"
                            color="danger"
                            variant="ghost"
                            className="rounded-pill"
                            onClick={() => handleDelete(habit.id)}
                          >
                            <CIcon icon={cilTrash} />
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
      </CRow>

      <CModal visible={showEditor} onClose={() => setShowEditor(false)} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Edit habit</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-flex flex-column gap-3">
          <div>
            <CFormLabel>Title</CFormLabel>
            <CFormInput
              value={editDraft.title}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Habit title"
            />
          </div>
          <div>
            <CFormLabel>Description</CFormLabel>
            <CFormTextarea
              rows={3}
              value={editDraft.description}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <CFormLabel>Category</CFormLabel>
              <CFormInput
                value={editDraft.category}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Wellness, Focus, Growth..."
              />
            </div>
            <div className="col-md-6">
              <CFormLabel>Target repetitions</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={editDraft.target_reps}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, target_reps: e.target.value }))}
              />
            </div>
          </div>
          <CFormCheck
            id="edit-daily-goal"
            label="Count this as a daily goal"
            checked={editDraft.is_daily_goal}
            onChange={(e) => setEditDraft((prev) => ({ ...prev, is_daily_goal: e.target.checked }))}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowEditor(false)}>
            Cancel
          </CButton>
          <CButton color="primary" disabled={savingEdit} onClick={saveEdit}>
            {savingEdit ? "Saving..." : "Save changes"}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

const InsightsTab = ({ analytics, historyEntries, loading, error, onRefresh }) => {
  const summary = analytics?.summary
  const habits = analytics?.habits ?? []

  const topHabits = useMemo(() => {
    return [...habits]
      .filter((h) => (h.totals.done || h.totals.missed) > 0)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)
      .map((h) => ({
        name: h.habitName,
        rate: h.successRate,
        streak: h.streak?.current ?? 0,
      }))
  }, [habits])

  const strugglingHabits = useMemo(() => {
    return [...habits]
      .filter((h) => (h.totals.done || h.totals.missed) > 0)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 3)
      .map((h) => ({
        name: h.habitName,
        rate: h.successRate,
      }))
  }, [habits])

  const forecast = useMemo(() => {
    const trend = summary?.dailyTrend ?? []
    const lastSeven = trend.slice(-7)
    if (lastSeven.length === 0) return []
    return lastSeven.map((day) => {
      const completion = day.completed + day.missed
      const percent = completion ? Math.round((day.completed / completion) * 100) : 0
      const label = new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })
      return { label, chance: percent }
    })
  }, [summary?.dailyTrend])

  const winRatesByCategory = useMemo(() => {
    if (!historyEntries?.length) return []
    const buckets = historyEntries.reduce((acc, entry) => {
      if (!entry.category) return acc
      if (!acc[entry.category]) acc[entry.category] = { done: 0, missed: 0 }
      if (entry.status === 'done') acc[entry.category].done += 1
      if (entry.status === 'missed') acc[entry.category].missed += 1
      return acc
    }, {})
    return Object.entries(buckets).map(([category, counts]) => {
      const total = counts.done + counts.missed
      const value = total ? Math.round((counts.done / total) * 100) : 0
      return { name: category, value }
    })
  }, [historyEntries])

  const bestTime = useMemo(() => {
    if (summary?.peakDay) {
      const label = new Date(`${summary.peakDay.date}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
      const completion = summary.peakDay.completed + summary.peakDay.missed
      const lift = completion ? formatPercent((summary.peakDay.completed / completion) * 100) : '—'
      return {
        window: label,
        detail: `You logged ${summary.peakDay.completed} wins on your strongest day`,
        lift: `${lift} completion rate`,
      }
    }
    return {
      window: 'Keep logging',
      detail: 'Complete or miss a habit to unlock your personalised best window.',
      lift: '',
    }
  }, [summary?.peakDay])

  const showEmptyState = !loading && !summary?.totalCheckIns

  return (
    <div className="mt-3">
      {(error || showEmptyState) && (
        <CAlert color={error ? 'danger' : 'info'} className="mb-3">
          {error || 'Log a habit to see your insights come alive.'}
        </CAlert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-muted small">Insights refresh when you log progress.</div>
        <CButton size="sm" color="light" onClick={onRefresh} disabled={loading}>
          Refresh
        </CButton>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center my-4">
          <CSpinner color="primary" />
        </div>
      ) : (
        <CRow className="g-4">
          <CCol lg={6}>
            <CCard className="shadow-sm border-0 h-100 habits-panel">
              <CCardHeader className="bg-gradient-primary text-white">
                <div className="d-flex align-items-center gap-2">
                  <CIcon icon={cilChartLine} />
                  <span className="fw-semibold">Highest performing habits</span>
                </div>
              </CCardHeader>
              <CCardBody className="d-flex flex-column gap-3">
                <CFormLabel className="text-uppercase small text-muted mb-1">Consistency rate</CFormLabel>
                <div className="d-flex flex-column gap-3">
                  {topHabits.length === 0 && <span className="text-muted">Log a habit to see rankings.</span>}
                  {topHabits.map((habit) => (
                    <div key={habit.name} className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold">{habit.name}</div>
                        <small className="text-muted">{habit.streak || 0}-day streak</small>
                      </div>
                      <CBadge color="success" className="px-3 py-2">{habit.rate}%</CBadge>
                    </div>
                  ))}
                </div>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol lg={6}>
            <CCard className="shadow-sm border-0 h-100 habits-panel">
              <CCardHeader className="bg-white d-flex align-items-center gap-2">
                <CIcon icon={cilBolt} className="text-danger" />
                <span className="fw-semibold">Habits needing attention</span>
              </CCardHeader>
              <CCardBody className="d-flex flex-column gap-3">
                <div className="d-flex flex-column gap-2">
                  {strugglingHabits.length === 0 && <span className="text-muted">No risky habits yet.</span>}
                  {strugglingHabits.map((habit) => (
                    <div key={habit.name} className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold">{habit.name}</div>
                        <small className="text-muted">Drop-in momentum</small>
                      </div>
                      <CBadge color="warning" className="text-dark px-3 py-2">
                        {habit.rate}%
                      </CBadge>
                    </div>
                  ))}
                </div>
                <div className="bg-body-tertiary p-3 rounded-3">
                  <div className="text-muted small mb-1">Next best action</div>
                  <p className="mb-0 text-body-secondary">
                    Reschedule the two lowest-performing habits to your strongest timeslot for the week.
                  </p>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol lg={4}>
            <CCard className="shadow-sm border-0 h-100 habits-panel">
              <CCardHeader className="bg-white d-flex align-items-center gap-2">
                <CIcon icon={cilClock} className="text-primary" />
                <span className="fw-semibold">Best day</span>
              </CCardHeader>
              <CCardBody className="d-flex flex-column gap-2">
                <h4 className="fw-bold mb-1">{bestTime.window}</h4>
                <p className="text-body-secondary mb-2">{bestTime.detail}</p>
                {bestTime.lift && <CBadge color="info" className="text-dark">{bestTime.lift}</CBadge>}
              </CCardBody>
            </CCard>
          </CCol>
          <CCol lg={4}>
            <CCard className="shadow-sm border-0 h-100 habits-panel">
              <CCardHeader className="bg-white d-flex align-items-center gap-2">
                <CIcon icon={cilChartLine} className="text-success" />
                <span className="fw-semibold">Win rate by category</span>
              </CCardHeader>
              <CCardBody className="d-flex flex-column gap-3">
                {winRatesByCategory.length === 0 && <span className="text-muted">No categories logged yet.</span>}
                {winRatesByCategory.map((category) => (
                  <div key={category.name} className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-semibold">{category.name}</div>
                      <small className="text-muted">Momentum</small>
                    </div>
                    <CProgress value={category.value} color="success" style={{ width: '140px' }} />
                  </div>
                ))}
              </CCardBody>
            </CCard>
          </CCol>
          <CCol lg={4}>
            <CCard className="shadow-sm border-0 h-100 habits-panel">
              <CCardHeader className="bg-white d-flex align-items-center gap-2">
                <CIcon icon={cilBolt} className="text-info" />
                <span className="fw-semibold">Weekly success forecast</span>
              </CCardHeader>
              <CCardBody className="d-flex flex-column gap-3">
                {forecast.length === 0 && <span className="text-muted">Keep logging to see a forecast.</span>}
                {forecast.map((day) => (
                  <div key={day.label}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">{day.label}</span>
                      <span className="fw-semibold">{day.chance}%</span>
                    </div>
                    <CProgressBar color="info" value={day.chance} className="rounded-pill" />
                  </div>
                ))}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}
    </div>
  )
}

const HistoryTab = ({ entries, loading, error, onRefresh }) => {
  const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const [selectedHabitIds, setSelectedHabitIds] = useState([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const habitOptions = useMemo(() => {
    const seen = new Map()
    entries.forEach((entry) => {
      const key = entry.habitId ?? entry.habit_id ?? entry.habitTitle
      if (!key || seen.has(key)) return
      seen.set(key, {
        id: key,
        label: entry.habitTitle,
        category: entry.category,
      })
    })

    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [entries])

  const filteredEntries = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null

    return [...entries]
      .filter((entry) => {
        const key = entry.habitId ?? entry.habit_id ?? entry.habitTitle
        if (selectedHabitIds.length && !selectedHabitIds.includes(String(key))) return false

        const progressDay = new Date(entry.progressDate ?? entry.createdAt)
        if (start && progressDay < start) return false
        if (end && progressDay > end) return false
        return true
      })
      .sort((a, b) => new Date(b.createdAt ?? b.progressDate) - new Date(a.createdAt ?? a.progressDate))
  }, [entries, endDate, selectedHabitIds, startDate])

  const exportCsv = () => {
    const header = "habit,status,date,time,reason\n"
    const rows = filteredEntries
      .map((entry) => {
        const reason = entry.reason ? entry.reason.replace(/"/g, '""') : ""
        return `${entry.habitTitle},${entry.status},${entry.progressDate},${formatTime(entry.createdAt)},"${reason}"`
      })
      .join("\n")
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'habit-history.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
        <div className="text-muted small">
          {filteredEntries.length === entries.length
            ? "Latest 50 check-ins, including your missed-day notes."
            : `Showing ${filteredEntries.length} of ${entries.length} logs.`}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <CButton color="light" size="sm" onClick={onRefresh} disabled={loading}>
            Refresh
          </CButton>
          <CButton color="primary" size="sm" variant="outline" onClick={exportCsv} disabled={!filteredEntries.length}>
            Export CSV
          </CButton>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3">
        <div className="flex-grow-1" style={{ minWidth: 220 }}>
          <CFormLabel htmlFor="history-habit-filter" className="small fw-semibold text-uppercase text-body-secondary">
            Filter by habit
          </CFormLabel>
          <CFormSelect
            id="history-habit-filter"
            multiple
            size={Math.min(6, Math.max(3, habitOptions.length))}
            value={selectedHabitIds}
            onChange={(e) =>
              setSelectedHabitIds(Array.from(e.target.selectedOptions).map((option) => option.value))
            }
          >
            <option value="" disabled>
              Select one or more habits
            </option>
            {habitOptions.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.label} {habit.category ? `(${habit.category})` : ""}
              </option>
            ))}
          </CFormSelect>
        </div>

        <div className="d-flex flex-wrap gap-3 align-items-end">
          <div>
            <CFormLabel htmlFor="history-start-date" className="small fw-semibold text-uppercase text-body-secondary">
              From
            </CFormLabel>
            <CFormInput
              id="history-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <CFormLabel htmlFor="history-end-date" className="small fw-semibold text-uppercase text-body-secondary">
              To
            </CFormLabel>
            <CFormInput
              id="history-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="d-flex gap-2 align-items-center mb-2">
            <CButton
              color="light"
              size="sm"
              variant="ghost"
              className="mt-1"
              onClick={() => {
                setSelectedHabitIds([])
                setStartDate("")
                setEndDate("")
              }}
              disabled={!selectedHabitIds.length && !startDate && !endDate}
            >
              Clear filters
            </CButton>
          </div>
        </div>
      </div>

      {error && <CAlert color="danger">{error}</CAlert>}

      {loading ? (
        <div className="d-flex justify-content-center my-4">
          <CSpinner color="primary" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center text-body-secondary py-4">
          {entries.length ? "No history matches your filters yet." : "Log your first habit to see history."}
        </div>
      ) : (
        <CListGroup flush>
          {filteredEntries.map((entry) => (
            <CListGroupItem key={entry.id} className="py-3">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div className="d-flex flex-column gap-1">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">{entry.habitTitle}</span>
                    {entry.category && (
                      <CBadge color="info" className="text-uppercase small subtle-badge">{entry.category}</CBadge>
                    )}
                  </div>
                  <div className="small text-muted">
                    {formatDate(entry.progressDate)} · {formatTime(entry.createdAt)}
                  </div>
                  {entry.status === 'missed' && entry.reason && (
                    <div className="small text-body-secondary bg-body-tertiary p-2 rounded-2">
                      <span className="fw-semibold">Your note:</span> {entry.reason}
                    </div>
                  )}
                </div>
                <CBadge color={entry.status === 'done' ? 'success' : 'danger'} className="px-3 py-2">
                  {entry.status === 'done' ? 'Done' : 'Missed'}
                </CBadge>
              </div>
            </CListGroupItem>
          ))}
        </CListGroup>
      )}
    </div>
  )
}

const AutomationTab = ({ summary, loading }) => {
  const [rules, setRules] = useState([
    {
      id: 1,
      title: "If habit missed 2 days → prompt reflection",
      description: "Trigger a short note so you can capture what got in the way.",
      active: true,
      tone: "info",
    },
    {
      id: 2,
      title: "If streak reaches 5 → award badge",
      description: "Celebrate momentum with a subtle badge and XP boost.",
      active: true,
      tone: "success",
    },
    {
      id: 3,
      title: "Notify if scheduled habit window passes without completion",
      description: "Send a quiet nudge to reschedule or log a reason.",
      active: false,
      tone: "warning",
    },
  ])

  const toggleRule = (ruleId) => {
    setRules((prev) => prev.map((rule) => (rule.id === ruleId ? { ...rule, active: !rule.active } : rule)))
  }

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-muted small">Automations respond to your latest check-ins.</div>
        {loading && <CSpinner size="sm" />}
      </div>
      <CRow className="g-4">
        {rules.map((rule) => (
          <CCol key={rule.id} lg={4}>
            <CCard className="shadow-sm border-0 h-100 habits-panel">
              <CCardHeader className="bg-white d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <CIcon icon={cilBolt} className={`text-${rule.tone}`} />
                  <span className="fw-semibold">Automation</span>
                </div>
                <CFormSwitch checked={rule.active} onChange={() => toggleRule(rule.id)} />
              </CCardHeader>
              <CCardBody className="d-flex flex-column gap-2">
                <h6 className="mb-1">{rule.title}</h6>
                <p className="text-body-secondary mb-0">{rule.description}</p>
                <div className="d-flex align-items-center gap-2 mt-auto">
                  <CBadge color={rule.tone}>{rule.active ? "Enabled" : "Disabled"}</CBadge>
                  <small className="text-muted">
                    {summary?.totalMissed ? `${summary.totalMissed} missed logs reviewed this week.` : "Ready to react."}
                  </small>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>
    </div>
  )
}

const RewardsTab = ({ summary, loading }) => {
  const totalDone = summary?.totalDone ?? 0
  const totalMissed = summary?.totalMissed ?? 0
  const xp = Math.max(0, totalDone * 10 + totalMissed * 2)
  const level = Math.max(1, Math.floor(xp / 500) + 1)
  const nextLevel = level + 1
  const progressToNext = Math.min(100, Math.round(((xp % 500) / 500) * 100))

  const badges = [
    { name: "Momentum", note: `${totalDone} completions logged`, color: "success" },
    { name: "Consistency", note: `${summary?.totalHabits ?? 0} habits tracked`, color: "info" },
    { name: "Reflection", note: `${totalMissed} honest misses`, color: "warning" },
  ]

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-muted small">Rewards update with every log.</div>
        {loading && <CSpinner size="sm" />}
      </div>
      <CRow className="g-4">
        <CCol lg={5}>
          <CCard className="shadow-sm border-0 h-100 habits-panel">
            <CCardHeader className="bg-gradient-primary text-white">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilBadge} />
                <span className="fw-semibold">Rewards</span>
              </div>
            </CCardHeader>
            <CCardBody className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-uppercase small text-muted">Current level</div>
                  <h3 className="fw-bold mb-0">Level {level}</h3>
                  <small className="text-body-secondary">Next: Level {nextLevel}</small>
                </div>
                <CBadge color="light" className="text-dark">{xp} XP</CBadge>
              </div>
              <div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Progress to next level</span>
                  <span className="fw-semibold">{progressToNext}%</span>
                </div>
                <CProgress value={progressToNext} color="success" />
              </div>
              <div className="p-3 rounded-3 bg-body-tertiary">
                <div className="text-muted small mb-1">How XP works</div>
                <p className="mb-0 text-body-secondary">
                  Earn XP for completions, streak milestones, and automations that keep you consistent.
                </p>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={7}>
          <CCard className="shadow-sm border-0 h-100 habits-panel">
            <CCardHeader className="bg-white">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilChartLine} className="text-success" />
                <span className="fw-semibold">Badges & levels</span>
              </div>
            </CCardHeader>
            <CCardBody className="d-flex flex-column gap-3">
              <div className="d-flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <CBadge key={badge.name} color={badge.color} className="px-3 py-2">
                    <span className="fw-semibold">{badge.name}</span>
                    <div className="small text-white-50">{badge.note}</div>
                  </CBadge>
                ))}
              </div>
              <div className="bg-body-tertiary p-3 rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">Minimal gamification</span>
                  <CBadge color="primary" className="text-uppercase small">Focused</CBadge>
                </div>
                <p className="mb-0 text-body-secondary">
                  Stay motivated without distraction—rewards stay subtle and purposeful so the habit stays center stage.
                </p>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

const Habits = () => {
  const [activeTab, setActiveTab] = useState("my-habits")
  const [analytics, setAnalytics] = useState(null)
  const [historyEntries, setHistoryEntries] = useState([])
  const [signalsLoading, setSignalsLoading] = useState(false)
  const [signalsError, setSignalsError] = useState("")

  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), [])

  const refreshSignals = useCallback(async () => {
    if (!user?.id) return
    try {
      setSignalsLoading(true)
      const [analyticsData, historyData] = await Promise.all([
        getProgressAnalytics(user.id),
        getProgressHistory(user.id),
      ])
      setAnalytics(analyticsData)
      setHistoryEntries(Array.isArray(historyData) ? historyData : [])
      setSignalsError("")
    } catch (error) {
      console.error("Failed to refresh habit analytics", error)
      setSignalsError("We couldn't refresh your habit insights just now.")
    } finally {
      setSignalsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    refreshSignals()
  }, [refreshSignals])

  const summary = analytics?.summary

  const heroStats = useMemo(
    () => [
      { label: "Weekly win rate", value: formatPercent(summary?.completionRate ?? 0), tone: "success" },
      { label: "Current streak", value: `${summary?.streakLeader?.streak?.current ?? 0} days`, tone: "info" },
      { label: "Active habits", value: `${summary?.totalHabits ?? 0}`, tone: "warning" },
    ],
    [summary?.completionRate, summary?.streakLeader?.streak?.current, summary?.totalHabits],
  )

  return (
    <div className="pt-3 pb-5 position-relative habits-page">
      <div className="habits-hero mb-4">
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <CBadge color="info" className="text-uppercase fw-semibold mini-badge">Modernized</CBadge>
            <span className="text-body-secondary small">Smart routines, powerful insights</span>
          </div>
          <h2 className="fw-bold mb-1">Habits</h2>
          <p className="text-body-secondary mb-0">
            One home for creating, browsing, tracking, and celebrating your habits. Everything feels calm, clear,
            and ready for momentum.
          </p>
          <div className="d-flex gap-2 flex-wrap mt-1">
            <CButton color="primary" size="sm" className="rounded-pill" onClick={() => setActiveTab("add")}>
              <CIcon icon={cilPlus} className="me-2" /> Add new habit
            </CButton>
            <CButton color="light" size="sm" className="rounded-pill">
              View quick wins
            </CButton>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-3 habits-hero-stats">
          {heroStats.map((stat) => (
            <div key={stat.label} className="habits-hero-card">
              <span className="text-uppercase small text-muted">{stat.label}</span>
              <h4 className="fw-bold mb-0">{stat.value}</h4>
              <div className={`badge bg-${stat.tone} bg-opacity-10 text-${stat.tone} fw-semibold mt-2`}>
                Trending
              </div>
            </div>
          ))}
        </div>
      </div>

      <CNav variant="tabs" role="tablist" className="mb-3 habits-nav">
        <CNavItem>
          <CNavLink active={activeTab === "my-habits"} onClick={() => setActiveTab("my-habits")}>My Habits</CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "add"} onClick={() => setActiveTab("add")}>Add Habit</CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "library"} onClick={() => setActiveTab("library")}>
            Habit Library
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "progress"} onClick={() => setActiveTab("progress")}>
            Progress
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "insights"} onClick={() => setActiveTab("insights")}>
            Insights
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "history"} onClick={() => setActiveTab("history")}>
            History
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "automation"} onClick={() => setActiveTab("automation")}>
            Automation
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "rewards"} onClick={() => setActiveTab("rewards")}>
            Rewards
          </CNavLink>
        </CNavItem>
      </CNav>

      {signalsError && <CAlert color="warning">{signalsError}</CAlert>}

      <CTabContent>
        <CTabPane visible={activeTab === "my-habits"}>
          <MyHabitsTab onAddClick={() => setActiveTab("add")} onProgressLogged={refreshSignals} />
        </CTabPane>
        <CTabPane visible={activeTab === "add"}>
          <div className="mt-3">
            <AddHabit />
          </div>
        </CTabPane>
        <CTabPane visible={activeTab === "library"}>
          <div className="mt-3">
            <HabitLibrary />
          </div>
        </CTabPane>
        <CTabPane visible={activeTab === "progress"}>
          <div className="mt-3">
            <ProgressTracker />
          </div>
        </CTabPane>
        <CTabPane visible={activeTab === "insights"}>
          <InsightsTab
            analytics={analytics}
            historyEntries={historyEntries}
            loading={signalsLoading}
            error={signalsError}
            onRefresh={refreshSignals}
          />
        </CTabPane>
        <CTabPane visible={activeTab === "history"}>
          <HistoryTab
            entries={historyEntries}
            loading={signalsLoading}
            error={signalsError}
            onRefresh={refreshSignals}
          />
        </CTabPane>
        <CTabPane visible={activeTab === "automation"}>
          <AutomationTab summary={summary} loading={signalsLoading} />
        </CTabPane>
        <CTabPane visible={activeTab === "rewards"}>
          <RewardsTab summary={summary} loading={signalsLoading} />
        </CTabPane>
      </CTabContent>

    </div>
  )
}

export default Habits
