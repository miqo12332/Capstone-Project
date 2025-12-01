import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  CAlert,
  CAvatar,
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
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilBell,
  cilCloudUpload,
  cilContact,
  cilInfo,
  cilLifeRing,
  cilLink,
  cilLockLocked,
  cilSettings,
  cilStar,
  cilUser,
} from "@coreui/icons"
import axios from "axios"
import { useLocation, useNavigate } from "react-router-dom"
import { AuthContext } from "../../context/AuthContext"
import { HabitContext } from "../../context/HabitContext"
import { fetchUserSettings, saveUserSettings } from "../../services/settings"
import { getProgressAnalytics } from "../../services/analytics"

const UserProfile = () => {
  const { user, login } = useContext(AuthContext)
  const habitContext = useContext(HabitContext)
  const habits = habitContext?.habits || []
  const location = useLocation()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(location.state?.tab || "account")
  const [profile, setProfile] = useState({ name: "", email: "", gender: "" })
  const [preferences, setPreferences] = useState({
    theme: "light",
    aiTone: "balanced",
    supportStyle: "celebrate",
  })
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
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab)
    }
  }, [location.state?.tab])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { user: payload } = await fetchUserSettings(user.id)
        setProfile({
          name: payload.name || "",
          email: payload.email || "",
          gender: payload.gender || "",
        })
        const settings = payload.settings || {}
        setSettingsBaseline(settings)
        setPreferences({
          theme: settings.theme || "light",
          aiTone: settings.aiTone || "balanced",
          supportStyle: settings.supportStyle || "celebrate",
        })
        setNotificationPrefs({
          emailAlerts: Boolean(settings.emailAlerts ?? true),
          pushReminders: Boolean(settings.pushReminders ?? false),
        })
        setConnectedApps({
          googleCalendar: Boolean(settings.googleCalendar ?? false),
          appleCalendar: Boolean(settings.appleCalendar ?? false),
          fitnessSync: Boolean(settings.fitnessSync ?? false),
        })
        setAvatarUrl(
          payload.avatar
            ? `http://localhost:5001${payload.avatar}`
            : "/uploads/default-avatar.png"
        )
        setError("")
        if (typeof login === "function") {
          login(payload)
        }
      } catch (err) {
        console.error(err)
        setError("We couldn't load your profile details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user?.id, login])

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

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    const formData = new FormData()
    formData.append("avatar", file)

    try {
      setAvatarUploading(true)
      const res = await axios.post(
        `http://localhost:5001/api/avatar/${user.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )

      if (res.data.success) {
        const newAvatar = `http://localhost:5001${res.data.imagePath}`
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
    setStatus("Password reset instructions will be sent to your email.")
  }

  const achievementsSummary = useMemo(
    () => ({
      totalHabits: habits.length,
      streak: analytics?.streak ?? analytics?.longestStreak ?? 0,
      badges: analytics?.badges || analytics?.milestones || [],
    }),
    [habits.length, analytics]
  )

  const renderAccountTab = () => (
    <CRow className="g-4">
      <CCol md={4}>
        <CCard className="h-100 shadow-sm border-0">
          <CCardHeader className="bg-white border-0">
            <h5 className="mb-1">Avatar</h5>
            <small className="text-body-secondary">Keep your profile recognizable across the app.</small>
          </CCardHeader>
          <CCardBody className="text-center">
            <CAvatar src={avatarUrl} size="xl" className="mb-3" />
            <div className="text-body-secondary small mb-3">Completion {completionScore}%</div>
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
        <CCard className="h-100 shadow-sm border-0">
          <CCardHeader className="bg-white border-0 d-flex justify-content-between align-items-center">
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
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Full name</CFormLabel>
                <CFormInput
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="How should we address you?"
                  required
                />
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
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )

  const renderPreferencesTab = () => (
    <CCard className="shadow-sm border-0">
      <CCardHeader className="bg-white border-0">
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
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )

  const renderNotificationsTab = () => (
    <CCard className="shadow-sm border-0">
      <CCardHeader className="bg-white border-0">
        <h5 className="mb-1">Notifications</h5>
        <small className="text-body-secondary">Choose how you want to stay on track.</small>
      </CCardHeader>
      <CCardBody>
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
    <CCard className="shadow-sm border-0">
      <CCardHeader className="bg-white border-0">
        <h5 className="mb-1">Connected Apps</h5>
        <small className="text-body-secondary">
          Sync calendars and fitness data so StepHabit can plan around your real life.
        </small>
      </CCardHeader>
      <CCardBody>
        <CListGroup flush>
          <CListGroupItem className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">Google Calendar</div>
              <small className="text-body-secondary">Block time for routines alongside events.</small>
            </div>
            <CFormSwitch
              checked={connectedApps.googleCalendar}
              onChange={(event) =>
                setConnectedApps((prev) => ({ ...prev, googleCalendar: event.target.checked }))
              }
            />
          </CListGroupItem>
          <CListGroupItem className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">Apple Calendar</div>
              <small className="text-body-secondary">See habits next to your schedule.</small>
            </div>
            <CFormSwitch
              checked={connectedApps.appleCalendar}
              onChange={(event) =>
                setConnectedApps((prev) => ({ ...prev, appleCalendar: event.target.checked }))
              }
            />
          </CListGroupItem>
          <CListGroupItem className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">Fitness Sync</div>
              <small className="text-body-secondary">Import steps and workouts to fuel streaks.</small>
            </div>
            <CFormSwitch
              checked={connectedApps.fitnessSync}
              onChange={(event) =>
                setConnectedApps((prev) => ({ ...prev, fitnessSync: event.target.checked }))
              }
            />
          </CListGroupItem>
        </CListGroup>
      </CCardBody>
    </CCard>
  )

  const renderAchievementsTab = () => (
    <CRow className="g-4">
      <CCol md={4}>
        <CCard className="shadow-sm border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle bg-primary-subtle p-2 me-3">
                <CIcon icon={cilStar} className="text-primary" />
              </div>
              <div>
                <div className="fw-semibold">Badges</div>
                <small className="text-body-secondary">Celebrations for consistent wins.</small>
              </div>
            </div>
            <h2 className="fw-bold mb-1">{achievementsSummary.badges.length}</h2>
            <div className="text-body-secondary small">Earned so far</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard className="shadow-sm border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle bg-success-subtle p-2 me-3">
                <CIcon icon={cilSettings} className="text-success" />
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
        <CCard className="shadow-sm border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle bg-warning-subtle p-2 me-3">
                <CIcon icon={cilBell} className="text-warning" />
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
        <CCard className="shadow-sm border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle bg-info-subtle p-2 me-3">
                <CIcon icon={cilInfo} className="text-info" />
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
        <CCard className="shadow-sm border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle bg-primary-subtle p-2 me-3">
                <CIcon icon={cilLifeRing} className="text-primary" />
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
        <CCard className="shadow-sm border-0 h-100">
          <CCardBody>
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle bg-warning-subtle p-2 me-3">
                <CIcon icon={cilContact} className="text-warning" />
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
    <CContainer fluid className="py-4">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-3 mb-2">
            <CAvatar src={avatarUrl} size="lg" />
            <div>
              <h2 className="fw-bold mb-0">Profile</h2>
              <div className="text-body-secondary">One hub for account, preferences, and support.</div>
            </div>
          </div>
          {status && (
            <CAlert color="success" className="py-2 px-3 mb-0 d-inline-flex align-items-center">
              <CIcon icon={cilLink} className="me-2" /> {status}
            </CAlert>
          )}
          {error && (
            <CAlert color="danger" className="py-2 px-3 mb-0 d-inline-flex align-items-center">
              <CIcon icon={cilLink} className="me-2" /> {error}
            </CAlert>
          )}
        </div>
        <CButton color="primary" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSettings} className="me-2" />}
          {saving ? "Saving" : "Save changes"}
        </CButton>
      </div>

      <CNav variant="tabs" role="tablist" className="mb-4">
        <CNavItem>
          <CNavLink active={activeTab === "account"} onClick={() => setActiveTab("account")}>
            <CIcon icon={cilUser} className="me-2" /> Account
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "preferences"} onClick={() => setActiveTab("preferences")}>
            <CIcon icon={cilSettings} className="me-2" /> Preferences
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "notifications"} onClick={() => setActiveTab("notifications")}>
            <CIcon icon={cilBell} className="me-2" /> Notifications
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === "connected-apps"}
            onClick={() => setActiveTab("connected-apps")}
          >
            <CIcon icon={cilLink} className="me-2" /> Connected Apps
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "achievements"} onClick={() => setActiveTab("achievements")}>
            <CIcon icon={cilStar} className="me-2" /> Achievements
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === "help"} onClick={() => setActiveTab("help")}>
            <CIcon icon={cilLifeRing} className="me-2" /> Help & Support
          </CNavLink>
        </CNavItem>
      </CNav>

      <CForm onSubmit={handleSave}>{renderTabContent()}</CForm>
    </CContainer>
  )
}

export default UserProfile
