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
  CFormCheck,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilClock, cilCalendar, cilPlus, cilNotes } from "@coreui/icons"
import { emitDataRefresh, REFRESH_SCOPES, useDataRefresh } from "../../utils/refreshBus"
import { API_BASE } from "../../utils/apiConfig"
import { fetchCalendarOverview, syncCalendar } from "../../services/calendar"
import "./Schedules.css"

const DAYS_OF_WEEK = [
  { value: "sun", label: "Sun" },
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
]

const formatCustomDays = (days) => {
  if (!days) return ""
  if (typeof days === "string") return days
  if (!Array.isArray(days)) return ""

  return days
    .map((day) => DAYS_OF_WEEK.find((d) => d.value === day)?.label || day)
    .join(", ")
}

const getRepeatDisplay = (repeatValue, customdays) => {
  const repeatLabels = {
    daily: "Daily",
    weekly: "Weekly",
    every3days: "Every 3 Days",
    custom: "Custom",
  }

  if (repeatValue === "custom") {
    const label = formatCustomDays(customdays)
    return label ? `Custom · ${label}` : "Custom"
  }

  return repeatLabels[repeatValue] || "One-time"
}

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
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [editSchedule, setEditSchedule] = useState(null)
  const [editValues, setEditValues] = useState({ day: "", starttime: "", endtime: "" })
  const [savingEdit, setSavingEdit] = useState(false)

  const formattedCalendarEvents = useMemo(() => {
    const sorted = [...calendarEvents].sort((a, b) => {
      const aDate = a?.start_time ? new Date(a.start_time).getTime() : 0
      const bDate = b?.start_time ? new Date(b.start_time).getTime() : 0
      return aDate - bDate
    })
    return sorted.map((event) => ({
      id: event.id,
      title: event.title || "Calendar event",
      when: event.start_time ? new Date(event.start_time).toLocaleString() : "Date unknown",
      startDate: event.start_time || null,
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
    customdays: [],
    notes: "",
  })

  const matchesFilterDate = useCallback(
    (dateValue) => {
      if (!filterDate) return true
      if (!dateValue) return false
      if (typeof dateValue === "string" && dateValue.length >= 10) {
        return dateValue.slice(0, 10) === filterDate
      }

      const candidate = new Date(dateValue)
      if (Number.isNaN(candidate)) return false
      return candidate.toISOString().slice(0, 10) === filterDate
    },
    [filterDate],
  )

  const filteredSchedules = useMemo(
    () => schedules.filter((schedule) => matchesFilterDate(schedule.day)),
    [schedules, matchesFilterDate],
  )

  const filteredCalendarEvents = useMemo(
    () => formattedCalendarEvents.filter((event) => matchesFilterDate(event.startDate)),
    [formattedCalendarEvents, matchesFilterDate],
  )

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
  const loadSchedules = useCallback(async () => {
    if (!user?.id) return
    try {
      setLoading(true)
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
  }, [user?.id])

  useEffect(() => {
    if (user?.id) loadSchedules()
  }, [user?.id, loadSchedules])

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

  const refreshSchedulesAndCalendar = useCallback(() => {
    loadSchedules()
    loadCalendarEvents()
  }, [loadCalendarEvents, loadSchedules])

  // ✅ Add new schedule
  const handleAdd = async () => {
    try {
      setError("")
      if (!newSchedule.day || !newSchedule.starttime)
        return setError("Please fill required fields (day and start time)")

      const endDateValue = newSchedule.enddate || newSchedule.day
      const startDateObj = newSchedule.day ? new Date(`${newSchedule.day}T00:00:00`) : null
      const endDateObj = endDateValue ? new Date(`${endDateValue}T00:00:00`) : null

      if (startDateObj && endDateObj && endDateObj < startDateObj) {
        return setError("End date cannot be before the start date")
      }

      if (newSchedule.repeat === "custom" && (!newSchedule.customdays || newSchedule.customdays.length === 0)) {
        return setError("Please pick at least one day for a custom pattern")
      }

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
        customdays:
          newSchedule.repeat === "custom" && Array.isArray(newSchedule.customdays)
            ? newSchedule.customdays
            : null,
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
        customdays: [],
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
      emitDataRefresh(REFRESH_SCOPES.INTEGRATIONS, {
        provider: payload.provider,
        connected: true,
      })
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

  const openEditModal = (schedule) => {
    setEditSchedule(schedule)
    setEditValues({
      day: schedule.day || "",
      starttime: schedule.starttime || "",
      endtime: schedule.endtime || "",
    })
  }

  const closeEditModal = () => {
    setEditSchedule(null)
    setEditValues({ day: "", starttime: "", endtime: "" })
    setSavingEdit(false)
  }

  const handleUpdate = async () => {
    if (!editSchedule) return

    try {
      setSavingEdit(true)
      setError("")

      const payload = {
        day: editValues.day || null,
        starttime: editValues.starttime || null,
        endtime: editValues.endtime || null,
      }

      const res = await fetch(
        `${API_BASE}/schedules/${editSchedule.id}${editSchedule.type ? `?type=${editSchedule.type}` : ""}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) throw new Error("Failed to update schedule")

      const updatedSchedule = await res.json()

      setSchedules((prev) =>
        prev.map((schedule) =>
          String(schedule.id) === String(editSchedule.id)
            ? { ...schedule, ...updatedSchedule }
            : schedule,
        ),
      )
      await loadSchedules()
      emitDataRefresh(REFRESH_SCOPES.SCHEDULES, {
        reason: "schedule-updated",
        scheduleId: editSchedule.id,
      })
      closeEditModal()
    } catch (err) {
      console.error("❌ Failed to update schedule:", err)
      setError("Failed to update schedule")
    } finally {
      setSavingEdit(false)
    }
  }

  useDataRefresh([REFRESH_SCOPES.HABITS], loadHabits)
  useDataRefresh([REFRESH_SCOPES.SCHEDULES], refreshSchedulesAndCalendar)

  return (
    <>
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
                <CButtonGroup className="w-100">
                  {repeatOptions.map((option) => (
                    <CButton
                      key={option.value}
                      color={newSchedule.repeat === option.value ? "primary" : "outline-primary"}
                      onClick={() =>
                        setNewSchedule({
                          ...newSchedule,
                          repeat: option.value,
                        })
                      }
                    >
                      {option.label}
                    </CButton>
                  ))}
                </CButtonGroup>
                {newSchedule.repeat === "custom" && (
                  <div className="mt-2">
                    <div className="d-flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <CFormCheck
                          key={day.value}
                          id={`custom-day-${day.value}`}
                          type="checkbox"
                          label={day.label}
                          checked={newSchedule.customdays.includes(day.value)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            const nextDays = checked
                              ? [...new Set([...newSchedule.customdays, day.value])]
                              : newSchedule.customdays.filter((d) => d !== day.value)
                            setNewSchedule({ ...newSchedule, customdays: nextDays })
                          }}
                        />
                      ))}
                    </div>
                    <CFormText>Select which weekdays this schedule should repeat on.</CFormText>
                  </div>
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

          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={7}>
        <CCard className="shadow-sm border-0 h-100 saved-busy-card">
          <CCardHeader className="fw-semibold saved-busy-header">Saved busy times</CCardHeader>
          <CCardBody className="p-0">
            <div className="p-3 border-bottom d-flex flex-wrap justify-content-between align-items-end gap-3">
              <div>
                <div className="fw-semibold">Filter by day</div>
                <div className="small text-body-secondary">
                  {filterDate
                    ? `Showing entries for ${new Date(filterDate).toLocaleDateString()}`
                    : "Showing entries across all days"}
                </div>
              </div>
              <div className="d-flex flex-wrap align-items-end gap-2">
                <div style={{ minWidth: "180px" }}>
                  <CFormLabel className="text-uppercase text-muted fw-semibold small mb-1">
                    Day
                  </CFormLabel>
                  <CFormInput
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  disabled={!filterDate}
                  onClick={() => setFilterDate("")}
                >
                  Clear
                </CButton>
              </div>
            </div>
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
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center text-muted py-5">
                No entries found for this day.
                <div className="small">Try another date or clear the filter to see everything.</div>
              </div>
            ) : (
              <CListGroup flush>
                {filteredSchedules.map((s) => (
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
                          {getRepeatDisplay(s.repeat, s.customdays)}
                        </CBadge>
                        <CButton
                          color="primary"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(s)}
                        >
                          Edit
                        </CButton>
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
              ) : filteredCalendarEvents.length === 0 ? (
                <div className="text-body-secondary small">
                  No imported events match this day. Try adjusting or clearing the filter.
                </div>
              ) : (
                <CListGroup flush>
                  {filteredCalendarEvents.map((event) => (
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

      <CModal visible={Boolean(editSchedule)} onClose={closeEditModal} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>Edit schedule</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-flex flex-column gap-3">
          <div>
            <CFormLabel className="text-uppercase text-muted fw-semibold small">Day</CFormLabel>
            <CFormInput
              type="date"
              value={editValues.day}
              onChange={(e) => setEditValues({ ...editValues, day: e.target.value })}
            />
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <CFormLabel className="text-uppercase text-muted fw-semibold small">Start time</CFormLabel>
              <CFormInput
                type="time"
                value={editValues.starttime}
                onChange={(e) => setEditValues({ ...editValues, starttime: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-6">
              <CFormLabel className="text-uppercase text-muted fw-semibold small">End time</CFormLabel>
              <CFormInput
                type="time"
                value={editValues.endtime || ""}
                onChange={(e) => setEditValues({ ...editValues, endtime: e.target.value })}
              />
            </div>
          </div>
          <div className="small text-body-secondary">
            Update the day or time range for this busy block. Changes are saved to your account.
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={closeEditModal} disabled={savingEdit}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleUpdate}
            disabled={!editValues.day || !editValues.starttime || savingEdit}
          >
            {savingEdit ? <CSpinner size="sm" className="me-2" /> : null}
            Save changes
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default MySchedule
