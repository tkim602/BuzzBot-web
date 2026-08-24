# BuzzBot Chat Continuity and Background Sync Design

**Date:** 2026-08-25  
**Status:** Approved design; implementation pending  
**Repositories:** `BuzzBot-web` and `BuzzBot-backend`

## Goal

Make the current local-first chat usable for longer sessions and keep the official data behind it fresh without introducing authentication or a separate job system.

The change covers five behaviors:

1. Long conversations keep a fixed application shell and scroll only inside the message region.
2. Each saved conversation continues with its own messages and backend thread context.
3. Selecting the BuzzBot wordmark returns to the empty initial chat screen without deleting saved history.
4. When background synchronization is enabled, the active academic term is synchronized at startup and every 24 hours; official document sources are synchronized at most once every seven days.
5. Saved conversations can be pinned or deleted from the sidebar.

It also changes term interpretation: an explicit term always wins, while a schedule question that says “this semester” or omits a term uses the configured active term.

## Non-goals

- Authentication, accounts, or server-side conversation storage
- Syncing every historical or future term automatically
- A distributed task queue, scheduler dependency, or new operations dashboard
- Changing OSCAR/document discovery scope
- Changing retrieval, answer validation, or RAG quality thresholds
- Automatically migrating browser history to a future account in this iteration

## Frontend Design

### Fixed chat shell

The application shell uses the viewport height. The sidebar and main chat column remain fixed within that shell. Only the message list scrolls; the composer stays anchored at the bottom of the main column.

After a new message is appended, the view scrolls to the bottom only when the user was already near the bottom. Reading older content must not be interrupted by a forced jump. Older messages use native CSS rendering containment where supported so a long transcript does not require every off-screen message to be fully rendered.

### Conversation continuity

One conversation maps to one local-storage record and one backend thread ID. Sending a message appends both the user message and completed assistant response to the active record. Reopening that conversation restores the complete stored transcript and continues with the same thread ID.

The browser retains up to 100 messages per conversation. API requests continue to send only the latest 20 completed messages, which bounds request size while preserving recent conversational context. Pending or failed placeholder messages are never sent as history.

The existing local-storage format remains backward compatible. New optional fields must not make older saved conversations unreadable.

### Home behavior

The BuzzBot wordmark is an accessible button. Selecting it clears only the active selection and returns to the initial empty chat screen. It does not delete, truncate, or replace any saved conversation. Starting the next message creates a new conversation through the existing new-chat path.

### Pin and delete

Each history row exposes compact pin and delete controls on hover and keyboard focus. These controls have accessible labels and do not activate the conversation row when selected.

Pinning stores an optional pin timestamp and moves the conversation into a Pinned group. Pinned conversations are ordered by pin time; unpinned conversations retain their existing recency order. Unpinning returns the item to the normal date group.

Deleting requires confirmation. If the active conversation is deleted, the app returns to the initial screen. Other conversations and their thread IDs remain unchanged.

## Active-term Semantics

The backend owns one validated six-digit active term code through `ACTIVE_TERM_CODE`; the initial configured value is `202608`.

Term resolution follows one order everywhere:

1. A term explicitly present in the current question
2. A term already present in the supplied user context
3. The configured active term for schedule/availability questions

“This semester” is an explicit request for the configured active term. A schedule or course-availability question with no term also uses the active term. Non-schedule policy questions do not receive an artificial term.

This removes the repeated “Please include the term” response for ordinary current-semester schedule questions while preserving explicit queries for other terms.

## Background Synchronization

### Lifecycle

Background synchronization reuses the application lifespan and existing ingestion functions. It adds no scheduler dependency.

`BACKGROUND_SYNC_ENABLED` defaults to false so tests and ordinary local development do not unexpectedly perform network or embedding work. A deployed process enables it explicitly.

When enabled, startup creates one non-blocking background task after application initialization:

- Synchronize the configured active term immediately.
- Repeat the active-term schedule synchronization every 24 hours while the process remains alive.
- Synchronize the approved official-document profile immediately only when no completed run exists or the latest completed run is at least seven days old.
- Recheck document eligibility periodically, but never run it more than once inside the seven-day window.

The task is cancelled and awaited during application shutdown.

### Concurrency and publication safety

A PostgreSQL advisory lock prevents two application workers from running the same background job concurrently. If another worker owns the lock, the current worker logs and skips that interval.

The service calls the existing OSCAR term orchestrator and official-document profile orchestrator. Their current versioning, successful-publication, failed-fetch preservation, changed-document-only embedding, and usage-budget behavior remain authoritative. The scheduler does not delete trusted rows or implement a second publication path.

### Failure handling and observability

Synchronization failure never prevents the API from starting and never terminates the server. Each attempt logs its job kind, active term or profile, run ID when available, final status, and error. The next scheduled interval remains eligible after a failure.

The existing readiness response remains the source for schedule freshness. No new status endpoint or dashboard is added.

## Data Flow

### Chat

```text
sidebar selection
      -> local conversation + thread ID
      -> user message appended
      -> POST /chat with latest completed history
      -> assistant result appended to the same conversation
      -> local storage persisted
```

### Schedule question

```text
question
      -> explicit term if present
      -> otherwise configured active term for schedule intent
      -> existing LangGraph schedule route
      -> existing structured schedule retrieval and answer synthesis
```

### Background sync

```text
FastAPI lifespan
      -> feature flag
      -> PostgreSQL advisory lock
      -> existing schedule/document orchestrator
      -> existing atomic publication and run records
```

## Testing

Frontend tests cover:

- Restoring and continuing the same conversation and thread ID
- Retaining up to 100 stored messages while sending only the last 20 completed messages
- Wordmark navigation returning home without deleting history
- Pin, unpin, ordering, persistence, and backward compatibility
- Delete confirmation and active-conversation reset
- Fixed-shell/message-scroll behavior through component/browser assertions

Backend tests cover:

- Active-term configuration validation
- Explicit term precedence
- “This semester” and omitted-term schedule fallback
- No active-term injection for non-schedule questions
- Disabled background sync performing no work
- Startup schedule sync, 24-hour schedule cadence, and seven-day document eligibility with time and orchestrators mocked
- Advisory-lock skip behavior, failure isolation, and shutdown cancellation

Existing frontend checks, backend unit/integration tests, and lint must remain green. Tests must not call live GT sources, OpenAI, or LangSmith.

## Acceptance Criteria

- A long transcript scrolls inside the chat region while the sidebar and composer remain usable.
- Reopening a saved chat continues that conversation instead of starting a disconnected one.
- Selecting BuzzBot returns to a clean initial screen and preserves all history.
- Pin and delete controls work by mouse and keyboard and persist after reload.
- “CS 2200 availability” and “CS 2200 this semester” resolve to `ACTIVE_TERM_CODE`; “CS 2200 in Fall 2027” keeps Fall 2027.
- With background sync disabled, startup behavior is unchanged.
- With it enabled, only the active term is synchronized at startup and every 24 hours, and approved documents are synchronized no more often than every seven days.
- Failed sync attempts leave previously published trusted data authoritative and the chat API available.

