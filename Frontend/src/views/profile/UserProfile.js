import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
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
  CFormTextarea,
  CListGroup,
  CListGroupItem,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilBell,
  cilCalendar,
  cilClock,
  cilCloudUpload,
  cilCompass,
  cilEnvelopeOpen,
  cilFlagAlt,
  cilHeart,
  cilListRich,
  cilPen,
  cilPeople,
  cilSettings,
  cilSpeedometer,
  cilStar,
  cilTask,
  cilUser,
} from "@coreui/icons";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { HabitContext } from "../../context/HabitContext";
import { getProgressAnalytics } from "../../services/analytics";

const numberFormatter = new Intl.NumberFormat();
const formatCount = (value) => numberFormatter.format(value ?? 0);

const genderOptions = [
  { label: "Select gender", value: "" },
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

const goalOptions = [
  { label: "Select a primary goal", value: "" },
  { label: "Build consistency", value: "Build consistency" },
  { label: "Boost energy", value: "Boost energy" },
  { label: "Focus & clarity", value: "Focus & clarity" },
  { label: "Balance & wellbeing", value: "Balance & wellbeing" },
];

const focusOptions = [
  { label: "Select a focus area", value: "" },
  { label: "Mindfulness", value: "Mindfulness" },
  { label: "Fitness", value: "Fitness" },
  { label: "Productivity", value: "Productivity" },
  { label: "Self-care", value: "Self-care" },
];

const experienceOptions = [
  { label: "Select experience level", value: "" },
  { label: "Just getting started", value: "Just getting started" },
  { label: "Finding my rhythm", value: "Finding my rhythm" },
  { label: "Leveling up", value: "Leveling up" },
  { label: "Habit pro", value: "Habit pro" },
];

const commitmentOptions = [
  { label: "Select daily commitment", value: "" },
  { label: "5 minutes", value: "5 minutes" },
  { label: "15 minutes", value: "15 minutes" },
  { label: "30 minutes", value: "30 minutes" },
  { label: "Flexible", value: "Flexible" },
];

const supportOptions = [
  { label: "Select support preference", value: "" },
  { label: "Gentle nudges", value: "Gentle nudges" },
  { label: "Focused reminders", value: "Focused reminders" },
  { label: "Deep insights", value: "Deep insights" },
  { label: "Celebrate my wins", value: "Celebrate my wins" },
];

const formatDate = (value) => {
  if (!value) return "–";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (err) {
    return "–";
  }
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user: authUser, login } = useContext(AuthContext);
  const habitContext = useContext(HabitContext);
  const habits = habitContext?.habits || [];
  const habitsLoading = habitContext?.loading;

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    bio: "",
    primaryGoal: "",
    focusArea: "",
    experienceLevel: "",
    dailyCommitment: "",
    supportPreference: "",
    motivation: "",
  });
  const [settingsSnapshot, setSettingsSnapshot] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("/uploads/default-avatar.png");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!authUser?.id) {
        setLoading(false);
        setError("No profile found. Please login again.");
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5001/api/users/profile/${authUser.id}`);
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();
        const payload = data.user || data;
        setProfile(payload);
        setForm({
          name: payload.name || "",
          email: payload.email || "",
          age: payload.age ?? "",
          gender: payload.gender || "",
          bio: payload.bio || "",
          primaryGoal: payload.primaryGoal || "",
          focusArea: payload.focusArea || "",
          experienceLevel: payload.experienceLevel || "",
          dailyCommitment: payload.dailyCommitment || "",
          supportPreference: payload.supportPreference || "",
          motivation: payload.motivation || "",
        });
        setSettingsSnapshot(payload.settings || {});
        setAvatarUrl(
          payload.avatar
            ? `http://localhost:5001${payload.avatar}`
            : "/uploads/default-avatar.png"
        );
        if (typeof login === "function") {
          login(payload);
        }
        setError("");
      } catch (err) {
        console.error(err);
        setError("Unable to load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [authUser?.id]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!authUser?.id) return;

      try {
        setAnalyticsLoading(true);
        setAnalyticsError("");
        const data = await getProgressAnalytics(authUser.id);
        setAnalytics(data);
      } catch (err) {
        console.error(err);
        setAnalyticsError("We couldn't load your activity insights just yet.");
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, [authUser?.id]);

  const profileCompletion = useMemo(() => {
    const requirements = [
      form.name,
      form.email,
      form.bio,
      form.age,
      form.gender,
      form.primaryGoal,
      form.focusArea,
      form.dailyCommitment,
      form.experienceLevel,
      form.supportPreference,
      form.motivation,
      settingsSnapshot?.timezone,
      settingsSnapshot?.dailyReminderTime,
      settingsSnapshot?.theme,
    ];
    const filled = requirements.filter((value) => value !== null && value !== undefined && value !== "").length;
    return Math.round((filled / requirements.length) * 100);
  }, [form, settingsSnapshot]);

  const insights = useMemo(() => {
    if (!settingsSnapshot) return [];

    return [
      {
        icon: cilCalendar,
        label: "Timezone",
        value: settingsSnapshot.timezone || "UTC",
      },
      {
        icon: cilBell,
        label: "Daily reminder",
        value: settingsSnapshot.dailyReminderTime
          ? `Scheduled for ${settingsSnapshot.dailyReminderTime}`
          : "Disabled",
      },
      {
        icon: cilSettings,
        label: "Theme",
        value:
          settingsSnapshot.theme === "dark"
            ? "Dark mode"
            : settingsSnapshot.theme === "light"
            ? "Light mode"
            : "System default",
      },
      {
        icon: cilTask,
        label: "Activity sharing",
        value: settingsSnapshot.shareActivity ? "Sharing with friends" : "Private",
      },
      {
        icon: cilCalendar,
        label: "Weekly summary",
        value: settingsSnapshot.weeklySummaryDay || "Sunday",
      },
      {
        icon: cilEnvelopeOpen,
        label: "Email updates",
        value: settingsSnapshot.emailNotifications ? "Enabled" : "Disabled",
      },
      {
        icon: cilBell,
        label: "Push alerts",
        value: settingsSnapshot.pushNotifications ? "Enabled" : "Disabled",
      },
    ];
  }, [settingsSnapshot]);

  const journeyHighlights = useMemo(
    () => [
      {
        icon: cilFlagAlt,
        label: "Primary goal",
        value: form.primaryGoal || "Set a guiding goal to personalise your recommendations.",
      },
      {
        icon: cilCompass,
        label: "Focus area",
        value: form.focusArea || "Choose where you’d like to focus first.",
      },
      {
        icon: cilClock,
        label: "Daily commitment",
        value: form.dailyCommitment || "Decide how much time you can give each day.",
      },
      {
        icon: cilSpeedometer,
        label: "Experience level",
        value: form.experienceLevel || "Share how established your habits feel today.",
      },
      {
        icon: cilPeople,
        label: "Support style",
        value: form.supportPreference || "Tell us how you’d like encouragement to show up.",
      },
      {
        icon: cilHeart,
        label: "Motivation",
        value: form.motivation
          ? `“${form.motivation}”`
          : "Add a spark of motivation to revisit on quiet days.",
      },
    ],
    [form]
  );

  const topHabits = useMemo(() => habits.slice(0, 5), [habits]);

  const activityHighlights = useMemo(() => {
    if (!analytics?.summary) return [];

    const { summary } = analytics;
    return [
      {
        icon: cilListRich,
        label: "Habits tracked",
        value: formatCount(summary.totalHabits || 0),
        tone: "primary",
      },
      {
        icon: cilTask,
        label: "Total check-ins",
        value: formatCount(summary.totalCheckIns || 0),
        tone: "success",
      },
      {
        icon: cilSpeedometer,
        label: "Completion rate",
        value: `${summary.completionRate ?? 0}%`,
        tone: "info",
      },
      {
        icon: cilStar,
        label: "Best streak",
        value: summary.streakLeader
          ? `${summary.streakLeader.bestStreak}-day run`
          : "Build your streak",
        tone: "warning",
      },
    ];
  }, [analytics]);

  const leaderboard = useMemo(
    () => analytics?.summary?.habitLeaderboard || [],
    [analytics]
  );

  const momentumHabits = useMemo(() => {
    if (!analytics?.habits?.length) return [];

    return [...analytics.habits]
      .sort((a, b) => (b.recent?.completionRate || 0) - (a.recent?.completionRate || 0))
      .slice(0, 3);
  }, [analytics]);

  const handleInputChange = (event) => {
    const { id, value } = event.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!authUser?.id) return;

    try {
      setSaving(true);
      setSuccess("");
      setError("");
      const res = await fetch(`http://localhost:5001/api/users/profile/${authUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, settings: settingsSnapshot || {} }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update profile");
      }

      const payload = data.user || data;
      setProfile(payload);
      setForm({
        name: payload.name || "",
        email: payload.email || "",
        age: payload.age ?? "",
        gender: payload.gender || "",
        bio: payload.bio || "",
        primaryGoal: payload.primaryGoal || "",
        focusArea: payload.focusArea || "",
        experienceLevel: payload.experienceLevel || "",
        dailyCommitment: payload.dailyCommitment || "",
        supportPreference: payload.supportPreference || "",
        motivation: payload.motivation || "",
      });
      setSettingsSnapshot(payload.settings || settingsSnapshot);
      setAvatarUrl(
        payload.avatar
          ? `http://localhost:5001${payload.avatar}`
          : "/uploads/default-avatar.png"
      );
      setSuccess("Profile updated successfully!");
      if (typeof login === "function") {
        login(payload);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !authUser?.id) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setAvatarUploading(true);
      setSuccess("");
      setError("");

      const res = await fetch(`http://localhost:5001/api/avatar/${authUser.id}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Failed to upload avatar");
      }

      const newAvatarPath = data.imagePath;
      const newProfile = {
        ...(profile || {}),
        avatar: newAvatarPath,
      };
      setProfile(newProfile);
      setAvatarUrl(`http://localhost:5001${newAvatarPath}`);
      setSuccess("Profile photo updated!");
      if (typeof login === "function") {
        login({ ...newProfile, settings: newProfile.settings || settingsSnapshot || {} });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="py-5 text-center">
        <CSpinner color="primary" />
        <p className="text-body-secondary mt-2">Loading your profile…</p>
      </div>
    );
  }

  return (
    <CContainer fluid className="py-4">
      {error && (
        <CAlert color="danger" className="mb-4">
          {error}
        </CAlert>
      )}
      {success && (
        <CAlert color="success" className="mb-4">
          {success}
        </CAlert>
      )}

      <CRow className="g-4">
        <CCol xl={4} lg={5}>
          <CCard className="h-100">
            <CCardBody className="text-center d-flex flex-column">
              <CAvatar src={avatarUrl} size="xl" className="mx-auto mb-3" />
              <h4 className="mb-0">{form.name || "Your profile"}</h4>
              {form.email && (
                <div className="text-body-secondary small mb-3 d-flex align-items-center justify-content-center gap-1">
                  <CIcon icon={cilEnvelopeOpen} />
                  {form.email}
                </div>
              )}
              <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                <CBadge color="info" className="px-3 py-2">
                  <CIcon icon={cilTask} className="me-2" />
                  {habits.length} habits
                </CBadge>
                <CBadge color="secondary" className="px-3 py-2">
                  <CIcon icon={cilSettings} className="me-2" />
                  {profileCompletion}% complete
                </CBadge>
              </div>
              <CProgress thin className="mb-3">
                <CProgressBar value={profileCompletion} color="primary" />
              </CProgress>
              <div className="text-body-secondary small mb-4">
                Member since {formatDate(profile?.createdAt)} · Updated {formatDate(profile?.updatedAt)}
              </div>
              <CButton
                color="secondary"
                variant="outline"
                className="mb-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                <CIcon icon={cilCloudUpload} className="me-2" />
                {avatarUploading ? "Uploading…" : "Update photo"}
              </CButton>
              <input
                ref={fileInputRef}
                type="file"
                className="d-none"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <CButton
                color="primary"
                variant="outline"
                className="mt-auto"
                onClick={() => navigate("/settings")}
              >
                <CIcon icon={cilSettings} className="me-2" />
                Open account settings
              </CButton>
            </CCardBody>
          </CCard>

          <CCard className="mt-4">
            <CCardHeader>Personal insights</CCardHeader>
            <CCardBody>
              <CListGroup flush>
                {insights.length > 0 ? (
                  insights.map((item) => (
                    <CListGroupItem
                      key={item.label}
                      className="d-flex align-items-center justify-content-between"
                    >
                      <span className="d-flex align-items-center gap-2">
                        <CIcon icon={item.icon} className="text-primary" />
                        {item.label}
                      </span>
                      <span className="fw-semibold">{item.value}</span>
                    </CListGroupItem>
                  ))
                ) : (
                  <CListGroupItem className="text-center text-body-secondary">
                    Personal preferences aren&apos;t set yet. Visit settings to customise your experience.
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>

          <CCard className="mt-4">
            <CCardHeader>Your journey focus</CCardHeader>
            <CCardBody>
              <CListGroup flush>
                {journeyHighlights.map((item) => (
                  <CListGroupItem
                    key={item.label}
                    className="d-flex align-items-start justify-content-between gap-3"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <CIcon icon={item.icon} className="text-primary" />
                      {item.label}
                    </span>
                    <span className="fw-semibold text-end text-wrap text-break">{item.value}</span>
                  </CListGroupItem>
                ))}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={8} lg={7}>
          <CCard className="mb-4">
            <CCardHeader>Account details</CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleSubmit} className="mt-2">
                <CRow className="g-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="name">Full name</CFormLabel>
                    <CFormInput
                      id="name"
                      value={form.name}
                      onChange={handleInputChange}
                      required
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="email">Email</CFormLabel>
                    <CFormInput
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={handleInputChange}
                      required
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="age">Age</CFormLabel>
                    <CFormInput
                      id="age"
                      type="number"
                      min="0"
                      value={form.age}
                      onChange={handleInputChange}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="gender">Gender</CFormLabel>
                    <CFormSelect
                      id="gender"
                      value={form.gender}
                      onChange={handleInputChange}
                      options={genderOptions}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Reminder summary</CFormLabel>
                    <CFormInput
                      disabled
                      value={settingsSnapshot?.dailyReminderTime ? `Daily at ${settingsSnapshot.dailyReminderTime}` : "No reminders"}
                    />
                  </CCol>
                  <CCol xs={12}>
                    <CFormLabel htmlFor="bio">About you</CFormLabel>
                    <CFormTextarea
                      id="bio"
                      rows={4}
                      value={form.bio}
                      onChange={handleInputChange}
                      placeholder="Share what keeps you motivated, your goals, or anything your friends should know."
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="primaryGoal">Primary goal</CFormLabel>
                    <CFormSelect
                      id="primaryGoal"
                      value={form.primaryGoal}
                      onChange={handleInputChange}
                      options={goalOptions}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="focusArea">Focus area</CFormLabel>
                    <CFormSelect
                      id="focusArea"
                      value={form.focusArea}
                      onChange={handleInputChange}
                      options={focusOptions}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="dailyCommitment">Daily commitment</CFormLabel>
                    <CFormSelect
                      id="dailyCommitment"
                      value={form.dailyCommitment}
                      onChange={handleInputChange}
                      options={commitmentOptions}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="experienceLevel">Experience level</CFormLabel>
                    <CFormSelect
                      id="experienceLevel"
                      value={form.experienceLevel}
                      onChange={handleInputChange}
                      options={experienceOptions}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="supportPreference">Support style</CFormLabel>
                    <CFormSelect
                      id="supportPreference"
                      value={form.supportPreference}
                      onChange={handleInputChange}
                      options={supportOptions}
                    />
                  </CCol>
                  <CCol xs={12}>
                    <CFormLabel htmlFor="motivation">Motivation mantra</CFormLabel>
                    <CFormTextarea
                      id="motivation"
                      rows={3}
                      value={form.motivation}
                      onChange={handleInputChange}
                      placeholder="Write a short message to future you for days when energy dips."
                    />
                  </CCol>
                </CRow>
                <div className="d-flex justify-content-end mt-4">
                  <CButton color="primary" type="submit" disabled={saving}>
                    <CIcon icon={cilPen} className="me-2" />
                    {saving ? "Saving…" : "Save profile"}
                  </CButton>
                </div>
              </CForm>
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>Performance snapshot</CCardHeader>
            <CCardBody>
              {analyticsError && (
                <CAlert color="warning" className="mb-3">
                  {analyticsError}
                </CAlert>
              )}
              {analyticsLoading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <div className="text-body-secondary small mt-2">
                    Gathering your progress…
                  </div>
                </div>
              ) : analytics ? (
                <>
                  <CRow className="g-3">
                    {activityHighlights.map((item) => (
                      <CCol md={6} key={item.label}>
                        <CCard className="border-0 shadow-sm h-100">
                          <CCardBody className="d-flex align-items-center justify-content-between">
                            <div>
                              <div className="text-uppercase text-body-secondary small mb-1">
                                {item.label}
                              </div>
                              <div className="fw-bold fs-4">{item.value}</div>
                            </div>
                            <div className={`bg-${item.tone}-subtle text-${item.tone} rounded-circle p-3`}>
                              <CIcon icon={item.icon} size="lg" />
                            </div>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    ))}
                  </CRow>

                  <CRow className="g-4 mt-1">
                    <CCol md={6}>
                      <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader>Peak day</CCardHeader>
                        <CCardBody>
                          {analytics.summary?.peakDay ? (
                            <>
                              <div className="fw-bold fs-5 mb-2">
                                {formatDate(analytics.summary.peakDay.date)}
                              </div>
                              <p className="mb-1">
                                <span className="fw-semibold">{analytics.summary.peakDay.completed}</span>{" "}
                                completed · {" "}
                                <span className="fw-semibold">{analytics.summary.peakDay.missed}</span>{" "}
                                missed
                              </p>
                              <p className="text-body-secondary mb-0">
                                Keep the momentum going by planning your next check-ins.
                              </p>
                            </>
                          ) : (
                            <p className="text-body-secondary mb-0">
                              Complete a few habits to discover your standout day.
                            </p>
                          )}
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol md={6}>
                      <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader>Streak leader</CCardHeader>
                        <CCardBody>
                          {analytics.summary?.streakLeader ? (
                            <>
                              <div className="fw-bold fs-5 mb-1">
                                {analytics.summary.streakLeader.habitName}
                              </div>
                              <p className="mb-1">
                                <span className="fw-semibold">{analytics.summary.streakLeader.currentStreak}</span>{" "}
                                day current streak · best run {" "}
                                <span className="fw-semibold">{analytics.summary.streakLeader.bestStreak}</span>{" "}
                                days
                              </p>
                              <p className="text-body-secondary mb-0">
                                Try logging this habit today to keep the streak alive!
                              </p>
                            </>
                          ) : (
                            <p className="text-body-secondary mb-0">
                              Build consistent check-ins to unlock your first streak badge.
                            </p>
                          )}
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>

                  <CRow className="g-4 mt-1">
                    <CCol xl={6}>
                      <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader>Top habits</CCardHeader>
                        <CCardBody>
                          {leaderboard.length > 0 ? (
                            <CListGroup flush>
                              {leaderboard.map((item) => (
                                <CListGroupItem
                                  key={item.habitId}
                                  className="d-flex justify-content-between align-items-center"
                                >
                                  <div>
                                    <div className="fw-semibold">{item.habitName}</div>
                                    <div className="text-body-secondary small">
                                      {item.totalCheckIns} total check-ins · {item.successRate}% success
                                    </div>
                                  </div>
                                  <CBadge color="success" className="px-3 py-2">
                                    <CIcon icon={cilStar} className="me-2" />
                                    {item.currentStreak} day streak
                                  </CBadge>
                                </CListGroupItem>
                              ))}
                            </CListGroup>
                          ) : (
                            <p className="text-body-secondary mb-0 text-center">
                              Your leaderboard will appear once you start tracking habits regularly.
                            </p>
                          )}
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol xl={6}>
                      <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader>Recent momentum</CCardHeader>
                        <CCardBody>
                          {momentumHabits.length > 0 ? (
                            <CListGroup flush>
                              {momentumHabits.map((habit) => (
                                <CListGroupItem
                                  key={habit.habitId}
                                  className="d-flex justify-content-between align-items-center"
                                >
                                  <div>
                                    <div className="fw-semibold">{habit.habitName}</div>
                                    <div className="text-body-secondary small">
                                      Last 7 days · {habit.recent?.done ?? 0} done / {habit.recent?.missed ?? 0} missed
                                    </div>
                                  </div>
                                  <CBadge color={(habit.recent?.completionRate || 0) >= 70 ? "success" : "info"}>
                                    {habit.recent?.completionRate ?? 0}%
                                  </CBadge>
                                </CListGroupItem>
                              ))}
                            </CListGroup>
                          ) : (
                            <p className="text-body-secondary mb-0 text-center">
                              Track a habit for a week to see your rising trends here.
                            </p>
                          )}
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>
                </>
              ) : (
                <p className="text-body-secondary mb-0">
                  Start checking in your habits to unlock personalised insights.
                </p>
              )}
            </CCardBody>
          </CCard>

          <CCard>
            <CCardHeader>Habit highlights</CCardHeader>
            <CCardBody>
              {habitsLoading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" size="sm" />
                  <span className="ms-2 text-body-secondary">Loading habits…</span>
                </div>
              ) : topHabits.length > 0 ? (
                <CListGroup flush>
                  {topHabits.map((habit) => (
                    <CListGroupItem
                      key={habit.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <span className="d-flex flex-column">
                        <span className="fw-semibold">
                          <CIcon icon={cilListRich} className="me-2 text-primary" />
                          {habit.title || habit.name || "Untitled habit"}
                        </span>
                        {habit.description && (
                          <span className="text-body-secondary small mt-1">
                            {habit.description}
                          </span>
                        )}
                      </span>
                      <span className="text-body-secondary small">
                        Created {formatDate(habit.created_at || habit.createdAt)}
                      </span>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <div className="text-center text-body-secondary py-4">
                  <CIcon icon={cilUser} className="display-6 text-primary mb-3 d-block" />
                  You haven&apos;t added any habits yet. Head to the
                  <Link to="/addhabit" className="ms-1">Add Habit</Link> planner to get started.
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default UserProfile;
