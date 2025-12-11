# Email Verification Setup

StepHabit now sends a 6-digit verification code during registration. Emails are dispatched through the [Resend](https://resend.com) API using the built-in `fetch` client (Node.js 18+).

## Required environment variables
Create or update your `.env` file in `Backend/` with:

```
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=StepHabit <no-reply@yourdomain.com>
```

`EMAIL_FROM` must be a **verified sender** in your Resend account. If either variable is missing in production, registration and resend requests will return a `503` error so you know email isn't configured. To keep the old log-only behavior for local development, set `ALLOW_EMAIL_LOGGING=true` in your environment (non-production only). With logging enabled, the payload is printed to the server console instead of being dispatched.

## Delivery notes
- Verification codes expire after 15 minutes.
- Users can request a new code via `POST /api/users/resend-code` with `{ "email": "user@example.com" }`.
- Verification uses `POST /api/users/verify-email` with `{ "email": "user@example.com", "code": "123456" }`.
