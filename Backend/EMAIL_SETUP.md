# Email Verification Setup

StepHabit now sends a 6-digit verification code during registration. Emails are dispatched through the [Resend](https://resend.com) API using the built-in `fetch` client (Node.js 18+).

## Required environment variables
Create or update your `.env` file in `Backend/` with:

```
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=StepHabit <no-reply@yourdomain.com>
```

`EMAIL_FROM` must be a **verified sender** in your Resend account. If either variable is missing in production, registration and resend requests will return a `503` error so you know email isn't configured. For local development, log-only fallback is enabled by default (unless you set `ALLOW_EMAIL_LOGGING=false`); the payload is printed to the server console instead of being dispatched. When logging is used, the API response includes `deliveryStatus: "logged"` so the UI can indicate that no email was actually sent.

### Stop seeing the "logged to console" message
If you get a response like `Email delivery isn't configured; the verification code was logged to the server console (code: 123456)`, it means the app is running in log-only mode. To send real emails instead:

1. Sign up for [Resend](https://resend.com) and create an API key.
2. Verify your sender domain or address in Resend so the `EMAIL_FROM` value is authorised.
3. Add `RESEND_API_KEY` and `EMAIL_FROM` to `Backend/.env`, then restart the server.
4. Optional: set `ALLOW_EMAIL_LOGGING=false` in non-production environments to fail fast if delivery isn't configured.

After configuration, the API returns `deliveryStatus: "sent"` and users receive actual emails instead of console logs.

## Delivery notes
- Verification codes expire after 15 minutes.
- Users can request a new code via `POST /api/users/resend-code` with `{ "email": "user@example.com" }`.
- Verification uses `POST /api/users/verify-email` with `{ "email": "user@example.com", "code": "123456" }`.
