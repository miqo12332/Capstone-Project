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
  cilCloudUpload,
  cilEnvelopeOpen,
  cilListRich,
  cilPen,
  cilSettings,
  cilTask,
  cilUser,
} from "@coreui/icons";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { HabitContext } from "../../context/HabitContext";

const genderOptions = [
  { label: "Select gender", value: "" },
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
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
  });
  const [settingsSnapshot, setSettingsSnapshot] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("/uploads/default-avatar.png");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const profileCompletion = useMemo(() => {
    const requirements = [
      form.name,
      form.email,
      form.bio,
      form.age,
      form.gender,
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
    ];
  }, [settingsSnapshot]);

  const topHabits = useMemo(() => habits.slice(0, 5), [habits]);

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
