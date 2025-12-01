import api from "./api"

export const fetchFriends = async (userId) => {
  const response = await api.get(`/friends/${userId}`)
  return response.data
}

export const searchPotentialFriends = async (userId, query) => {
  const response = await api.get(`/friends/${userId}/search`, {
    params: { q: query },
  })
  return response.data
}

export const addFriend = async (userId, friendId) => {
  const response = await api.post(`/friends/${userId}`, { friendId })
  return response.data
}

export const fetchFriendRequests = async (userId) => {
  const response = await api.get(`/friends/${userId}/requests`)
  return response.data
}

export const respondToFriendRequest = async (userId, requesterId, action) => {
  const response = await api.post(`/friends/${userId}/respond`, { requesterId, action })
  return response.data
}

export const updateHabitVisibility = async (userId, friendId, shareHabits) => {
  const response = await api.patch(`/friends/${userId}/visibility`, { friendId, shareHabits })
  return response.data
}

