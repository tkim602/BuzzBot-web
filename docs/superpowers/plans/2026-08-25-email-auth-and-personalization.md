# Email Authentication and Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase email/password authentication, UID-scoped local chat history, and a future Personalization surface without changing the public chat backend.

**Architecture:** Firebase's browser SDK owns account lifecycle and exposes a small React hook. `BuzzBotApp` switches the existing versioned localStorage state between anonymous and UID-specific keys only after auth hydration. Sidebar actions open one account dialog and one static personalization dialog.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Auth, Vitest, Testing Library, CSS Modules

---

## File Structure

- Create `src/components/buzzbot/auth.tsx`: Firebase initialization, auth state, actions, error mapping, and GT eligibility.
- Create `src/components/buzzbot/AccountDialog.tsx`: sign-in, sign-up, reset, verification, and account controls.
- Create `src/components/buzzbot/PersonalizationDialog.tsx`: eligibility-aware future-feature message.
- Modify `src/components/buzzbot/chat-storage.ts`: optional UID keys and one-time anonymous migration.
- Modify `src/components/buzzbot/BuzzBotApp.tsx`: auth hydration, storage switching, and dialog orchestration.
- Modify `src/components/buzzbot/Sidebar.tsx`: Personalization and real account actions.
- Modify `src/components/buzzbot/buzzbot.module.css`: dialog, form, and account-button styling.
- Modify `.env.example`, `package.json`, and `package-lock.json`: Firebase browser configuration and dependency.
- Modify existing tests and add `tests/auth.test.tsx` and `tests/account-dialog.test.tsx`.

### Task 1: Firebase client boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `src/components/buzzbot/auth.tsx`
- Test: `tests/auth.test.tsx`

- [ ] **Step 1: Add failing tests for eligibility and unavailable configuration**

Test `isPersonalizationEligible({email, emailVerified})` for verified GT, unverified GT, and
verified non-GT accounts. Render the hook/provider with empty configuration and assert anonymous
chat state remains available while auth reports `configured: false`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/auth.test.tsx`
Expected: FAIL because `auth.tsx` does not exist.

- [ ] **Step 3: Install Firebase and implement the minimum provider**

Run: `npm install firebase`

Expose these stable values and actions:

```ts
type AuthState = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  personalizationEligible: boolean;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  sendReset(email: string): Promise<void>;
  signOut(): Promise<void>;
};
```

Initialize Firebase only when all four public environment values are present. Sign-up sends a
verification email and signs out. Sign-in rejects an unverified user after resending verification
and signing out. Map expected Firebase codes to concise `AuthError` messages.

- [ ] **Step 4: Document public configuration**

Add the four `NEXT_PUBLIC_FIREBASE_*` names to `.env.example`, leaving values empty.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/auth.test.tsx`
Expected: PASS.

Commit: `feat: add Firebase email authentication`

### Task 2: UID-scoped chat persistence

**Files:**
- Modify: `src/components/buzzbot/chat-storage.ts`
- Modify: `tests/chat-storage.test.ts`

- [ ] **Step 1: Add failing storage tests**

Cover these exact behaviors:

```ts
expect(chatStorageKey()).toBe("buzzbot.chat.v1");
expect(chatStorageKey("uid-1")).toBe("buzzbot.chat.v1.user.uid-1");
```

Verify `migrateAnonymousChatState(storage, "uid-1")` copies valid anonymous state only when the
account key is absent, removes anonymous data only after the account write succeeds, records a UID
marker, never overwrites existing account history, and does nothing on subsequent calls.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/chat-storage.test.ts`
Expected: FAIL because scoped key and migration helpers do not exist.

- [ ] **Step 3: Extend existing helpers without changing the schema**

Make `loadChatState(storage, uid?)` and `saveChatState(storage, state, uid?)` select the scoped key.
Add one migration function using `getItem`, `setItem`, and `removeItem`; reuse existing validation and
normalization rather than duplicating parsing.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/chat-storage.test.ts`
Expected: PASS.

Commit: `feat: isolate local chat history by account`

### Task 3: Account and Personalization UI

**Files:**
- Create: `src/components/buzzbot/AccountDialog.tsx`
- Create: `src/components/buzzbot/PersonalizationDialog.tsx`
- Modify: `src/components/buzzbot/Sidebar.tsx`
- Modify: `src/components/buzzbot/buzzbot.module.css`
- Create: `tests/account-dialog.test.tsx`
- Modify: `tests/sidebar.test.tsx`

- [ ] **Step 1: Add failing component tests**

Assert that Sidebar shows `Sign in` when anonymous, the real email when authenticated, and an
enabled Personalization action. Assert sign-up requires matching passwords, invokes `signUp`, and
shows the verification confirmation. Assert Personalization distinguishes signed-out, verified
non-GT, and eligible GT states.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/sidebar.test.tsx tests/account-dialog.test.tsx`
Expected: FAIL on the new props/components.

- [ ] **Step 3: Implement focused dialogs and sidebar account controls**

Use native `<dialog>` semantics through an accessible fixed overlay, labeled fields, submit errors,
Escape close, and existing typography/colors. Keep one account form component with explicit
`sign-in`, `sign-up`, and `reset` modes. Personalization contains no course input or persistence.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/sidebar.test.tsx tests/account-dialog.test.tsx`
Expected: PASS.

Commit: `feat: add account and personalization surfaces`

### Task 4: App integration and storage handoff

**Files:**
- Modify: `src/components/buzzbot/BuzzBotApp.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `tests/buzzbot-app.test.tsx`

- [ ] **Step 1: Add failing integration tests**

Mock the auth hook and verify that auth loading delays storage hydration, signing in loads the UID
namespace, the first verified sign-in migrates anonymous history, signing out restores anonymous
history, and an active request is aborted before a namespace change.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/buzzbot-app.test.tsx`
Expected: FAIL because the app does not consume auth state.

- [ ] **Step 3: Wire auth and chat state together**

Wrap the app in `AuthProvider`. Track the currently loaded UID separately from Firebase state. On an
auth identity change, abort the request, migrate when appropriate, load that namespace, then enable
saves. Pass account and dialog callbacks to Sidebar. Never send Firebase tokens to `/chat`.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/buzzbot-app.test.tsx`
Expected: PASS.

Commit: `feat: connect accounts to local chat history`

### Task 5: Full verification

**Files:**
- Modify only files required by failures directly caused by Tasks 1-4.

- [ ] **Step 1: Run all repository checks**

Run: `npm run verify`
Expected: lint, typecheck,  unit tests, and production build all exit 0.

- [ ] **Step 2: Verify the unconfigured fallback**

Run the production build without Firebase environment values and confirm it succeeds. Render the
app test with missing config and confirm anonymous chat remains available.

- [ ] **Step 3: Inspect final scope**

Confirm no backend files, database schema, server-side history, course personalization, OAuth
provider, or Firebase Admin credentials were added. Run `git diff --check` and inspect `git status`.

- [ ] **Step 4: Commit any verification-only correction**

Commit only if Step 1 exposed a directly related issue; otherwise leave the Task 4 commit as the
final implementation commit.
