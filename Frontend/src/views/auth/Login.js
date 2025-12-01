import React, { useContext, useState } from "react"
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" })
  const [message, setMessage] = useState("")
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    try {
      const res = await fetch("http://localhost:5001/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || "Login failed")
        return
      }

      login(data.user)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      console.error("Login error:", err)
      setMessage("❌ Error connecting to server")
    }
  }

  return (
    <div className="auth-page">
      <CContainer>
        <CRow className="align-items-center g-4">
          <CCol lg={6} className="d-none d-lg-block">
            <div className="auth-hero">
              <div className="eyebrow mb-2">Habit companion</div>
              <h1 className="hero-title">Welcome back to StepHabit</h1>
              <p className="hero-subtitle mb-4">
                Sign in to pick up your streaks, review your goals, and keep your day flowing with intention.
              </p>
              <ul className="auth-highlights">
                <li>Beautiful dashboard that stays calm, even when the schedule is busy.</li>
                <li>One-tap check-ins and planner shortcuts so nothing gets lost.</li>
                <li>Secure, privacy-first space—only you see your reflections.</li>
              </ul>
            </div>
          </CCol>
          <CCol xs={12} lg={6}>
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
                    <div className="text-center text-body-secondary">
                      New to StepHabit? <Link to="/register">Create an account</Link>
                    </div>
                    {message && <p className="text-center text-danger mb-0">{message}</p>}
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
