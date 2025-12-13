import React, { useContext, useState } from "react"
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilUser, cilLockLocked, cilSun } from "@coreui/icons"
import { Link, useNavigate } from "react-router-dom"
import { AuthContext } from "../../context/AuthContext"
import { API_BASE } from "../../utils/apiConfig"
import ResetPasswordModal from "../../components/auth/ResetPasswordModal"

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" })
  const [message, setMessage] = useState(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: "danger", text: data.error || "Login failed" })
        return
      }

      login(data.user)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      console.error("Login error:", err)
      setMessage({ type: "danger", text: "❌ Error connecting to server" })
    }
  }

  return (
    <div className="auth-page">
      <CContainer>
        <CRow className="align-items-center justify-content-center g-4">
          <CCol xs={12} md={10} lg={6}>
            <CCard className="auth-card shadow-lg">
              <CCardBody className="p-4 p-lg-5">
                <div className="text-center mb-4">
                  <div className="soft-pill bg-primary bg-opacity-10 text-primary d-inline-flex align-items-center px-3 py-1 mb-2">
                    <CIcon icon={cilSun} className="me-2" />
                    StepHabit Login
                  </div>
                  <h2 className="fw-semibold mb-1">Log in to your space</h2>
                  <p className="text-body-secondary mb-0">Everything about your habits, in one calm view.</p>
                </div>
                <CForm onSubmit={handleSubmit}>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </CInputGroup>

                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                  </CInputGroup>

                  <div className="d-grid gap-3">
                    <CButton type="submit" color="primary" size="lg">
                      Log in and continue
                    </CButton>
                    <CButton
                      color="link"
                      className="p-0"
                      type="button"
                      onClick={() => setResetModalOpen(true)}
                    >
                      Forgot password?
                    </CButton>
                    <div className="text-center text-body-secondary">
                      New to StepHabit? <Link to="/register">Create an account</Link>
                    </div>
                    {message && (
                      <p
                        className={`text-center mb-0 ${
                          message.type === "success" ? "text-success" : "text-danger"
                        }`}
                      >
                        {message.text}
                      </p>
                    )}
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
      <ResetPasswordModal
        visible={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        initialEmail={form.email}
        onSuccess={() => setMessage({ type: "success", text: "Password updated. Please log in." })}
      />
    </div>
  )
}

export default Login
