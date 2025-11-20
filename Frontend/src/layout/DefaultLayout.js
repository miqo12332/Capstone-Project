import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'

const DefaultLayout = () => {
  return (
    <div className="layout-shell gradient-frame">
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100 layout-surface">
        <AppHeader />
        <div className="body flex-grow-1 px-3 px-lg-4 py-4">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
