import React from "react"

const REFRESH_EVENT = "stephabit:data-updated"

export const REFRESH_SCOPES = {
  ALL: "all",
  HABITS: "habits",
  SCHEDULES: "schedules",
  PROGRESS: "progress",
  ANALYTICS: "analytics",
}

export const emitDataRefresh = (scope = REFRESH_SCOPES.ALL, meta = {}) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(REFRESH_EVENT, {
      detail: { scope, meta },
    }),
  )
}

export const useDataRefresh = (scopes, handler) => {
  React.useEffect(() => {
    if (typeof window === "undefined") return undefined
    const normalized = Array.isArray(scopes) && scopes.length ? scopes : [REFRESH_SCOPES.ALL]

    const listener = (event) => {
      const scope = event?.detail?.scope || REFRESH_SCOPES.ALL
      if (normalized.includes(REFRESH_SCOPES.ALL) || normalized.includes(scope)) {
        handler(event?.detail)
      }
    }

    window.addEventListener(REFRESH_EVENT, listener)
    return () => window.removeEventListener(REFRESH_EVENT, listener)
  }, [handler, scopes])
}

