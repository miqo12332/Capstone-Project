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
  CFormSwitch,
  CFormTextarea,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCheckCircle, cilPlus } from "@coreui/icons";

import { AuthContext } from "../../context/AuthContext";
import {
  createChallenge,
  fetchChallenges,
  joinChallenge,
} from "../../services/challenges";
import { fetchFriends } from "../../services/friends";

const initialFormState = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  requiresApproval: false,
  invites: [],
};

const GroupChallenges = () => {
  const { user } = useContext(AuthContext);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialFormState);

  const isAuthenticated = Boolean(user);

  const refreshChallenges = async () => {
    try {
      setLoading(true);
      const data = await fetchChallenges();
      setChallenges(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load challenges", err);
      setError("Could not load challenges. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshChallenges();
  }, []);

  useEffect(() => {
    const loadFriends = async () => {
      if (!user?.id) return;
      try {
        setLoadingFriends(true);
        const data = await fetchFriends(user.id);
        setFriends(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load friends", err);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [user?.id]);

  const handleJoin = async (challengeId) => {
    if (!user?.id) {
      setError("Please log in to join challenges.");
      return;
    }

    if (joining.includes(challengeId)) return;

    setJoining((prev) => [...prev, challengeId]);
    setError("");
    setSuccess("");

    try {
      const result = await joinChallenge(challengeId, user.id);
      setSuccess(result?.message || "Joined challenge");
      await refreshChallenges();
    } catch (err) {
      console.error("Failed to join challenge", err);
      const message =
        err?.response?.data?.error || err?.message || "Unable to join challenge.";
      setError(message);
    } finally {
      setJoining((prev) => prev.filter((id) => id !== challengeId));
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      setError("Please log in to create a challenge.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        requiresApproval: form.requiresApproval,
        creatorId: user.id,
        invites: form.invites,
      };

      const created = await createChallenge(payload);
      setChallenges((prev) => [created, ...prev]);
      setForm(initialFormState);
      setShowModal(false);
      setSuccess("Challenge created and saved to the community list.");
    } catch (err) {
      console.error("Failed to create challenge", err);
      const message =
        err?.response?.data?.error || err?.message || "Unable to create challenge.";
      setError(message);
    }
  };

  const toggleInvite = (friendId) => {
    setForm((prev) => {
      const invites = prev.invites.includes(friendId)
        ? prev.invites.filter((id) => id !== friendId)
        : [...prev.invites, friendId];

      return { ...prev, invites };
    });
  };

  const membershipStatus = (challenge) => {
    if (!user?.id || !challenge?.participants) return null;
    const membership = challenge.participants.find((participant) => participant.id === user.id);
    return membership?.UserGroupChallenge?.status || null;
  };

  const membershipRole = (challenge) => {
    if (!user?.id || !challenge?.participants) return null;
    const membership = challenge.participants.find((participant) => participant.id === user.id);
    return membership?.UserGroupChallenge?.role || null;
  };

  const formattedChallenges = useMemo(
    () =>
      challenges.map((challenge) => ({
        ...challenge,
        participantCount: (challenge.participants || []).filter(
          (participant) => participant?.UserGroupChallenge?.status !== "invited"
        ).length,
      })),
    [challenges]
  );

  const renderJoinButton = (challenge) => {
    const status = membershipStatus(challenge);
    const role = membershipRole(challenge);
    const requiresApproval = challenge.approval_required;

    if (role === "creator") {
      return <CBadge color="success">You created this</CBadge>;
    }

    if (status === "accepted") {
      return (
        <CBadge color="success" className="d-inline-flex align-items-center gap-2">
          <CIcon icon={cilCheckCircle} /> Joined
        </CBadge>
      );
    }

    if (status === "pending") {
      return <CBadge color="warning">Pending approval</CBadge>;
    }

    if (status === "invited") {
      return (
        <CButton
          color="primary"
          size="sm"
          disabled={joining.includes(challenge.id)}
          onClick={() => handleJoin(challenge.id)}
        >
          {joining.includes(challenge.id) ? <CSpinner size="sm" /> : "Accept invite"}
        </CButton>
      );
    }

    return (
      <CButton
        color="primary"
        size="sm"
        disabled={joining.includes(challenge.id)}
        onClick={() => handleJoin(challenge.id)}
      >
        {joining.includes(challenge.id)
          ? <CSpinner size="sm" />
          : requiresApproval
            ? "Request to join"
            : "Join challenge"}
      </CButton>
    );
  };

  return (
    <>
      <CRow className="justify-content-center mt-4">
        <CCol xs={12} lg={10} xl={8}>
          {error && <CAlert color="danger">{error}</CAlert>}
          {success && <CAlert color="success">{success}</CAlert>}

          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h4 className="mb-1">🤝 Group Challenges</h4>
                <p className="text-body-secondary mb-0">
                  Create a challenge, invite friends, and decide whether members need approval to join.
                </p>
              </div>
              <CButton color="primary" onClick={() => setShowModal(true)} disabled={!isAuthenticated}>
                <CIcon icon={cilPlus} className="me-2" /> New Challenge
              </CButton>
            </CCardHeader>
            <CCardBody>
              {!isAuthenticated && (
                <CAlert color="info" className="mb-3">
                  Log in to create or join challenges and invite your friends.
                </CAlert>
              )}

              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <CSpinner />
                </div>
              ) : formattedChallenges.length === 0 ? (
                <div className="text-center text-body-secondary py-4">
                  No challenges yet. Be the first to start one!
                </div>
              ) : (
                <CListGroup>
                  {formattedChallenges.map((challenge) => (
                    <CListGroupItem
                      key={challenge.id}
                      className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2"
                    >
                      <div className="me-md-3">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h5 className="mb-0">{challenge.title}</h5>
                          {challenge.approval_required && (
                            <CBadge color="warning" shape="rounded-pill">
                              Approval required
                            </CBadge>
                          )}
                        </div>
                        <p className="mb-1 text-body-secondary">{challenge.description || "No description provided."}</p>
                        <div className="small text-body-secondary">
                          {challenge.start_date} → {challenge.end_date} · {challenge.participantCount} member
                          {challenge.participantCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="text-md-end w-100 w-md-auto d-flex align-items-center gap-2 justify-content-between">
                        <div className="text-body-secondary small">
                          {challenge.creator?.name ? `Host: ${challenge.creator.name}` : ""}
                        </div>
                        {renderJoinButton(challenge)}
                      </div>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal
        alignment="center"
        visible={showModal}
        onClose={() => setShowModal(false)}
        scrollable
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>Create a new challenge</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCreate}>
          <CModalBody>
            <CFormInput
              type="text"
              label="Title"
              placeholder="e.g. Run 10km this week"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
              className="mb-3"
            />

            <CFormTextarea
              label="Description"
              rows={3}
              placeholder="Share the rules or motivation for this challenge"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="mb-3"
            />

            <CRow className="g-3 mb-3">
              <CCol md={6}>
                <CFormInput
                  type="date"
                  label="Start date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  type="date"
                  label="End date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  required
                />
              </CCol>
            </CRow>

            <CFormSwitch
              id="requires-approval"
              label="Members need my approval to join"
              checked={form.requiresApproval}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requiresApproval: event.target.checked }))
              }
              className="mb-4"
            />

            <div className="mb-2 fw-semibold">Invite friends (optional)</div>
            {loadingFriends ? (
              <div className="d-flex align-items-center gap-2 text-body-secondary mb-2">
                <CSpinner size="sm" /> Loading friends...
              </div>
            ) : friends.length === 0 ? (
              <p className="text-body-secondary">No friends found to invite yet.</p>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {friends.map((friend) => (
                  <CFormCheck
                    key={friend.id}
                    id={`invite-${friend.id}`}
                    label={friend.name || friend.email || `Friend #${friend.id}`}
                    checked={form.invites.includes(friend.id)}
                    onChange={() => toggleInvite(friend.id)}
                  />
                ))}
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={!isAuthenticated}>
              Create challenge
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  );
};

export default GroupChallenges;
