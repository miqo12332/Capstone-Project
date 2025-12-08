import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CBadge,
  CButton,
  CCloseButton,
  CProgress,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBolt, cilPaperPlane, cilPlus } from '@coreui/icons'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    <CSidebar
      className="border-0 neon-sidebar shadow-sm"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-0 px-3 py-4 neon-sidebar__header">
        <div className="d-flex align-items-center justify-content-between w-100">
          <div className="brand-crest d-flex align-items-center gap-3">
            <span className="brand-crest__orb" aria-hidden="true" />
            <CSidebarBrand to="/" className="p-0 m-0 brand-crest__logo">
              <CIcon customClassName="sidebar-brand-full" icon={logo} height={40} />
              <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={40} />
            </CSidebarBrand>
          </div>
          <CCloseButton
            className="d-lg-none text-white"
            dark
            onClick={() => dispatch({ type: 'set', sidebarShow: false })}
          />
        </div>
      </CSidebarHeader>
      <div className="px-3 pb-3 d-flex flex-column gap-3 sidebar-overview">
        <div className="sidebar-panel">
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div>
              <p className="sidebar-eyebrow text-white-50 mb-1">Today</p>
              <h6 className="text-white mb-1">Momentum</h6>
              <small className="text-white-50">3 / 5 habits completed</small>
            </div>
            <div className="sidebar-streak" aria-label="Five-day streak">
              <span className="sidebar-streak__icon" aria-hidden="true">
                🔥
              </span>
              <span className="sidebar-streak__value">5d</span>
            </div>
          </div>
          <CProgress thin color="success" value={65} className="mt-3 sidebar-progress" />
        </div>
        <div className="sidebar-actions-card">
          <div className="d-flex align-items-start gap-3">
            <div className="sidebar-actions-card__icon">
              <CIcon icon={cilBolt} />
            </div>
            <div className="flex-grow-1">
              <p className="mb-1 text-white">Keep the streak alive</p>
              <small className="text-white-50 d-block">Start with your top priority and check-in before lunch.</small>
              <div className="d-flex gap-2 mt-3">
                <CButton color="primary" size="sm" className="shadow-sm">
                  <CIcon icon={cilPlus} className="me-2" /> New task
                </CButton>
                <CButton color="light" size="sm" className="sidebar-chip text-body">
                  <CIcon icon={cilPaperPlane} className="me-2" /> Quick log
                </CButton>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <CBadge color="success" className="px-3 py-2 rounded-pill">Planner ready</CBadge>
            <CBadge color="info" className="px-3 py-2 rounded-pill text-body">Habits synced</CBadge>
          </div>
        </div>
      </div>
      <AppSidebarNav items={navigation} />
      <CSidebarFooter className="border-0 d-none d-lg-flex justify-content-center pb-4">
        <div className="sidebar-glow rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2">
          <span className="status-dot pulse" />
          <small className="text-white-50">All systems synced</small>
          <CSidebarToggler
            className="text-white"
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            aria-label="Toggle sidebar visibility"
          />
          <CCloseButton
            className="sidebar-footer-close text-white"
            dark
            onClick={() => dispatch({ type: 'set', sidebarShow: false })}
            aria-label="Close sidebar"
          />
        </div>
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
