import api from "./api";

export const fetchChallenges = () =>
  api.get("/group-challenges").then((response) => response.data);

export const createChallenge = (payload) =>
  api.post("/group-challenges", payload).then((response) => response.data);

export const joinChallenge = (challengeId, userId) =>
  api
    .post(`/group-challenges/${challengeId}/join`, { userId })
    .then((response) => response.data);
