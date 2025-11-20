import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CBadge,
  CButton,
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CForm,
  CFormInput,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalendar,
  cilContrast,
  cilMenu,
  cilMoon,
  cilPlus,
  cilSearch,
  cilSpeedometer,
  cilSun,
} from '@coreui/icons'

import { AppBreadcrumb } from './index'
import { AppHeaderDropdown } from './header/index'

const AppHeader = () => {
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  useEffect(() => {
    document.addEventListener('scroll', () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    })
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0 modern-header" ref={headerRef}>
      <CContainer className="px-4 py-3" fluid>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <CHeaderToggler
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            className="rounded-circle shadow-sm bg-body"
            style={{ marginInlineStart: '-6px' }}
          >
            <CIcon icon={cilMenu} size="lg" />
          </CHeaderToggler>
          <div className="d-flex flex-column flex-grow-1 gap-2">
            <div className="d-flex flex-wrap align-items-center gap-3 justify-content-between">
              <div className="d-flex flex-column">
                <span className="text-uppercase text-muted fw-semibold small">Today at a glance</span>
                <div className="d-flex align-items-center gap-2">
                  <CIcon icon={cilSpeedometer} className="text-primary" />
                  <span className="fw-semibold">Smooth flow</span>
                  <CBadge color="primary" className="rounded-pill">Updated</CBadge>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 quick-actions">
                <CForm className="d-none d-md-flex align-items-center modern-search">
                  <CIcon icon={cilSearch} className="text-muted me-2" />
                  <CFormInput size="sm" placeholder="Search pages, habits, schedules" />
                </CForm>
                <CButton color="primary" variant="ghost" className="rounded-pill" component={NavLink} to="/addhabit">
                  <CIcon icon={cilPlus} className="me-2" />
                  Add habit
                </CButton>
                <CButton color="secondary" variant="ghost" className="rounded-pill" component={NavLink} to="/schedules">
                  <CIcon icon={cilCalendar} className="me-2" />
                  Planner
                </CButton>
              </div>
            </div>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <CHeaderNav className="pill-nav d-flex align-items-center gap-2">
                <CNavItem>
                  <CNavLink to="/dashboard" as={NavLink} className="pill-link">
                    Overview
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink to="/progress-tracker" as={NavLink} className="pill-link">
                    Progress
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink to="/habit-library" as={NavLink} className="pill-link">
                    Library
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink to="/messages" as={NavLink} className="pill-link">
                    Messages
                  </CNavLink>
                </CNavItem>
              </CHeaderNav>
              <div className="d-flex align-items-center gap-2">
                <CDropdown variant="nav-item" placement="bottom-end">
                  <CDropdownToggle caret={false} className="theme-toggle">
                    {colorMode === 'dark' ? (
                      <CIcon icon={cilMoon} size="lg" />
                    ) : colorMode === 'auto' ? (
                      <CIcon icon={cilContrast} size="lg" />
                    ) : (
                      <CIcon icon={cilSun} size="lg" />
                    )}
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem
                      active={colorMode === 'light'}
                      className="d-flex align-items-center"
                      as="button"
                      type="button"
                      onClick={() => setColorMode('light')}
                    >
                      <CIcon className="me-2" icon={cilSun} size="lg" /> Light
                    </CDropdownItem>
                    <CDropdownItem
                      active={colorMode === 'dark'}
                      className="d-flex align-items-center"
                      as="button"
                      type="button"
                      onClick={() => setColorMode('dark')}
                    >
                      <CIcon className="me-2" icon={cilMoon} size="lg" /> Dark
                    </CDropdownItem>
                    <CDropdownItem
                      active={colorMode === 'auto'}
                      className="d-flex align-items-center"
                      as="button"
                      type="button"
                      onClick={() => setColorMode('auto')}
                    >
                      <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
                    </CDropdownItem>
                  </CDropdownMenu>
                </CDropdown>
                <CHeaderNav className="ms-0">
                  <CNavItem>
                    <CNavLink to="/notifications" as={NavLink} className="icon-pill">
                      <CIcon icon={cilBell} size="lg" />
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink to="/calendar-sync" as={NavLink} className="icon-pill">
                      <CIcon icon={cilCalendar} size="lg" />
                    </CNavLink>
                  </CNavItem>
                </CHeaderNav>
                <AppHeaderDropdown />
              </div>
            </div>
          </div>
        </div>
      </CContainer>
      <CContainer className="px-4 pb-3" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
