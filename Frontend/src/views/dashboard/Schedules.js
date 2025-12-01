import React, { useEffect, useState } from "react"
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CButtonGroup,
  CListGroup,
  CListGroupItem,
  CAlert,
  CSpinner,
  CInputGroup,
  CInputGroupText,
  CFormText,
  CFormTextarea,
  CBadge,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilClock, cilCalendar, cilLoopCircular, cilPlus, cilNotes } from "@coreui/icons"

const MySchedule = () => {
  const user = JSON.parse(localStorage.getItem("user"))
  const [habits, setHabits] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newSchedule, setNewSchedule] = useState({
    type: "habit", // link to a habit or keep it as a custom busy time
    habit_id: "",
    custom_title: "",
    day: "",
    starttime: "",
    endtime: "",
    enddate: "",
    repeat: "daily",
    customdays: "",
    notes: "",
  })

  // ✅ Load user's habits
  useEffect(() => {
    const loadHabits = async () => {
      try {
        const res = await fetch(`http://localhost:5001/api/habits/user/${user.id}`)
        if (!res.ok) throw new Error("Failed to fetch habits")
        const data = await res.json()
        setHabits(data)
      } catch (err) {
        console.error("❌ Failed to load habits:", err)
        setError("Failed to load habits")
      }
    }
    if (user?.id) loadHabits()
  }, [user?.id])

  // ✅ Load user's schedules
  const loadSchedules = async () => {
    try {
      const res = await fetch(`http://localhost:5001/api/schedules/user/${user.id}`)
      if (!res.ok) throw new Error("Failed to fetch schedules")
      const data = await res.json()
      setSchedules(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("❌ Failed to load schedules:", err)
      setError("Failed to load schedules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) loadSchedules()
  }, [user?.id])

  // ✅ Add new schedule
  const handleAdd = async () => {
    try {
      setError("")
      if (!newSchedule.day || !newSchedule.starttime)
        return setError("Please fill required fields (day and start time)")

      if (
        newSchedule.type === "custom" &&
        (!newSchedule.custom_title || !newSchedule.custom_title.trim())
      ) {
        return setError("Please provide a title for your custom event")
      }

      const payload = {
        user_id: user.id,
        type: newSchedule.type,
        habit_id:
          newSchedule.type === "habit" && newSchedule.habit_id
            ? Number(newSchedule.habit_id)
            : null,
        custom_title:
          newSchedule.type === "custom"
            ? newSchedule.custom_title.trim()
            : null,
        day: newSchedule.day,
        starttime: newSchedule.starttime,
        endtime: newSchedule.endtime || null,
        enddate: newSchedule.enddate || null,
        repeat: newSchedule.repeat,
        customdays: newSchedule.repeat === "custom" ? newSchedule.customdays || null : null,
        notes: newSchedule.notes || null,
      }

      const res = await fetch("http://localhost:5001/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to add schedule")

      await loadSchedules()
      setNewSchedule({
        type: "habit",
        habit_id: "",
        custom_title: "",
        day: "",
        starttime: "",
        endtime: "",
        enddate: "",
        repeat: "daily",
        customdays: "",
        notes: "",
      })
    } catch (err) {
      console.error("❌ Failed to add schedule:", err)
      setError("Failed to add schedule")
    }
  }

  const repeatOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "every3days", label: "Every 3 Days" },
    { value: "custom", label: "Custom" },
  ]

  const repeatLabels = repeatOptions.reduce(
    (acc, option) => ({ ...acc, [option.value]: option.label }),
    {}
  )

  const selectedHabit =
    newSchedule.type === "habit" && newSchedule.habit_id
      ? habits.find((h) => String(h.id) === String(newSchedule.habit_id))
      : null

  // ✅ Delete schedule
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5001/api/schedules/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete schedule")
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error("❌ Failed to delete schedule:", err)
      setError("Failed to delete schedule")
    }
  }

  return (
    <CRow className="mt-4 g-4">
      <CCol xs={12}>{error && <CAlert color="danger">{error}</CAlert>}</CCol>

      <CCol lg={5}>
        <CCard className="shadow-sm border-0 h-100">
          <CCardHeader className="bg-primary text-white d-flex align-items-center">
            <CIcon icon={cilCalendar} className="me-2" />
            Save when you're busy
          </CCardHeader>
          <CCardBody>
            <div className="text-body-secondary small mb-3">
              These entries are informational. They tell the assistant when you're busy
              or focused so it can suggest habits around your day—nothing to mark as done
              or missed.
            </div>

            <CForm className="d-flex flex-column gap-3">
              <div>
                <CFormLabel className="text-uppercase text-muted fw-semibold small">
                  What kind of time block?
                </CFormLabel>
                <CButtonGroup className="w-100">
                  <CButton
                    type="button"
                    color={newSchedule.type === "habit" ? "primary" : "outline-primary"}
                    className="d-flex align-items-center justify-content-center"
                    onClick={() =>
                      setNewSchedule({
                        ...newSchedule,
                        type: "habit",
                        custom_title: "",
                      })
                    }
                  >
                    Link to a habit
                  </CButton>
                  <CButton
                    type="button"
                    color={newSchedule.type === "custom" ? "primary" : "outline-primary"}
                    className="d-flex align-items-center justify-content-center"
                    onClick={() =>
                      setNewSchedule({
                        ...newSchedule,
                        type: "custom",
                        habit_id: "",
                      })
                    }
                  >
                    Busy event
                  </CButton>
                </CButtonGroup>
              </div>

              {newSchedule.type === "habit" && (
                <div>
                  <CFormLabel className="text-uppercase text-muted fw-semibold small">
                    Link a habit (optional)
                  </CFormLabel>
                  <CFormSelect
                    value={newSchedule.habit_id}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, habit_id: e.target.value })
                    }
                  >
                    <option value="">— Select Habit —</option>
                    {habits.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title}
                      </option>
                    ))}
                  </CFormSelect>
                  <CFormText>
                    Connect a habit so the assistant knows which routine fits this time block.
                  </CFormText>
                </div>
              )}

              {newSchedule.type === "custom" && (
                <div>
                  <CFormLabel className="text-uppercase text-muted fw-semibold small">
                    What's happening?
                  </CFormLabel>
                  <CFormInput
                    placeholder="e.g. Doctor Appointment, Gym Session"
                    value={newSchedule.custom_title}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, custom_title: e.target.value })
                    }
                  />
                  <CFormText>Keep it short and recognizable.</CFormText>
                </div>
              )}

              <div>
                <CFormLabel className="text-uppercase text-muted fw-semibold small">
                  When does it happen?
                </CFormLabel>
                <CRow className="g-3">
                  <CCol sm={6}>
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilCalendar} />
                      </CInputGroupText>
                      <CFormInput
                        type="date"
                        value={newSchedule.day}
                        onChange={(e) =>
                          setNewSchedule({ ...newSchedule, day: e.target.value })
                        }
                      />
                    </CInputGroup>
                  </CCol>
                  <CCol sm={6}>
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilCalendar} />
                      </CInputGroupText>
                      <CFormInput
                        type="date"
                        placeholder="End date"
                        value={newSchedule.enddate}
                        onChange={(e) =>
                          setNewSchedule({ ...newSchedule, enddate: e.target.value })
                        }
                      />
                    </CInputGroup>
                  </CCol>
                  <CCol sm={6}>
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilClock} />
                      </CInputGroupText>
                      <CFormInput
                        type="time"
                        value={newSchedule.starttime}
                        onChange={(e) =>
                          setNewSchedule({ ...newSchedule, starttime: e.target.value })
                        }
                      />
                    </CInputGroup>
                  </CCol>
                  <CCol sm={6}>
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilClock} />
                      </CInputGroupText>
                      <CFormInput
                        type="time"
                        value={newSchedule.endtime}
                        onChange={(e) =>
                          setNewSchedule({ ...newSchedule, endtime: e.target.value })
                        }
                      />
                    </CInputGroup>
                  </CCol>
                </CRow>
                <CFormText>Specify the day and time range for this schedule.</CFormText>
              </div>

              <div>
                <CFormLabel className="text-uppercase text-muted fw-semibold small">
                  Repeat pattern
                </CFormLabel>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilLoopCircular} />
                  </CInputGroupText>
                  <CFormSelect
                    value={newSchedule.repeat}
                    onChange={(e) => setNewSchedule({ ...newSchedule, repeat: e.target.value })}
                  >
                    {repeatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CInputGroup>
                {newSchedule.repeat === "custom" && (
                  <CFormInput
                    className="mt-2"
                    placeholder="e.g. Mon, Wed, Fri"
                    value={newSchedule.customdays}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, customdays: e.target.value })
                    }
                  />
                )}
              </div>

              <div>
                <CFormLabel className="text-uppercase text-muted fw-semibold small">
                  Notes
                </CFormLabel>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilNotes} />
                  </CInputGroupText>
                  <CFormTextarea
                    rows={2}
                    placeholder="Add context, reminders or preparation steps"
                    value={newSchedule.notes}
                    onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                  />
                </CInputGroup>
              </div>

              <CButton color="primary" className="mt-2" onClick={handleAdd}>
                <CIcon icon={cilPlus} className="me-2" /> Add Schedule
              </CButton>
            </CForm>

            <CCard className="border-0 bg-light mt-4">
              <CCardBody>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">Preview</span>
                  <CBadge color="info" shape="rounded-pill">
                    {repeatLabels[newSchedule.repeat] || "One-time"}
                  </CBadge>
                </div>
                <div className="text-muted small">
                  <div className="mb-1">
                    <strong>
                      {selectedHabit?.title || newSchedule.custom_title || "Untitled schedule"}
                    </strong>
                  </div>
                  <div>{newSchedule.day || "Pick a day"}</div>
                  <div>
                    {newSchedule.starttime || "Start time"} – {newSchedule.endtime || "End time"}
                  </div>
                  {newSchedule.notes && <div className="mt-1">{newSchedule.notes}</div>}
                </div>
              </CCardBody>
            </CCard>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={7}>
        <CCard className="shadow-sm border-0 h-100">
          <CCardHeader className="bg-white fw-semibold">Saved busy times</CCardHeader>
          <CCardBody className="p-0">
            {loading ? (
              <div className="d-flex justify-content-center my-4">
                <CSpinner color="primary" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center text-muted py-5">
                Add time blocks so the assistant understands when you're occupied or focused.
              </div>
            ) : (
              <CListGroup flush>
                {schedules.map((s) => (
                  <CListGroupItem key={s.id} className="py-3">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                      <div>
                        <div className="fw-semibold">
                          {s.custom_title || s.habit?.title || s.notes || "Custom Event"}
                        </div>
                        <div className="text-muted small">
                          {s.day} • {s.starttime} – {s.endtime || "—"}
                        </div>
                        {s.notes && <div className="text-muted small mt-1">{s.notes}</div>}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <CBadge color="secondary" shape="rounded-pill">
                          {repeatLabels[s.repeat] || s.repeat}
                        </CBadge>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                        >
                          Delete
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
  )
}

export default MySchedule
