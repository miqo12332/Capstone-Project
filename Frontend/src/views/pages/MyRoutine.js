import React, { useEffect, useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CAlert,
} from "@coreui/react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const MyRoutine = () => {
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  useEffect(() => {
    const fetchRoutines = async () => {
      if (!userId) {
        setError("User not logged in");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5001/api/schedules/user/${userId}`);
        if (!res.ok) throw new Error("Failed to load your routine");
        const data = await res.json();
        setRoutines(data);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchRoutines();
  }, [userId]);

  const selectedDayRoutines = routines.filter(
    (r) => new Date(r.day).toDateString() === selectedDate.toDateString()
  );

  const resolveScheduleTitle = (entry) =>
    entry?.habit?.title || entry.notes || "Custom Event";

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (loading) return <CSpinner color="primary" className="d-block mx-auto mt-5" />;
  if (error) return <CAlert color="danger">{error}</CAlert>;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <CCard style={{ borderRadius: "15px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <CCardHeader
          style={{
            backgroundColor: "#4caf50",
            color: "black",
            borderTopLeftRadius: "15px",
            borderTopRightRadius: "15px",
          }}
        >
          <h4 style={{ margin: 0 }}>My Routine</h4>
        </CCardHeader>
        <CCardBody>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", justifyContent: "center" }}>
            {/* Calendar */}
            <div style={{ minWidth: "320px" }}>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                locale="en-US"
                className="shadow-sm rounded"
                tileClassName={({ date, view }) => {
                  const today = new Date();
                  if (view === "month") {
                    if (date.toDateString() === today.toDateString()) return "today-tile";
                    if (date.toDateString() === selectedDate.toDateString()) return "selected-tile";
                  }
                  return "";
                }}
              />
            </div>

            {/* Daily Routines */}
            <div style={{ flexGrow: 1, minWidth: "300px" }}>
              <h5 style={{ color: "#4caf50", marginBottom: "1rem" }}>
                {formatDate(selectedDate)}
              </h5>

              {selectedDayRoutines.length === 0 ? (
                <div style={{ textAlign: "center", color: "#666", padding: "2rem" }}>
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/3145/3145765.png"
                    alt="Empty routine"
                    width={120}
                    style={{ marginBottom: "1rem", opacity: 0.7 }}
                  />
                  <h5>You have no tasks today 🌿</h5>
                  <p>Relax! Nothing is scheduled for this day.</p>
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {selectedDayRoutines.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        backgroundColor: "#f7f7f7",
                        padding: "1rem",
                        marginBottom: "1rem",
                        borderRadius: "12px",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div style={{ fontWeight: "600", marginBottom: "0.3rem", color: "black" }}>
                        {resolveScheduleTitle(item)}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#555" }}>
                        🕒 {item.starttime} — {item.endtime || "—"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#4caf50" }}>
                        📅 {item.day} ({item.repeat})
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* Inline styles for calendar */}
      <style>
        {`
          .react-calendar {
            width: 100%;
            border: none;
            border-radius: 12px;
            padding: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            color: grey; /* <-- day numbers grey */
          }
          .react-calendar__tile {
            border-radius: 8px;
            transition: all 0.2s ease;
            padding: 8px 0;
            color: grey; /* <-- day numbers grey */
          }
          .react-calendar__tile:hover {
            background-color: darkgreen; /* <-- hover dark green */
            color: white; /* make hover text readable */
          }
          .today-tile {
            font-weight: bold;
            background-color: rgba(76,175,80,0.3);
          }
          .selected-tile {
            font-weight: bold;
            background-color: #4caf50;
            color: white;
          }
          .react-calendar__month-view__weekdays {
            font-weight: 600;
            color: grey; /* weekdays grey */
            text-align: center;
          }
          .react-calendar__navigation button {
            font-weight: bold;
            color: grey;
            min-width: 40px;
            background: none;
            border-radius: 6px;
            transition: 0.2s;
          }
          .react-calendar__navigation button:hover {
            background-color: rgba(76,175,80,0.2);
          }
        `}
      </style>
    </div>
  );
};

export default MyRoutine;
