# Chat Continuity and Background Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep long local conversations usable and resumable, add history pin/delete controls, infer the configured active term for current schedule questions, and periodically refresh trusted data through existing ingestion orchestrators.

**Architecture:** The frontend extends its existing version-1 local-storage record with one optional pin timestamp and keeps the app shell fixed while only the message list scrolls. The backend adds active-term settings plus one small lifespan-owned async loop that invokes existing schedule/document orchestrators behind a PostgreSQL advisory lock; it adds no scheduler dependency or publication path.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, FastAPI, Pydantic Settings, SQLAlchemy/PostgreSQL, pytest, asyncio.

---

### Task 1: Persist pinned conversations and longer transcripts

**Files:**
- Modify: `BuzzBot-web/src/components/buzzbot/chat-types.ts`
- Modify: `BuzzBot-web/src/components/buzzbot/chat-storage.ts`
- Test: `BuzzBot-web/tests/chat-storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Add tests proving that old records without `pinnedAt` still load, records retain the latest 100 messages, pinned rows form a first `Pinned` group ordered by `pinnedAt`, and API history remains the latest 20 completed messages.

```ts
expect(normalizeChatState(state).conversations[0].messages).toHaveLength(100);
expect(groupConversations([unpinned, olderPin, newerPin], now)[0]).toMatchObject({
  label: "Pinned",
  conversations: [{ id: "newer-pin" }, { id: "older-pin" }],
});
expect(loadChatState(storage).conversations[0].pinnedAt).toBeUndefined();
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/chat-storage.test.ts`  
Expected: FAIL because storage is capped at 40 and does not expose pinned metadata/groups.

- [ ] **Step 3: Implement the minimal backward-compatible model**

Add `pinnedAt?: string` to `StoredConversation`, `pinned: boolean` to `ChatHistoryItem`, and `"Pinned"` to the history label union. Accept only an optional string in storage validation, change `MAX_MESSAGES` to `100`, and build the Pinned group before the existing date groups.

```ts
export type StoredConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinnedAt?: string;
  messages: StoredMessage[];
};
```

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/chat-storage.test.ts`  
Expected: PASS.

```bash
git add src/components/buzzbot/chat-types.ts src/components/buzzbot/chat-storage.ts tests/chat-storage.test.ts
git commit -m "feat: persist pinned chat history"
```

### Task 2: Add home, pin, and delete sidebar actions

**Files:**
- Modify: `BuzzBot-web/src/components/buzzbot/Sidebar.tsx`
- Modify: `BuzzBot-web/src/components/buzzbot/BuzzBotApp.tsx`
- Modify: `BuzzBot-web/src/components/buzzbot/buzzbot.module.css`
- Test: `BuzzBot-web/tests/sidebar.test.tsx`
- Test: `BuzzBot-web/tests/buzzbot-app.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover wordmark home navigation, pin/unpin callbacks, confirmed deletion, cancelled deletion, and deleting the active chat. Stub `window.confirm` in app tests and assert unrelated stored chats remain.

```ts
fireEvent.click(screen.getByRole("button", { name: "BuzzBot home" }));
expect(screen.getByRole("heading", { name: /What can I help/ })).toBeVisible();
fireEvent.click(screen.getByRole("button", { name: "Pin CS 6601 Fall schedule" }));
expect(onTogglePin).toHaveBeenCalledWith("thread-cs");
```

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/sidebar.test.tsx tests/buzzbot-app.test.tsx`  
Expected: FAIL because the callbacks and controls do not exist.

- [ ] **Step 3: Implement actions in existing components**

Turn the wordmark into a button that calls `resetChat`. Add `onTogglePin(id)` and `onDeleteConversation(id)` sidebar props. Use the installed Lucide `Pin`, `PinOff`, and `Trash2` icons. The app mutates only the matching conversation; deletion calls `window.confirm`, aborts an active request when required, and clears the active ID only when deleting the selected chat.

```ts
const togglePin = (id: string) => setChatState((state) => ({
  ...state,
  conversations: state.conversations.map((conversation) =>
    conversation.id === id
      ? { ...conversation, pinnedAt: conversation.pinnedAt ? undefined : new Date().toISOString() }
      : conversation,
  ),
}));
```

Use one row wrapper with the title button and icon buttons. Reveal icons on row hover or `:focus-within`, but keep them keyboard reachable and labelled at all times.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/sidebar.test.tsx tests/buzzbot-app.test.tsx`  
Expected: PASS.

```bash
git add src/components/buzzbot/Sidebar.tsx src/components/buzzbot/BuzzBotApp.tsx src/components/buzzbot/buzzbot.module.css tests/sidebar.test.tsx tests/buzzbot-app.test.tsx
git commit -m "feat: manage local chat history"
```

### Task 3: Keep long chat rendering inside the viewport

**Files:**
- Modify: `BuzzBot-web/src/components/buzzbot/ChatWorkspace.tsx`
- Modify: `BuzzBot-web/src/components/buzzbot/buzzbot.module.css`
- Test: `BuzzBot-web/tests/chat-workspace.test.tsx`
- Test: `BuzzBot-web/tests/design-contract.test.ts`

- [ ] **Step 1: Write failing scroll contract tests**

Assert that the message region is addressable as `data-testid="message-scroll"`, every rendered turn has the containment class, and the CSS contract contains `height: 100dvh`, `min-height: 0`, and `overflow-y: auto` on the correct shell/message selectors.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/chat-workspace.test.tsx tests/design-contract.test.ts`  
Expected: FAIL because `.thread` grows to `100dvh` and the message region does not own scrolling.

- [ ] **Step 3: Implement viewport layout and respectful auto-scroll**

Make `.appShell`, `.workspaceSlot`, `.workspace`, `.chatCanvas`, and `.thread` participate in a fixed-height/min-height-zero chain. Make `.messages` the sole vertical scroller and `.stickyComposer` a normal final grid row. Add `content-visibility: auto` and `contain-intrinsic-size` to message turns.

In `ChatWorkspace`, keep a ref to the message scroller. Before updates, treat the user as near the bottom when the remaining distance is at most 120px; after a new turn/pending state, call `scrollTo({ top: scrollHeight, behavior: "smooth" })` only when that flag is true.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/chat-workspace.test.tsx tests/design-contract.test.ts`  
Expected: PASS.

```bash
git add src/components/buzzbot/ChatWorkspace.tsx src/components/buzzbot/buzzbot.module.css tests/chat-workspace.test.tsx tests/design-contract.test.ts
git commit -m "fix: keep long chats within the viewport"
```

### Task 4: Configure and apply the active academic term

**Files:**
- Modify: `BuzzBot-backend/app/core/config.py`
- Modify: `BuzzBot-backend/app/api/routes/chat.py`
- Modify: `BuzzBot-backend/app/graph/understanding.py`
- Modify: `BuzzBot-backend/.env.example`
- Test: `BuzzBot-backend/tests/test_database_config.py`
- Test: `BuzzBot-backend/tests/test_graph_understanding.py`
- Test: `BuzzBot-backend/tests/test_agent_api.py`

- [ ] **Step 1: Write failing active-term tests**

Test six-digit validation and these exact rules:

```python
assert understand_query("Is CS 2200 offered?", active_term="202608")["term_code"] == "202608"
assert understand_query("Is CS 2200 offered this semester?", active_term="202608")["term_code"] == "202608"
assert understand_query("Is CS 2200 offered in Fall 2027?", active_term="202608")["term_code"] == "202708"
assert understand_query("What are OMSCS admission requirements?", active_term="202608")["term_code"] is None
```

- [ ] **Step 2: Verify the tests fail**

Run: `pytest -q tests/test_database_config.py tests/test_graph_understanding.py tests/test_agent_api.py -x`  
Expected: FAIL because `active_term_code` and the fallback argument do not exist.

- [ ] **Step 3: Implement one fallback point**

Add `active_term_code: str = "202608"` with a Pydantic regex constraint. Add an optional `active_term` argument to `understand_query`. Resolve the explicit query/user term first, classify the intent, and only then assign `active_term` when intent is `course_schedule` and the term is absent. Pass `settings.active_term_code` from the chat route. Do not inject it into policy or calendar routes.

- [ ] **Step 4: Run focused tests and commit**

Run: `pytest -q tests/test_database_config.py tests/test_graph_understanding.py tests/test_agent_api.py`  
Expected: PASS.

```bash
git add app/core/config.py app/api/routes/chat.py app/graph/understanding.py .env.example tests/test_database_config.py tests/test_graph_understanding.py tests/test_agent_api.py
git commit -m "feat: default schedule queries to active term"
```

### Task 5: Add the bounded background sync service

**Files:**
- Create: `BuzzBot-backend/app/core/background_sync.py`
- Create: `BuzzBot-backend/tests/test_background_sync.py`
- Modify: `BuzzBot-backend/app/core/config.py`
- Modify: `BuzzBot-backend/.env.example`

- [ ] **Step 1: Write failing scheduler tests**

With schedule/document runners, time, sleep, and advisory lock mocked, cover: disabled service does nothing; the first cycle runs the active term; a recent completed `official-documents`/`run3` run skips documents; an old or absent run executes documents; a held lock skips work; one job exception is logged and does not escape the loop helper.

- [ ] **Step 2: Verify the tests fail**

Run: `pytest -q tests/test_background_sync.py -x`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the smallest service around existing orchestrators**

Add settings `background_sync_enabled: bool = False`, `schedule_sync_interval_seconds: int = 86400`, and `document_sync_interval_seconds: int = 604800`, all positive. Implement:

```python
async def run_sync_cycle(now: datetime | None = None) -> None:
    await _run_locked("schedule", lambda: sync_oscar_term(term=settings.active_term_code))
    if documents_due(now or datetime.now(UTC)):
        await _run_locked("documents", _sync_run3_documents)

async def background_sync_loop() -> None:
    while True:
        try:
            await run_sync_cycle()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("background sync cycle failed", error=type(exc).__name__)
        await asyncio.sleep(settings.schedule_sync_interval_seconds)
```

`_sync_run3_documents` loads existing sources, filters profile `run3`, and calls `sync_document_profile("run3", ..., SyncSessionLocal, get_embedding_function())`. `documents_due` reads completed official-document runs newest-first and compares the matching profile completion time to the configured interval. `_run_locked` holds one dedicated PostgreSQL session-level advisory lock per job kind and always unlocks in `finally`.

- [ ] **Step 4: Run focused tests and commit**

Run: `pytest -q tests/test_background_sync.py tests/test_database_config.py`  
Expected: PASS.

```bash
git add app/core/background_sync.py app/core/config.py .env.example tests/test_background_sync.py
git commit -m "feat: schedule bounded background data sync"
```

### Task 6: Own the sync task in FastAPI lifespan

**Files:**
- Modify: `BuzzBot-backend/app/main.py`
- Test: `BuzzBot-backend/tests/test_agent_api.py`

- [ ] **Step 1: Write failing lifespan tests**

Mock `background_sync_loop` with a coroutine that records start/cancellation. Assert no task is created when disabled, a task is created when enabled, and it is cancelled and awaited when lifespan exits.

- [ ] **Step 2: Verify the tests fail**

Run: `pytest -q tests/test_agent_api.py -x`  
Expected: FAIL because lifespan does not manage the background task.

- [ ] **Step 3: Add task lifecycle without blocking startup**

Inside the existing lifespan, create the task only after reranker/checkpointer setup and only when enabled. In `finally`, cancel it and suppress only `asyncio.CancelledError` while awaiting it. Do not await the first network synchronization before yielding the API.

- [ ] **Step 4: Run focused tests and commit**

Run: `pytest -q tests/test_agent_api.py tests/test_background_sync.py`  
Expected: PASS.

```bash
git add app/main.py tests/test_agent_api.py
git commit -m "feat: run data sync from application lifespan"
```

### Task 7: Full verification without live synchronization

**Files:**
- Modify only if verification exposes a scoped defect.

- [ ] **Step 1: Verify frontend**

Run: `npm run verify` from `BuzzBot-web`.  
Expected: ESLint, TypeScript, Vitest, and Next production build all pass.

- [ ] **Step 2: Verify backend**

Run: `ruff check .` and `pytest -q` from `BuzzBot-backend`.  
Expected: lint passes and the complete existing suite passes with only documented skips.

- [ ] **Step 3: Confirm no live work or secrets changed**

Run: `git diff --check`, inspect both worktree statuses, and confirm `BACKGROUND_SYNC_ENABLED` remains false in examples/local defaults. Do not start the API, OSCAR sync, document sync, OpenAI, or LangSmith.

- [ ] **Step 4: Record implementation heads**

Run `git log -1 --format='%h %an <%ae> %s'` in each repository and confirm the author is `tkim602 <tkim602@gatech.edu>`.

