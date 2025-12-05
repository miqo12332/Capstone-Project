import React from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CNavTitle, CSidebarNav } from '@coreui/react'

export const AppSidebarNav = ({ items }) => {
  const navLink = (name, icon, badge, subtitle, indent = false) => {
    return (
      <div className="nav-glow d-flex align-items-center gap-3 w-100">
        <div className="nav-glow__icon">
          {icon
            ? icon
            : indent && (
                <span className="nav-icon">
                  <span className="nav-icon-bullet"></span>
                </span>
              )}
        </div>
        <div className="d-flex flex-column">
          {name && <span className="fw-semibold nav-glow__label">{name}</span>}
          {subtitle && <small className="nav-glow__subtitle">{subtitle}</small>}
          {badge && (
            <CBadge color={badge.color} className="ms-0 mt-1 align-self-start" size="sm">
              {badge.text}
            </CBadge>
          )}
        </div>
        <span className="ms-auto nav-glow__chevron">›</span>
      </div>
    )
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, subtitle, ...rest } = item
    const Component = component
    const hasLink = Boolean(rest.to || rest.href)

    if (!hasLink && Component === CNavTitle) {
      return (
        <Component key={index} className={`nav-title ${rest.className ?? ''}`} {...rest}>
          {name}
        </Component>
      )
    }

    return (
      <Component as="div" key={index}>
        {hasLink ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            {...rest}
            className={`nav-glow-link ${rest.className ?? ''}`}
          >
            {navLink(name, icon, badge, subtitle, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, subtitle, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, ...rest } = item
    const Component = component
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index, true),
        )}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar} className="nav-shell">
      <div className="nav-grid">
        {items &&
          items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
      </div>
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
