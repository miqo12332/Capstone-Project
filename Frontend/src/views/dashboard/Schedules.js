import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { emitDataRefresh, REFRESH_SCOPES, useDataRefresh } from "../../utils/refreshBus"
import { API_BASE } from "../../utils/apiConfig"
import { fetchCalendarOverview, syncCalendar } from "../../services/calendar"
import "./Schedules.css"

const MySchedule = () => {
  const user = JSON.parse(localStorage.getItem("user"))
  const [habits, setHabits] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [calendarError, setCalendarError] = useState("")
  const [calendarStatus, setCalendarStatus] = useState({
    syncing: false,
    lastSync: null,
    integrationLabel: "",
  })
  const [calendarEvents, setCalendarEvents] = useState([])
  const [calendarFileName, setCalendarFileName] = useState("")
  const [calendarFileText, setCalendarFileText] = useState("")
  const calendarFileInputRef = useRef(null)

  const formattedCalendarEvents = useMemo(() => {
    const sorted = [...calendarEvents].sort((a, b) => {
      const aDate = a?.start_time ? new Date(a.start_time).getTime() : 0
      const bDate = b?.start_time ? new Date(b.start_time).getTime() : 0
      return aDate - bDate
    })
    return sorted.map((event) => ({
      id: event.id,
      title: event.title || "Calendar event",
      when: event.start_time
        ? new Date(event.start_time).toLocaleString()
        : "Date unknown",
      provider: event.source || event.integration?.provider || "calendar",
      location: event.location || event.metadata?.location || "",
    }))
  }, [calendarEvents])
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
  const loadHabits = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_BASE}/habits/user/${user.id}`)
      if (!res.ok) throw new Error("Failed to fetch habits")
      const data = await res.json()
      setHabits(data)
    } catch (err) {
      console.error("❌ Failed to load habits:", err)
      setError("Failed to load habits")
    }
  }, [user?.id])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  // ✅ Load user's schedules
  const loadSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE}/schedules/user/${user.id}`)
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

  // ✅ Load calendar events connected to the account (e.g. Google Calendar)
  const loadCalendarEvents = useCallback(async () => {
    if (!user?.id) return
    try {
      setCalendarError("")
      const overview = await fetchCalendarOverview(user.id, { days: 45 })
      setCalendarEvents(Array.isArray(overview?.events) ? overview.events : [])
      const lastIntegration = overview?.integrations?.[0]
      setCalendarStatus((prev) => ({
        ...prev,
        lastSync: overview?.summary?.lastSync || null,
        integrationLabel: lastIntegration?.label || prev.integrationLabel,
      }))
    } catch (err) {
      console.error("❌ Failed to load calendar events:", err)
      setCalendarError("Unable to load calendar events")
    }
  }, [user?.id])

  useEffect(() => {
    loadCalendarEvents()
  }, [loadCalendarEvents])

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

      const res = await fetch(`${API_BASE}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to add schedule")

      await loadSchedules()
      emitDataRefresh(REFRESH_SCOPES.SCHEDULES, { reason: "schedule-added" })
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

  const handleCalendarSync = async () => {
    if (!user?.id) return
    try {
      setCalendarError("")
      setCalendarStatus((prev) => ({ ...prev, syncing: true }))

      if (!calendarFileText) {
        setCalendarStatus((prev) => ({ ...prev, syncing: false }))
        return setCalendarError("Upload a .ics file to sync your calendar")
      }

      const payload = {
        provider: "google",
        label: "Google Calendar",
        icsText: calendarFileText || undefined,
        days: 45,
      }

      const result = await syncCalendar(user.id, payload)
      const events = Array.isArray(result?.overview?.events)
        ? result.overview.events
        : []
      setCalendarEvents(events)
      setCalendarStatus({
        syncing: false,
        lastSync: result?.overview?.summary?.lastSync || null,
        integrationLabel: result?.integration?.label || "Google Calendar",
      })
      setCalendarFileName("")
      setCalendarFileText("")
      if (calendarFileInputRef.current) {
        calendarFileInputRef.current.value = ""
      }
    } catch (err) {
      console.error("❌ Failed to sync Google Calendar:", err)
      setCalendarError(err?.message || "Could not sync Google Calendar")
      setCalendarStatus((prev) => ({ ...prev, syncing: false }))
    }
  }

  const handleCalendarFile = (event) => {
    setCalendarError("")
    const inputElement = event.target
    const file = inputElement?.files?.[0]
    if (!file) {
      setCalendarFileName("")
      setCalendarFileText("")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result || ""
      setCalendarFileName(file.name)
      setCalendarFileText(typeof text === "string" ? text : "")
      if (inputElement) {
        inputElement.value = ""
      }
    }
    reader.onerror = () => {
      setCalendarError("Couldn't read the uploaded calendar file")
      setCalendarFileName("")
      setCalendarFileText("")
      if (calendarFileInputRef.current) {
        calendarFileInputRef.current.value = ""
      }
    }
    reader.readAsText(file)
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
  const handleDelete = async (id, type) => {
    try {
      const res = await fetch(
        `${API_BASE}/schedules/${id}${type ? `?type=${type}` : ""}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to delete schedule")
      setSchedules((prev) => prev.filter((s) => !(String(s.id) === String(id) && s.type === type)))
      emitDataRefresh(REFRESH_SCOPES.SCHEDULES, { reason: "schedule-deleted", scheduleId: id })
    } catch (err) {
      console.error("❌ Failed to delete schedule:", err)
      setError("Failed to delete schedule")
    }
  }

  useDataRefresh([REFRESH_SCOPES.HABITS], loadHabits)

  return (
    <CRow className="mt-4 g-4 schedules-shell">
      <CCol xs={12}>{error && <CAlert color="danger">{error}</CAlert>}</CCol>
      <CCol xs={12}>{calendarError && <CAlert color="warning">{calendarError}</CAlert>}</CCol>

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

            <CCard className="border-0 schedule-preview-card mt-4">
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
        <CCard className="shadow-sm border-0 h-100 saved-busy-card">
          <CCardHeader className="fw-semibold saved-busy-header">Saved busy times</CCardHeader>
          <CCardBody className="p-0">
            <div className="p-3 border-bottom calendar-import-panel">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <div className="fw-semibold">Pull from Google Calendar</div>
                  <div className="small text-body-secondary">
                    Upload a .ics file to mirror busy events here so the assistant avoids conflicts.
                  </div>
                  {calendarStatus.lastSync && (
                    <div className="small text-success mt-1">
                      Last synced {new Date(calendarStatus.lastSync).toLocaleString()}
                    </div>
                  )}
                </div>
                <CButton
                  color="success"
                  size="sm"
                  className="text-white"
                  disabled={calendarStatus.syncing}
                  onClick={handleCalendarSync}
                >
                  {calendarStatus.syncing ? (
                    <>
                      <CSpinner size="sm" className="me-2" /> Syncing
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilCalendar} className="me-2" /> Sync now
                    </>
                  )}
                </CButton>
              </div>
              <div className="mt-3">
                <CFormLabel className="text-uppercase text-muted fw-semibold small mb-1">
                  Upload a .ics file
                </CFormLabel>
                <div className="d-flex align-items-center gap-2 flex-wrap position-relative">
                  <label
                    htmlFor="calendarUpload"
                    className="btn btn-outline-secondary mb-0 d-inline-flex align-items-center"
                  >
                    Choose file
                  </label>
                  <input
                    id="calendarUpload"
                    type="file"
                    accept=".ics,text/calendar"
                    onChange={handleCalendarFile}
                    ref={calendarFileInputRef}
                    className="d-none"
                  />
                  {calendarFileName && (
                    <div className="small text-success">Selected: {calendarFileName}</div>
                  )}
                </div>
                <CFormText>We'll import events from the uploaded file if provided.</CFormText>
              </div>
            </div>
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
                  <CListGroupItem key={`${s.type || "habit"}-${s.id}`} className="py-3">
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
                          onClick={() => handleDelete(s.id, s.type)}
                        >
                          Delete
                        </CButton>
                      </div>
                    </div>
                  </CListGroupItem>
                ))}
              </CListGroup>
            )}

            <div className="p-3 border-top">
              <div className="d-flex align-items-center gap-2 mb-2">
                <CIcon icon={cilCalendar} className="text-primary" />
                <span className="fw-semibold">Calendar busy events</span>
                {calendarStatus.integrationLabel && (
                  <CBadge color="info" shape="rounded-pill">
                    {calendarStatus.integrationLabel}
                  </CBadge>
                )}
              </div>
              {formattedCalendarEvents.length === 0 ? (
                <div className="text-body-secondary small">
                  Connect Google Calendar to automatically add busy events to this view.
                </div>
              ) : (
                <CListGroup flush>
                  {formattedCalendarEvents.map((event) => (
                    <CListGroupItem key={`${event.id}-${event.when}`} className="py-3">
                      <div className="fw-semibold">{event.title}</div>
                      <div className="text-muted small">{event.when}</div>
                      {event.location && (
                        <div className="text-muted small">{event.location}</div>
                      )}
                      <CBadge color="secondary" shape="rounded-pill" className="mt-2">
                        {event.provider}
                      </CBadge>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default MySchedule
