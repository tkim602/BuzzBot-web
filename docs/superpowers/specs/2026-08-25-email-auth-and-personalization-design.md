# BuzzBot Email Authentication and Personalization Design

**Date:** 2026-08-25
**Status:** Approved for implementation

## Goal

Add email-and-password accounts without expanding the backend data model. All verified email
addresses can use an account. A verified `@gatech.edu` address additionally receives a
personalization eligibility flag. Personalization remains a clearly labeled future feature.

## Scope

- Firebase Authentication for email/password sign-up, sign-in, email verification, password reset,
  sign-out, and persisted browser sessions.
- Replace the disabled Settings control with Personalization.
- Replace the hard-coded sidebar identity with the Firebase account email and state.
- Isolate browser chat history by Firebase UID.
- Move existing anonymous history into the first signed-in account once on the same browser.

The public `/chat` API remains unchanged. There is no server-side chat history, Firebase Admin SDK,
account database table, Google sign-in, Georgia Tech SSO, or implemented course personalization in
this change.

## Architecture

Firebase's browser SDK owns credentials, verification email delivery, password reset, and session
persistence. A small client module initializes Firebase from public Next.js environment variables.
An auth provider exposes the current user, loading state, authentication actions, and this derived
capability:

```text
personalizationEligible = user.emailVerified
  && user.email.toLowerCase().endsWith("@gatech.edu")
```

`BuzzBotApp` continues to own chat state. It receives the current Firebase UID and uses it only to
choose a localStorage namespace. No auth token is sent to the public backend because no protected
server resource exists yet.

## Authentication Flow

### Sign-up

1. The user enters email, password, and password confirmation.
2. Firebase creates the account and sends a verification email.
3. BuzzBot signs the new session out and shows a verification-sent confirmation.
4. The user verifies the address and then signs in normally.

Password rules use Firebase's minimum requirements and a local minimum length of six characters.
Firebase error codes are mapped to short user-facing messages without exposing provider internals.

### Sign-in and session restoration

Firebase restores the browser session through `onAuthStateChanged`. The chat UI remains usable while
signed out. Until Firebase finishes its initial auth-state check, account-scoped history is not
loaded or saved, preventing anonymous history from being written into the wrong namespace.

An unverified account is signed out and shown a verification reminder with a resend action. Password
reset sends Firebase's reset email and returns a neutral confirmation that does not disclose whether
an account exists.

### Sign-out

Any active chat request is aborted before changing storage namespaces. After Firebase signs out,
BuzzBot loads the anonymous history namespace.

## Local Chat History

The existing state schema and limits remain unchanged. Only the storage key changes:

```text
anonymous: buzzbot.chat.v1
account:   buzzbot.chat.v1.user.<firebase_uid>
marker:    buzzbot.chat.v1.migrated.<firebase_uid>
```

On the first successful verified sign-in for a UID:

1. If the account key already contains history, load it and do not overwrite it.
2. Otherwise copy the validated anonymous state into the account key.
3. After the account write succeeds, remove the anonymous key and record the migration marker.
4. Subsequent sign-ins load only that UID's account key.

Storage parsing, normalization, conversation limits, message limits, and API-history limits reuse
the existing helpers. A full or unavailable localStorage continues to fail safely without breaking
chat. This is same-browser account isolation, not cross-device synchronization.

## User Interface

The existing editorial sidebar and chat layout remain intact.

- Signed out: the account row reads `Sign in` and opens one focused auth dialog.
- Signed in: the account row shows an email-derived initial, the email address, and either
  `Georgia Tech account` or `Account`; its menu contains Sign out.
- The Settings row becomes Personalization.
- Signed-out Personalization opens sign-in.
- A verified non-GT account sees that a verified `@gatech.edu` email is required.
- An eligible GT account sees a compact coming-soon panel explaining that students will later be
  able to add current courses for personalized answers.

The auth dialog switches between sign-in, sign-up, verification reminder, and password reset inside
one component. It uses native email/password inputs, accessible labels, focus management, Escape to
close, and the existing warm paper design tokens. It does not introduce a settings page.

## Configuration

The frontend requires these public Firebase Web App values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebase Console must enable the Email/Password provider and authorize `localhost` for local
development. These Web App values are intentionally public identifiers; no service-account key is
stored in the frontend repository.

If configuration is incomplete, normal anonymous chat continues to work and opening authentication
shows a configuration-unavailable message rather than crashing the application.

## Security Boundary

Firebase stores and validates passwords; BuzzBot never receives them outside the Firebase browser
SDK. Email-domain eligibility is a UI capability only until a protected personalization backend is
implemented. Any future server-side personalized data must verify Firebase ID tokens with Firebase
Admin and recompute the verified email/domain entitlement on the server.

## Testing

- Unit-test UID storage keys, first-login migration, account isolation, and safe storage failures.
- Mock Firebase auth state and actions; no test reaches Firebase's network.
- Component-test sign-up validation, verification confirmation, sign-in, password reset, sign-out,
  account rendering, and Personalization eligibility states.
- Regression-test that anonymous chat still works with missing Firebase configuration.
- Run lint, typecheck, unit tests, and production build.

## Success Criteria

1. A user can sign up with any valid email/password and receives a verification email.
2. Only a verified account can complete sign-in to the account-scoped UI.
3. A verified `@gatech.edu` account is personalization-eligible; other accounts are not.
4. Chat histories from anonymous mode and different Firebase UIDs do not mix.
5. Existing anonymous history is moved once without data loss after the first verified sign-in.
6. Settings is absent and Personalization displays the correct future-feature state.
7. Anonymous chat remains operational when Firebase is unavailable or unconfigured.
