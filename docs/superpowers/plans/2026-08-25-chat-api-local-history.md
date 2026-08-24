# Chat API and Local History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect BuzzBot Web to the real `/chat` API and replace mock chat history with resumable, searchable browser-local conversations while leaving authentication out of scope.

**Architecture:** `BuzzBotApp` remains the state owner and delegates HTTP serialization to `chat-api.ts` and versioned persistence to `chat-storage.ts`. The sidebar receives real conversations and callbacks; the workspace renders stored messages and real response evidence. FastAPI keeps its existing chat contract and gains only environment-configurable CORS origins.

**Tech Stack:** Next.js 16, React 19, TypeScript, native localStorage/fetch/AbortController, Vitest, Testing Library, Playwright, FastAPI, Pydantic Settings, pytest, Ruff.

**Spec:** `docs/superpowers/specs/2026-08-25-chat-api-local-history-design.md`

---

## File Map

```text
BuzzBot-web/
├── .env.example
├── src/components/buzzbot/
│   ├── chat-api.ts              # request/response boundary
│   ├── chat-storage.ts          # versioned localStorage functions
│   ├── chat-types.ts            # shared conversation types
│   ├── BuzzBotApp.tsx           # request and active-thread orchestration
│   ├── ChatWorkspace.tsx        # real messages/loading/error/composer
│   ├── Evidence.tsx             # real citations and response metadata
│   ├── Sidebar.tsx              # searchable real conversations
│   ├── mock-data.ts             # suggestions only
│   └── buzzbot.module.css
├── tests/
│   ├── chat-api.test.ts
│   ├── chat-storage.test.ts
│   ├── sidebar.test.tsx
│   └── buzzbot-app.test.tsx
└── e2e/shell.spec.ts

BuzzBot/
├── app/core/config.py
├── app/main.py
└── tests/test_cors_config.py
```

---

### Task 1: Add the real chat API boundary

**Files:**
- Create: `src/components/buzzbot/chat-types.ts`
- Create: `src/components/buzzbot/chat-api.ts`
- Create: `tests/chat-api.test.ts`

- [ ] **Step 1: Write failing API serialization and error tests**

Create tests that stub `global.fetch`, call `sendChat`, and assert the exact
`POST http://localhost:8000/chat` body:

```ts
expect(JSON.parse(String(init?.body))).toEqual({
  query: "Is it offered in Fall 2026?",
  thread_id: "thread-1",
  history: [{ role: "user", content: "Tell me about CS 6601" }],
});
```

Also assert that a valid response is returned, an invalid success response
rejects with `BuzzBot returned an invalid response.`, and a 429 JSON detail
maps to its safe `message`.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- tests/chat-api.test.ts`

Expected: FAIL because `chat-api.ts` and `chat-types.ts` do not exist.

- [ ] **Step 3: Add shared API and conversation types**

Define `ChatCitation`, `FreshnessInfo`, `ChatApiResponse`, `StoredMessage`,
`StoredConversation`, and `StoredChatState` exactly as approved in the spec.
Use `readonly` arrays at API boundaries and mutable arrays in stored state.

- [ ] **Step 4: Implement minimal fetch and validation**

Implement:

```ts
export async function sendChat(
  request: ChatApiRequest,
  signal?: AbortSignal,
): Promise<ChatApiResponse> {
  const response = await fetch(`${apiOrigin()}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ChatApiError(errorMessage(response.status, body));
  if (!isChatApiResponse(body)) {
    throw new ChatApiError("BuzzBot returned an invalid response.");
  }
  return body;
}
```

Validation must require a string `thread_id`, string `answer`, citation array,
finite confidence in `[0, 1]`, a freshness object, and notes array. Citation
fields are validated before rendering. Do not add a schema dependency.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm test -- tests/chat-api.test.ts && npm run lint && npm run typecheck`

Commit: `feat: add BuzzBot chat API client`

---

### Task 2: Add versioned local conversation persistence

**Files:**
- Create: `src/components/buzzbot/chat-storage.ts`
- Create: `tests/chat-storage.test.ts`

- [ ] **Step 1: Write failing persistence tests**

Cover these exact behaviors:

```ts
expect(loadChatState(storage)).toEqual(EMPTY_CHAT_STATE);
saveChatState(storage, state);
expect(loadChatState(storage)).toEqual(state);
expect(toApiHistory(conversation.messages)).toEqual([
  { role: "user", content: "Earlier question" },
  { role: "assistant", content: "Earlier answer" },
]);
```

Also write tests proving malformed JSON and `version: 2` fail closed, failed
messages are excluded, API history keeps only the last 20 turns, conversations
are capped at 50, messages at 40, and grouping yields Today, Previous 7 days,
and Older.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- tests/chat-storage.test.ts`

Expected: FAIL because `chat-storage.ts` does not exist.

- [ ] **Step 3: Implement storage as plain functions**

Export:

```ts
export const CHAT_STORAGE_KEY = "buzzbot.chat.v1";
export const EMPTY_CHAT_STATE: StoredChatState = {
  version: 1,
  activeConversationId: null,
  conversations: [],
};

export function loadChatState(storage: Pick<Storage, "getItem">): StoredChatState;
export function saveChatState(
  storage: Pick<Storage, "setItem">,
  state: StoredChatState,
): void;
export function normalizeChatState(state: StoredChatState): StoredChatState;
export function toApiHistory(messages: readonly StoredMessage[]): ChatTurn[];
export function groupConversations(
  conversations: readonly StoredConversation[],
  now?: Date,
): ChatHistoryGroup[];
```

Use `JSON.parse`, `Array.isArray`, string checks, `slice`, and `sort`. Do not add
a repository class, migration registry, date library, or state dependency.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- tests/chat-storage.test.ts && npm run lint && npm run typecheck`

Commit: `feat: persist local BuzzBot conversations`

---

### Task 3: Make sidebar history and search functional

**Files:**
- Modify: `src/components/buzzbot/Sidebar.tsx`
- Modify: `src/components/buzzbot/mock-data.ts`
- Modify: `src/components/buzzbot/buzzbot.module.css`
- Modify: `tests/sidebar.test.tsx`

- [ ] **Step 1: Replace mock-history tests with controlled real data tests**

Render `Sidebar` with grouped conversations and assert:

- clicking a conversation calls `onSelectConversation(id)`;
- Search chats enables an input named `Search conversations`;
- entering `OMSCS` hides unrelated titles and retains matching message content;
- the active conversation exposes `aria-current="page"`;
- empty history displays `Your conversations will appear here.`;
- Settings remains disabled.

- [ ] **Step 2: Run sidebar tests and verify RED**

Run: `npm test -- tests/sidebar.test.tsx`

Expected: FAIL because the current sidebar consumes `HISTORY_GROUPS` and keeps
search disabled.

- [ ] **Step 3: Implement controlled sidebar behavior**

Change `SidebarProps` to consume:

```ts
historyGroups: readonly ChatHistoryGroup[];
activeConversationId: string | null;
onSelectConversation(id: string): void;
```

Keep search visibility as local sidebar UI state. Render conversation entries
as buttons instead of passive list items. Filter against lower-cased title and
the provided searchable text. Remove `HISTORY_GROUPS` from runtime fixtures;
retain only `SUGGESTIONS` in `mock-data.ts`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- tests/sidebar.test.tsx && npm run lint && npm run typecheck`

Commit: `feat: add searchable local chat history`

---

### Task 4: Render real conversation messages and evidence

**Files:**
- Modify: `src/components/buzzbot/ChatWorkspace.tsx`
- Modify: `src/components/buzzbot/Evidence.tsx`
- Modify: `src/components/buzzbot/buzzbot.module.css`
- Modify: `tests/chat-workspace.test.tsx`

- [ ] **Step 1: Write failing message and evidence tests**

Assert that the workspace renders all supplied messages in order, Thinking only
while pending, a failed user message with Retry, disabled composer during a
request, citation title and exact quote, freshness, confidence, and notes. Add a
guard proving a `javascript:` citation is rendered as text rather than a link.

- [ ] **Step 2: Run workspace tests and verify RED**

Run: `npm test -- tests/chat-workspace.test.tsx`

Expected: FAIL because the workspace still renders `MOCK_ANSWER`.

- [ ] **Step 3: Implement generic rendering**

Use this controlled contract:

```ts
type ChatWorkspaceProps = {
  messages: readonly StoredMessage[];
  input: string;
  pending: boolean;
  error: string | null;
  onInputChange(value: string): void;
  onSubmit(question: string): void;
  onRetry(): void;
};
```

Keep the existing empty layout when `messages.length === 0`. Render user
messages as bubbles and assistant messages as transparent articles. `SourceList`
accepts real citations, permits only HTTP(S) links, includes quotes, and renders
freshness/confidence/notes adjacent to the answer. Delete `ScheduleResult` and
all runtime `MOCK_ANSWER` imports.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- tests/chat-workspace.test.tsx && npm run lint && npm run typecheck`

Commit: `feat: render real BuzzBot answers and evidence`

---

### Task 5: Orchestrate resumable API conversations

**Files:**
- Modify: `src/components/buzzbot/BuzzBotApp.tsx`
- Modify: `tests/buzzbot-app.test.tsx`

- [ ] **Step 1: Write failing integration tests with mocked fetch and storage**

Cover one flow per test:

1. first question sends an empty history and generated thread ID, then stores
   user and assistant messages;
2. second question in the selected chat reuses the thread ID and sends the two
   completed prior turns;
3. remount restores stored conversation and selecting history displays it;
4. New chat returns to an empty draft without deleting history;
5. a failed request shows Retry and retry succeeds without duplicating the user
   question;
6. selecting a different conversation aborts an in-flight request.

Use `vi.stubGlobal("fetch", vi.fn())`, real localStorage, and deterministic
`crypto.randomUUID` stubs. Do not use fake API timers.

- [ ] **Step 2: Run app tests and verify RED**

Run: `npm test -- tests/buzzbot-app.test.tsx`

Expected: FAIL because the app still uses a 650ms mock transition.

- [ ] **Step 3: Implement the state flow**

On mount, load local storage once. On every committed state change, save it.
For submission:

```ts
const previousHistory = toApiHistory(active.messages);
appendPendingUserMessage(question);
const response = await sendChat(
  { query: question, thread_id: active.id, history: previousHistory },
  controller.signal,
);
completeUserAndAppendAssistant(response);
```

Ignore `AbortError`; map all other `ChatApiError` values to the inline error.
Abort on unmount, New chat, and conversation selection. Persist only after the
first question creates the conversation. Close the mobile drawer on selection.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test && npm run lint && npm run typecheck && npm run build`

Commit: `feat: connect resumable BuzzBot conversations`

---

### Task 6: Prove the browser contract and document configuration

**Files:**
- Create: `.env.example`
- Modify: `e2e/shell.spec.ts`
- Modify: `README.md`
- Modify: `e2e/shell.spec.ts-snapshots/*.png`

- [ ] **Step 1: Add a failing intercepted API browser test**

Intercept `**/chat`, assert the first and second payloads use one thread ID
and the second contains prior turns, fulfill deterministic responses, reload,
and assert the conversation remains selectable in history. Keep existing desktop
and mobile layout tests.

- [ ] **Step 2: Run E2E and verify RED**

Run: `npm run test:e2e`

Expected: FAIL because current runtime never calls `/chat`.

- [ ] **Step 3: Add environment and run documentation**

Create:

```dotenv
NEXT_PUBLIC_BUZZBOT_API_URL=http://localhost:8000
```

Document starting FastAPI on port 8000 and Next on port 3000, the browser-local
history limitation, and that no secret belongs in `.env.local`.

- [ ] **Step 4: Update and inspect visual baselines**

Run: `npm run test:e2e -- --update-snapshots`

Inspect desktop and mobile PNGs. Reject overflow, a composer over 52px when
empty, hidden retry controls, detached citations, or a three-line empty title.

- [ ] **Step 5: Verify and commit**

Run: `npm run verify && npm run test:e2e && git diff --check`

Commit: `test: verify live chat browser flow`

---

### Task 7: Make backend CORS origins deploy-configurable

**Repository:** `/Users/tkim01/Desktop/personal_project/BuzzBot_repo`

**Files:**
- Modify: `app/core/config.py`
- Modify: `app/main.py`
- Create: `tests/test_cors_config.py`

- [ ] **Step 1: Create an isolated backend worktree from clean `main`**

Use branch `data/web-cors-config`. Preserve all dirty files in the existing main
checkout by making no edits there.

- [ ] **Step 2: Write failing CORS parsing tests**

Assert:

```py
configured = Settings(
    _env_file=None,
    cors_origins="https://buzzbot.example,http://localhost:3100",
)
assert configured.cors_origin_list == [
    "https://buzzbot.example",
    "http://localhost:3100",
]
```

Also assert whitespace and trailing slashes are normalized and wildcard input
raises `ValueError`.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `PYTHONPATH=$PWD python -m pytest -q tests/test_cors_config.py`

Expected: FAIL because `cors_origins` and `cors_origin_list` do not exist.

- [ ] **Step 4: Implement the minimal setting and middleware handoff**

Add a comma-separated `cors_origins` string with local ports 3000 and 3100 for
localhost and 127.0.0.1. Add a property that trims whitespace and trailing `/`,
rejects `*`, and returns the list. Replace the hard-coded `allow_origins` value
in `app/main.py` with `settings.cors_origin_list`.

- [ ] **Step 5: Verify backend and commit**

Run:

```bash
PYTHONPATH=$PWD python -m pytest -q tests/test_cors_config.py tests/test_agent_api.py
ruff check app/core/config.py app/main.py tests/test_cors_config.py
ruff format --check app/core/config.py app/main.py tests/test_cors_config.py
```

Then run the full existing backend suite and report DB integration skips
separately. Commit as `feat: configure frontend CORS origins` under `tkim602`.

---

### Task 8: Final cross-repository verification and handoff

- [ ] **Step 1: Verify frontend from a clean install**

Run: `npm ci && npm run verify && npm run test:e2e`

- [ ] **Step 2: Verify backend without paid calls**

Run: `PYTHONPATH=$PWD python -m pytest -q && make lint`

Do not run live chat, OpenAI, LangSmith, ingestion, or DB mutation commands.

- [ ] **Step 3: Report exact local startup commands**

```bash
# Backend
cd /Users/tkim01/Desktop/personal_project/BuzzBot_repo
make run-backend

# Frontend
cd /Users/tkim01/Desktop/personal_project/BuzzBot-web
cp .env.example .env.local
npm run dev
```

Explain that local history is browser-specific and becomes eligible for a
consent-based account import only after authentication is implemented.
