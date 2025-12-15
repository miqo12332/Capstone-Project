import React, { useMemo, useState } from "react"
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CNav,
  CNavItem,
  CNavLink,
  CProgress,
  CProgressBar,
  CRow,
  CTabContent,
  CTabPane,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilCalendar, cilList, cilLoopCircular, cilPlus, cilSync } from "@coreui/icons"

import CalendarSync from "../sync/CalendarSync"
import MyRoutine from "../pages/MyRoutine"
import Schedules from "./Schedules"
import "./Planner.css"

const Planner = () => {
  const [activeTab, setActiveTab] = useState("schedule")

  const quickMetrics = useMemo(
    () => [
      {
        label: "Today's focus",
        value: new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(
          new Date(),
        ),
        icon: cilCalendar,
        accent: "primary",
      },
      {
        label: "Planning health",
        value: "On track",
        icon: cilList,
        accent: "success",
      },
      {
        label: "Sync status",
        value: "Connected",
        icon: cilSync,
        accent: "info",
      },
    ],
    [],
  )

  const handleSyncClick = () => setActiveTab("sync")

  return (
    <div className="planner-shell">
      <div className="planner-hero shadow-sm">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <div className="text-uppercase small text-white-50 fw-semibold">Unified Planner</div>
            <h2 className="fw-bold text-white mb-2">Design your perfect week</h2>
            <p className="mb-0 text-white-75">
              Balance routines, smart suggestions, and calendar sync with a refreshed, cohesive workspace.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton color="light" variant="ghost" onClick={() => setActiveTab("add")} className="shadow-sm">
              <CIcon icon={cilPlus} className="me-2" /> New time block
            </CButton>
            <CButton color="light" onClick={() => setActiveTab("sync")} className="shadow-sm">
              <CIcon icon={cilLoopCircular} className="me-2" /> Sync calendars
            </CButton>
          </div>
        </div>
        <CRow className="mt-4 g-3">
          {quickMetrics.map((metric) => (
            <CCol sm={6} md={4} key={metric.label}>
              <div className="metric-card h-100 p-3 rounded-4 bg-white bg-opacity-10 border border-white border-opacity-25">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="text-white-75 small text-uppercase">{metric.label}</span>
                  <CBadge color={metric.accent} className="border-0">
                    <CIcon icon={metric.icon} size="sm" />
                  </CBadge>
                </div>
                <div className="fs-5 fw-semibold text-white">{metric.value}</div>
                <div className="mt-2">
                  <CProgress thin color={metric.accent} className="bg-white bg-opacity-25">
                    <CProgressBar value={80} />
                  </CProgress>
                </div>
              </div>
            </CCol>
          ))}
        </CRow>
      </div>

      <CCard className="border-0 shadow-sm planner-panel">
        <CCardBody>
          <CNav variant="tabs" role="tablist" className="planner-tabs mb-4">
            <CNavItem>
              <CNavLink active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")}>
                <CIcon icon={cilCalendar} className="me-2" /> My Schedule
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === "add"} onClick={() => setActiveTab("add")}>
                <CIcon icon={cilPlus} className="me-2" /> Add Schedule
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === "sync"} onClick={() => setActiveTab("sync")}>
                <CIcon icon={cilSync} className="me-2" /> Sync
              </CNavLink>
            </CNavItem>
          </CNav>

          <div className="planner-pane">
            <CTabContent>
              <CTabPane visible={activeTab === "schedule"}>
                <MyRoutine onSyncClick={handleSyncClick} />
              </CTabPane>
              <CTabPane visible={activeTab === "add"}>
                <div className="mt-2">
                  <Schedules />
                </div>
              </CTabPane>
              <CTabPane visible={activeTab === "sync"}>
                <div className="mt-2">
                  <CalendarSync />
                </div>
              </CTabPane>
            </CTabContent>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default Planner
