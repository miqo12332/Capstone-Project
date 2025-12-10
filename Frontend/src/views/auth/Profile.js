import React, { useEffect, useState } from "react";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (userId) {
      fetch(`http://stephabit.local:5001/api/users/profile/${userId}`)
        .then((res) => res.json())
        .then((data) => setProfile(data))
        .catch(() => setProfile(null));
    }
  }, [userId]);

  if (!userId) {
    return <p>⚠️ Please login first.</p>;
  }

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      {profile ? (
        <div>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </div>
  );
};

export default Profile;