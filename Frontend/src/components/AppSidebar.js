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
      <AppSidebarNav items={navigation} />
      <CSidebarFooter className="border-0 d-none d-lg-flex justify-content-center pb-4">
        <div className="sidebar-glow rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2">
          <span className="status-dot pulse" />
          <small className="text-white-50">All systems synced</small>
          <CSidebarToggler
            className="text-white"
            onClick={() => dispatch({ type: 'set', sidebarShow: false })}
          />
        </div>
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
