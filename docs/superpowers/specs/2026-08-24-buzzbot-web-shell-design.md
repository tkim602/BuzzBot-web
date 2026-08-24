# BuzzBot Web Shell Design

**Date:** 2026-08-24
**Status:** Approved
**Register:** Product

## Goal

Build a production-quality, frontend-only BuzzBot shell that feels as immediately understandable as a modern chat product while retaining a restrained Georgia Tech identity and making official evidence central to the eventual conversation experience.

## Approved Direction

The interface uses a ChatGPT-like information architecture, not ChatGPT branding:

1. A desktop sidebar expands to show grouped chat history and collapses to a 56px action rail.
2. The main empty state contains one centered question, a compact 50px composer, and three likely student questions.
3. Personalization stays out of the main canvas. Settings is visible as its eventual home but is not implemented in PR1.
4. The default palette uses a near-neutral canvas, GT Diploma sidebar, GT navy text/actions, and restrained gold source/selection accents.
5. Backend integration is excluded. Representative mock data drives reviewable conversation, thinking, citation, and schedule states.

## Information Architecture

### Expanded sidebar

- BuzzBot wordmark
- Collapse sidebar
- New chat
- Search chats
- Today history group
- Previous 7 days history group
- Settings location
- Account identity

### Collapsed desktop rail

- BuzzBot mark
- Expand sidebar
- New chat
- Search chats
- Settings location
- Account identity

### Empty chat canvas

- “What can I help you with at Tech?”
- “Ask about courses, dates, or policies” composer
- Three likely questions drawn from course, calendar, and policy domains
- Small trust note: “Answers cite official Georgia Tech sources.”

### Mock conversation canvas

- User question
- Thinking state
- Assistant document-style answer
- Citation/source list
- One structured schedule result demonstrating desktop and mobile behavior
- Sticky composer at the bottom of the readable column

## Component Boundaries

```text
AppShell
├── Sidebar
│   ├── PrimaryActions
│   ├── ChatHistory
│   └── AccountArea
└── ChatWorkspace
    ├── WorkspaceHeader
    ├── EmptyChat | ChatThread
    │   ├── ThinkingIndicator
    │   ├── AssistantAnswer
    │   ├── SourceList
    │   └── ScheduleResult
    └── Composer
```

`AppShell` owns view-only prototype state: sidebar mode, selected mock conversation, composer text, and mock thinking transition. Child components receive values and callbacks. No global state library, context provider, persistence layer, or API client is required in PR1.

## Interaction Flow

```text
Open app
  -> empty chat
  -> choose a likely question or type a question
  -> user message appears immediately
  -> accessible Thinking indicator appears
  -> representative mock answer replaces Thinking
  -> citations and structured result appear when relevant
```

Desktop sidebar state changes between 260px and 56px. On mobile, the same control opens and closes an overlay drawer instead of preserving a rail. Escape and the backdrop close the drawer.

## Content Rules

- Keep titles and body copy phrase-safe with `word-break: keep-all`.
- Shorten title copy before reducing its font size.
- Use manual line breaks only at complete phrase boundaries.
- Likely questions are direct student questions, not marketing prompts.
- Do not use AI, automation, or productivity buzzwords.
- Do not imply that BuzzBot replaces an advisor or official registrar action.

## Accessibility

- WCAG 2.2 AA contrast targets.
- Semantic landmarks: `aside`, `nav`, `main`, `form`.
- Every icon-only control has an accessible name and visible tooltip.
- Sidebar toggle exposes `aria-expanded` and `aria-controls`.
- Thinking uses `role="status"` and `aria-live="polite"`.
- Touch targets are at least 44px on mobile.
- Focus indicators use dark gold and remain visible on every surface.
- Reduced motion disables sidebar and thinking movement.

## Responsive Rules

- `>= 768px`: 260px expanded sidebar or 56px collapsed rail.
- `< 768px`: sidebar is a drawer above the canvas; the canvas always uses the full viewport width.
- Composer width is `min(768px, 100% - 32px)`.
- Schedule table uses horizontal scrolling only when labeled mobile rows cannot preserve the data relationship.
- No horizontal overflow at 375px, 768px, 1280px, or 1440px.

## PR1 Scope

Include:

- Next.js App Router and TypeScript setup
- CSS design tokens and local component styles
- Responsive app shell and sidebar states
- Empty chat and likely questions
- Compact composer
- Mock user, thinking, assistant, source, and schedule states
- Keyboard, reduced-motion, and responsive checks
- Unit interaction tests and Playwright layout smoke tests

Exclude:

- BuzzBot backend connection
- Authentication and persisted chat history
- Streaming/SSE transport
- Functional search
- Functional Settings and personalization
- Production markdown rendering
- Analytics, telemetry, and deployment
- Dark mode

## Acceptance Criteria

1. Expanded history sidebar and collapsed desktop rail are both keyboard operable.
2. The empty-state composer renders at 50px tall at 1280px and does not exceed 52px before typing.
3. The main empty state contains no dashboard grid or nested cards.
4. A likely question can enter the mock conversation flow without a backend.
5. The mock answer demonstrates exact official-source links and one structured schedule result.
6. The layout has no horizontal overflow at the four declared viewports.
7. All tests, lint, type checking, and production build pass.
8. Browser screenshots are reviewed for line breaks, footer collisions, focus visibility, and mobile drawer behavior.

