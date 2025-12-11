# Email Verification Setup

StepHabit now sends a 6-digit verification code during registration. Emails are dispatched through the [Resend](https://resend.com) API using the built-in `fetch` client (Node.js 18+).

## Required environment variables
Create or update your `.env` file in `Backend/` with:

```
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=StepHabit <no-reply@yourdomain.com>
```

`EMAIL_FROM` should be a verified sender in your Resend account. If either variable is missing, registration and resend requests will return an error before creating or updating user verification records.

## Delivery notes
- Verification codes expire after 15 minutes.
- Users can request a new code via `POST /api/users/resend-code` with `{ "email": "user@example.com" }`.
- Verification uses `POST /api/users/verify-email` with `{ "email": "user@example.com", "code": "123456" }`.
