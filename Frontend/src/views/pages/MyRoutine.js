import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CButton,
  CAlert,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilCalendar,
  cilCheckCircle,
  cilList,
  cilPeople,
  cilSync,
} from "@coreui/icons";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import { getSchedules } from "../../services/schedules";
import { fetchCalendarOverview } from "../../services/calendar";

const toDateKey = (date) => date?.toISOString().split("T")[0];

const formatTimeRange = (entry) => {
  if (entry.allDay) return "All day";
  if (!entry.start) return "Time to be confirmed";
  const start = entry.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (!entry.end) return `${start}`;
  const end = entry.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${start} – ${end}`;
};

const MyRoutine = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [calendarOverview, setCalendarOverview] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  useEffect(() => {
    const loadData = async () => {
      if (!userId) {
        setError("Please log in to view your routine.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [scheduleData, calendarData] = await Promise.all([
          getSchedules(userId),
          fetchCalendarOverview(userId, { days: 60 }),
        ]);
        setSchedules(Array.isArray(scheduleData) ? scheduleData : []);
        setCalendarOverview(calendarData || null);
      } catch (err) {
        setError(err.message || "Unable to load routine details.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const calendarEvents = useMemo(
    () =>
      (calendarOverview?.events || []).map((event) => ({
        id: `calendar-${event.id}`,
        type: "calendar",
        title: event.title,
        start: event.start_time ? new Date(event.start_time) : null,
        end: event.end_time ? new Date(event.end_time) : null,
        allDay: Boolean(event.all_day),
        location: event.location,
        provider: event.source,
      })),
    [calendarOverview]
  );

  const routineEntries = useMemo(
    () =>
      schedules.map((schedule) => {
        const start = schedule.day
          ? new Date(`${schedule.day}T${schedule.starttime || "00:00"}`)
          : null;
        const end = schedule.day && schedule.endtime
          ? new Date(`${schedule.day}T${schedule.endtime}`)
          : null;
        return {
          id: `schedule-${schedule.id}`,
          type: "habit",
          title: schedule.habit?.title || schedule.custom_title || schedule.notes || "Planned habit",
          start,
          end,
          allDay: false,
          repeat: schedule.repeat,
          notes: schedule.notes,
        };
      }),
    [schedules]
  );

  const entriesByDate = useMemo(() => {
    const grouped = {};
    [...routineEntries, ...calendarEvents].forEach((entry) => {
      const key = entry.start ? toDateKey(entry.start) : null;
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => {
        const startA = a.start ? a.start.getTime() : 0;
        const startB = b.start ? b.start.getTime() : 0;
        return startA - startB;
      });
    });

    return grouped;
  }, [routineEntries, calendarEvents]);

  const selectedEntries = useMemo(() => {
    const key = toDateKey(selectedDate);
    return key && entriesByDate[key] ? entriesByDate[key] : [];
  }, [entriesByDate, selectedDate]);

  const summary = {
    scheduledHabits: routineEntries.length,
    importedEvents: calendarEvents.length,
    integrationCount: calendarOverview?.summary?.integrationCount || 0,
    hoursScheduled: calendarOverview?.summary?.hoursScheduled || 0,
    nextFreeDay: calendarOverview?.summary?.nextFreeDay || null,
  };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return "";
    const todayKey = toDateKey(new Date());
    const dateKey = toDateKey(date);
    const classes = [];
    if (dateKey === todayKey) classes.push("today-tile");
    if (dateKey === toDateKey(selectedDate)) classes.push("selected-tile");
    if ((entriesByDate[dateKey] || []).length > 0) classes.push("busy-tile");
    return classes.join(" ");
  };

  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const key = toDateKey(date);
    const entries = entriesByDate[key] || [];
    if (entries.length === 0) return null;
    const hasHabit = entries.some((entry) => entry.type === "habit");
    const hasCalendar = entries.some((entry) => entry.type === "calendar");
    return (
      <div className="d-flex justify-content-center gap-1 mt-1">
        {hasHabit && <span className="calendar-dot habit" />}
        {hasCalendar && <span className="calendar-dot calendar" />}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <CSpinner color="success" />
      </div>
    );
  }

  if (error) {
    return <CAlert color="danger">{error}</CAlert>;
  }

  return (
    <div className="py-4 py-lg-5">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">My Routine Planner</h2>
          <p className="text-body-secondary mb-0">
            Review your habits alongside imported calendar events to plan each day with confidence.
          </p>
        </div>
        <CButton
          color="info"
          variant="outline"
          component={Link}
          to="/calendar-sync"
          className="text-nowrap"
        >
          <CIcon icon={cilSync} className="me-2" /> Manage calendar connections
        </CButton>
      </div>

      <CRow className="g-3 mb-4">
        <CCol xs={12} md={6} xl={3}>
          <CCard className="h-100 border-success border-2">
            <CCardBody>
              <div className="text-uppercase small text-body-secondary mb-2">
                Habits scheduled
              </div>
              <div className="display-6 fw-semibold text-success">{summary.scheduledHabits}</div>
              <div className="small text-body-secondary">
                Recurring routines planned through My Schedule.
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={6} xl={3}>
          <CCard className="h-100 border-info border-2">
            <CCardBody>
              <div className="text-uppercase small text-body-secondary mb-2">
                Imported events
              </div>
              <div className="display-6 fw-semibold text-info">{summary.importedEvents}</div>
              <div className="small text-body-secondary">
                Synced from your Apple or Google Calendar.
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={6} xl={3}>
          <CCard className="h-100 border-primary border-2">
            <CCardBody>
              <div className="text-uppercase small text-body-secondary mb-2">
                Hours scheduled
              </div>
              <div className="display-6 fw-semibold text-primary">
                {Number(summary.hoursScheduled || 0).toFixed(1)}
              </div>
              <div className="small text-body-secondary">
                Total focus time across the next few weeks.
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={6} xl={3}>
          <CCard className="h-100 border-warning border-2">
            <CCardBody>
              <div className="text-uppercase small text-body-secondary mb-2">
                Linked calendars
              </div>
              <div className="display-6 fw-semibold text-warning">{summary.integrationCount}</div>
              <div className="small text-body-secondary">
                Connected accounts feeding your routine.
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-4 align-items-start">
        <CCol xs={12} lg={5}>
          <CCard className="shadow-sm">
            <CCardHeader className="fw-semibold d-flex align-items-center">
              <CIcon icon={cilCalendar} className="me-2 text-success" /> Calendar overview
            </CCardHeader>
            <CCardBody>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                locale="en-US"
                className="shadow-sm rounded"
                tileClassName={tileClassName}
                tileContent={tileContent}
              />
              <div className="d-flex justify-content-center gap-3 mt-3 small text-body-secondary">
                <span className="d-flex align-items-center gap-1">
                  <span className="legend-dot habit" /> Habit routine
                </span>
                <span className="d-flex align-items-center gap-1">
                  <span className="legend-dot calendar" /> Calendar event
                </span>
              </div>
            </CCardBody>
          </CCard>

          {summary.nextFreeDay && (
            <CCard className="shadow-sm mt-4 border-0 bg-light">
              <CCardBody className="d-flex align-items-center gap-3">
                <CIcon icon={cilCheckCircle} className="text-success" size="lg" />
                <div>
                  <div className="fw-semibold">Next light day</div>
                  <div className="text-body-secondary">
                    {new Date(summary.nextFreeDay).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </CCardBody>
            </CCard>
          )}
        </CCol>

        <CCol xs={12} lg={7}>
          <CCard className="shadow-sm">
            <CCardHeader className="fw-semibold d-flex align-items-center justify-content-between">
              <span>
                <CIcon icon={cilList} className="me-2 text-success" />
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <CBadge color="success">{selectedEntries.length} item{selectedEntries.length === 1 ? "" : "s"}</CBadge>
            </CCardHeader>
            <CCardBody>
              {selectedEntries.length === 0 ? (
                <div className="text-center text-body-secondary py-4">
                  <CIcon icon={cilPeople} size="lg" className="mb-2 text-muted" />
                  <div className="fw-semibold">No plans on this day</div>
                  <div className="small">
                    Add a habit from My Schedule or import events to fill your routine.
                  </div>
                </div>
              ) : (
                <div className="timeline">
                  {selectedEntries.map((entry) => (
                    <div key={entry.id} className="timeline-item">
                      <div className={`timeline-dot ${entry.type}`} />
                      <div className="timeline-content">
                        <div className="d-flex align-items-center justify-content-between gap-3">
                          <div>
                            <div className="fw-semibold">{entry.title}</div>
                            <div className="small text-body-secondary">
                              {formatTimeRange(entry)}
                              {entry.type === "habit" && entry.repeat
                                ? ` · ${entry.repeat.toLowerCase()}`
                                : ""}
                              {entry.type === "calendar" && entry.provider
                                ? ` · ${entry.provider}`
                                : ""}
                            </div>
                          </div>
                          <CBadge color={entry.type === "habit" ? "success" : "info"}>
                            {entry.type === "habit" ? "Habit" : "Calendar"}
                          </CBadge>
                        </div>
                        {entry.notes && (
                          <div className="small text-body-secondary mt-2">{entry.notes}</div>
                        )}
                        {entry.location && (
                          <div className="small text-body-secondary mt-2">{entry.location}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <style>{`
        .react-calendar {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          font-family: inherit;
        }
        .react-calendar__tile {
          border-radius: 8px;
          transition: all 0.2s ease;
          padding: 8px 0;
        }
        .react-calendar__tile:hover {
          background-color: rgba(46, 184, 92, 0.2);
        }
        .today-tile {
          font-weight: 600;
          border: 1px solid rgba(46, 184, 92, 0.6);
        }
        .selected-tile {
          font-weight: 600;
          background-color: #2eb85c;
          color: white;
        }
        .busy-tile {
          position: relative;
        }
        .calendar-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
        }
        .calendar-dot.habit {
          background-color: #2eb85c;
        }
        .calendar-dot.calendar {
          background-color: #3399ff;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
        }
        .legend-dot.habit {
          background-color: #2eb85c;
        }
        .legend-dot.calendar {
          background-color: #3399ff;
        }
        .timeline {
          position: relative;
          padding-left: 1.5rem;
        }
        .timeline::before {
          content: "";
          position: absolute;
          left: 7px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, rgba(46, 184, 92, 0.3), rgba(51, 153, 255, 0.3));
        }
        .timeline-item {
          position: relative;
          padding: 0.75rem 0 0.75rem 1.5rem;
        }
        .timeline-item + .timeline-item {
          border-top: 1px solid rgba(0,0,0,0.05);
        }
        .timeline-dot {
          position: absolute;
          left: -1.5rem;
          top: 1.1rem;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          border: 2px solid #fff;
          box-shadow: 0 0 0 2px rgba(46, 184, 92, 0.15);
        }
        .timeline-dot.habit {
          background-color: #2eb85c;
        }
        .timeline-dot.calendar {
          background-color: #3399ff;
        }
        .timeline-content {
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default MyRoutine;
