export const PASSWORD_REQUIREMENTS_TEXT =
  "Password must be at least 8 characters and include both letters and numbers."

export const isStrongPassword = (value) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value || "")
