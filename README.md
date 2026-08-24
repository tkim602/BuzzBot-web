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
keys. The browser sends chat requests directly to `POST /v2/chat`.

## Conversation history

Until authentication is added, conversations are stored only in this
browser's localStorage under `buzzbot.chat.v1`. Selecting a chat continues the
same thread and sends its recent completed turns to the API. Clearing site data
removes this history.

## Verify

```bash
npm run verify
npm run test:e2e
```
