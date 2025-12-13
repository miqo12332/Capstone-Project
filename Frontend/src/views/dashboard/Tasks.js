import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  CAlert,
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
  CSpinner,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilList,
  cilPlus,
  cilTask,
  cilTrash,
  cilWatch,
} from "@coreui/icons"

import { createTask, deleteTask, getTasks } from "../../services/tasks"

const defaultDraft = {
  name: "",
  duration_minutes: 60,
  min_duration_minutes: 30,
  max_duration_minutes: 120,
  split_up: true,
  hours_label: "Working Hours",
  schedule_after: "",
  due_date: "",
  color: "#4f46e5",
  status: "pending",
}

const Tasks = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(() => ({ ...defaultDraft }))
  const [feedback, setFeedback] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null)
  const [deletingTaskId, setDeletingTaskId] = useState(null)
  const [taskEdits, setTaskEdits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("taskEdits") || "{}")
    } catch (error) {
      console.error("Failed to read stored edits", error)
      return {}
    }
  })
  const [editTitle, setEditTitle] = useState("")
  const [editNotes, setEditNotes] = useState("")

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
      const normalized = (Array.isArray(data) ? data : []).map((task) => ({
        ...task,
        status: task.status || "pending",
        color: task.color || "#4f46e5",
      }))
      setTasks(normalized)
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
  }

  const closeDetails = () => {
    setSelectedTask(null)
  }

  const handleDeleteTask = async () => {
    if (!confirmDeleteTask) return
    setDeletingTaskId(confirmDeleteTask.id)
    setFeedback(null)

    try {
      await deleteTask(confirmDeleteTask.id)
      setTasks((prev) => prev.filter((task) => task.id !== confirmDeleteTask.id))
      if (selectedTask?.id === confirmDeleteTask.id) {
        closeDetails()
      }
      setFeedback({ type: "success", message: "Task deleted." })
    } catch (error) {
      console.error("Failed to delete task", error)
      setFeedback({ type: "danger", message: error.message || "Unable to delete task." })
    } finally {
      setDeletingTaskId(null)
      setConfirmDeleteTask(null)
    }
  }

  const moveTask = useCallback((fromId, toId) => {
    setTasks((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId)
      const toIndex = prev.findIndex((item) => item.id === toId)

      if (fromIndex === -1 || toIndex === -1) return prev

      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }, [])

  const handleDragStart = (taskId) => {
    setDraggedId(taskId)
  }

  const handleDragEnter = (targetId) => {
    if (draggedId && draggedId !== targetId) {
      moveTask(draggedId, targetId)
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  const displayTasks = useMemo(
    () =>
      tasks.map((task) => {
        const edits = taskEdits[task.id] || {}
        return {
          ...task,
          name: edits.name?.trim() || task.name,
          notes: edits.notes || "",
        }
      }),
    [taskEdits, tasks],
  )

  useEffect(() => {
    if (!selectedTask) return

    setSelectedTask((prev) => {
      if (!prev) return prev
      const latest = displayTasks.find((task) => task.id === prev.id)
      if (!latest) return prev
      const hasChanged = latest.name !== prev.name || latest.notes !== prev.notes
      return hasChanged ? latest : prev
    })
  }, [displayTasks, selectedTask])

  useEffect(() => {
    if (!selectedTask) return
    const edits = taskEdits[selectedTask.id] || {}
    setEditTitle(edits.name || selectedTask.name || "")
    setEditNotes(edits.notes || "")
  }, [selectedTask, taskEdits])

  const saveTaskEdits = (taskId, updates) => {
    setTaskEdits((prev) => {
      const next = { ...prev, [taskId]: { ...(prev[taskId] || {}), ...updates } }
      localStorage.setItem("taskEdits", JSON.stringify(next))
      return next
    })
  }

  const handleSaveDetails = () => {
    if (!selectedTask) return

    const trimmedTitle = editTitle.trim() || selectedTask.name
    saveTaskEdits(selectedTask.id, { name: trimmedTitle, notes: editNotes })
    setTasks((prev) => prev.map((task) => (task.id === selectedTask.id ? { ...task, name: trimmedTitle } : task)))
    setSelectedTask((prev) => (prev ? { ...prev, name: trimmedTitle, notes: editNotes } : prev))
    setFeedback({ type: "success", message: "Task updated. Changes are stored on this device." })
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
            <>
              <div className="mb-3 text-body-secondary small">
                Drag tasks to reorder them. Click a task name to see its details.
              </div>
              <CListGroup className="shadow-sm">
                {displayTasks.map((task) => (
                  <CListGroupItem
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnter={() => handleDragEnter(task.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`d-flex align-items-center justify-content-between gap-3 ${
                      draggedId === task.id ? "border-primary border-2" : ""
                    }`}
                  >
                    <div className="d-flex align-items-center gap-3 flex-grow-1">
                      <span
                        className="rounded-circle"
                        style={{
                          width: 18,
                          height: 18,
                          display: "inline-block",
                          cursor: "grab",
                          border: `2px solid ${task.color || "#d1d5db"}`,
                        }}
                        aria-label={`Task color ${task.color || "purple"}`}
                      />
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none text-start p-0"
                        onClick={() => openDetails(task)}
                      >
                        <div className="fw-semibold text-wrap">{task.name}</div>
                        {task.notes ? (
                          <div className="text-body-secondary small text-truncate" style={{ maxWidth: 260 }}>
                            {task.notes}
                          </div>
                        ) : null}
                      </button>
                    </div>
                    <div className="text-body-secondary small d-flex align-items-center gap-3 flex-wrap justify-content-end">
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        className="p-2 d-flex align-items-center justify-content-center"
                        onClick={() => setConfirmDeleteTask(task)}
                        aria-label={`Delete ${task.name}`}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                      <div className="d-flex align-items-center gap-2">
                        <CIcon icon={cilWatch} className="text-primary" />
                        <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CListGroupItem>
                ))}
              </CListGroup>
            </>
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
            <CCol md={6}>
              <CFormLabel>Task color</CFormLabel>
              <div className="d-flex align-items-center gap-2">
                <CFormInput
                  type="color"
                  value={draft.color}
                  onChange={(e) => handleDraftChange("color", e.target.value)}
                  style={{ width: 64 }}
                />
                <small className="text-body-secondary">Shown on the list icon.</small>
              </div>
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

      <CModal alignment="center" visible={Boolean(selectedTask)} onClose={closeDetails} size="lg">
        <CModalHeader closeButton className="border-0 pb-1">
          <CModalTitle className="w-100">
            <div className="d-flex align-items-center gap-3">
              <span
                className="rounded-circle"
                style={{
                  width: 22,
                  height: 22,
                  border: `2px solid ${selectedTask?.color || "#d1d5db"}`,
                  display: "inline-block",
                }}
                aria-hidden
              />
              <div className="w-100">
                <div className="text-uppercase text-medium-emphasis small mb-1">Task</div>
                <CFormInput
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  className="border-0 border-bottom rounded-0 shadow-0 ps-0"
                />
              </div>
            </div>
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="pt-2">
          {selectedTask && (
            <CForm className="d-flex flex-column gap-3">
              <div>
                <CFormLabel className="text-medium-emphasis">Notes</CFormLabel>
                <CFormTextarea
                  rows={8}
                  placeholder="Capture ideas, plans, and reminders—just like a note."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="bg-body-secondary border-0"
                />
              </div>
              <div className="small text-body-secondary">
                Changes are kept on this device so you can jot things down quickly.
              </div>
            </CForm>
          )}
        </CModalBody>
        <CModalFooter className="border-0 d-flex justify-content-between">
          <div className="text-body-secondary small">Tap save to keep your edits visible in the list.</div>
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="ghost" onClick={closeDetails}>
              Close
            </CButton>
            <CButton color="primary" onClick={handleSaveDetails}>
              Save
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      <CModal
        alignment="center"
        visible={Boolean(confirmDeleteTask)}
        onClose={() => setConfirmDeleteTask(null)}
      >
        <CModalHeader closeButton>
          <CModalTitle>Delete task</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {confirmDeleteTask ? (
            <>
              <p className="mb-1">Are you sure you want to delete this task?</p>
              <p className="fw-semibold">{confirmDeleteTask.name}</p>
              <p className="text-body-secondary mb-0">
                This action cannot be undone and will remove the task from your list.
              </p>
            </>
          ) : null}
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={() => setConfirmDeleteTask(null)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDeleteTask} disabled={Boolean(deletingTaskId)}>
            {deletingTaskId ? <CSpinner size="sm" className="me-2" /> : null}
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Tasks
