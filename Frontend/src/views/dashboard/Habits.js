import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
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
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
  CRow,
  CSpinner,
  CTabContent,
  CTabPane,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilBolt,
  cilChatBubble,
  cilList,
  cilPencil,
  cilPlus,
  cilTrash,
} from "@coreui/icons"

import AddHabit from "./AddHabit"
import HabitLibrary from "./HabitLibrary"
import ProgressTracker from "./ProgressTracker"
import HabitCoach from "./HabitCoach"
import { getHabits, deleteHabit, updateHabit } from "../../services/habits"
import { logHabitProgress } from "../../services/progress"
import { promptMissedReflection } from "../../utils/reflection"
import { getDailyChallengeSummary } from "../../services/dailyChallenge"

const createEditDraft = (habit) => ({
  id: habit?.id,
  title: habit?.title || "",
  description: habit?.description || "",
  category: habit?.category || "",
  target_reps: habit?.target_reps ?? "",
  is_daily_goal: Boolean(habit?.is_daily_goal),
})

const DailyChallengeHighlight = ({ challenge, onLog }) => {
  if (!challenge?.focusHabit) return null
  const focus = challenge.focusHabit
  const progressPercent = focus.targetForToday
    ? Math.min(100, Math.round((focus.doneToday / focus.targetForToday) * 100))
    : 0

  return (
    <CCard className="h-100 shadow-sm border-0">
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
          <CButton color="success" size="sm" onClick={() => onLog(focus, "done")}>Log done</CButton>
          <CButton color="danger" size="sm" variant="outline" onClick={() => onLog(focus, "missed")}>
            Log missed
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

const MyHabitsTab = ({ onAddClick }) => {
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
    <div className="mt-3">
      <CRow className="g-4">
        <CCol lg={4}>
          {challengeError && <CAlert color="warning">{challengeError}</CAlert>}
          <DailyChallengeHighlight challenge={challenge} onLog={handleLog} />
        </CCol>
        <CCol lg={8}>
          <CCard className="shadow-sm border-0 h-100">
            <CCardHeader className="d-flex align-items-center justify-content-between bg-white">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilList} className="text-primary" />
                <span className="fw-semibold">My habits</span>
              </div>
              <div className="d-flex gap-2">
                <CButton color="primary" size="sm" variant="outline" onClick={onAddClick}>
                  <CIcon icon={cilPlus} className="me-1" /> Add habit
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {feedback && <CAlert color={feedback.type}>{feedback.message}</CAlert>}
              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <CSpinner color="primary" />
                </div>
              ) : habits.length === 0 ? (
                emptyState
              ) : (
                <CListGroup flush>
                  {habits.map((habit) => (
                    <CListGroupItem key={habit.id} className="py-3">
                      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-semibold">{habit.title}</span>
                            {habit.category && (
                              <CBadge color="info" className="text-uppercase small">
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
                        <div className="d-flex flex-wrap gap-2">
                          <CButton
                            size="sm"
                            color="success"
                            disabled={loggingState === `${habit.id}-done`}
                            onClick={() => handleLog(habit, "done")}
                          >
                            {loggingState === `${habit.id}-done` ? "Logging..." : "Log done"}
                          </CButton>
                          <CButton
                            size="sm"
                            color="warning"
                            variant="outline"
                            disabled={loggingState === `${habit.id}-missed`}
                            onClick={() => handleLog(habit, "missed")}
                          >
                            {loggingState === `${habit.id}-missed` ? "Logging..." : "Log missed"}
                          </CButton>
                          <CButton size="sm" color="secondary" variant="outline" onClick={() => startEdit(habit)}>
                            <CIcon icon={cilPencil} className="me-1" /> Edit
                          </CButton>
                          <CButton size="sm" color="danger" variant="ghost" onClick={() => handleDelete(habit.id)}>
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

const HabitCoachBubble = () => {
  const [visible, setVisible] = useState(false)

  return (
    <>
      <CButton
        color="info"
        size="lg"
        className="position-fixed shadow habit-coach-bubble"
        style={{ bottom: "24px", right: "24px", zIndex: 1050 }}
        onClick={() => setVisible(true)}
      >
        <CIcon icon={cilChatBubble} className="me-2" /> Habit Coach
      </CButton>
      <COffcanvas placement="end" visible={visible} onHide={() => setVisible(false)} backdrop>
        <COffcanvasHeader closeButton>
          <COffcanvasTitle>
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilChatBubble} />
              <span>Habit Coach</span>
            </div>
          </COffcanvasTitle>
        </COffcanvasHeader>
        <COffcanvasBody className="p-0" style={{ height: "100vh" }}>
          <div className="h-100 overflow-auto">
            <HabitCoach />
          </div>
        </COffcanvasBody>
      </COffcanvas>
    </>
  )
}

const Habits = () => {
  const [activeTab, setActiveTab] = useState("my-habits")

  return (
    <div className="pt-3 pb-5 position-relative">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Habits</h2>
          <p className="text-body-secondary mb-0">
            One home for creating, browsing, tracking, and celebrating your habits.
          </p>
        </div>
        <CBadge color="primary" className="px-3 py-2">
          Unified workspace
        </CBadge>
      </div>

      <CNav variant="tabs" role="tablist" className="mb-3">
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
      </CNav>

      <CTabContent>
        <CTabPane visible={activeTab === "my-habits"}>
          <MyHabitsTab onAddClick={() => setActiveTab("add")} />
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
      </CTabContent>

      <HabitCoachBubble />
    </div>
  )
}

export default Habits
