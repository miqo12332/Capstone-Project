import React, { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CProgress,
  CProgressBar,
  CRow,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import {
  cilArrowRight,
  cilBolt,
  cilCheckCircle,
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

  const handleNext = () => {
    if (!validateStep()) return
    setStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setMessage(null)
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validateStep()) return

    try {
      setSubmitting(true)
      setMessage(null)
      const response = await fetch("http://localhost:5001/api/users/register", {
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
        throw new Error(data?.error || "Registration failed")
      }

      setMessage({
        type: "success",
        text: "Welcome aboard! Your plan is ready—let’s log in and get started.",
      })
      setTimeout(() => navigate("/login"), 1800)
    } catch (err) {
      console.error("Register error:", err)
      setMessage({ type: "danger", text: err.message || "Could not connect to the server." })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedHighlights = [
    form.primaryGoal || "Choose a goal that inspires you",
    form.focusArea || "Pick a focus area to spotlight",
    form.dailyCommitment || "Decide how much time you’ll invest",
    form.supportPreference || "Select how we can support you",
  ]

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
    <div className="min-vh-100 d-flex flex-row align-items-center bg-light">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol lg={10} xl={9}>
            <CCardGroup>
              <CCard className="text-white bg-gradient p-4 d-none d-lg-flex"
                style={{
                  background: "linear-gradient(135deg, #321fdb 0%, #9f7aea 100%)",
                }}
              >
                <CCardBody className="d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-25 rounded-pill px-3 py-2 mb-4">
                      <CIcon icon={cilBolt} />
                      <span className="fw-semibold">Kickstart your step-by-step success</span>
                    </div>
                    <h2 className="fw-bold">Design a ritual that feels like you</h2>
                    <p className="lead opacity-75">
                      A few mindful choices today help us craft a dashboard, reminders, and challenges
                      that match your energy. Your answers stay flexible—you can tweak everything later.
                    </p>
                  </div>
                  <div className="mt-4">
                    <h6 className="text-uppercase opacity-75">Your launch plan</h6>
                    <CListGroup flush className="bg-transparent text-white">
                      {selectedHighlights.map((highlight, index) => (
                        <CListGroupItem
                          key={`${highlight}-${index}`}
                          className="bg-transparent border-0 px-0 d-flex align-items-start gap-3 text-white"
                        >
                          <CIcon icon={cilCheckCircle} className="mt-1" />
                          <span className="fw-semibold">{highlight}</span>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                    <div className="d-flex align-items-center gap-2 mt-4 small opacity-75">
                      <CIcon icon={cilArrowRight} />
                      All selections sync to your profile so we can celebrate the wins that matter to you.
                    </div>
                  </div>
                </CCardBody>
              </CCard>
              <CCard className="p-4">
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
                          {submitting ? "Creating..." : "Start my journey"}
                        </CButton>
                      ) : (
                        <CButton color="primary" type="button" onClick={handleNext}>
                          Continue
                        </CButton>
                      )}
                    </div>

                    <div className="text-center mt-3">
                      <CButton color="link" className="px-0" onClick={() => navigate("/login")}
                        disabled={submitting}
                      >
                        Already have an account? Log in
                      </CButton>
                    </div>
                  </CForm>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Register
