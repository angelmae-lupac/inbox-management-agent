# Smart Inbox Management Agent

A professional portfolio project demonstrating AI-driven inbox triage and automation for a small business workflow.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Prisma
- Vercel Postgres
- Gemini API (planned integration)

## Features

- Inbox dashboard with realistic sample data
- AI classification workflow stub ready for Gemini integration
- Draft reply generation hook
- Status tracking for handled and pending messages
- Human review flag for urgent or sensitive messages
- Clean, client-facing dashboard design

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment setup

Copy `.env.example` to `.env.local` and update the values for your local environment.

```bash
cp .env.example .env.local
```

## Deployment

This app is designed for Vercel deployment. Add the environment variables in the Vercel dashboard before deploying.

## Notes

The AI route currently uses placeholder logic so the app can be scaffolded and reviewed before the actual Gemini API call is wired in.
