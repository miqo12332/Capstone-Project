import React, { useState, useEffect, useContext, useRef } from "react";
import {
  CAvatar,
  CBadge,
  CButton,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CProgress,
  CProgressBar,
} from "@coreui/react";
import {
  cilCloudUpload,
  cilLockLocked,
  cilSettings,
  cilSpeedometer,
  cilTask,
  cilUser,
} from "@coreui/icons";
import CIcon from "@coreui/icons-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { HabitContext } from "../../context/HabitContext";

const AppHeaderDropdown = () => {
  const navigate = useNavigate();
  const { user: authUser, login, logout } = useContext(AuthContext);
  const habitContext = useContext(HabitContext);
  const habits = habitContext?.habits || [];

  const [user, setUser] = useState(authUser || {});
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatar ? `http://localhost:5001${user.avatar}` : "/uploads/default-avatar.png"
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setAvatarUrl(
        authUser.avatar
          ? `http://localhost:5001${authUser.avatar}`
          : "/uploads/default-avatar.png"
      );
    } else {
      const localUser = JSON.parse(localStorage.getItem("user"));
      if (localUser) {
        setUser(localUser);
        setAvatarUrl(
          localUser.avatar
            ? `http://localhost:5001${localUser.avatar}`
            : "/uploads/default-avatar.png"
        );
      }
    }
  }, [authUser]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user?.id) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploading(true);
      setUploadError("");
      const res = await axios.post(
        `http://localhost:5001/api/avatar/${user.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        const newAvatar = `http://localhost:5001${res.data.imagePath}`;
        setAvatarUrl(newAvatar);

        const updatedUser = { ...user, avatar: res.data.imagePath };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (typeof login === "function") {
          login(updatedUser);
        }
      } else {
        setUploadError("Upload failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Upload error. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }
    navigate("/login");
  };

  const completionPieces = [
    user?.name,
    user?.email,
    user?.bio,
    user?.age,
    user?.gender,
    user?.avatar,
  ];
  const completionScore = Math.round(
    (completionPieces.filter((piece) => Boolean(piece && piece !== "")).length /
      completionPieces.length) *
      100
  );

  return (
    <CDropdown variant="nav-item" className="d-flex align-items-center">
      <CDropdownToggle className="py-0 px-0" caret={false}>
        <CAvatar src={avatarUrl} size="md" />
      </CDropdownToggle>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="d-none"
        onChange={handleFileChange}
      />
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <div className="px-3 pt-3 pb-2 border-bottom text-center">
          <CAvatar src={avatarUrl} size="lg" className="mb-2" />
          <div className="fw-semibold">{user?.name || "Guest"}</div>
          {user?.email && <div className="text-body-secondary small">{user.email}</div>}
          <div className="d-flex gap-2 justify-content-center mt-2">
            <CBadge color="info" className="text-uppercase small">
              <CIcon icon={cilTask} className="me-1" /> {habits.length} habits
            </CBadge>
            <CBadge color="primary" className="text-uppercase small">
              <CIcon icon={cilSettings} className="me-1" />
              {completionScore}% complete
            </CBadge>
          </div>
          <CProgress className="mt-3" thin>
            <CProgressBar color="primary" value={completionScore} />
          </CProgress>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <CIcon icon={cilCloudUpload} className="me-2" />
            {uploading ? "Uploading..." : "Change avatar"}
          </CButton>
          {uploadError && (
            <div className="text-danger small mt-2">{uploadError}</div>
          )}
        </div>
        <CDropdownItem
          component="button"
          type="button"
          onClick={() => navigate("/profile")}
          className="d-flex align-items-center"
        >
          <CIcon icon={cilUser} className="me-2" /> View profile
        </CDropdownItem>
        <CDropdownItem
          component="button"
          type="button"
          onClick={() => navigate("/settings")}
          className="d-flex align-items-center"
        >
          <CIcon icon={cilSettings} className="me-2" /> Account settings
        </CDropdownItem>
        <CDropdownItem
          component="button"
          type="button"
          onClick={() => navigate("/preferences")}
          className="d-flex align-items-center"
        >
          <CIcon icon={cilSpeedometer} className="me-2" /> Preferences
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem
          component="button"
          type="button"
          className="text-danger d-flex align-items-center"
          onClick={handleLogout}
        >
          <CIcon icon={cilLockLocked} className="me-2" /> Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  );
};

export default AppHeaderDropdown;
