import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    <CSidebar
      className="modern-sidebar shadow-lg"
      colorScheme="light"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom-0 py-4 px-3">
        <CSidebarBrand to="/" className="d-flex align-items-center gap-2">
          <div className="sidebar-mark">
            <CIcon customClassName="sidebar-brand-full" icon={logo} height={32} />
          </div>
          <div>
            <div className="fw-bold">StepHabit</div>
            <div className="small text-muted">Personal coach</div>
          </div>
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <div className="px-3 pb-3">
        <div className="sidebar-callout">
          <div className="fw-semibold">Plan smarter</div>
          <div className="small text-muted">Tap Planner to map your day.</div>
        </div>
      </div>
      <AppSidebarNav items={navigation} />
      <CSidebarFooter className="border-top-0 d-none d-lg-flex px-3 pb-3">
        <div className="w-100 sidebar-footer-card">
          <div className="fw-semibold mb-1">Need a quick reset?</div>
          <div className="small text-muted mb-2">
            Jump to the dashboard for a concise overview of today.
          </div>
          <CSidebarToggler
            className="mt-1"
            onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
          />
        </div>
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
