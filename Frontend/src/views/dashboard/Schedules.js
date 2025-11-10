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
  CListGroup,
  CListGroupItem,
  CAlert,
  CSpinner,
} from "@coreui/react"

const MySchedule = () => {
  const user = JSON.parse(localStorage.getItem("user"))
  const [habits, setHabits] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newSchedule, setNewSchedule] = useState({
    type: "habit", // "habit" or "custom"
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
        userid: user.id,
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
    <CRow className="mt-4">
      <CCol xs={12} md={8} className="mx-auto">
        <CCard>
          <CCardHeader>📅 My Schedule</CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}

            {/* ✅ Add Schedule Form */}
            <CForm>
              <CFormLabel>Type</CFormLabel>
              <CFormSelect
                value={newSchedule.type}
                onChange={(e) => setNewSchedule({ ...newSchedule, type: e.target.value })}
              >
                <option value="habit">Habit</option>
                <option value="custom">Custom Event</option>
              </CFormSelect>

              {/* Habit selection */}
              {newSchedule.type === "habit" && (
                <>
                  <CFormLabel className="mt-2">Habit</CFormLabel>
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
                </>
              )}

              {/* Custom event title */}
              {newSchedule.type === "custom" && (
                <>
                  <CFormLabel className="mt-2">Custom Event Title</CFormLabel>
                  <CFormInput
                    placeholder="e.g. Doctor Appointment, Gym Session"
                    value={newSchedule.custom_title}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, custom_title: e.target.value })
                    }
                  />
                </>
              )}

              {/* Common fields */}
              <CFormLabel className="mt-2">Day</CFormLabel>
              <CFormInput
                type="date"
                value={newSchedule.day}
                onChange={(e) => setNewSchedule({ ...newSchedule, day: e.target.value })}
              />

              <CFormLabel className="mt-2">Start Time</CFormLabel>
              <CFormInput
                type="time"
                value={newSchedule.starttime}
                onChange={(e) => setNewSchedule({ ...newSchedule, starttime: e.target.value })}
              />

              <CFormLabel className="mt-2">End Time</CFormLabel>
              <CFormInput
                type="time"
                value={newSchedule.endtime}
                onChange={(e) => setNewSchedule({ ...newSchedule, endtime: e.target.value })}
              />

              <CFormLabel className="mt-2">End Date (optional)</CFormLabel>
              <CFormInput
                type="date"
                value={newSchedule.enddate}
                onChange={(e) => setNewSchedule({ ...newSchedule, enddate: e.target.value })}
              />

              <CFormLabel className="mt-2">Repeat</CFormLabel>
              <CFormSelect
                value={newSchedule.repeat}
                onChange={(e) => setNewSchedule({ ...newSchedule, repeat: e.target.value })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="every3days">Every 3 Days</option>
                <option value="custom">Custom</option>
              </CFormSelect>

              {newSchedule.repeat === "custom" && (
                <>
                  <CFormLabel className="mt-2">Custom Days</CFormLabel>
                  <CFormInput
                    placeholder="e.g. Mon, Wed, Fri"
                    value={newSchedule.customdays}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, customdays: e.target.value })
                    }
                  />
                </>
              )}

              <CFormLabel className="mt-2">Notes</CFormLabel>
              <CFormInput
                placeholder="Add notes..."
                value={newSchedule.notes}
                onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
              />

              <CButton color="primary" className="mt-3" onClick={handleAdd}>
                Add Schedule
              </CButton>
            </CForm>

            <hr />

            {/* ✅ Schedule List */}
            {loading ? (
              <div className="d-flex justify-content-center my-4">
                <CSpinner color="primary" />
              </div>
            ) : (
              <CListGroup>
                {schedules.length === 0 && (
                  <CListGroupItem>No schedules yet</CListGroupItem>
                )}
                {schedules.map((s) => (
                  <CListGroupItem key={s.id}>
                    <strong>{s.habit?.title || "Custom Event"}</strong>{" "}
                    — {s.day} ({s.starttime} - {s.endtime || "—"}) [{s.repeat}]
                    {s.notes && (
                      <div className="text-muted small mt-1">{s.notes}</div>
                    )}
                    <CButton
                      color="danger"
                      size="sm"
                      className="float-end"
                      onClick={() => handleDelete(s.id)}
                    >
                      Delete
                    </CButton>
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