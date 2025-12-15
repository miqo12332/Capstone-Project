import api from "./api";

export const fetchChallenges = () =>
  api.get("/group-challenges").then((response) => response.data);

export const createChallenge = (payload) =>
  api.post("/group-challenges", payload).then((response) => response.data);

export const joinChallenge = (challengeId, userId) =>
  api
    .post(`/group-challenges/${challengeId}/join`, { userId })
    .then((response) => response.data);

export const cancelJoinRequest = (challengeId, userId) =>
  api
    .delete(`/group-challenges/${challengeId}/join`, { data: { userId } })
    .then((response) => response.data);

export const decideJoinRequest = (challengeId, userId, approverId, action) =>
  api
    .post(`/group-challenges/${challengeId}/requests/${userId}/decision`, {
      approverId,
      action,
    })
    .then((response) => response.data);

export const fetchChallengeMessages = (challengeId, userId) =>
  api
    .get(`/group-challenges/${challengeId}/messages`, { params: { userId } })
    .then((response) => response.data);

export const fetchChallengeMessageSummary = (challengeId, userId) =>
  api
    .get(`/group-challenges/${challengeId}/messages/summary`, { params: { userId } })
    .then((response) => response.data);

export const sendChallengeMessage = (challengeId, userId, content) =>
  api
    .post(`/group-challenges/${challengeId}/messages`, { userId, content })
    .then((response) => response.data);
