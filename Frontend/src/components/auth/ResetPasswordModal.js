import React, { useEffect, useMemo, useState } from "react"
import {
  CAlert,
  CButton,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilCheckCircle, cilEnvelopeClosed, cilLockLocked, cilPaperPlane } from "@coreui/icons"
import { API_BASE } from "../../utils/apiConfig"
import { PASSWORD_REQUIREMENTS_TEXT, isStrongPassword } from "../../utils/passwordUtils"

const ResetPasswordModal = ({ visible, onClose, initialEmail = "", onSuccess }) => {
  const [step, setStep] = useState("request")
  const [form, setForm] = useState({
    email: initialEmail,
    code: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      setStep("request")
      setForm({
        email: initialEmail,
        code: "",
        newPassword: "",
        confirmPassword: "",
      })
      setMessage(null)
    }
  }, [visible, initialEmail])

  const canSubmitCode = useMemo(() => form.email.trim().length > 0, [form.email])

  const handleSendCode = async (event) => {
    event?.preventDefault()
    if (!canSubmitCode) return

    try {
      setLoading(true)
      setMessage(null)
      const response = await fetch(`${API_BASE}/users/password/reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim() }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to send reset code.")
      }

      setStep("verify")
      setMessage({ type: "success", text: "Reset code sent. Check your inbox." })
    } catch (err) {
      console.error("Reset request error:", err)
      setMessage({ type: "danger", text: err.message || "Unable to send reset code." })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (event) => {
    event?.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: "warning", text: "Passwords do not match." })
      return
    }

    if (!isStrongPassword(form.newPassword)) {
      setMessage({ type: "warning", text: PASSWORD_REQUIREMENTS_TEXT })
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      const response = await fetch(`${API_BASE}/users/password/reset/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          code: form.code.trim(),
          newPassword: form.newPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to reset password.")
      }

      setMessage({ type: "success", text: "Password updated. Redirecting to login..." })
      setTimeout(() => {
        if (typeof onSuccess === "function") {
          onSuccess()
        }
        onClose?.()
      }, 900)
    } catch (err) {
      console.error("Password reset verify error:", err)
      setMessage({ type: "danger", text: err.message || "Unable to reset password." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>Reset password</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm onSubmit={step === "request" ? handleSendCode : handlePasswordReset}>
          {step === "request" ? (
            <>
              <p className="text-body-secondary">
                We’ll send a 6-digit code to your email to confirm it’s really you.
              </p>
              <CInputGroup className="mb-3">
                <CInputGroupText>
                  <CIcon icon={cilEnvelopeClosed} />
                </CInputGroupText>
                <CFormInput
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  disabled={loading}
                />
              </CInputGroup>
              <CButton color="primary" type="submit" className="w-100" disabled={!canSubmitCode || loading}>
                {loading ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilPaperPlane} className="me-2" />}
                Send reset code
              </CButton>
            </>
          ) : (
            <>
              <p className="text-body-secondary mb-3">Enter the code from your email and set a new password.</p>
              <CInputGroup className="mb-3">
                <CInputGroupText>
                  <CIcon icon={cilCheckCircle} />
                </CInputGroupText>
                <CFormInput
                  type="text"
                  placeholder="6-digit code"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  maxLength={6}
                  required
                  disabled={loading}
                />
              </CInputGroup>
              <CInputGroup className="mb-3">
                <CInputGroupText>
                  <CIcon icon={cilLockLocked} />
                </CInputGroupText>
                <CFormInput
                  type="password"
                  placeholder="New password"
                  value={form.newPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  required
                  disabled={loading}
                />
              </CInputGroup>
              <CInputGroup className="mb-2">
                <CInputGroupText>
                  <CIcon icon={cilLockLocked} />
                </CInputGroupText>
                <CFormInput
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  required
                  disabled={loading}
                />
              </CInputGroup>
              <div className="small text-body-secondary mb-3">{PASSWORD_REQUIREMENTS_TEXT}</div>
              <CButton color="success" type="submit" className="w-100" disabled={loading}>
                {loading ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilCheckCircle} className="me-2" />}
                Update password
              </CButton>
            </>
          )}
        </CForm>
        {message && (
          <CAlert color={message.type} className="mt-3 mb-0">
            {message.text}
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter className="d-flex justify-content-between">
        <div className="text-body-secondary small">
          {step === "request" ? "Remember your password?" : "Need to try a different email?"}
        </div>
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ResetPasswordModal
