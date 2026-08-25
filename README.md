# BuzzBot Web

Next.js frontend for the BuzzBot Georgia Tech assistant.

## Run locally

Start the BuzzBot API on port `8000`, then run the frontend:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

`NEXT_PUBLIC_BUZZBOT_API_URL` is the public API origin, not a place for API
keys. The browser sends chat requests directly to `POST /chat`.

## Authentication and conversation history

Firebase email/password authentication is optional. Configure the four
`NEXT_PUBLIC_FIREBASE_*` Web App values to enable sign-up, verification, sign-in,
password reset, and sign-out. Authenticated chat calls obtain a current Firebase ID
token immediately before `POST /chat`; tokens are never manually persisted.

Conversations remain only in this browser's localStorage. Anonymous history uses
`buzzbot.chat.v1`; signed-in history uses a Firebase UID-scoped key and is migrated
once from anonymous history. This does not provide cloud or cross-device history.

## Verify

```bash
npm run verify
npm run test:e2e
```

GitHub Actions runs lint, typecheck, unit tests, build, and the mocked Playwright suite without
Firebase credentials or a live backend.
