# BuzzBot Web

Frontend-only Next.js shell for the BuzzBot Georgia Tech assistant.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run verify
npm run test:e2e
```

The current interaction uses committed mock data. Backend chat, authentication,
and persistent history are intentionally deferred to the integration phase.
