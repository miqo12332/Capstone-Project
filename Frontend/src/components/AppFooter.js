import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4 modern-footer">
      <div>
        <div className="fw-semibold">StepHabit © 2025</div>
        <div className="text-muted small">Built to keep your routines calm and clear.</div>
      </div>
      <div className="ms-auto text-end">
        <div className="fw-semibold">Mikayel Davtyan & Artur Aghamyan</div>
        <div className="text-muted small">Capstone Project</div>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
