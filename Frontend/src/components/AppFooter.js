import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <h6>StepHabit &copy; 2025 Capstone Project</h6>
      </div>
      <div className="ms-auto">
        <h6>Mikayel Davtyan & Artur Aghamyan</h6>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
