import React, { useContext, useEffect, useState } from "react"
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilSearch, cilUserPlus } from "@coreui/icons"
import { AuthContext } from "../../context/AuthContext"
import { addFriend, fetchFriends, searchPotentialFriends } from "../../services/friends"

const Friends = () => {
  const { user } = useContext(AuthContext)
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [addingFriendIds, setAddingFriendIds] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!user?.id) return

    const loadFriends = async () => {
      try {
        setLoadingFriends(true)
        setError("")
        const data = await fetchFriends(user.id)
        setFriends(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Failed to load friends", err)
        setError("Unable to load friends right now. Please try again.")
      } finally {
        setLoadingFriends(false)
      }
    }

    loadFriends()
  }, [user?.id])

  const handleSearch = async (event) => {
    event.preventDefault()
    setSuccess("")
    setError("")

    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      const results = await searchPotentialFriends(user.id, searchTerm.trim())
      setSearchResults(Array.isArray(results) ? results : [])
    } catch (err) {
      console.error("Friend search failed", err)
      setError("Search failed. Please try again.")
    } finally {
      setSearching(false)
    }
  }

  const handleAddFriend = async (friendId) => {
    if (addingFriendIds.includes(friendId)) return

    setAddingFriendIds((prev) => [...prev, friendId])

    try {
      setError("")
      const newFriend = await addFriend(user.id, friendId)
      setFriends((prev) => [...prev, newFriend])
      setSearchResults((prev) => prev.filter((candidate) => candidate.id !== friendId))
      setSuccess(`You're now connected with ${newFriend.name}.`)
    } catch (err) {
      console.error("Failed to add friend", err)
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Could not add friend right now. Please try again."
      setError(message)
    } finally {
      setAddingFriendIds((prev) => prev.filter((id) => id !== friendId))
    }
  }

  if (!user) {
    return (
      <CAlert color="info" className="mt-4">
        Please log in to view and manage your friends.
      </CAlert>
    )
  }

  const hasSearchResults = searchResults.length > 0

  return (
    <CRow className="justify-content-center mt-4">
      <CCol xs={12} lg={10} xl={8}>
        {error && <CAlert color="danger">{error}</CAlert>}
        {success && <CAlert color="success">{success}</CAlert>}

        <CCard className="mb-4">
          <CCardHeader>
            <h4 className="mb-0">Find New Friends</h4>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={handleSearch} className="mb-3">
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <CButton type="submit" color="primary" disabled={searching}>
                  {searching ? <CSpinner size="sm" /> : "Search"}
                </CButton>
              </CInputGroup>
            </CForm>

            {searching && (
              <div className="text-center my-3">
                <CSpinner />
              </div>
            )}

            {!searching && hasSearchResults && (
              <CListGroup>
                {searchResults.map((person) => {
                  const isAdding = addingFriendIds.includes(person.id)
                  return (
                    <CListGroupItem
                      key={person.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div className="fw-semibold">{person.name}</div>
                        <small className="text-muted">{person.email}</small>
                      </div>
                      <CButton
                        color="success"
                        size="sm"
                        disabled={isAdding}
                        onClick={() => handleAddFriend(person.id)}
                      >
                        {isAdding ? <CSpinner size="sm" /> : <CIcon icon={cilUserPlus} />} Add
                      </CButton>
                    </CListGroupItem>
                  )
                })}
              </CListGroup>
            )}

            {!searching && !hasSearchResults && searchTerm.trim() && (
              <p className="text-muted mb-0">No people matched your search.</p>
            )}
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader>
            <h4 className="mb-0">Your Friends</h4>
          </CCardHeader>
          <CCardBody>
            {loadingFriends ? (
              <div className="text-center my-4">
                <CSpinner />
              </div>
            ) : friends.length > 0 ? (
              <CListGroup>
                {friends.map((friend) => (
                  <CListGroupItem key={friend.id}>
                    <div className="d-flex justify-content-between flex-wrap">
                      <div>
                        <div className="fw-semibold">{friend.name}</div>
                        {friend.email && <small className="text-muted">{friend.email}</small>}
                      </div>
                      {friend.created_at && (
                        <small className="text-muted">Joined {new Date(friend.created_at).toLocaleDateString()}</small>
                      )}
                    </div>

                    {Array.isArray(friend.habits) && friend.habits.length > 0 ? (
                      <div className="mt-3">
                        <div className="fw-semibold mb-2">Habits</div>
                        <ul className="mb-0 ps-3">
                          {friend.habits.map((habit) => (
                            <li key={habit.id}>
                              <span className="fw-semibold">{habit.title}</span>
                              {habit.category && <span className="text-muted"> · {habit.category}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-muted mb-0 mt-3">No habits shared yet.</p>
                    )}
                  </CListGroupItem>
                ))}
              </CListGroup>
            ) : (
              <p className="text-muted mb-0">
                You haven't added any friends yet. Use the search above to start building your
                community.
              </p>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Friends

