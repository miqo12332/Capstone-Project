import React, { useEffect, useState } from "react"
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormText,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CAlert,
  CRow,
  CSpinner,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilCheckCircle,
  cilLightbulb,
  cilList,
  cilNotes,
  cilPlus,
  cilTags,
  cilTrash,
  cilSpeedometer,
  cilClock,
  cilBolt,
  cilStar,
} from "@coreui/icons"
import { getHabits, createHabit, deleteHabit } from "../../services/habits"
import { emitDataRefresh, REFRESH_SCOPES } from "../../utils/refreshBus"

const createBlankHabit = () => ({
  title: "",
  description: "",
  category: "",
  target_reps: "",
  is_daily_goal: false,
})

const AddHabit = () => {
  const [habits, setHabits] = useState([])
  const [loadingHabits, setLoadingHabits] = useState(true)
  const [newHabit, setNewHabit] = useState(createBlankHabit)
  const [err, setErr] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionDraft, setReflectionDraft] = useState("")
  const quickTemplates = [
    {
      title: "Hydration reset",
      description: "Drink 8 glasses of water throughout the day",
      category: "Health",
      target_reps: 8,
      is_daily_goal: true,
      accent: "info",
    },
    {
      title: "Focused reading",
      description: "Read 20 pages of a book",
      category: "Growth",
      target_reps: 20,
      is_daily_goal: false,
      accent: "primary",
    },
    {
      title: "Move with intention",
      description: "Complete a 30 minute workout",
      category: "Fitness",
      target_reps: 30,
      is_daily_goal: true,
      accent: "success",
    },
    {
      title: "Digital sunset",
      description: "No screens 60 minutes before bed",
      category: "Wellness",
      target_reps: 60,
      is_daily_goal: true,
      accent: "warning",
    },
  ]

  const suggestions = [
    {
      title: "Batch morning wins",
      note: "You close most habits before 10am. Try stacking a short journal after your stretch.",
      category: "Mindfulness",
      time: "Morning",
    },
    {
      title: "Evening recovery",
      note: "Movement habits dip after 7pm. Shift workouts to earlier slots and keep evenings for reflection.",
      category: "Recovery",
      time: "Evening",
    },
    {
      title: "Deep work block",
      note: "Focus habits succeed on weekdays. Reserve a 45-minute session Mon-Thu at 9am.",
      category: "Focus",
      time: "Weekday",
    },
  ]

  const user = JSON.parse(localStorage.getItem("user"))
  const userId = user?.id

  const updateHabit = (field, value) => {
    setNewHabit((prev) => ({ ...prev, [field]: value }))
    if (err) setErr("")
    if (success) setSuccess("")
  }

  const applyTemplate = (template) => {
    setNewHabit({
      title: template.title,
      description: template.description,
      category: template.category,
      target_reps: template.target_reps,
      is_daily_goal: template.is_daily_goal,
    })
    setSuccess("Template applied—adjust any fields to make it yours.")
    setErr("")
  }

  const loadHabits = async () => {
    try {
      setLoadingHabits(true)
      const data = await getHabits(userId)
      setHabits(data)
      setErr("")
    } catch {
      setErr("Failed to load habits")
    } finally {
      setLoadingHabits(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadHabits()
    } else {
      setLoadingHabits(false)
    }
  }, [userId])

  const handleAddHabit = async () => {
    try {
      if (isSubmitting) return
      if (!newHabit.title || !newHabit.title.trim()) {
        setSuccess("")
        return setErr("Habit title is required")
      }

      setErr("")
      setSuccess("")
      setIsSubmitting(true)

      const payload = {
        ...newHabit,
        user_id: userId,
        title: newHabit.title.trim(),
        description: newHabit.description?.trim() || null,
        category: newHabit.category?.trim() || null,
        target_reps:
          newHabit.target_reps !== "" && newHabit.target_reps !== null
            ? Number(newHabit.target_reps)
            : null,
      }

      const created = await createHabit(payload)
      setHabits((prev) => [...prev, created])
      setNewHabit(createBlankHabit())
      setSuccess("Habit added to your collection!")
      emitDataRefresh(REFRESH_SCOPES.HABITS, { reason: "habit-added" })
    } catch {
      setErr("Failed to create habit")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteHabit(id)
      setHabits((prev) => prev.filter((h) => h.id !== id))
      setSuccess("Habit removed")
      setErr("")
      emitDataRefresh(REFRESH_SCOPES.HABITS, { reason: "habit-removed" })
    } catch {
      setErr("Failed to delete habit")
      setSuccess("")
    }
  }

  return (
    <>
      <CRow className="mt-4 g-4">
      <CCol xl={7}>
        <CCard className="shadow-sm border-0 h-100">
          <CCardHeader className="bg-primary text-white">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <CIcon icon={cilPlus} className="me-2" />
                <span className="fw-semibold">Design your next habit</span>
              </div>
              <CBadge color="light" className="text-primary">
                {habits.length} saved
              </CBadge>
            </div>
          </CCardHeader>
          <CCardBody className="d-flex flex-column gap-3">
            {(err || success) && (
              <CAlert color={err ? "danger" : "success"}>{err || success}</CAlert>
            )}

            <div>
              <CCardTitle className="mb-2">Habit essentials</CCardTitle>
              <CFormText className="text-muted">
                Give your habit a memorable title and short description so it
                stands out in your trackers.
              </CFormText>
            </div>

            <CForm className="d-flex flex-column gap-3">
              <div>
                <CFormLabel className="text-muted text-uppercase small fw-semibold">
                  Title
                </CFormLabel>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilLightbulb} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="e.g. Sunrise stretch"
                    value={newHabit.title}
                    onChange={(e) => updateHabit("title", e.target.value)}
                  />
                </CInputGroup>
              </div>

              <div>
                <CFormLabel className="text-muted text-uppercase small fw-semibold">
                  Description
                </CFormLabel>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilNotes} />
                  </CInputGroupText>
                  <CFormTextarea
                    rows={3}
                    placeholder="Add a short note about why and how you'll keep this habit."
                    value={newHabit.description}
                    onChange={(e) => updateHabit("description", e.target.value)}
                  />
                </CInputGroup>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <CFormLabel className="text-muted text-uppercase small fw-semibold">
                    Category
                  </CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilTags} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Health, Study, Wellness..."
                      value={newHabit.category}
                      onChange={(e) => updateHabit("category", e.target.value)}
                    />
                  </CInputGroup>
                  <CFormText className="text-muted">
                    Helps group the habit across analytics and schedules.
                  </CFormText>
                </div>
                <div className="col-md-6">
                  <CFormLabel className="text-muted text-uppercase small fw-semibold">
                    Target repetitions
                  </CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSpeedometer} />
                    </CInputGroupText>
                    <CFormInput
                      type="number"
                      min={0}
                      placeholder="e.g. 20"
                      value={newHabit.target_reps}
                      onChange={(e) => updateHabit("target_reps", e.target.value)}
                    />
                  </CInputGroup>
                  <CFormText className="text-muted">
                    Optional. Track reps or minutes you aim to complete.
                  </CFormText>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-between flex-wrap">
                <CFormCheck
                  label="Count this as a daily goal"
                  checked={newHabit.is_daily_goal}
                  onChange={(e) => updateHabit("is_daily_goal", e.target.checked)}
                />
                <CFormText className="text-muted">
                  Daily goals reset each morning to keep streaks honest.
                </CFormText>
              </div>

              <div className="d-flex justify-content-end">
                <CButton
                  color="secondary"
                  variant="outline"
                  className="me-2"
                  onClick={() => setShowReflection(true)}
                >
                  Missed-day reflection
                </CButton>
                <CButton
                  color="primary"
                  className="px-4"
                  onClick={handleAddHabit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="d-inline-flex align-items-center gap-2">
                      <CSpinner size="sm" /> Saving
                    </span>
                  ) : (
                    <span className="d-inline-flex align-items-center gap-2">
                      <CIcon icon={cilCheckCircle} /> Save habit
                    </span>
                  )}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={5}>
        <div className="d-flex flex-column gap-4 h-100">
          <CCard className="shadow-sm border-0">
            <CCardHeader className="bg-white">
              <div className="d-flex align-items-center">
                <CIcon icon={cilCheckCircle} className="me-2 text-success" />
                <span className="fw-semibold text-success">Live preview</span>
              </div>
            </CCardHeader>
            <CCardBody className="d-flex flex-column gap-2">
              <CCardTitle className="mb-1">
                {newHabit.title.trim() || "Your habit title"}
              </CCardTitle>
              <CFormText className="text-muted">
                {newHabit.description.trim() ||
                  "Describe your habit to remember the intention behind it."}
              </CFormText>
              <div className="d-flex flex-wrap gap-2 mt-2">
                {(newHabit.category || newHabit.target_reps || newHabit.is_daily_goal) ? (
                  <>
                    {newHabit.category && (
                      <CBadge color="info" className="text-uppercase small">
                        {newHabit.category}
                      </CBadge>
                    )}
                    {newHabit.target_reps && (
                      <CBadge color="light" className="text-dark">
                        🎯 {newHabit.target_reps}
                      </CBadge>
                    )}
                    {newHabit.is_daily_goal && <CBadge color="success">Daily goal</CBadge>}
                  </>
                ) : (
                  <CFormText className="text-muted">
                    Add a category or target to see it highlighted here.
                  </CFormText>
                )}
              </div>
            </CCardBody>
          </CCard>

          <CCard className="shadow-sm border-0 bg-body-tertiary">
            <CCardHeader className="bg-white d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilBolt} className="text-primary" />
                <span className="fw-semibold">Quick add templates</span>
              </div>
              <CBadge color="primary" className="text-uppercase small">Fast start</CBadge>
            </CCardHeader>
            <CCardBody className="d-flex flex-column gap-3">
              <CFormText className="text-muted">
                Use a ready-made template and tune the details before saving.
              </CFormText>
              <div className="d-flex flex-column gap-3">
                {quickTemplates.map((template) => (
                  <div
                    key={template.title}
                    className="p-3 rounded-3 shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99, 126, 234, 0.08), rgba(61, 199, 239, 0.1))",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <CIcon icon={cilStar} className="text-warning" />
                          <span className="fw-semibold">{template.title}</span>
                        </div>
                        <small className="text-muted d-block mb-1">{template.description}</small>
                        <div className="d-flex flex-wrap gap-2">
                          <CBadge color={template.accent}>{template.category}</CBadge>
                          {template.target_reps ? (
                            <CBadge color="light" className="text-dark">
                              🎯 {template.target_reps}
                            </CBadge>
                          ) : null}
                          {template.is_daily_goal && <CBadge color="success">Daily</CBadge>}
                        </div>
                      </div>
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                      >
                        Use template
                      </CButton>
                    </div>
                  </div>
                ))}
              </div>
            </CCardBody>
          </CCard>

          <CCard className="shadow-sm border-0 h-100">
            <CCardHeader className="bg-light">
              <div className="d-flex align-items-center">
                <CIcon icon={cilList} className="me-2 text-primary" />
                <span className="fw-semibold text-primary">Your habit library</span>
              </div>
            </CCardHeader>
            <CCardBody className="p-0">
              {loadingHabits ? (
                <div className="p-4 d-flex justify-content-center">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <CListGroup flush className="rounded-0">
                  {habits.length === 0 && (
                    <CListGroupItem className="py-4 text-center text-muted">
                      Start by crafting your first habit above.
                    </CListGroupItem>
                  )}
                  {habits.map((h) => (
                    <CListGroupItem
                      key={h.id}
                      className="d-flex flex-column flex-md-row align-items-md-center gap-2 gap-md-3"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold">{h.title}</span>
                          {h.category && (
                            <CBadge color="info" className="text-uppercase small">
                              {h.category}
                            </CBadge>
                          )}
                        </div>
                        <small className="text-muted">
                          {h.description || "No description yet"}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        {h.target_reps && (
                          <CBadge color="light" className="text-dark">
                            🎯 {h.target_reps}
                          </CBadge>
                        )}
                        {h.is_daily_goal && <CBadge color="success">Daily</CBadge>}
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          className="ms-md-2"
                          onClick={() => handleDelete(h.id)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}
            </CCardBody>
          </CCard>

          <CCard className="shadow-sm border-0">
            <CCardHeader className="bg-gradient-primary text-white">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilClock} />
                <span className="fw-semibold">Habit suggestions</span>
              </div>
            </CCardHeader>
            <CCardBody className="d-flex flex-column gap-3">
              <CFormText className="text-white-50">
                Recommendations adjust to when and where you typically succeed.
              </CFormText>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.title}
                  className="p-3 rounded-3"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <CBadge color="light" className="text-primary">
                          {suggestion.category}
                        </CBadge>
                        <span className="fw-semibold text-white">{suggestion.title}</span>
                      </div>
                      <small className="text-white-50">{suggestion.note}</small>
                    </div>
                    <CBadge color="info" className="text-dark">{suggestion.time}</CBadge>
                  </div>
                </div>
              ))}
            </CCardBody>
          </CCard>

          <CCard className="shadow-sm border-0 bg-primary text-white">
            <CCardBody className="d-flex flex-column gap-2">
              <CCardTitle className="text-white mb-1">Need inspiration?</CCardTitle>
              <CFormText className="text-white-50">
                Keep habits specific and actionable. Pair them with schedules to
                stay on track and review progress from the dashboard any time.
              </CFormText>
              <div className="d-flex flex-wrap gap-2 mt-2">
                {["Drink 2L of water", "Read 20 pages", "Practice coding 30 min"].map((idea) => (
                  <CBadge key={idea} color="light" className="text-primary">
                    {idea}
                  </CBadge>
                ))}
              </div>
            </CCardBody>
          </CCard>
        </div>
      </CCol>
    </CRow>

    <CModal
      alignment="center"
      visible={showReflection}
      onClose={() => setShowReflection(false)}
    >
      <CModalHeader closeButton>
        <CModalTitle>Journaling for missed days</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="text-muted mb-3">
          When you click "missed" in the dashboard or progress tracker, we'll ask
          for a quick note like this so you can recognize patterns and reset with
          intention.
        </p>
        <CFormTextarea
          rows={4}
          value={reflectionDraft}
          placeholder="What got in the way today?"
          onChange={(e) => setReflectionDraft(e.target.value)}
        />
        <CFormText className="mt-2 text-muted">
          Nothing here is saved yet—it's a space to practice the reflection you'll
          capture each time you log a missed habit.
        </CFormText>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={() => setShowReflection(false)}>
          Close
        </CButton>
        <CButton color="primary" onClick={() => setShowReflection(false)}>
          Ready for check-ins
        </CButton>
      </CModalFooter>
    </CModal>
    </>
  )
}

export default AddHabit
