import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CFormInput,
  CFormLabel,
  CFormCheck,
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
  CTooltip,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilClock,
  cilChartLine,
  cilBadge,
  cilList,
  cilBolt,
  cilPlus,
  cilPencil,
  cilTrash,
} from "@coreui/icons"

import AddHabit from "./AddHabit"
import HabitLibrary from "./HabitLibrary"
import ProgressTracker from "./ProgressTracker"
import HabitCoach from "./HabitCoach"
import { deleteHabit, getHabits, updateHabit } from "../../services/habits"
import { getProgressHistory, updateHabitProgressCount } from "../../services/progress"
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

const MyHabitsTab = ({ onAddClick, onProgressLogged }) => {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editDraft, setEditDraft] = useState(createEditDraft({}))
  const [savingEdit, setSavingEdit] = useState(false)
  const [historyEntries, setHistoryEntries] = useState([])
  const [historyError, setHistoryError] = useState("")
  const [calendarSaving, setCalendarSaving] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const today = useMemo(() => new Date(), [])
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

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
      setFeedback((prev) => (prev?.type === "danger" ? null : prev))
    } catch (error) {
      console.error("Failed to load habits", error)
      setFeedback({ type: "danger", message: "Unable to load your habits." })
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadHistory = useCallback(async () => {
    if (!userId) return
    try {
      const data = await getProgressHistory(userId)
      setHistoryEntries(Array.isArray(data) ? data : [])
      setHistoryError("")
    } catch (error) {
      console.error("Failed to load progress history", error)
      setHistoryEntries([])
      setHistoryError("Recent history is temporarily unavailable.")
    }
  }, [userId])

  useEffect(() => {
    loadHabits()
    loadHistory()
  }, [loadHabits, loadHistory])

  useDataRefresh(
    [REFRESH_SCOPES.HABITS, REFRESH_SCOPES.PROGRESS],
    useCallback(() => {
      loadHabits()
      loadHistory()
    }, [loadHabits, loadHistory]),
  )

  const cycleStatus = useCallback((status) => {
    if (status === "done") return "missed"
    if (status === "missed") return null
    return "done"
  }, [])

  const historyByHabit = useMemo(() => {
    return historyEntries.reduce((acc, entry) => {
      const habitKey = String(entry.habitId ?? entry.habit_id ?? "")
      if (!habitKey) return acc
      const dateKey = (entry.progressDate || entry.createdAt || "").slice(0, 10)
      if (!dateKey) return acc
      if (!acc[habitKey]) acc[habitKey] = {}
      acc[habitKey][dateKey] = entry.status
      return acc
    }, {})
  }, [historyEntries])

  const updateCountsForDate = useCallback(
    async (habitId, dateKey, nextStatus) => {
      if (!userId) return

      const targetCounts = {
        done: nextStatus === "done" ? 1 : 0,
        missed: nextStatus === "missed" ? 1 : 0,
      }

      await Promise.all([
        updateHabitProgressCount(habitId, {
          userId,
          status: "done",
          targetCount: targetCounts.done,
          date: dateKey,
        }),
        updateHabitProgressCount(habitId, {
          userId,
          status: "missed",
          targetCount: targetCounts.missed,
          date: dateKey,
        }),
      ])
    },
    [userId],
  )

  const handleCalendarToggle = useCallback(
    async (habit, dateKey) => {
      const habitId = habit?.id || habit?.habitId
      if (!habitId || !userId) return

      const currentStatus = historyByHabit[String(habitId)]?.[dateKey] || null
      const nextStatus = cycleStatus(currentStatus)

      try {
        setCalendarSaving(`${habitId}-${dateKey}`)
        await updateCountsForDate(habitId, dateKey, nextStatus)
        emitDataRefresh(REFRESH_SCOPES.PROGRESS, { habitId, status: nextStatus || "cleared", date: dateKey })
        emitDataRefresh(REFRESH_SCOPES.ANALYTICS, { habitId, status: nextStatus || "cleared", date: dateKey })
        setHistoryEntries((prev) => {
          const filtered = prev.filter((entry) => {
            const entryHabitId = String(entry.habitId ?? entry.habit_id ?? "")
            const entryDate = (entry.progressDate || entry.createdAt || "").slice(0, 10)
            return !(entryHabitId === String(habitId) && entryDate === dateKey)
          })

          if (!nextStatus) return filtered

          const nextEntry = {
            id: `${habitId}-${dateKey}`,
            habitId,
            habit_id: habitId,
            habitTitle: habit.title || habit.name || habit.habitName || "Habit",
            status: nextStatus,
            progressDate: dateKey,
            createdAt: new Date().toISOString(),
          }

          return [...filtered, nextEntry]
        })
        setFeedback({
          type: nextStatus === "missed" ? "warning" : "success",
          message:
            nextStatus === null
              ? `Cleared log for ${habit.title || habit.name || habit.habitName} on ${dateKey}.`
              : `Marked ${nextStatus} for ${habit.title || habit.name || habit.habitName} on ${dateKey}.`,
        })
      } catch (error) {
        console.error("Failed to update day status", error)
        setFeedback({ type: "danger", message: "We couldn't update that day just now." })
      } finally {
        setCalendarSaving(null)
      }
    },
    [cycleStatus, historyByHabit, updateCountsForDate, userId],
  )

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

  const removeHabit = async (habitId) => {
    if (!habitId) return
    const confirmDelete = window.confirm("Remove this habit? This cannot be undone.")
    if (!confirmDelete) return

    try {
      setDeletingId(habitId)
      await deleteHabit(habitId)
      setHabits((prev) => prev.filter((habit) => habit.id !== habitId))
      setHistoryEntries((prev) =>
        prev.filter((entry) => String(entry.habitId ?? entry.habit_id) !== String(habitId)),
      )
      setFeedback({ type: "success", message: "Habit removed." })
      emitDataRefresh(REFRESH_SCOPES.HABITS, { reason: "habit-removed", habitId })
    } catch (error) {
      console.error("Failed to delete habit", error)
      setFeedback({ type: "danger", message: "Could not remove this habit." })
    } finally {
      setDeletingId(null)
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

  const formatDateKey = useCallback((date) => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString()
      .split("T")[0]
  }, [])

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index,
        label: new Date(2000, index, 1).toLocaleDateString(undefined, { month: "long" }),
      })),
    [],
  )

  const yearOptions = useMemo(() => {
    const baseYear = today.getFullYear()
    return Array.from({ length: 5 }, (_, index) => baseYear - 2 + index)
  }, [today])

  const visibleDays = useMemo(() => {
    const days = []
    const cursor = new Date(selectedYear, selectedMonth, 1)
    while (cursor.getMonth() === selectedMonth) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }, [selectedMonth, selectedYear])

  const weeks = useMemo(() => {
    const chunks = []
    for (let i = 0; i < visibleDays.length; i += 7) {
      chunks.push(visibleDays.slice(i, i + 7))
    }
    return chunks
  }, [visibleDays])

  const historyByDate = useMemo(() => {
    return historyEntries.reduce((map, entry) => {
      const dateKey = (entry.progressDate || entry.createdAt || "").slice(0, 10)
      if (!dateKey) return map
      const list = map.get(dateKey) || []
      list.push(entry)
      map.set(dateKey, list)
      return map
    }, new Map())
  }, [historyEntries])

  const visibleDateKeys = useMemo(
    () => new Set(visibleDays.map(formatDateKey)),
    [formatDateKey, visibleDays],
  )

  const visibleLogs = useMemo(
    () =>
      historyEntries.filter((entry) =>
        visibleDateKeys.has((entry.progressDate || entry.createdAt || "").slice(0, 10)),
      ),
    [historyEntries, visibleDateKeys],
  )

  const completionCount = useMemo(
    () => visibleLogs.filter((entry) => entry.status === "done").length,
    [visibleLogs],
  )

  const missedCount = useMemo(
    () => visibleLogs.filter((entry) => entry.status === "missed").length,
    [visibleLogs],
  )

  const completionRate = useMemo(() => {
    const total = completionCount + missedCount
    return total ? Math.round((completionCount / total) * 100) : 0
  }, [completionCount, missedCount])

  const completedHabitsCount = useMemo(() => {
    const set = new Set()
    visibleLogs.forEach((entry) => {
      if (entry.status === "done") {
        const key = String(entry.habitId ?? entry.habit_id ?? entry.habitTitle ?? "")
        if (key) set.add(key)
      }
    })
    return set.size
  }, [visibleLogs])

  const weeklyCompletion = useMemo(
    () =>
      weeks.map((week, index) => {
        const logs = week.flatMap((day) => historyByDate.get(formatDateKey(day)) || [])
        const total = logs.filter((log) => log.status === "done" || log.status === "missed").length
        const done = logs.filter((log) => log.status === "done").length
        const percent = total ? Math.round((done / total) * 100) : 0
        return { label: `Week ${index + 1}`, percent, total }
      }),
    [formatDateKey, historyByDate, weeks],
  )

  const habitProgress = useMemo(() => {
    const progressMap = new Map()
    habits.forEach((habit) => {
      const statuses = historyByHabit[String(habit.id)] || {}
      let done = 0
      let total = 0
      visibleDays.forEach((day) => {
        const status = statuses[formatDateKey(day)]
        if (status === "done") done += 1
        if (status === "done" || status === "missed") total += 1
      })
      const rate = total ? Math.round((done / total) * 100) : 0
      progressMap.set(habit.id, { rate, done, total })
    })
    return progressMap
  }, [formatDateKey, habits, historyByHabit, visibleDays])

  const currentMonthLabel = useMemo(
    () => new Date(selectedYear, selectedMonth, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [selectedMonth, selectedYear],
  )

  const DayStatusCheckbox = ({ status, onToggle, disabled, inputId, title }) => {
    const mark = status === "done" ? "✓" : status === "missed" ? "✕" : ""

    return (
      <button
        type="button"
        className={`month-checkbox status-${status || "empty"}${disabled ? " is-saving" : ""}`}
        aria-label={title}
        aria-pressed={Boolean(status)}
        disabled={disabled}
        onClick={onToggle}
        title={title}
        id={inputId}
      >
        <span className="month-checkbox__mark" aria-hidden="true">
          {mark}
        </span>
        <span className="visually-hidden">Toggle day status</span>
      </button>
    )
  }

  return (
    <div className="mt-3 habits-section">
      <CRow className="g-4">
        <CCol xs={12}>
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
            <CCardBody className="d-flex flex-column gap-4">
              {feedback && <CAlert color={feedback.type}>{feedback.message}</CAlert>}
              {historyError && <CAlert color="warning">{historyError}</CAlert>}

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 tracker-summary">
                <div className="d-flex flex-column gap-2">
                  <div className="text-uppercase small text-muted">Month view</div>
                  <h5 className="mb-1">{currentMonthLabel}</h5>
                  <p className="text-body-secondary mb-0">
                    Hover over a habit to see more info. Click any day to cycle done → missed → clear for that habit.
                  </p>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <CFormSelect
                      aria-label="Select month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="month-select"
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                    <CFormSelect
                      aria-label="Select year"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="year-select"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-3">
                  <div className="tracker-pill">
                    <div className="text-uppercase small text-muted">Number of habits</div>
                    <div className="fw-bold fs-4">{habits.length}</div>
                  </div>
                  <div className="tracker-pill">
                    <div className="text-uppercase small text-muted">Completed habits</div>
                    <div className="fw-bold fs-4">{completedHabitsCount}</div>
                  </div>
                  <div className="tracker-pill">
                    <div className="text-uppercase small text-muted">Progress</div>
                    <div className="d-flex align-items-center gap-2">
                      <div className="flex-grow-1">
                        <CProgress value={completionRate} color="success" />
                      </div>
                      <span className="fw-semibold">{completionRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <CSpinner color="primary" />
                </div>
              ) : habits.length === 0 ? (
                emptyState
              ) : (
                <>
                  <div className="tracker-grid-wrapper">
                    <div className="habit-tracker-grid" style={{ "--habit-day-count": visibleDays.length }}>
                      <div className="tracker-cell tracker-head habit-col">
                        <div className="d-flex flex-column gap-1">
                          <span className="text-uppercase small text-muted">Our habits</span>
                          <span className="fw-semibold">Daily tracker</span>
                        </div>
                      </div>
                      {visibleDays.map((day) => (
                        <div key={`head-${formatDateKey(day)}`} className="tracker-cell tracker-head text-center">
                          <div className="date-header">
                            <span className="weekday-label">
                              {day.toLocaleDateString(undefined, { weekday: "short" })}
                            </span>
                            <span className="tiny-date">
                              <span>{day.toLocaleDateString(undefined, { month: "short" })}</span>
                              <span>{day.getDate()}</span>
                            </span>
                          </div>
                        </div>
                      ))}

                      {habits.map((habit) => {
                        const progress = habitProgress.get(habit.id) || { rate: 0 }
                        const habitKey = String(habit.id)
                        return (
                          <React.Fragment key={habit.id}>
                            <div className="tracker-cell habit-col">
                                <div className="habit-meta">
                                  <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <CTooltip
                                      content={`${habit.description || "No description yet."}${
                                        habit.target_reps ? ` • Target ${habit.target_reps}` : ""
                                      }${habit.category ? ` • ${habit.category}` : ""}`}
                                      placement="bottom"
                                    >
                                      <span className="fw-semibold habit-title cursor-help">{habit.title}</span>
                                    </CTooltip>
                                    {habit.category && (
                                      <CBadge color="light" className="text-uppercase small habit-tag">
                                        {habit.category}
                                      </CBadge>
                                    )}
                                    {habit.is_daily_goal && <CBadge color="success">Daily</CBadge>}
                                    <div className="habit-actions">
                                      <CTooltip content="Edit" placement="top">
                                        <CButton
                                          size="sm"
                                          color="light"
                                          variant="ghost"
                                          onClick={() => startEdit(habit)}
                                        >
                                          <CIcon icon={cilPencil} />
                                        </CButton>
                                      </CTooltip>
                                      <CTooltip content="Delete" placement="top">
                                        <CButton
                                          size="sm"
                                          color="danger"
                                          variant="ghost"
                                          disabled={deletingId === habit.id}
                                          onClick={() => removeHabit(habit.id)}
                                        >
                                          {deletingId === habit.id ? (
                                            <CSpinner size="sm" component="span" />
                                          ) : (
                                            <CIcon icon={cilTrash} />
                                          )}
                                        </CButton>
                                      </CTooltip>
                                    </div>
                                  </div>
                                {habit.description && <p className="habit-desc">{habit.description}</p>}
                                {habit.target_reps ? (
                                  <p className="habit-desc text-muted mb-0">🎯 Target: {habit.target_reps}</p>
                                ) : null}
                                <div className="habit-progress-row">
                                  <CProgress
                                    value={progress.rate}
                                    color="success"
                                    className="flex-grow-1 habit-progress"
                                  />
                                  <span className="habit-progress-rate text-muted">{progress.rate}%</span>
                                </div>
                              </div>
                            </div>
                            {visibleDays.map((day) => {
                              const dateKey = formatDateKey(day)
                              const status = historyByHabit[habitKey]?.[dateKey]
                              const isSaving = calendarSaving === `${habit.id}-${dateKey}`
                              return (
                                <div
                                  key={`${habit.id}-${dateKey}`}
                                  className={`tracker-cell day-cell status-${status || "empty"}`}
                                >
                                  <DayStatusCheckbox
                                    status={status}
                                    disabled={isSaving}
                                    inputId={`${habit.id}-${dateKey}`}
                                    title={`${habit.title} on ${day.toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}`}
                                    onToggle={() => handleCalendarToggle(habit, dateKey)}
                                  />
                                </div>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-3 bg-body-tertiary p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold">Weekly completion</span>
                      <span className="text-muted small">Selected month</span>
                    </div>
                    <CRow className="g-3">
                      {weeklyCompletion.map((week) => (
                        <CCol sm={6} lg={3} key={week.label}>
                          <div className="mini-progress-card p-3 h-100">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-semibold">{week.label}</span>
                              <span className="text-muted small">{week.total || "No"} logs</span>
                            </div>
                            <CProgress
                              className="mt-2"
                              value={week.percent}
                              color={week.percent >= 70 ? "success" : week.percent >= 40 ? "warning" : "danger"}
                            />
                            <div className="small text-muted mt-1">{week.percent}% completion</div>
                          </div>
                        </CCol>
                      ))}
                    </CRow>
                  </div>
                </>
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
      return { label, chance: percent, date: day.date }
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
                  <div key={day.date || day.label}>
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
  const navigate = useNavigate()
  const location = useLocation()

  const tabFromPath = useCallback((pathname) => {
    if (pathname.includes("/addhabit")) return "add"
    if (pathname.includes("/habit-library")) return "library"
    if (pathname.includes("/progress-tracker")) return "progress"
    if (pathname.includes("/habit-coach")) return "coach"
    if (pathname.includes("/ai-chat")) return "coach"
    return "my-habits"
  }, [])

  const pathForTab = useCallback((tab) => {
    switch (tab) {
      case "add":
        return "/addhabit"
      case "library":
        return "/habit-library"
      case "progress":
        return "/progress-tracker"
      case "coach":
        return "/habit-coach"
      default:
        return "/habits"
    }
  }, [])

  const [activeTab, setActiveTab] = useState(() => tabFromPath(location.pathname))
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

  useEffect(() => {
    const nextTab = tabFromPath(location.pathname)
    setActiveTab(nextTab)
  }, [location.pathname, tabFromPath])

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab)
      navigate(pathForTab(tab))
    },
    [navigate, pathForTab],
  )

  const goToAddTab = useCallback(() => {
    handleTabChange("add")
    requestAnimationFrame(() => {
      const addSection = document.getElementById("add-habit-section")
      if (addSection) {
        addSection.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    })
  }, [handleTabChange])

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
            <CButton color="primary" size="sm" className="rounded-pill" onClick={goToAddTab}>
              <CIcon icon={cilPlus} className="me-2" /> Add habit
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
          <CNavLink active={activeTab === "my-habits"} onClick={() => handleTabChange("my-habits")}>
            My Habits
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "add"} onClick={goToAddTab}>
            Add Habit
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "library"} onClick={() => handleTabChange("library")}>
            Habit Library
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "progress"} onClick={() => handleTabChange("progress")}>
            Progress
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "coach"} onClick={() => handleTabChange("coach")}>
            HabitCoach
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
          <MyHabitsTab onAddClick={goToAddTab} onProgressLogged={refreshSignals} />
        </CTabPane>
        <CTabPane visible={activeTab === "add"}>
          <div className="mt-3" id="add-habit-section">
            <AddHabit />
          </div>
        </CTabPane>
        <CTabPane visible={activeTab === "library"}>
          <div className="mt-3">
            <HabitLibrary />
          </div>
        </CTabPane>
        <CTabPane visible={activeTab === "progress"}>
          {activeTab === "progress" && (
            <div className="mt-3">
              <ProgressTracker />
            </div>
          )}
        </CTabPane>
        <CTabPane visible={activeTab === "coach"}>
          {activeTab === "coach" && (
            <div className="mt-3">
              <HabitCoach />
            </div>
          )}
        </CTabPane>
        <CTabPane visible={activeTab === "insights"}>
          {activeTab === "insights" && (
            <InsightsTab
              analytics={analytics}
              historyEntries={historyEntries}
              loading={signalsLoading}
              error={signalsError}
              onRefresh={refreshSignals}
            />
          )}
        </CTabPane>
        <CTabPane visible={activeTab === "history"}>
          {activeTab === "history" && (
            <HistoryTab
              entries={historyEntries}
              loading={signalsLoading}
              error={signalsError}
              onRefresh={refreshSignals}
            />
          )}
        </CTabPane>
        <CTabPane visible={activeTab === "automation"}>
          {activeTab === "automation" && <AutomationTab summary={summary} loading={signalsLoading} />}
        </CTabPane>
        <CTabPane visible={activeTab === "rewards"}>
          {activeTab === "rewards" && <RewardsTab summary={summary} loading={signalsLoading} />}
        </CTabPane>
      </CTabContent>

    </div>
  )
}

export default Habits
