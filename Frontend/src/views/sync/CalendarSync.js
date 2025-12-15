import React, { useEffect, useMemo, useState } from "react";
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CAlert,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CBadge,
  CCallout,
  CListGroup,
  CListGroupItem,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilCalendar,
  cilCloudUpload,
  cilSync,
  cilClock,
  cilList,
  cilPeople,
  cilCheckCircle,
  cilWarning,
} from "@coreui/icons";
import {
  fetchCalendarOverview,
  syncCalendar,
  disconnectIntegration,
} from "../../services/calendar";
import { emitDataRefresh, REFRESH_SCOPES } from "../../utils/refreshBus";

const providerDefaults = {
  google: "Google Calendar",
  apple: "Apple Calendar",
};

const CalendarSync = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    provider: "google",
    label: providerDefaults.google,
    icsText: "",
    fileName: "",
  });

  useEffect(() => {
    if (!userId) {
      setError("Please log in to manage your calendar integrations.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchCalendarOverview(userId, { days: 45 });
        setOverview(data);
      } catch (err) {
        setError(err.message || "Failed to load calendar data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const integrations = overview?.integrations ?? [];
  const upcomingEvents = overview?.summary?.upcoming ?? [];
  const busyDays = overview?.summary?.busyDays ?? [];
  const providers = overview?.summary?.providers ?? {};

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "provider"
        ? { label: providerDefaults[value] || prev.label }
        : {}),
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, fileName: "", icsText: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        icsText: e.target?.result || "",
      }));
    };
    reader.readAsText(file);
  };

  const submitCalendar = async (event) => {
    event.preventDefault();
    if (!userId) return;

    setSyncing(true);
    setError(null);
    setSuccess("");

    try {
      const payload = {
        provider: form.provider,
        label: form.label || providerDefaults[form.provider] || "Imported Calendar",
        icsText: form.icsText?.trim() || undefined,
        days: 45,
      };

      const result = await syncCalendar(userId, payload);
      setOverview(result.overview);
      setSuccess(
        `${result.integration?.label || providerDefaults[form.provider]} is now synced.`
      );
      emitDataRefresh(REFRESH_SCOPES.INTEGRATIONS, {
        provider: form.provider,
        connected: true,
      });
      setForm((prev) => ({
        ...prev,
        icsText: "",
        fileName: "",
      }));
    } catch (err) {
      setError(err.message || "Unable to sync calendar. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const refreshIntegration = async (integration) => {
    if (!userId) return;
    setSyncing(true);
    setError(null);
    setSuccess("");
    try {
      const result = await syncCalendar(userId, {
        integrationId: integration.id,
        provider: integration.provider,
        label: integration.label,
        days: 45,
      });
      setOverview(result.overview);
      setSuccess(`${integration.label} refreshed successfully.`);
      emitDataRefresh(REFRESH_SCOPES.INTEGRATIONS, {
        provider: integration.provider,
        connected: true,
      });
    } catch (err) {
      setError(err.message || "Unable to refresh calendar feed.");
    } finally {
      setSyncing(false);
    }
  };

  const removeIntegration = async (integration) => {
    if (!window.confirm(`Disconnect ${integration.label}?`)) return;
    try {
      await disconnectIntegration(integration.id, userId);
      const data = await fetchCalendarOverview(userId, { days: 45 });
      setOverview(data);
      setSuccess(`${integration.label} was disconnected.`);
      emitDataRefresh(REFRESH_SCOPES.INTEGRATIONS, {
        provider: integration.provider,
        connected: false,
      });
    } catch (err) {
      setError(err.message || "Unable to disconnect calendar.");
    }
  };

  const providerBadges = useMemo(
    () =>
      Object.entries(providers).map(([providerName, count]) => (
        <CBadge key={providerName} color="info" className="me-2">
          {providerDefaults[providerName] || providerName}: {count}
        </CBadge>
      )),
    [providers]
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <CSpinner color="success" />
      </div>
    );
  }

  return (
    <CRow className="gy-4">
      <CCol xs={12} lg={7}>
        <CCard className="h-100 shadow-sm">
          <CCardHeader className="d-flex align-items-center justify-content-between">
            <span className="fw-semibold">
              <CIcon icon={cilCalendar} className="me-2 text-primary" />
              Connect your calendars
            </span>
            {syncing && <CSpinner size="sm" />}
          </CCardHeader>
          <CCardBody>
            <p className="text-body-secondary mb-4">
              Import your Apple or Google Calendar so StepHabit can surface busy
              days, free windows, and reminders alongside your habits.
            </p>

            {error && (
              <CAlert color="danger" className="mb-4">
                {error}
              </CAlert>
            )}
            {success && (
              <CAlert color="success" className="mb-4">
                <CIcon icon={cilCheckCircle} className="me-2" />
                {success}
              </CAlert>
            )}

            <CForm onSubmit={submitCalendar}>
              <CRow className="g-3 align-items-end">
                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="provider">Calendar provider</CFormLabel>
                  <select
                    id="provider"
                    name="provider"
                    className="form-select"
                    value={form.provider}
                    onChange={handleInputChange}
                  >
                    <option value="google">Google Calendar</option>
                    <option value="apple">Apple Calendar</option>
                  </select>
                </CCol>
                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="label">Display name</CFormLabel>
                  <CFormInput
                    id="label"
                    name="label"
                    value={form.label}
                    onChange={handleInputChange}
                    placeholder="Morning routine calendar"
                  />
                </CCol>

                <CCol xs={12}>
                  <CFormLabel htmlFor="icsUpload">
                    Upload .ics file (optional)
                  </CFormLabel>
                  <div className="d-flex align-items-center gap-3">
                    <label htmlFor="icsUpload" className="btn btn-light border mb-0">
                      <CIcon icon={cilCloudUpload} className="me-2" />
                      Choose file
                    </label>
                    <input
                      id="icsUpload"
                      type="file"
                      accept=".ics,text/calendar"
                      className="d-none"
                      onChange={handleFileChange}
                    />
                    <span className="text-body-secondary">
                      {form.fileName || "No file selected"}
                    </span>
                  </div>
                </CCol>

                <CCol xs={12}>
                  <CFormLabel htmlFor="icsText">
                    Or paste calendar data
                  </CFormLabel>
                  <CFormTextarea
                    id="icsText"
                    name="icsText"
                    rows={4}
                    placeholder="BEGIN:VCALENDAR..."
                    value={form.icsText}
                    onChange={handleInputChange}
                  />
                </CCol>

                <CCol xs={12} className="d-flex justify-content-end">
                  <CButton type="submit" color="success" disabled={syncing}>
                    {syncing ? (
                      <CSpinner size="sm" />
                    ) : (
                      <>
                        <CIcon icon={cilSync} className="me-2" /> Sync calendar
                      </>
                    )}
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12} lg={5}>
        <CCard className="mb-4 shadow-sm">
          <CCardHeader className="fw-semibold">
            <CIcon icon={cilList} className="me-2 text-primary" /> Linked
            calendars
          </CCardHeader>
          <CCardBody>
            {integrations.length === 0 ? (
              <div className="text-body-secondary">
                Connect a calendar to unlock richer scheduling insights.
              </div>
            ) : (
              <CListGroup flush>
                {integrations.map((integration) => (
                  <CListGroupItem key={integration.id}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{integration.label}</div>
                        <div className="small text-body-secondary">
                          {providerDefaults[integration.provider] || integration.provider}
                        </div>
                        {integration.last_synced_at && (
                          <div className="small text-body-secondary">
                            Last synced {new Date(integration.last_synced_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        <CButton
                          size="sm"
                          color="light"
                          variant="outline"
                          onClick={() => refreshIntegration(integration)}
                          disabled={syncing}
                        >
                          <CIcon icon={cilSync} className="me-1" /> Refresh
                        </CButton>
                        <CButton
                          size="sm"
                          color="danger"
                          variant="outline"
                          onClick={() => removeIntegration(integration)}
                        >
                          Disconnect
                        </CButton>
                      </div>
                    </div>
                  </CListGroupItem>
                ))}
              </CListGroup>
            )}

            {providerBadges.length > 0 && (
              <div className="mt-3">Connected providers: {providerBadges}</div>
            )}
          </CCardBody>
        </CCard>

        <CCard className="mb-4 shadow-sm">
          <CCardHeader className="fw-semibold d-flex align-items-center">
            <CIcon icon={cilClock} className="me-2 text-primary" /> Upcoming
            events
          </CCardHeader>
          <CCardBody>
            {upcomingEvents.length === 0 ? (
              <div className="text-body-secondary">
                No imported events in the next few weeks.
              </div>
            ) : (
              <CListGroup flush>
                {upcomingEvents.map((event) => (
                  <CListGroupItem key={`${event.id}-${event.start_time}`}>
                    <div className="fw-semibold">{event.title}</div>
                    <div className="small text-body-secondary">
                      {event.start_time
                        ? new Date(event.start_time).toLocaleString()
                        : ""}
                    </div>
                    {event.location && (
                      <div className="small text-body-secondary">{event.location}</div>
                    )}
                  </CListGroupItem>
                ))}
              </CListGroup>
            )}
          </CCardBody>
        </CCard>

        <CCard className="shadow-sm">
          <CCardHeader className="fw-semibold d-flex align-items-center">
            <CIcon icon={cilPeople} className="me-2 text-primary" /> Busy day
            highlights
          </CCardHeader>
          <CCardBody>
            {busyDays.length === 0 ? (
              <div className="text-body-secondary">
                We'll flag your busiest days once events are imported.
              </div>
            ) : (
              <ul className="list-unstyled mb-0">
                {busyDays.map((day) => (
                  <li key={day.date} className="mb-2">
                    <CBadge color="warning" className="me-2">
                      <CIcon icon={cilWarning} className="me-1" /> {day.count}
                      {day.count === 1 ? " event" : " events"}
                    </CBadge>
                    <span className="fw-semibold">{day.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {overview?.summary?.nextFreeDay && (
              <CCallout color="success" className="mt-3">
                <CIcon icon={cilCheckCircle} className="me-2" />
                Next quiet day: {new Date(overview.summary.nextFreeDay).toLocaleDateString()}
              </CCallout>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default CalendarSync;
