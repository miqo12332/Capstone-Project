import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilArrowRight, cilList, cilPlus, cilSend, cilTask, cilWatch } from "@coreui/icons"

import { createTask, getTasks } from "../../services/tasks"
import { sendReasoningRequest } from "../../services/ai"

const defaultDraft = {
  name: "",
  duration_minutes: 60,
  min_duration_minutes: 30,
  max_duration_minutes: 120,
  split_up: true,
  hours_label: "Working Hours",
  schedule_after: "",
  due_date: "",
}

const formatDuration = (minutes) => {
  if (!minutes) return "n/a"
  if (minutes % 60 === 0) return `${minutes / 60} hr${minutes === 60 ? "" : "s"}`
  return `${minutes} mins`
}

const Tasks = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(() => ({ ...defaultDraft }))
  const [feedback, setFeedback] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [subpoints, setSubpoints] = useState({})
  const [subpointInput, setSubpointInput] = useState("")
  const [aiMessage, setAiMessage] = useState("")
  const [aiHistory, setAiHistory] = useState({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const userId = user?.id

  const emptyState = useMemo(
    () => ({
      title: "Your task list is empty",
      helper: "Capture your focus tasks and we will keep them ready to schedule.",
    }),
    [],
  )

  const loadTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      setTasks([])
      return
    }
    try {
      setLoading(true)
      const data = await getTasks(userId)
      setTasks(Array.isArray(data) ? data : [])
      setFeedback(null)
    } catch (error) {
      console.error("Failed to load tasks", error)
      setFeedback({ type: "danger", message: "Unable to load your tasks." })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleDraftChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleNumberChange = (key) => (e) => {
    const value = e.target.value
    handleDraftChange(key, value === "" ? "" : Number(value))
  }

  const resetDraft = () => {
    setDraft({ ...defaultDraft })
  }

  const handleCreate = async () => {
    if (!draft.name?.trim()) {
      setFeedback({ type: "warning", message: "Please add a task name before creating." })
      return
    }

    try {
      setSaving(true)
      const payload = {
        ...draft,
        user_id: userId,
      }
      await createTask(payload)
      await loadTasks()
      setShowModal(false)
      resetDraft()
      setFeedback({ type: "success", message: "Task created and saved." })
    } catch (error) {
      console.error("Failed to create task", error)
      setFeedback({ type: "danger", message: error.message || "Unable to create task." })
    } finally {
      setSaving(false)
    }
  }

  const openDetails = (task) => {
    setSelectedTask(task)
    setSubpointInput("")
    setAiMessage("")
    setAiError(null)
  }

  const closeDetails = () => {
    setSelectedTask(null)
    setSubpointInput("")
    setAiMessage("")
    setAiError(null)
  }

  const taskSubpoints = selectedTask ? subpoints[selectedTask.id] || [] : []
  const taskHistory = selectedTask ? aiHistory[selectedTask.id] || [] : []

  const handleAddSubpoint = () => {
    const trimmed = subpointInput.trim()
    if (!selectedTask || !trimmed) return

    setSubpoints((prev) => ({
      ...prev,
      [selectedTask.id]: [...(prev[selectedTask.id] || []), trimmed],
    }))
    setSubpointInput("")
  }

  const handleSendAi = async () => {
    if (!selectedTask) return
    const trimmed = aiMessage.trim()
    if (!trimmed) return

    const baseHistory = aiHistory[selectedTask.id] || []
    const optimisticHistory = [
      ...baseHistory,
      { role: "user", content: trimmed, id: `local-${Date.now()}` },
    ]

    setAiHistory((prev) => ({ ...prev, [selectedTask.id]: optimisticHistory }))
    setAiMessage("")
    setAiLoading(true)
    setAiError(null)

    try {
      const snapshot = {
        task: selectedTask,
        subpoints: taskSubpoints,
        totalTasks: tasks.length,
      }

      const response = await sendReasoningRequest({
        snapshot,
        insightText: "Help me work on this task",
        history: optimisticHistory,
      })

      const assistantMessage = {
        role: "assistant",
        content: response.reply,
        id: `assistant-${Date.now()}`,
      }

      setAiHistory((prev) => ({
        ...prev,
        [selectedTask.id]: [...optimisticHistory, assistantMessage],
      }))
    } catch (error) {
      console.error("Failed to send AI request", error)
      setAiError(error.message || "Unable to talk with the AI right now.")
      setAiHistory((prev) => ({ ...prev, [selectedTask.id]: baseHistory }))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="py-3">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-uppercase small text-secondary mb-1">Tasks</p>
          <h2 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <CIcon icon={cilTask} className="text-primary" />
            Task board
          </h2>
          <p className="text-body-secondary mb-0">Plan tasks, duration, and deadlines before scheduling.</p>
        </div>
        <div className="d-flex gap-2">
          <CButton color="light" className="text-primary" onClick={() => setShowModal(true)}>
            <CIcon icon={cilPlus} className="me-2" /> New Task
          </CButton>
        </div>
      </div>

      {feedback && (
        <CAlert color={feedback.type} className="shadow-sm">
          {feedback.message}
        </CAlert>
      )}

      <CCard className="border-0 shadow-sm">
        <CCardHeader className="bg-white d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <CIcon icon={cilList} className="text-primary" />
            <div>
              <div className="fw-semibold">All tasks</div>
              <small className="text-body-secondary">{tasks.length} total</small>
            </div>
          </div>
          <CButton color="primary" onClick={() => setShowModal(true)}>
            <CIcon icon={cilPlus} className="me-2" /> Add task
          </CButton>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3 display-6">📋</div>
              <h5 className="fw-semibold">{emptyState.title}</h5>
              <p className="text-body-secondary mb-4">{emptyState.helper}</p>
              <CButton color="primary" onClick={() => setShowModal(true)}>
                <CIcon icon={cilPlus} className="me-2" /> New Task
              </CButton>
            </div>
          ) : (
            <CRow className="g-3">
              {tasks.map((task) => (
                <CCol md={6} lg={4} key={task.id}>
                  <CCard className="h-100 border shadow-sm">
                    <CCardBody>
                      <div className="d-flex align-items-start justify-content-between mb-2">
                        <div>
                          <div className="fw-semibold">{task.name}</div>
                          <div className="text-body-secondary small">
                            Created {new Date(task.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {task.split_up && (
                          <CBadge color="info" shape="rounded-pill">
                            Split up
                          </CBadge>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2 text-body-secondary small mb-2">
                        <CIcon icon={cilWatch} className="text-primary" />
                        <span>
                          Duration {formatDuration(task.duration_minutes)}
                          {task.min_duration_minutes
                            ? ` • Min ${formatDuration(task.min_duration_minutes)}`
                            : ""}
                          {task.max_duration_minutes
                            ? ` • Max ${formatDuration(task.max_duration_minutes)}`
                            : ""}
                        </span>
                      </div>

                      <div className="d-flex flex-wrap gap-2 small text-body-secondary">
                        {task.hours_label && <CBadge color="light">{task.hours_label}</CBadge>}
                        {task.schedule_after && (
                          <CBadge color="light">
                            Start after {new Date(task.schedule_after).toLocaleString()}
                          </CBadge>
                        )}
                        {task.due_date && (
                          <CBadge color="warning" textColor="dark">
                            Due {new Date(task.due_date).toLocaleString()}
                          </CBadge>
                        )}
                        <CButton
                          color="light"
                          size="sm"
                          className="ms-auto"
                          onClick={() => openDetails(task)}
                        >
                          <CIcon icon={cilArrowRight} className="me-2" /> Open
                        </CButton>
                      </div>
                    </CCardBody>
                  </CCard>
                </CCol>
              ))}
            </CRow>
          )}
        </CCardBody>
      </CCard>

      <CModal
        alignment="center"
        visible={showModal}
        onClose={() => {
          setShowModal(false)
          resetDraft()
        }}
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>Add task</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm className="row g-3">
            <CCol md={12}>
              <CFormLabel>Task name</CFormLabel>
              <CFormInput
                type="text"
                placeholder="New marketing page"
                value={draft.name}
                onChange={(e) => handleDraftChange("name", e.target.value)}
                autoFocus
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Duration (minutes)</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  min={15}
                  step={15}
                  value={draft.duration_minutes}
                  onChange={handleNumberChange("duration_minutes")}
                />
                <CInputGroupText>mins</CInputGroupText>
              </CInputGroup>
            </CCol>
            <CCol md={6} className="d-flex align-items-end justify-content-end">
              <div className="d-flex align-items-center gap-2">
                <CFormSwitch
                  label="Split up"
                  checked={draft.split_up}
                  onChange={(e) => handleDraftChange("split_up", e.target.checked)}
                />
              </div>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Min duration</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  min={5}
                  step={5}
                  value={draft.min_duration_minutes}
                  onChange={handleNumberChange("min_duration_minutes")}
                />
                <CInputGroupText>mins</CInputGroupText>
              </CInputGroup>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Max duration</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type="number"
                  min={15}
                  step={15}
                  value={draft.max_duration_minutes}
                  onChange={handleNumberChange("max_duration_minutes")}
                />
                <CInputGroupText>mins</CInputGroupText>
              </CInputGroup>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Hours</CFormLabel>
              <CFormInput
                type="text"
                placeholder="Working hours"
                value={draft.hours_label}
                onChange={(e) => handleDraftChange("hours_label", e.target.value)}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Schedule after</CFormLabel>
              <CFormInput
                type="datetime-local"
                value={draft.schedule_after}
                onChange={(e) => handleDraftChange("schedule_after", e.target.value)}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Due date</CFormLabel>
              <CFormInput
                type="datetime-local"
                value={draft.due_date}
                onChange={(e) => handleDraftChange("due_date", e.target.value)}
              />
            </CCol>
          </CForm>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <div className="text-body-secondary small">Tasks are saved to your account.</div>
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </CButton>
            <CButton color="primary" disabled={saving} onClick={handleCreate}>
              {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilTask} className="me-2" />}Create
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      <CModal
        alignment="center"
        visible={Boolean(selectedTask)}
        onClose={closeDetails}
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>
            Talk about: {selectedTask?.name}
            <div className="text-medium-emphasis small fw-normal">
              Share details, add subpoints, and chat with the AI.
            </div>
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedTask && (
            <CRow className="g-3">
              <CCol md={6}>
                <CCard className="border-0 bg-body-secondary mb-3">
                  <CCardBody>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div>
                        <div className="fw-semibold">Task details</div>
                        <small className="text-body-secondary">Quick snapshot for the AI.</small>
                      </div>
                      {selectedTask.split_up && (
                        <CBadge color="info" shape="rounded-pill">
                          Split up
                        </CBadge>
                      )}
                    </div>
                    <div className="text-body-secondary small mb-2">
                      Duration {formatDuration(selectedTask.duration_minutes)}
                      {selectedTask.min_duration_minutes
                        ? ` • Min ${formatDuration(selectedTask.min_duration_minutes)}`
                        : ""}
                      {selectedTask.max_duration_minutes
                        ? ` • Max ${formatDuration(selectedTask.max_duration_minutes)}`
                        : ""}
                    </div>
                    <div className="d-flex flex-wrap gap-2 small">
                      {selectedTask.hours_label && (
                        <CBadge color="light">{selectedTask.hours_label}</CBadge>
                      )}
                      {selectedTask.schedule_after && (
                        <CBadge color="light">
                          Start after {new Date(selectedTask.schedule_after).toLocaleString()}
                        </CBadge>
                      )}
                      {selectedTask.due_date && (
                        <CBadge color="warning" textColor="dark">
                          Due {new Date(selectedTask.due_date).toLocaleString()}
                        </CBadge>
                      )}
                    </div>
                  </CCardBody>
                </CCard>

                <div className="mb-2 d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">Subpoints</div>
                    <small className="text-body-secondary">
                      Break the task down before asking the AI.
                    </small>
                  </div>
                  <CBadge color="light" textColor="dark">
                    {taskSubpoints.length || 0} added
                  </CBadge>
                </div>

                <CInputGroup className="mb-2">
                  <CFormInput
                    placeholder="Add a subpoint"
                    value={subpointInput}
                    onChange={(e) => setSubpointInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddSubpoint()
                      }
                    }}
                  />
                  <CButton color="primary" variant="outline" onClick={handleAddSubpoint}>
                    Add
                  </CButton>
                </CInputGroup>

                <CListGroup className="mb-3">
                  {taskSubpoints.length ? (
                    taskSubpoints.map((point, idx) => (
                      <CListGroupItem key={`${selectedTask.id}-point-${idx}`}>
                        {point}
                      </CListGroupItem>
                    ))
                  ) : (
                    <CListGroupItem className="text-body-secondary">
                      No subpoints yet. Create a couple so the AI can be specific.
                    </CListGroupItem>
                  )}
                </CListGroup>
              </CCol>

              <CCol md={6}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <div className="fw-semibold">Ask the AI</div>
                    <small className="text-body-secondary">
                      The AI sees this task, your subpoints, and recent messages.
                    </small>
                  </div>
                  {aiLoading && <CSpinner size="sm" color="info" />}
                </div>

                <div
                  className="border rounded p-3 mb-3 bg-body-secondary"
                  style={{ minHeight: 220, maxHeight: 320, overflowY: "auto" }}
                >
                  {taskHistory.length ? (
                    taskHistory.map((entry) => (
                      <div key={entry.id} className="mb-3">
                        <small className="text-uppercase text-medium-emphasis fw-semibold d-block mb-1">
                          {entry.role === "user" ? "You" : "AI"}
                        </small>
                        <div
                          className={`p-2 rounded-4 ${
                            entry.role === "assistant" ? "bg-white" : "bg-primary text-white"
                          }`}
                        >
                          {entry.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-body-secondary text-center">
                      Ask a question to start planning this task with the AI.
                    </div>
                  )}
                </div>

                {aiError && <CAlert color="danger">{aiError}</CAlert>}

                <CInputGroup>
                  <CFormTextarea
                    rows={2}
                    placeholder="Ask for help, break down steps, or request coaching"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    disabled={aiLoading}
                  />
                  <CButton color="primary" disabled={aiLoading} onClick={handleSendAi}>
                    {aiLoading ? (
                      <>
                        <CSpinner size="sm" className="me-2" /> Sending
                      </>
                    ) : (
                      <>
                        <CIcon icon={cilSend} className="me-2" /> Send
                      </>
                    )}
                  </CButton>
                </CInputGroup>
              </CCol>
            </CRow>
          )}
        </CModalBody>
        <CModalFooter>
          <div className="text-body-secondary small">AI requests use your task snapshot and notes.</div>
          <CButton color="secondary" variant="ghost" onClick={closeDetails}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Tasks
