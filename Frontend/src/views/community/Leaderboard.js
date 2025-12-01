import React from "react"
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilChartLine, cilStar } from "@coreui/icons"

const Leaderboard = () => {
  const leaders = [
    { name: "Alice", points: 120, streak: 7 },
    { name: "Bob", points: 100, streak: 5 },
    { name: "Charlie", points: 80, streak: 3 },
    { name: "Danielle", points: 75, streak: 2 },
    { name: "Elliot", points: 60, streak: 1 },
  ]

  const maxPoints = Math.max(...leaders.map((l) => l.points))

  return (
    <CRow className="justify-content-center mt-4">
      <CCol xs={12} lg={10} xl={8}>
        <CCard className="community-section-card border-0 subtle-bg">
          <CCardHeader className="bg-transparent border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
            <div>
              <p className="text-uppercase small text-body-secondary mb-1">Leaderboard</p>
              <h4 className="mb-1">🏅 Weekly momentum</h4>
              <p className="text-body-secondary mb-0">
                Celebrate consistency, streaks, and milestone completions from your community.
              </p>
            </div>
            <CBadge color="warning" className="rounded-pill">
              <CIcon icon={cilChartLine} className="me-2" /> Updated live
            </CBadge>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive align="middle" className="mb-0">
              <CTableHead className="table-light">
                <CTableRow>
                  <CTableHeaderCell scope="col">Rank</CTableHeaderCell>
                  <CTableHeaderCell scope="col">User</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Points</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Progress</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-end">
                    Streak
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {leaders.map((leader, index) => {
                  const isTopThree = index < 3
                  const progress = Math.round((leader.points / maxPoints) * 100)

                  return (
                    <CTableRow key={leader.name} className={isTopThree ? "fw-semibold" : ""}>
                      <CTableDataCell>
                        <div className="d-flex align-items-center gap-2">
                          <CBadge color={isTopThree ? "warning" : "secondary"} shape="rounded-pill">
                            {index + 1}
                          </CBadge>
                          {isTopThree && <CIcon icon={cilStar} className="text-warning" />}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>{leader.name}</CTableDataCell>
                      <CTableDataCell>{leader.points}</CTableDataCell>
                      <CTableDataCell>
                        <CProgress
                          thin
                          color={isTopThree ? "primary" : "info"}
                          value={progress}
                          className="my-2"
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CBadge color="success" shape="rounded-pill">
                          {leader.streak} day{leader.streak === 1 ? "" : "s"}
                        </CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Leaderboard
