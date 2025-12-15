import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  CAlert,
  CAvatar,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CListGroup,
  CListGroupItem,
  CNav,
  CNavItem,
  CNavLink,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
  useColorModes,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilBell,
  cilCalendar,
  cilCheckCircle,
  cilCloudUpload,
  cilContact,
  cilInfo,
  cilLifeRing,
  cilLink,
  cilLockLocked,
  cilMoodGood,
  cilSettings,
  cilSpeedometer,
  cilStar,
  cilUser,
} from "@coreui/icons"
import axios from "axios"
import { useLocation, useNavigate } from "react-router-dom"
import { AuthContext } from "../../context/AuthContext"
import { HabitContext } from "../../context/HabitContext"
import { fetchUserSettings, saveUserSettings } from "../../services/settings"
import { getProgressAnalytics } from "../../services/analytics"
import { fetchCalendarOverview } from "../../services/calendar"
import { API_BASE, ASSET_BASE } from "../../utils/apiConfig"
import { useDataRefresh, REFRESH_SCOPES } from "../../utils/refreshBus"
import ResetPasswordModal from "../../components/auth/ResetPasswordModal"

const THEME_STORAGE_KEY = "coreui-free-react-admin-template-theme"

const mapThemeToColorMode = (theme) => {
  if (theme === "dark") return "dark"
  if (theme === "system") return "auto"
  return "light"
}

const mapColorModeToTheme = (colorMode) => {
  if (colorMode === "dark") return "dark"
  if (colorMode === "auto") return "system"
  return "light"
}

const UserProfile = () => {
  const { user, login, logout } = useContext(AuthContext)
  const habitContext = useContext(HabitContext)
  const habits = habitContext?.habits || []
  const location = useLocation()
  const navigate = useNavigate()
  const { colorMode, setColorMode } = useColorModes(THEME_STORAGE_KEY)

  const [activeTab, setActiveTab] = useState(location.state?.tab || "account")
  const [profile, setProfile] = useState({ name: "", email: "", gender: "" })
  const [preferences, setPreferences] = useState(() => ({
    theme: mapColorModeToTheme(colorMode),
    aiTone: "balanced",
    supportStyle: "celebrate",
  }))
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailAlerts: true,
    pushReminders: true,
  })
  const [connectedApps, setConnectedApps] = useState({
    googleCalendar: false,
    appleCalendar: false,
    fitnessSync: false,
  })
  const [avatarUrl, setAvatarUrl] = useState("/uploads/default-avatar.png")
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [settingsBaseline, setSettingsBaseline] = useState({})
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const fileInputRef = useRef(null)
  const loginRef = useRef(login)

  useEffect(() => {
    loginRef.current = login
  }, [login])

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab)
    }
  }, [location.state?.tab])

  useEffect(() => {
    if (!user) return

    setProfile({
      name: user.name || "",
      email: user.email || "",
      gender: user.gender || "",
    })

    setAvatarUrl(user.avatar ? `${ASSET_BASE}${user.avatar}` : "/uploads/default-avatar.png")
  }, [user])

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    const loadProfile = async () => {
      if (!user?.id) {
        if (isActive) setLoading(false)
        return
      }

      try {
        if (isActive) setLoading(true)
        const { user: payload } = await fetchUserSettings(user.id, {
          signal: controller.signal,
          timeout: 8000,
        })
        if (!isActive) return
        setProfile({
          name: payload.name || "",
          email: payload.email || "",
          gender: payload.gender || "",
        })
        const settings = payload.settings || {}
        const storedColorMode =
          typeof window !== "undefined" ? localStorage.getItem(THEME_STORAGE_KEY) : null
        const mappedColorModeTheme = mapColorModeToTheme(colorMode)
        const mappedSettingsTheme = settings.theme
        const resolvedTheme =
          mappedSettingsTheme && storedColorMode !== null
            ? mapColorModeToTheme(storedColorMode)
            : mappedSettingsTheme || mappedColorModeTheme

        setSettingsBaseline(settings)
        setPreferences({
          theme: resolvedTheme || "light",
          aiTone: settings.aiTone || settings.ai_tone || "balanced",
          supportStyle: settings.supportStyle || settings.support_style || "celebrate",
        })
        setNotificationPrefs({
          emailAlerts: Boolean(
            settings.emailAlerts ?? settings.emailNotifications ?? settings.email_alerts ?? true,
          ),
          pushReminders: Boolean(
            settings.pushReminders ?? settings.pushNotifications ?? settings.push_reminders ?? false,
          ),
        })
        setConnectedApps({
          googleCalendar: Boolean(settings.googleCalendar ?? settings.google_calendar ?? false),
          appleCalendar: Boolean(settings.appleCalendar ?? settings.apple_calendar ?? false),
          fitnessSync: Boolean(settings.fitnessSync ?? settings.fitness_sync ?? false),
        })
        setAvatarUrl(payload.avatar ? `${ASSET_BASE}${payload.avatar}` : "/uploads/default-avatar.png")
        setError("")
        if (typeof loginRef.current === "function") {
          loginRef.current(payload)
        }
      } catch (err) {
        if (!isActive || err.name === "CanceledError") return
        console.error(err)
        setError("We couldn't load your profile details. Please try again.")
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [user?.id])

  useEffect(() => {
    setColorMode(mapThemeToColorMode(preferences.theme))
  }, [preferences.theme, setColorMode])

  const refreshCalendarConnection = useCallback(async () => {
    if (!user?.id) return
    try {
      const overview = await fetchCalendarOverview(user.id, { days: 7 })

      const integrations =
        overview?.integrations || overview?.overview?.integrations || overview?.data?.integrations || []
      const providersMap =
        overview?.summary?.providers || overview?.overview?.summary?.providers || overview?.data?.providers || {}
      const hasEventData = Array.isArray(overview?.events) && overview.events.length > 0

      const hasGoogleIntegration = integrations.some((integration) => {
        const provider = (integration.provider || integration.type || "").toLowerCase()
        const label = (integration.label || "").toLowerCase()
        return provider === "google" || label.includes("google")
      })

      const hasGoogleProviderCount = Boolean(
        Object.entries(providersMap || {}).some(([key, count]) => {
          const normalizedKey = key.toLowerCase()
          return normalizedKey === "google" && Number(count || 0) > 0
        }),
      )

      setConnectedApps((prev) => ({
        ...prev,
        googleCalendar:
          hasGoogleIntegration || hasGoogleProviderCount || hasEventData || prev.googleCalendar,
      }))
    } catch (err) {
      console.error("Failed to refresh calendar integrations", err)
    }
  }, [user?.id])

  useEffect(() => {
    refreshCalendarConnection()
  }, [refreshCalendarConnection])

  useDataRefresh([REFRESH_SCOPES.INTEGRATIONS], refreshCalendarConnection)

  useEffect(() => {
    const mappedTheme = mapColorModeToTheme(colorMode)
    setPreferences((prev) =>
      prev.theme === mappedTheme ? prev : { ...prev, theme: mappedTheme },
    )
  }, [colorMode])

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user?.id) return
      try {
        const data = await getProgressAnalytics(user.id)
        setAnalytics(data)
      } catch (err) {
        console.error(err)
      }
    }

    loadAnalytics()
  }, [user?.id])

  const completionScore = useMemo(() => {
    const pieces = [profile.name, profile.email, profile.gender, preferences.theme]
    const filled = pieces.filter((value) => Boolean(value && value !== "")).length
    return Math.round((filled / pieces.length) * 100)
  }, [profile, preferences])

  const achievementsSummary = useMemo(
    () => ({
      totalHabits: habits.length,
      streak: analytics?.streak ?? analytics?.longestStreak ?? 0,
      badges: analytics?.badges || analytics?.milestones || [],
    }),
    [habits.length, analytics]
  )

  const badgeNames = useMemo(() => {
    return (achievementsSummary.badges || []).map((badge, index) => {
      if (typeof badge === "string") return badge
      if (typeof badge === "object" && badge !== null) {
        return badge.name || badge.title || `Badge ${index + 1}`
      }
      return `Badge ${index + 1}`
    })
  }, [achievementsSummary.badges])

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    const formData = new FormData()
    formData.append("avatar", file)

    try {
      setAvatarUploading(true)
      const res = await axios.post(`${API_BASE}/avatar/${user.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      if (res.data.success) {
        const newAvatar = `${ASSET_BASE}${res.data.imagePath}`
        setAvatarUrl(newAvatar)
        const updatedUser = { ...user, avatar: res.data.imagePath }
        localStorage.setItem("user", JSON.stringify(updatedUser))
        if (typeof login === "function") {
          login(updatedUser)
        }
        setStatus("Avatar updated successfully")
      } else {
        setError("Avatar upload failed. Please try again.")
      }
    } catch (err) {
      console.error(err)
      setError("Avatar upload failed. Please try again.")
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSave = async (event) => {
    event?.preventDefault()
    if (!user?.id) return

    setSaving(true)
    setStatus("")
    setError("")

    try {
      const mergedSettings = {
        ...settingsBaseline,
        theme: preferences.theme,
        aiTone: preferences.aiTone,
        supportStyle: preferences.supportStyle,
        emailAlerts: notificationPrefs.emailAlerts,
        pushReminders: notificationPrefs.pushReminders,
        emailNotifications: notificationPrefs.emailAlerts,
        pushNotifications: notificationPrefs.pushReminders,
        googleCalendar: connectedApps.googleCalendar,
        appleCalendar: connectedApps.appleCalendar,
        fitnessSync: connectedApps.fitnessSync,
      }

      const payload = {
        ...profile,
        settings: mergedSettings,
      }

      const { user: updated } = await saveUserSettings(user.id, payload)
      setSettingsBaseline(updated.settings || {})
      setStatus("Profile saved")
      if (typeof login === "function") {
        login(updated)
      }
    } catch (err) {
      console.error(err)
      const message = err?.response?.data?.error || "Unable to save your updates."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordReset = () => {
    setStatus("")
    setResetModalOpen(true)
  }

  const handleResetSuccess = () => {
    if (typeof logout === "function") {
      logout()
    }
    navigate("/login")
  }

  const renderAccountTab = () => (
    <CRow className="g-4">
      <CCol md={4}>
        <CCard className="h-100 glass-panel border-0">
          <CCardHeader className="bg-transparent border-0">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="mb-1">Avatar</h5>
                <small className="text-body-secondary">
                  Keep your profile recognizable across the app.
                </small>
              </div>
              <CBadge color="light" textColor="dark" className="rounded-pill">{completionScore}%</CBadge>
            </div>
          </CCardHeader>
          <CCardBody className="text-center">
            <CAvatar src={avatarUrl} size="xl" className="mb-3 shadow-sm" />
            <div className="text-body-secondary small mb-3">Freshen your look with a quick upload.</div>
            <CProgress thin className="mb-3">
              <CProgressBar color="primary" value={completionScore} />
            </CProgress>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={handleAvatarChange}
            />
            <CButton
              color="secondary"
              variant="outline"
              className="w-100"
              disabled={avatarUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <CIcon icon={cilCloudUpload} className="me-2" />
              {avatarUploading ? "Uploading..." : "Upload new avatar"}
            </CButton>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={8}>
        <CCard className="h-100 glass-panel border-0">
          <CCardHeader className="bg-transparent border-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h5 className="mb-1">Account</h5>
              <small className="text-body-secondary">
                Update your core details and keep your login secure.
              </small>
            </div>
            <CButton color="link" className="text-decoration-none" onClick={handlePasswordReset}>
              <CIcon icon={cilLockLocked} className="me-2" /> Reset password
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CAlert color="info" className="soft-alert">
              <CIcon icon={cilCheckCircle} className="me-2" /> Fill the highlighted fields to unlock your best
              recommendations.
            </CAlert>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Full name</CFormLabel>
                <CFormInput
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="How should we address you?"
                  required
                />
                <small className="text-body-secondary">Use your preferred display name.</small>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Email</CFormLabel>
                <CFormInput
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="your@email.com"
                  required
                />
                <small className="text-body-secondary">We only use this for account security.</small>
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Gender</CFormLabel>
                <CFormSelect
                  value={profile.gender}
                  onChange={(event) => setProfile((prev) => ({ ...prev, gender: event.target.value }))}
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </CFormSelect>
                <small className="text-body-secondary">Optional, helps us tailor insights.</small>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )

  const renderPreferencesTab = () => (
    <CCard className="glass-panel border-0">
      <CCardHeader className="bg-transparent border-0">
        <h5 className="mb-1">Preferences</h5>
        <small className="text-body-secondary">Shape how StepHabit feels and sounds.</small>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-4">
          <CCol md={4}>
            <CFormLabel className="fw-semibold">Theme</CFormLabel>
            <CFormSelect
              value={preferences.theme}
              onChange={(event) => setPreferences((prev) => ({ ...prev, theme: event.target.value }))}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Match system</option>
            </CFormSelect>
            <small className="text-body-secondary">Switch between light, dark, or your device default.</small>
          </CCol>
          <CCol md={4}>
            <CFormLabel className="fw-semibold">AI tone</CFormLabel>
            <CFormSelect
              value={preferences.aiTone}
              onChange={(event) => setPreferences((prev) => ({ ...prev, aiTone: event.target.value }))}
            >
              <option value="balanced">Balanced coach</option>
              <option value="gentle">Gentle encourager</option>
              <option value="direct">Direct accountability</option>
            </CFormSelect>
            <small className="text-body-secondary">Choose the voice that feels right for your routines.</small>
          </CCol>
          <CCol md={4}>
            <CFormLabel className="fw-semibold">Support style</CFormLabel>
            <CFormSelect
              value={preferences.supportStyle}
              onChange={(event) =>
                setPreferences((prev) => ({ ...prev, supportStyle: event.target.value }))
              }
            >
              <option value="celebrate">Celebrate my wins</option>
              <option value="insights">Deep insights</option>
              <option value="nudges">Gentle nudges</option>
            </CFormSelect>
            <small className="text-body-secondary">Fine-tune how we cheer you on.</small>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )

  const renderNotificationsTab = () => (
    <CCard className="glass-panel border-0">
      <CCardHeader className="bg-transparent border-0">
        <h5 className="mb-1">Notifications</h5>
        <small className="text-body-secondary">Choose how you want to stay on track.</small>
      </CCardHeader>
      <CCardBody>
        <CAlert color="light" className="soft-alert border-0">
          <CIcon icon={cilBell} className="me-2 text-primary" /> Smart reminders are spaced to avoid notification
          fatigue.
        </CAlert>
        <CFormSwitch
          label="Email alerts for reminders and recaps"
          checked={notificationPrefs.emailAlerts}
          onChange={(event) =>
            setNotificationPrefs((prev) => ({ ...prev, emailAlerts: event.target.checked }))
          }
          className="mb-3"
        />
        <CFormSwitch
          label="Push reminders for upcoming habits"
          checked={notificationPrefs.pushReminders}
          onChange={(event) =>
            setNotificationPrefs((prev) => ({ ...prev, pushReminders: event.target.checked }))
          }
        />
      </CCardBody>
    </CCard>
  )

  const renderConnectedAppsTab = () => (
    <CCard className="glass-panel border-0">
      <CCardHeader className="bg-transparent border-0">
        <h5 className="mb-1">Connected Apps</h5>
        <small className="text-body-secondary">
          Sync calendars and fitness data so StepHabit can plan around your real life.
        </small>
      </CCardHeader>
      <CCardBody>
        <CListGroup flush>
          <CListGroupItem className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="fw-semibold">Google Calendar</div>
              <small className="text-body-secondary">
                Status is checked automatically based on your account connection.
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <CBadge color={connectedApps.googleCalendar ? "success" : "secondary"}>
                {connectedApps.googleCalendar ? "Connected" : "Not connected"}
              </CBadge>
              <CBadge color="info" className="text-uppercase">Auto</CBadge>
            </div>
          </CListGroupItem>
          <CListGroupItem className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="fw-semibold">Apple Calendar</div>
              <small className="text-body-secondary">Future improvement to see habits next to your schedule.</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <CBadge color={connectedApps.appleCalendar ? "success" : "secondary"}>
                {connectedApps.appleCalendar ? "Connected" : "Not connected"}
              </CBadge>
              <CBadge color="warning" className="text-uppercase">Coming soon</CBadge>
            </div>
          </CListGroupItem>
          <CListGroupItem className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="fw-semibold">Fitness Sync</div>
              <small className="text-body-secondary">
                Future improvement to import steps and workouts to fuel streaks.
              </small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <CBadge color={connectedApps.fitnessSync ? "success" : "secondary"}>
                {connectedApps.fitnessSync ? "Connected" : "Not connected"}
              </CBadge>
              <CBadge color="warning" className="text-uppercase">Coming soon</CBadge>
            </div>
          </CListGroupItem>
        </CListGroup>
      </CCardBody>
    </CCard>
  )

  const renderAchievementsTab = () => (
    <CRow className="g-4">
      <CCol md={4}>
        <CCard className="glass-panel border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="icon-chip icon-chip-primary">
                <CIcon icon={cilStar} />
              </div>
              <div>
                <div className="fw-semibold">Badges</div>
                <small className="text-body-secondary">Celebrations for consistent wins.</small>
              </div>
            </div>
            <h2 className="fw-bold mb-1">{achievementsSummary.badges.length}</h2>
            <div className="text-body-secondary small mb-3">Earned so far</div>
            <CListGroup flush className="rounded-3 bg-body-tertiary">
              {badgeNames.length ? (
                badgeNames.slice(0, 3).map((badge, index) => (
                  <CListGroupItem key={badge + index} className="border-0">
                    <CIcon icon={cilCheckCircle} className="me-2 text-success" /> {badge}
                  </CListGroupItem>
                ))
              ) : (
                <CListGroupItem className="border-0 text-body-secondary">No badges yet—start a streak!</CListGroupItem>
              )}
            </CListGroup>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard className="glass-panel border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="icon-chip icon-chip-success">
                <CIcon icon={cilSettings} />
              </div>
              <div>
                <div className="fw-semibold">Active streak</div>
                <small className="text-body-secondary">Stay consistent to keep it climbing.</small>
              </div>
            </div>
            <h2 className="fw-bold mb-1">{achievementsSummary.streak} days</h2>
            <div className="text-body-secondary small">Current streak</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard className="glass-panel border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="icon-chip icon-chip-warning">
                <CIcon icon={cilBell} />
              </div>
              <div>
                <div className="fw-semibold">Milestones</div>
                <small className="text-body-secondary">Habit completions logged in StepHabit.</small>
              </div>
            </div>
            <h2 className="fw-bold mb-1">{achievementsSummary.totalHabits}</h2>
            <div className="text-body-secondary small">Habits tracked</div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )

  const renderHelpTab = () => (
    <CRow className="g-4">
      <CCol md={4}>
        <CCard className="glass-panel border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="icon-chip icon-chip-info">
                <CIcon icon={cilInfo} />
              </div>
              <div>
                <div className="fw-semibold">About StepHabit</div>
                <small className="text-body-secondary">Learn how the app keeps you on track.</small>
              </div>
            </div>
            <CButton color="info" variant="outline" onClick={() => navigate("/dashboard")}>
              Explore the dashboard
            </CButton>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard className="glass-panel border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="icon-chip icon-chip-primary">
                <CIcon icon={cilLifeRing} />
              </div>
              <div>
                <div className="fw-semibold">Help Center</div>
                <small className="text-body-secondary">Browse FAQs and quick tips.</small>
              </div>
            </div>
            <CButton color="primary" variant="outline" onClick={() => navigate("/help")}>Open help</CButton>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard className="glass-panel border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="icon-chip icon-chip-warning">
                <CIcon icon={cilContact} />
              </div>
              <div>
                <div className="fw-semibold">Contact</div>
                <small className="text-body-secondary">Get support from the StepHabit team.</small>
              </div>
            </div>
            <CButton color="warning" variant="outline" onClick={() => navigate("/contact")}>Contact us</CButton>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case "account":
        return renderAccountTab()
      case "preferences":
        return renderPreferencesTab()
      case "notifications":
        return renderNotificationsTab()
      case "connected-apps":
        return renderConnectedAppsTab()
      case "achievements":
        return renderAchievementsTab()
      case "help":
        return renderHelpTab()
      default:
        return renderAccountTab()
    }
  }

  if (!user) {
    return (
      <CAlert color="warning" className="border-0 shadow-sm">
        Please log in to manage your profile.
      </CAlert>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-3 text-body-secondary">Loading your profile…</p>
      </div>
    )
  }

  return (
    <CContainer fluid className="py-4 profile-page">
      <div className="profile-hero glass-panel gradient-border mb-4">
        <div className="d-flex align-items-start gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-3">
            <div className="avatar-ring">
              <CAvatar src={avatarUrl} size="lg" />
            </div>
            <div>
              <p className="eyebrow text-uppercase mb-1">Profile control center</p>
              <h2 className="fw-bold mb-1">Hey {profile.name || "there"}, keep your space fresh</h2>
              <div className="text-body-secondary">One curated place for account, preferences, and support.</div>
              <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                <CBadge color="primary" shape="rounded-pill" className="soft-badge">
                  <CIcon icon={cilCheckCircle} className="me-1" /> Profile score {completionScore}%
                </CBadge>
                <CBadge color="success" shape="rounded-pill" className="soft-badge">
                  <CIcon icon={cilMoodGood} className="me-1" /> Mindful coaching: {preferences.aiTone}
                </CBadge>
                {status && (
                  <CBadge color="info" shape="rounded-pill" className="soft-badge">
                    <CIcon icon={cilLink} className="me-1" /> {status}
                  </CBadge>
                )}
                {error && (
                  <CBadge color="danger" shape="rounded-pill" className="soft-badge">
                    <CIcon icon={cilLink} className="me-1" /> {error}
                  </CBadge>
                )}
              </div>
            </div>
          </div>
          <div className="ms-auto d-flex gap-2 flex-wrap">
            <CButton color="secondary" variant="outline" onClick={() => setActiveTab("preferences")}>
              <CIcon icon={cilSpeedometer} className="me-2" /> Fine-tune experience
            </CButton>
            <CButton color="primary" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSettings} className="me-2" />}
              {saving ? "Saving" : "Save changes"}
            </CButton>
          </div>
        </div>
        <div className="mt-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-semibold">Progress to a complete profile</span>
                <span className="text-body-secondary small">{completionScore}% ready</span>
              </div>
              <CProgress className="profile-progress" color="info" value={completionScore} animated>
                <CProgressBar color="gradient" value={completionScore} />
              </CProgress>
            </div>
            <CBadge color="light" textColor="dark" className="rounded-pill px-3 py-2">
              <CIcon icon={cilCalendar} className="me-2" /> Synced habits: {habits.length}
            </CBadge>
          </div>
        </div>
      </div>

      <CRow className="g-3 mb-4">
        {[ 
          {
            label: "Profile completion",
            value: `${completionScore}%`,
            helper: "Fill in account & preferences",
            color: "primary",
            icon: cilCheckCircle,
          },
          {
            label: "Habits tracked",
            value: achievementsSummary.totalHabits,
            helper: "Active routines across StepHabit",
            color: "success",
            icon: cilBell,
          },
          {
            label: "Streak heat",
            value: `${achievementsSummary.streak} days`,
            helper: "Stay on your momentum",
            color: "warning",
            icon: cilStar,
          },
        ].map((card) => (
          <CCol md={4} key={card.label}>
            <CCard className="glass-panel h-100">
              <CCardBody className="d-flex align-items-start gap-3">
                <div className={`icon-chip icon-chip-${card.color}`}>
                  <CIcon icon={card.icon} />
                </div>
                <div>
                  <div className="text-body-secondary small fw-semibold text-uppercase">{card.label}</div>
                  <h4 className="fw-bold mb-1">{card.value}</h4>
                  <div className="text-body-secondary small">{card.helper}</div>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <div className="glass-panel p-0 mb-3 profile-nav">
        <CNav variant="pills" role="tablist" className="profile-nav__list">
          <CNavItem>
            <CNavLink
              className="profile-tab"
              active={activeTab === "account"}
              onClick={() => setActiveTab("account")}
            >
              <CIcon icon={cilUser} className="me-2" /> Account
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              className="profile-tab"
              active={activeTab === "preferences"}
              onClick={() => setActiveTab("preferences")}
            >
              <CIcon icon={cilSettings} className="me-2" /> Preferences
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              className="profile-tab"
              active={activeTab === "notifications"}
              onClick={() => setActiveTab("notifications")}
            >
              <CIcon icon={cilBell} className="me-2" /> Notifications
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              className="profile-tab"
              active={activeTab === "connected-apps"}
              onClick={() => setActiveTab("connected-apps")}
            >
              <CIcon icon={cilLink} className="me-2" /> Connected Apps
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              className="profile-tab"
              active={activeTab === "achievements"}
              onClick={() => setActiveTab("achievements")}
            >
              <CIcon icon={cilStar} className="me-2" /> Achievements
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink className="profile-tab" active={activeTab === "help"} onClick={() => setActiveTab("help")}>
              <CIcon icon={cilLifeRing} className="me-2" /> Help & Support
            </CNavLink>
          </CNavItem>
        </CNav>
      </div>

      <CForm onSubmit={handleSave} className="profile-content">{renderTabContent()}</CForm>
      <ResetPasswordModal
        visible={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        initialEmail={profile.email}
        onSuccess={handleResetSuccess}
      />
    </CContainer>
  )
}

export default UserProfile
