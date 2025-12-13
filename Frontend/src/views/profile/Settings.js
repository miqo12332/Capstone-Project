import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
  useColorModes,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilBell,
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilContrast,
  cilEnvelopeClosed,
  cilList,
  cilMoon,
  cilSettings,
  cilSun,
  cilUser,
} from "@coreui/icons";
import { AuthContext } from "../../context/AuthContext";
import { fetchUserSettings, saveUserSettings } from "../../services/settings";

const THEME_STORAGE_KEY = "coreui-free-react-admin-template-theme";
const COLOR_MODE_EVENT = "coreui-color-mode-updated";

const mapThemeToColorMode = (theme) => {
  if (theme === "dark") return "dark";
  if (theme === "auto") return "auto";
  return "light";
};

const mapColorModeToTheme = (colorMode) => {
  if (colorMode === "dark") return "dark";
  if (colorMode === "auto") return "auto";
  return "light";
};

const Settings = () => {
  const { user, login } = useContext(AuthContext);
  const { colorMode, setColorMode } = useColorModes(THEME_STORAGE_KEY);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    bio: "",
  });
  const [preferences, setPreferences] = useState({
    timezone: "UTC",
    dailyReminderTime: "",
    weeklySummaryDay: "Sunday",
    emailNotifications: true,
    pushNotifications: false,
    shareActivity: true,
    theme: mapColorModeToTheme(colorMode),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const timezoneOptions = useMemo(
    () => [
      { label: "UTC", value: "UTC" },
      { label: "Pacific Time (US & Canada)", value: "America/Los_Angeles" },
      { label: "Central Time (US & Canada)", value: "America/Chicago" },
      { label: "Eastern Time (US & Canada)", value: "America/New_York" },
      { label: "Greenwich Mean Time", value: "Europe/London" },
      { label: "Central European Time", value: "Europe/Berlin" },
      { label: "India Standard Time", value: "Asia/Kolkata" },
      { label: "Singapore Time", value: "Asia/Singapore" },
      { label: "Australia Eastern Time", value: "Australia/Sydney" },
    ],
    []
  );

  const summaryDays = useMemo(
    () => [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    []
  );

  useEffect(() => {
    const mappedTheme = mapColorModeToTheme(colorMode);
    setPreferences((prev) =>
      prev.theme === mappedTheme ? prev : { ...prev, theme: mappedTheme }
    );
  }, [colorMode]);

  useEffect(() => {
    const handleColorModeChange = (event) => {
      if (!event.detail) return;
      const mappedTheme = mapColorModeToTheme(event.detail);
      setPreferences((prev) =>
        prev.theme === mappedTheme ? prev : { ...prev, theme: mappedTheme }
      );
      setColorMode(event.detail);
    };

    window.addEventListener(COLOR_MODE_EVENT, handleColorModeChange);
    return () => window.removeEventListener(COLOR_MODE_EVENT, handleColorModeChange);
  }, [setColorMode]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { user: payload } = await fetchUserSettings(user.id);
        setProfile({
          name: payload.name || "",
          email: payload.email || "",
          age:
            payload.age !== null && payload.age !== undefined
              ? String(payload.age)
              : "",
          gender: payload.gender || "",
          bio: payload.bio || "",
        });
      setPreferences({
        timezone: payload.settings?.timezone || "UTC",
        dailyReminderTime: payload.settings?.dailyReminderTime || "",
        weeklySummaryDay: payload.settings?.weeklySummaryDay || "Sunday",
        emailNotifications: Boolean(payload.settings?.emailNotifications ?? true),
        pushNotifications: Boolean(payload.settings?.pushNotifications ?? false),
        shareActivity: Boolean(payload.settings?.shareActivity ?? true),
        theme: mapColorModeToTheme(payload.settings?.theme || colorMode),
      });
      } catch (err) {
        console.error(err);
        setError("We couldn't load your settings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [colorMode, user]);

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleBooleanPreference = (field) => {
    setPreferences((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    const nextColorMode = mapThemeToColorMode(preferences.theme);
    setColorMode(nextColorMode);
    window.dispatchEvent(
      new CustomEvent(COLOR_MODE_EVENT, {
        detail: nextColorMode,
      })
    );
  }, [preferences.theme, setColorMode]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user) return;

    setStatus("");
    setError("");
    setSaving(true);

    try {
      const numericAge = Number(profile.age);
      const parsedAge = profile.age === "" || Number.isNaN(numericAge) ? null : numericAge;

      const payload = {
        ...profile,
        age: parsedAge,
        settings: preferences,
      };
      const { user: updated } = await saveUserSettings(user.id, payload);

      setProfile({
        name: updated.name || "",
        email: updated.email || "",
        age:
          updated.age !== null && updated.age !== undefined
            ? String(updated.age)
            : "",
        gender: updated.gender || "",
        bio: updated.bio || "",
      });
      setPreferences({
        timezone: updated.settings?.timezone || "UTC",
        dailyReminderTime: updated.settings?.dailyReminderTime || "",
        weeklySummaryDay: updated.settings?.weeklySummaryDay || "Sunday",
        emailNotifications: Boolean(updated.settings?.emailNotifications ?? true),
        pushNotifications: Boolean(updated.settings?.pushNotifications ?? false),
        shareActivity: Boolean(updated.settings?.shareActivity ?? true),
        theme: updated.settings?.theme || mapColorModeToTheme(colorMode),
      });

      if (login) {
        login(updated);
      }

      setStatus("Your preferences are up to date!");
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.error || "Failed to save settings.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <CAlert color="warning" className="border-0 shadow-sm">
        Please login to personalise your StepHabit experience.
      </CAlert>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" size="lg" />
        <p className="mt-3 text-body-secondary">Preparing your settings dashboard…</p>
      </div>
    );
  }

  return (
    <CForm onSubmit={handleSave}>
      <CRow className="g-4">
        <CCol md={8}>
          <CCard className="border-0 shadow-sm h-100">
            <CCardHeader className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">Account Settings</h4>
                  <small className="text-body-secondary">
                    Update the essentials that shape your daily coaching experience.
                  </small>
                </div>
                <CBadge color="info" shape="rounded-pill">
                  <CIcon icon={cilSettings} className="me-1" /> Real-time sync
                </CBadge>
              </div>
            </CCardHeader>
            <CCardBody className="pt-0">
              {status && (
                <CAlert color="success" className="border-0 shadow-sm mb-4">
                  <CIcon icon={cilCheckCircle} className="me-2" /> {status}
                </CAlert>
              )}
              {error && (
                <CAlert color="danger" className="border-0 shadow-sm mb-4">
                  {error}
                </CAlert>
              )}
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel className="fw-semibold">Full name</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      value={profile.name}
                      onChange={(event) => handleProfileChange("name", event.target.value)}
                      placeholder="How should we address you?"
                      required
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="fw-semibold">Email address</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilEnvelopeClosed} />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      value={profile.email}
                      onChange={(event) => handleProfileChange("email", event.target.value)}
                      placeholder="Where should progress summaries land?"
                      required
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="fw-semibold">Age</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    value={profile.age}
                    onChange={(event) => handleProfileChange("age", event.target.value)}
                    placeholder="Optional"
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="fw-semibold">Preferred pronouns</CFormLabel>
                  <CFormSelect
                    value={profile.gender}
                    onChange={(event) => handleProfileChange("gender", event.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="Female">She / Her</option>
                    <option value="Male">He / Him</option>
                    <option value="Non-binary">They / Them</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="fw-semibold">Weekly summary day</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilCalendar} />
                    </CInputGroupText>
                    <CFormSelect
                      value={preferences.weeklySummaryDay}
                      onChange={(event) => handlePreferenceChange("weeklySummaryDay", event.target.value)}
                    >
                      {summaryDays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </CFormSelect>
                  </CInputGroup>
                </CCol>
                <CCol xs={12}>
                  <CFormLabel className="fw-semibold">Motivation tagline</CFormLabel>
                  <CFormTextarea
                    value={profile.bio}
                    onChange={(event) => handleProfileChange("bio", event.target.value)}
                    placeholder="Share a sentence that keeps you moving."
                    rows={3}
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="border-0 shadow-sm h-100">
            <CCardHeader className="bg-white border-0 py-3">
              <h5 className="mb-0">Daily snapshot</h5>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex align-items-start mb-3">
                <div className="me-3 rounded-circle bg-primary-subtle p-2">
                  <CIcon icon={cilClock} className="text-primary" />
                </div>
                <div>
                  <div className="fw-semibold">Next reminder</div>
                  <small className="text-body-secondary">
                    {preferences.dailyReminderTime ? `Today at ${preferences.dailyReminderTime}` : "No reminder scheduled"}
                  </small>
                </div>
              </div>
              <div className="d-flex align-items-start mb-3">
                <div className="me-3 rounded-circle bg-warning-subtle p-2">
                  <CIcon icon={cilBell} className="text-warning" />
                </div>
                <div>
                  <div className="fw-semibold">Inbox updates</div>
                  <small className="text-body-secondary">
                    {preferences.emailNotifications
                      ? "You'll receive curated progress emails"
                      : "Email digests are currently paused"}
                  </small>
                </div>
              </div>
              <div className="d-flex align-items-start mb-3">
                <div className="me-3 rounded-circle bg-info-subtle p-2">
                  <CIcon icon={cilList} className="text-info" />
                </div>
                <div>
                  <div className="fw-semibold">Weekly reset</div>
                  <small className="text-body-secondary">
                    {preferences.weeklySummaryDay} recaps arrive after dinner time.
                  </small>
                </div>
              </div>
              <CListGroup flush className="small border-top pt-3">
                <CListGroupItem className="border-0 px-0 d-flex justify-content-between align-items-center">
                  Theme preference
                  <CBadge
                    color={
                      preferences.theme === "dark"
                        ? "dark"
                        : preferences.theme === "auto"
                        ? "secondary"
                        : "primary"
                    }
                  >
                    {preferences.theme === "dark"
                      ? "Dark"
                      : preferences.theme === "auto"
                      ? "Auto"
                      : "Light"}
                  </CBadge>
                </CListGroupItem>
                <CListGroupItem className="border-0 px-0 d-flex justify-content-between align-items-center">
                  Push nudges
                  <CBadge color={preferences.pushNotifications ? "success" : "secondary"}>
                    {preferences.pushNotifications ? "Enabled" : "Muted"}
                  </CBadge>
                </CListGroupItem>
                <CListGroupItem className="border-0 px-0 d-flex justify-content-between align-items-center">
                  Share streaks with friends
                  <CBadge color={preferences.shareActivity ? "success" : "secondary"}>
                    {preferences.shareActivity ? "On" : "Private"}
                  </CBadge>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="g-4 mt-1">
        <CCol md={6}>
          <CCard className="border-0 shadow-sm h-100">
            <CCardHeader className="bg-white border-0 py-3">
              <h5 className="mb-0">Reminders & notifications</h5>
            </CCardHeader>
            <CCardBody className="pt-0">
              <CFormLabel className="fw-semibold">Daily reminder</CFormLabel>
              <CInputGroup className="mb-3">
                <CInputGroupText>
                  <CIcon icon={cilClock} />
                </CInputGroupText>
                <CFormInput
                  type="time"
                  value={preferences.dailyReminderTime}
                  onChange={(event) => handlePreferenceChange("dailyReminderTime", event.target.value)}
                />
              </CInputGroup>
              <CFormLabel className="fw-semibold">Timezone</CFormLabel>
              <CFormSelect
                className="mb-3"
                value={preferences.timezone}
                onChange={(event) => handlePreferenceChange("timezone", event.target.value)}
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </CFormSelect>
              <CFormSwitch
                label="Send me motivational nudges when I'm falling behind"
                checked={preferences.pushNotifications}
                onChange={() => handleBooleanPreference("pushNotifications")}
                className="mb-3"
              />
              <CFormSwitch
                label="Email me a curated digest each week"
                checked={preferences.emailNotifications}
                onChange={() => handleBooleanPreference("emailNotifications")}
                className="mb-3"
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard className="border-0 shadow-sm h-100">
            <CCardHeader className="bg-white border-0 py-3">
              <h5 className="mb-0">Sharing & personalisation</h5>
            </CCardHeader>
            <CCardBody className="pt-0">
              <CFormSwitch
                label="Let friends celebrate my wins and streaks"
                checked={preferences.shareActivity}
                onChange={() => handleBooleanPreference("shareActivity")}
                className="mb-3"
              />
              <CFormLabel className="fw-semibold">Dashboard theme</CFormLabel>
              <div className="d-flex gap-4">
                <CFormCheck
                  type="radio"
                  name="theme"
                  id="theme-light"
                  value="light"
                  checked={preferences.theme === "light"}
                  onChange={(event) => handlePreferenceChange("theme", event.target.value)}
                  label={
                    <span className="d-flex align-items-center">
                      <CIcon icon={cilSun} className="me-2 text-warning" /> Light & vibrant
                    </span>
                  }
                />
                <CFormCheck
                  type="radio"
                  name="theme"
                  id="theme-dark"
                  value="dark"
                  checked={preferences.theme === "dark"}
                  onChange={(event) => handlePreferenceChange("theme", event.target.value)}
                  label={
                    <span className="d-flex align-items-center">
                      <CIcon icon={cilMoon} className="me-2 text-primary" /> Deep focus
                    </span>
                  }
                />
                <CFormCheck
                  type="radio"
                  name="theme"
                  id="theme-auto"
                  value="auto"
                  checked={preferences.theme === "auto"}
                  onChange={(event) => handlePreferenceChange("theme", event.target.value)}
                  label={
                    <span className="d-flex align-items-center">
                      <CIcon icon={cilContrast} className="me-2 text-body-secondary" /> Auto
                    </span>
                  }
                />
              </div>
              <div className="bg-body-tertiary rounded p-3 mt-4">
                <div className="fw-semibold mb-1">Smart tips feed</div>
                <small className="text-body-secondary">
                  We prioritise strategies based on your timezone, reminder cadence, and sharing preferences. Tweak them anytime to keep recommendations relevant.
                </small>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <div className="d-flex justify-content-end mt-4">
        <CButton color="primary" size="lg" type="submit" disabled={saving}>
          {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilCheckCircle} className="me-2" />}
          {saving ? "Saving" : "Save settings"}
        </CButton>
      </div>
    </CForm>
  );
};

export default Settings;
