import React, { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_BASE } from "../../utils/apiConfig"
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CProgress,
  CProgressBar,
  CRow,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilClock,
  cilCompass,
  cilFlagAlt,
  cilHeart,
  cilLockLocked,
  cilPeople,
  cilStar,
  cilUser,
  cilEnvelopeClosed,
} from "@coreui/icons"

const goalOptions = [
  { value: "Build consistency", label: "Build consistency", description: "Stay accountable to the routines that matter most." },
  { value: "Boost energy", label: "Boost energy", description: "Create uplifting habits that energise your day." },
  { value: "Focus & clarity", label: "Focus & clarity", description: "Design rituals that sharpen your mind and keep you centred." },
  { value: "Balance & wellbeing", label: "Balance & wellbeing", description: "Craft a calmer schedule with time for what you love." },
]

const focusOptions = [
  { value: "Mindfulness", label: "Mindfulness", description: "Meditation, gratitude, journaling" },
  { value: "Fitness", label: "Fitness", description: "Movement, strength, flexibility" },
  { value: "Productivity", label: "Productivity", description: "Planning, deep work, focus sprints" },
  { value: "Self-care", label: "Self-care", description: "Sleep, recovery, personal growth" },
]

const experienceOptions = [
  { value: "Just getting started", label: "Just getting started" },
  { value: "Finding my rhythm", label: "Finding my rhythm" },
  { value: "Leveling up", label: "Leveling up" },
  { value: "Habit pro", label: "Habit pro" },
]

const supportOptions = [
  { value: "Gentle nudges", label: "Gentle nudges" },
  { value: "Focused reminders", label: "Focused reminders" },
  { value: "Deep insights", label: "Deep insights" },
  { value: "Celebrate my wins", label: "Celebrate my wins" },
]

const commitmentOptions = [
  { value: "5 minutes", label: "5 minutes", description: "Quick boosts to keep momentum" },
  { value: "15 minutes", label: "15 minutes", description: "Focused time for meaningful change" },
  { value: "30 minutes", label: "30 minutes", description: "Build a solid daily rhythm" },
  { value: "Flexible", label: "Flexible", description: "I’ll adapt depending on my day" },
]

const Register = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    primaryGoal: "",
    focusArea: "",
    experienceLevel: "",
    supportPreference: "",
    dailyCommitment: "",
    motivation: "",
  })

  const steps = useMemo(
    () => [
      {
        title: "Create your account",
        description: "Let’s start with the essentials so we can welcome you back each day.",
      },
      {
        title: "Shape your journey",
        description: "Choose the goal and focus areas that feel most exciting right now.",
      },
      {
        title: "Personalise your support",
        description: "Tell us how we can cheer you on and keep motivation high.",
      },
      {
        title: "Verify your email",
        description: "Enter the 6-digit code we just sent to confirm it’s really you.",
      },
    ],
    []
  )

  const progressValue = Math.round(((step + 1) / steps.length) * 100)
  const isLastStep = step === steps.length - 1

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleOptionSelect = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim() || !form.email.trim() || !form.password) {
        setMessage({ type: "danger", text: "Please add your name, email, and a password to continue." })
        return false
      }
    }

    if (step === 1) {
      if (!form.primaryGoal || !form.focusArea) {
        setMessage({ type: "warning", text: "Choose the goal and focus that resonate with you most." })
        return false
      }
    }

    if (step === 2) {
      if (!form.experienceLevel || !form.supportPreference || !form.dailyCommitment) {
        setMessage({
          type: "warning",
          text: "Tell us how experienced you are, how much time you have, and the support you’d like.",
        })
        return false
      }
    }

    setMessage(null)
    return true
  }

  const requestVerificationCode = async () => {
    try {
      setSendingCode(true)
      setMessage(null)
      const response = await fetch(`${API_BASE}/users/register/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          onboarding: {
            primaryGoal: form.primaryGoal,
            focusArea: form.focusArea,
            experienceLevel: form.experienceLevel,
            supportPreference: form.supportPreference,
            dailyCommitment: form.dailyCommitment,
            motivation: form.motivation,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 503 && data?.code === "EMAIL_CONFIG_MISSING") {
          console.warn("Email configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.")
          throw new Error(
            "Email verification is temporarily unavailable. Please try again later or contact support."
          )
        }

        throw new Error(data?.error || "We couldn’t send the verification code.")
      }

      setCodeSent(true)
      setMessage({ type: "success", text: "Verification code sent to your email." })
      setStep((prev) => Math.min(prev + 1, steps.length - 1))
    } catch (err) {
      console.error("Verification request error:", err)
      setMessage({ type: "danger", text: err.message || "Unable to send verification code." })
    } finally {
      setSendingCode(false)
    }
  }

  const handleNext = async () => {
    if (!validateStep()) return

    if (step === steps.length - 2) {
      await requestVerificationCode()
      return
    }

    setStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setMessage(null)
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (step !== steps.length - 1) {
      handleNext()
      return
    }

    if (!verificationCode.trim()) {
      setMessage({ type: "warning", text: "Please enter the verification code from your email." })
      return
    }

    try {
      setSubmitting(true)
      setMessage(null)
      const response = await fetch(`${API_BASE}/users/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          code: verificationCode.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Verification failed")
      }

      setMessage({
        type: "success",
        text: "Welcome aboard! Your plan is ready—let’s log in and get started.",
      })
      setTimeout(() => navigate("/login"), 1800)
    } catch (err) {
      console.error("Register error:", err)
      setMessage({ type: "danger", text: err.message || "Could not verify the code." })
    } finally {
      setSubmitting(false)
    }
  }

  const renderOptionButtons = (options, field) => (
    <CRow className="g-3">
      {options.map((option) => {
        const isSelected = form[field] === option.value
        return (
          <CCol sm={6} key={option.value}>
            <CButton
              type="button"
              color={isSelected ? "primary" : "light"}
              variant={isSelected ? undefined : "outline"}
              className="w-100 h-100 text-start p-3"
              onClick={() => handleOptionSelect(field, option.value)}
            >
              <div className="d-flex flex-column">
                <span className="fw-semibold">{option.label}</span>
                {option.description && (
                  <span className="small text-body-secondary mt-1">{option.description}</span>
                )}
              </div>
            </CButton>
          </CCol>
        )
      })}
    </CRow>
  )

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <>
          <CInputGroup className="mb-3">
            <CInputGroupText>
              <CIcon icon={cilUser} />
            </CInputGroupText>
            <CFormInput
              name="name"
              placeholder="Your name"
              autoComplete="name"
              value={form.name}
              onChange={handleFieldChange}
              required
            />
          </CInputGroup>
          <CInputGroup className="mb-3">
            <CInputGroupText>
              <CIcon icon={cilEnvelopeClosed} />
            </CInputGroupText>
            <CFormInput
              name="email"
              type="email"
              placeholder="Email address"
              autoComplete="email"
              value={form.email}
              onChange={handleFieldChange}
              required
            />
          </CInputGroup>
          <CInputGroup className="mb-1">
            <CInputGroupText>
              <CIcon icon={cilLockLocked} />
            </CInputGroupText>
            <CFormInput
              name="password"
              type="password"
              placeholder="Create a password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleFieldChange}
              required
            />
          </CInputGroup>
          <div className="small text-body-secondary mt-1">
            Use at least 8 characters with a mix of letters and numbers.
          </div>
        </>
      )
    }

    if (step === 1) {
      return (
        <div className="d-flex flex-column gap-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <CIcon icon={cilFlagAlt} className="text-primary" />
              <h5 className="mb-0">What brings you here?</h5>
            </div>
            {renderOptionButtons(goalOptions, "primaryGoal")}
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <CIcon icon={cilCompass} className="text-primary" />
              <h5 className="mb-0">Where would you like to focus first?</h5>
            </div>
            {renderOptionButtons(focusOptions, "focusArea")}
          </div>
        </div>
      )
    }

    if (step === 2) {
      return (
        <div className="d-flex flex-column gap-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <CIcon icon={cilClock} className="text-primary" />
              <h5 className="mb-0">How much time can you commit?</h5>
            </div>
            {renderOptionButtons(commitmentOptions, "dailyCommitment")}
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <CIcon icon={cilStar} className="text-primary" />
              <h5 className="mb-0">Where are you in your habit journey?</h5>
            </div>
            {renderOptionButtons(experienceOptions, "experienceLevel")}
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <CIcon icon={cilPeople} className="text-primary" />
              <h5 className="mb-0">How can we support you best?</h5>
            </div>
            {renderOptionButtons(supportOptions, "supportPreference")}
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <CIcon icon={cilHeart} className="text-primary" />
              <h5 className="mb-0">Share a spark of motivation</h5>
            </div>
            <CFormTextarea
              name="motivation"
              rows={3}
              placeholder="What’s one reason you’re excited to start?"
              value={form.motivation}
              onChange={handleFieldChange}
            />
            <div className="small text-body-secondary mt-1">
              We’ll echo this back on tough days to remind you why you began.
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="d-flex flex-column gap-3">
        <div className="p-3 bg-light rounded border">
          <div className="d-flex align-items-center gap-2 mb-1">
            <CIcon icon={cilEnvelopeClosed} className="text-primary" />
            <h5 className="mb-0">Check your inbox</h5>
          </div>
          <p className="mb-2">We’ve sent a 6-digit code to {form.email || "your email"}. Enter it below to finish.</p>
          <CButton
            color="link"
            className="px-0"
            type="button"
            onClick={requestVerificationCode}
            disabled={sendingCode || submitting}
          >
            {sendingCode ? "Sending another code..." : "Didn’t get it? Resend code"}
          </CButton>
        </div>

        <CInputGroup className="mb-2">
          <CInputGroupText>
            <CIcon icon={cilLockLocked} />
          </CInputGroupText>
          <CFormInput
            name="verificationCode"
            type="text"
            placeholder="Enter 6-digit code"
            autoComplete="one-time-code"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
            maxLength={6}
            required
          />
        </CInputGroup>
        <div className="small text-body-secondary">Check your spam folder if you don’t see the code.</div>
        {codeSent && (
          <CAlert color="info" className="mt-2">
            Code sent! It expires in 15 minutes.
          </CAlert>
        )}
      </div>
    )
  }

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center bg-light">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol lg={7} xl={6}>
            <CCard className="p-4 shadow-sm border-0">
              <CCardBody>
                <CForm onSubmit={handleSubmit}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h3 className="mb-1">{steps[step].title}</h3>
                      <p className="text-medium-emphasis mb-0">{steps[step].description}</p>
                    </div>
                    <div className="text-end small text-medium-emphasis">
                      Step {step + 1} of {steps.length}
                    </div>
                  </div>
                  <CProgress className="mb-4" height={6}>
                    <CProgressBar value={progressValue} color="primary" />
                  </CProgress>

                  {renderStepContent()}

                  {message && (
                    <CAlert color={message.type} className="mt-4">
                      {message.text}
                    </CAlert>
                  )}

                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <CButton
                      color="secondary"
                      variant="outline"
                      type="button"
                      disabled={step === 0}
                      onClick={handleBack}
                    >
                      Back
                    </CButton>
                    {isLastStep ? (
                      <CButton color="success" type="submit" disabled={submitting}>
                        <CIcon icon={cilHeart} className="me-2" />
                        {submitting ? "Verifying..." : "Start my journey"}
                      </CButton>
                    ) : (
                      <CButton color="primary" type="button" onClick={handleNext} disabled={sendingCode}>
                        {sendingCode && step === steps.length - 2 ? "Sending code..." : "Continue"}
                      </CButton>
                    )}
                  </div>

                  <div className="text-center mt-3">
                    <CButton color="link" className="px-0" onClick={() => navigate("/login")} disabled={submitting}>
                      Already have an account? Log in
                    </CButton>
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

export default Register
