# Smart Inbox Management Agent

An AI-assisted support inbox that receives real email, classifies it, drafts a response, and sends approved replies with a durable delivery audit trail.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL via Prisma
- Gemini API for classification and draft generation
- Resend for inbound webhooks and outbound email

## Features

- Inbox dashboard with realistic sample data fallback
- Signed inbound email webhook with duplicate-event protection
- AI classification and extracted support details
- Editable reply composer with human approval gate
- Resend-backed outbound replies and delivery state
- Reply and activity audit records in PostgreSQL
- Human review flag for urgent or sensitive messages

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment setup

Copy `.env.example` to `.env.local` and update the values for your local environment. Keep all provider keys server-side.

```bash
cp .env.example .env.local
```

Required for real email:

- `DATABASE_URL`: PostgreSQL connection string
- `GEMINI_API_KEY`: Google AI API key
- `RESEND_API_KEY`: Resend API key with sending access
- `EMAIL_FROM`: verified sender identity in Resend
- `RESEND_WEBHOOK_SECRET`: signing secret for the inbound webhook

For the optional personal Gmail connector, also configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `SESSION_SECRET`.

For a public portfolio deployment, set `DEMO_MODE=true`. This serves sanitized seeded messages and disables live Gmail/email actions. Keep `DEMO_MODE=false` only in a private authenticated environment.

In Resend, configure the inbound webhook URL as:

`https://your-domain.example/api/webhooks/email`

Configure delivery events at:

`https://your-domain.example/api/webhooks/email-status`

The dashboard sends replies through `POST /api/messages/[id]/send`. Urgent or ambiguous messages remain blocked until their human-review flag is cleared by an operator or by a future review workflow.

## Deployment

This app is designed for Vercel deployment. Add the environment variables in the Vercel dashboard before deploying.

## Production checklist

- Add authentication and role-based access before exposing the dashboard publicly.
- Run `npx prisma migrate deploy` during deployment after creating a migration.
- Configure Resend webhook signing and a verified sending domain.
- Add a background job for AI analysis if inbound volume can exceed webhook request limits.
- Add monitoring for failed analysis, failed sends, bounces, and provider rate limits.
- Test duplicate webhook delivery and retry behavior before launch.
