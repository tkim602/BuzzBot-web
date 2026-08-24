# BuzzBot Web Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality, frontend-only BuzzBot chat shell with a collapsible history sidebar, compact empty-state composer, representative evidence-rich mock answers, and responsive mobile behavior.

**Architecture:** Use a single Next.js App Router page with client-side prototype state owned by `BuzzBotApp`. Focused child components receive serializable data and callbacks; no global store, API client, authentication, or persistence is introduced. Native CSS Modules implement the approved GT design system, and the mock interaction follows the same state boundaries that the backend integration can replace in a separate PR.

**Tech Stack:** Next.js 16, React 19, TypeScript, native CSS Modules, `next/font`, Lucide React, Vitest, Testing Library, and Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-buzzbot-web-shell-design.md`

## Global Constraints

- PR1 is frontend-only; do not add a backend URL, fetch call, SSE client, authentication, analytics, or persisted history.
- Expanded desktop sidebar is exactly `260px`; collapsed desktop rail is exactly `56px`.
- Main top bar is `52px`; the untouched empty-state composer is exactly `50px` and must not exceed `52px`.
- Conversation and composer width is at most `768px`.
- Below `768px`, the sidebar is an overlay drawer and no collapsed rail remains in document flow.
- Use only Roboto and Roboto Condensed through `next/font/google`.
- Apply `word-break: keep-all` and `overflow-wrap: normal` to body copy and titles.
- Meet WCAG 2.2 AA contrast, preserve visible focus, expose icon-button names, and respect `prefers-reduced-motion`.
- Use native CSS and HTML controls. Do not add Tailwind, shadcn, Radix, a state library, a markdown package, or an animation library.
- Settings is visible as a disabled preview location with an accessible explanation; personalization behavior is outside PR1.
- Do not use robots, microphones, waveforms, honeycomb decoration, gradients, glass effects, nested cards, or generic AI copy.

---

## File Map

```text
BuzzBot-web/
├── src/
│   ├── app/
│   │   ├── globals.css                 # reset, tokens, fonts, focus, reduced motion
│   │   ├── layout.tsx                  # metadata and next/font variables
│   │   └── page.tsx                    # renders BuzzBotApp only
│   └── components/buzzbot/
│       ├── BuzzBotApp.tsx              # prototype state and mock transition
│       ├── Sidebar.tsx                 # desktop rail and mobile drawer content
│       ├── ChatWorkspace.tsx           # empty state, thread, and composer placement
│       ├── Evidence.tsx                # citations and responsive schedule result
│       ├── mock-data.ts                # typed history, suggestions, and mock answer
│       └── buzzbot.module.css          # shell, components, breakpoints, state styling
├── tests/
│   ├── design-contract.test.ts         # token and global typography contract
│   ├── sidebar.test.tsx                # expand/collapse and accessible controls
│   ├── chat-workspace.test.tsx         # composer and likely-question behavior
│   └── buzzbot-app.test.tsx            # end-to-end mock state transition in jsdom
├── e2e/
│   └── shell.spec.ts                   # desktop/mobile layout and screenshots
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── vitest.config.ts
└── vitest.setup.ts
```

---

### Task 1: Establish the Next.js foundation and token contract

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `tests/design-contract.test.ts`

**Interfaces:**
- Produces: CSS variables `--sidebar-expanded`, `--sidebar-collapsed`, `--workspace-width`, `--composer-height`, `--color-gt-navy`, `--color-gt-gold`, `--color-gt-dark-gold`, `--color-gt-diploma`, `--color-canvas`, `--color-ink`, `--color-muted`, and `--color-border`.
- Produces: font variables `--font-roboto` and `--font-roboto-condensed` on `<body>`.
- Consumes: no application code.

- [ ] **Step 1: Create the minimal package and tool configuration**

Use Node `>=20.9.0` and these scripts:

```json
{
  "name": "buzzbot-web",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=20.9.0" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "verify": "npm run lint && npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "lucide-react": "1.34.0",
    "next": "16.3.2",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "@testing-library/dom": "10.4.1",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.2",
    "@types/node": "^24.0.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "@vitejs/plugin-react": "6.1.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "16.3.2",
    "jsdom": "30.0.1",
    "typescript": "^5.9.0",
    "vite": "8.2.2",
    "vitest": "4.1.11"
  }
}
```

Run: `npm install`

Expected: `package-lock.json` is created and `npm audit` reports no unresolved high or critical production vulnerability. If npm reports one, stop and inspect the advisory before changing versions.

Create the tool configuration exactly as follows:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", "coverage/**", "playwright-report/**", "test-results/**"]),
]);
```

```ts
// vitest.config.ts
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Write the failing design contract test**

```ts
// tests/design-contract.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve("src/app/globals.css"), "utf8");

describe("BuzzBot design contract", () => {
  it("freezes the approved shell dimensions", () => {
    expect(css).toContain("--sidebar-expanded: 260px");
    expect(css).toContain("--sidebar-collapsed: 56px");
    expect(css).toContain("--workspace-width: 768px");
    expect(css).toContain("--composer-height: 50px");
  });

  it("protects phrase boundaries in titles and body copy", () => {
    expect(css).toMatch(/body,[\s\S]*h1,[\s\S]*h2,[\s\S]*h3[\s\S]*word-break:\s*keep-all/);
    expect(css).toMatch(/overflow-wrap:\s*normal/);
  });
});
```

- [ ] **Step 3: Run the contract test and verify RED**

Run: `npm test -- tests/design-contract.test.ts`

Expected: FAIL because `src/app/globals.css` does not yet contain the approved tokens.

- [ ] **Step 4: Add fonts, metadata, reset, and exact tokens**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Roboto, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-roboto-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BuzzBot",
  description: "Georgia Tech student information with official sources.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${robotoCondensed.variable}`}>{children}</body>
    </html>
  );
}
```

Use this complete global contract:

```css
/* src/app/globals.css */
:root {
  --sidebar-expanded: 260px;
  --sidebar-collapsed: 56px;
  --workspace-width: 768px;
  --composer-height: 50px;
  --color-gt-gold: oklch(67.2% 0.092 80.9);
  --color-gt-dark-gold: oklch(56.6% 0.079 79.8);
  --color-gt-navy: oklch(23.3% 0.061 252.8);
  --color-gt-diploma: oklch(97.1% 0.023 98.6);
  --color-canvas: oklch(98.5% 0.004 91.4);
  --color-ink: oklch(27.6% 0.023 248.7);
  --color-muted: oklch(45.7% 0.006 228.9);
  --color-border: oklch(87.3% 0.014 88.7);
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  min-height: 100dvh;
  margin: 0;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-family: var(--font-roboto), sans-serif;
}

body,
h1,
h2,
h3,
.big-statement,
.cjk-display {
  word-break: keep-all;
  overflow-wrap: normal;
}

h1,
h2,
h3 {
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}

button,
textarea {
  color: inherit;
  font: inherit;
}

button:focus-visible,
textarea:focus-visible,
a:focus-visible {
  outline: 3px solid var(--color-gt-dark-gold);
  outline-offset: 2px;
}
```

Create a temporary `src/app/page.tsx` that renders `<main>BuzzBot</main>` so type checking and build have a valid route. Task 4 replaces its contents.

- [ ] **Step 5: Verify GREEN and the production toolchain**

Run: `npm test -- tests/design-contract.test.ts && npm run lint && npm run typecheck && npm run build`

Expected: 2 tests pass, lint exits 0, type checking exits 0, and Next.js produces the `/` route.

- [ ] **Step 6: Commit the foundation**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts vitest.setup.ts src/app tests/design-contract.test.ts
git commit -m "build: initialize BuzzBot web frontend"
```

---

### Task 2: Build the accessible collapsible sidebar

**Files:**
- Create: `src/components/buzzbot/mock-data.ts`
- Create: `src/components/buzzbot/Sidebar.tsx`
- Create: `src/components/buzzbot/buzzbot.module.css`
- Create: `tests/sidebar.test.tsx`

**Interfaces:**
- Produces: `ChatHistoryGroup`, `SourceCitation`, `ScheduleSection`, and `MockAnswer` types from `mock-data.ts`.
- Produces: `HISTORY_GROUPS`, `SUGGESTIONS`, and `MOCK_ANSWER` immutable mock fixtures.
- Produces: `Sidebar({ collapsed, mobileOpen, onToggle, onClose }: SidebarProps)`.
- Consumes: global CSS tokens from Task 1.

- [ ] **Step 1: Add typed, official-looking mock fixtures without backend assumptions**

```ts
// src/components/buzzbot/mock-data.ts
export type ChatHistoryGroup = {
  label: string;
  conversations: readonly string[];
};

export type SourceCitation = {
  id: number;
  title: string;
  url: string;
  authority: "Official source" | "Structured schedule data";
};

export type ScheduleSection = {
  crn: string;
  section: string;
  days: string;
  time: string;
  instructor: string;
};

export type MockAnswer = {
  question: string;
  answer: string;
  course: { code: string; title: string; term: string };
  sections: readonly ScheduleSection[];
  sources: readonly SourceCitation[];
  freshAsOf: string;
};

export const HISTORY_GROUPS: readonly ChatHistoryGroup[] = [
  { label: "Today", conversations: ["CS 6601 Fall schedule", "Registration dates"] },
  {
    label: "Previous 7 days",
    conversations: ["OMSCS graduation requirements", "First-year recommendations"],
  },
];

export const SUGGESTIONS = [
  "Which CS courses are offered in Fall 2026?",
  "When is the withdrawal deadline?",
  "What does OMSCS require for graduation?",
] as const;

export const MOCK_ANSWER: MockAnswer = {
  question: SUGGESTIONS[0],
  answer: "Yes. CS 6601 has published sections for Fall 2026. Review the section details below and verify the current listing before registering.",
  course: { code: "CS 6601", title: "Artificial Intelligence", term: "Fall 2026" },
  sections: [
    { crn: "12345", section: "A", days: "M W", time: "3:30–4:45 PM", instructor: "Staff" },
    { crn: "12346", section: "O01", days: "Online", time: "Asynchronous", instructor: "Staff" },
  ],
  sources: [
    {
      id: 1,
      title: "Georgia Tech OSCAR",
      url: "https://oscar.gatech.edu/",
      authority: "Structured schedule data",
    },
    {
      id: 2,
      title: "Georgia Tech Catalog",
      url: "https://catalog.gatech.edu/coursesaz/cs/",
      authority: "Official source",
    },
  ],
  freshAsOf: "August 24, 2026",
};
```

- [ ] **Step 2: Write the failing sidebar behavior test**

```tsx
// tests/sidebar.test.tsx
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "@/components/buzzbot/Sidebar";

function SidebarHarness() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Sidebar
      collapsed={collapsed}
      mobileOpen={false}
      onToggle={() => setCollapsed((value) => !value)}
      onClose={() => undefined}
    />
  );
}

describe("Sidebar", () => {
  it("collapses history while preserving named primary actions", () => {
    render(<SidebarHarness />);

    expect(screen.getByText("CS 6601 Fall schedule")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.queryByText("CS 6601 Fall schedule")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "New chat" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Search chats" })).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the sidebar test and verify RED**

Run: `npm test -- tests/sidebar.test.tsx`

Expected: FAIL because `Sidebar` does not exist.

- [ ] **Step 4: Implement the controlled sidebar**

`Sidebar.tsx` must:

- render an `aside` with `id="buzzbot-sidebar"`;
- use semantic `nav` elements for primary actions and history;
- conditionally omit history text and account copy when `collapsed` is true;
- expose `aria-expanded={!collapsed}` and `aria-controls="buzzbot-sidebar"` on the toggle;
- render 44px icon buttons using Lucide `PanelLeftClose`, `PanelLeftOpen`, `SquarePen`, `Search`, and `Settings`;
- render Settings as a disabled button with `aria-label="Settings, available after account integration"`;
- apply `data-collapsed` and `data-mobile-open` attributes for CSS, without reading viewport width in JavaScript;
- call `onClose` from a visible mobile close button.

Use CSS grid rows `auto auto 1fr auto`, width tokens from Task 1, a single right border, no cards, and a 180ms width transition. Add the reduced-motion override in the same module.

- [ ] **Step 5: Verify sidebar behavior and existing tests**

Run: `npm test -- tests/sidebar.test.tsx tests/design-contract.test.ts && npm run lint && npm run typecheck`

Expected: 3 tests pass and static checks exit 0.

- [ ] **Step 6: Commit the sidebar**

```bash
git add src/components/buzzbot tests/sidebar.test.tsx
git commit -m "feat: add collapsible chat history sidebar"
```

---

### Task 3: Build the compact empty state and composer

**Files:**
- Create: `src/components/buzzbot/ChatWorkspace.tsx`
- Modify: `src/components/buzzbot/buzzbot.module.css`
- Create: `tests/chat-workspace.test.tsx`

**Interfaces:**
- Produces: `Composer({ value, onChange, onSubmit }: ComposerProps)` inside `ChatWorkspace.tsx`.
- Produces: `EmptyChat({ suggestions, onSelect }: EmptyChatProps)` inside `ChatWorkspace.tsx`.
- Produces: `ChatWorkspace({ phase, question, input, onInputChange, onSubmit }: ChatWorkspaceProps)`.
- Consumes: `SUGGESTIONS`, `MockAnswer`, and CSS tokens.

- [ ] **Step 1: Write failing tests for the compact composer and likely questions**

```tsx
// tests/chat-workspace.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatWorkspace } from "@/components/buzzbot/ChatWorkspace";
import { SUGGESTIONS } from "@/components/buzzbot/mock-data";

describe("ChatWorkspace", () => {
  it("shows one simple empty-state idea and submits a likely question", () => {
    const onSubmit = vi.fn();
    render(
      <ChatWorkspace
        phase="empty"
        question=""
        input=""
        onInputChange={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("heading", { name: "What can I help you with at Tech?" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Ask:/ })).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: "Message BuzzBot" })).toHaveAttribute("rows", "1");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: `Ask: ${SUGGESTIONS[0]}` }));
    expect(onSubmit).toHaveBeenCalledWith(SUGGESTIONS[0]);
  });

  it("submits Enter but preserves Shift+Enter for a line break", () => {
    const onSubmit = vi.fn();
    render(
      <ChatWorkspace
        phase="empty"
        question=""
        input="When is registration?"
        onInputChange={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    const textbox = screen.getByRole("textbox", { name: "Message BuzzBot" });
    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith("When is registration?");
  });
});
```

- [ ] **Step 2: Run the workspace tests and verify RED**

Run: `npm test -- tests/chat-workspace.test.tsx`

Expected: FAIL because `ChatWorkspace` does not exist.

- [ ] **Step 3: Implement the empty state and native form behavior**

Use this public contract:

```ts
export type ChatPhase = "empty" | "thinking" | "answer";

export type ChatWorkspaceProps = {
  phase: ChatPhase;
  question: string;
  input: string;
  onInputChange(value: string): void;
  onSubmit(question: string): void;
};
```

The form submit handler trims the value and refuses an empty string. `keydown` handles only unmodified Enter; Shift+Enter remains native textarea behavior. Suggestion buttons call `onSubmit` directly and are rendered as border-separated rows, not cards.

The CSS must use `height: var(--composer-height)` and `min-height: var(--composer-height)` for the untouched textarea container. The textarea starts at `rows={1}`, has no resize handle, and may grow to `max-height: 160px` after text wraps. Use a 15px container radius and one crisp `3px 3px 0` offset shadow with no blur.

- [ ] **Step 4: Verify empty-state behavior and typography contracts**

Run: `npm test -- tests/chat-workspace.test.tsx tests/design-contract.test.ts && npm run lint && npm run typecheck`

Expected: 4 tests pass and static checks exit 0.

- [ ] **Step 5: Commit the empty chat**

```bash
git add src/components/buzzbot/ChatWorkspace.tsx src/components/buzzbot/buzzbot.module.css tests/chat-workspace.test.tsx
git commit -m "feat: add compact BuzzBot empty chat"
```

---

### Task 4: Wire the shell and representative mock answer states

**Files:**
- Create: `src/components/buzzbot/Evidence.tsx`
- Create: `src/components/buzzbot/BuzzBotApp.tsx`
- Modify: `src/components/buzzbot/ChatWorkspace.tsx`
- Modify: `src/components/buzzbot/buzzbot.module.css`
- Modify: `src/app/page.tsx`
- Create: `tests/buzzbot-app.test.tsx`

**Interfaces:**
- Produces: `SourceList({ sources }: { sources: readonly SourceCitation[] })`.
- Produces: `ScheduleResult({ answer }: { answer: MockAnswer })`.
- Produces: `BuzzBotApp()` as the only page-level client component.
- Consumes: all components and fixtures from Tasks 2 and 3.

- [ ] **Step 1: Write the failing mock-flow test**

```tsx
// tests/buzzbot-app.test.tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuzzBotApp } from "@/components/buzzbot/BuzzBotApp";
import { MOCK_ANSWER, SUGGESTIONS } from "@/components/buzzbot/mock-data";

describe("BuzzBotApp", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("moves from question to thinking to an evidence-rich mock answer", async () => {
    render(<BuzzBotApp />);
    fireEvent.click(screen.getByRole("button", { name: `Ask: ${SUGGESTIONS[0]}` }));

    expect(screen.getByText(SUGGESTIONS[0])).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");

    await act(async () => vi.advanceTimersByTimeAsync(650));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(MOCK_ANSWER.answer)).toBeVisible();
    expect(screen.getByRole("heading", { name: /CS 6601.*Artificial Intelligence/ })).toBeVisible();
    expect(screen.getByRole("link", { name: "Georgia Tech OSCAR" })).toHaveAttribute(
      "href",
      "https://oscar.gatech.edu/",
    );
  });
});
```

- [ ] **Step 2: Run the app test and verify RED**

Run: `npm test -- tests/buzzbot-app.test.tsx`

Expected: FAIL because `BuzzBotApp` and evidence components do not exist.

- [ ] **Step 3: Implement the single owner for prototype state**

`BuzzBotApp.tsx` begins with `"use client"` and owns exactly these values:

```ts
const [collapsed, setCollapsed] = useState(false);
const [mobileOpen, setMobileOpen] = useState(false);
const [phase, setPhase] = useState<ChatPhase>("empty");
const [question, setQuestion] = useState("");
const [input, setInput] = useState("");
```

`submitQuestion` trims its argument, stores it, clears the input, and sets `phase` to `"thinking"`. A `useEffect` starts one 650ms timeout only while thinking and clears it on unmount; the timeout changes the phase to `"answer"`. `New chat` resets phase, question, and input. No random delay, network call, global context, or storage is permitted.

The application renders a skip link, `Sidebar`, and `ChatWorkspace` inside one full-height shell. `src/app/page.tsx` contains only:

```tsx
import { BuzzBotApp } from "@/components/buzzbot/BuzzBotApp";

export default function Home() {
  return <BuzzBotApp />;
}
```

- [ ] **Step 4: Add evidence, schedule, and thinking presentation**

`Evidence.tsx` renders citations as external links with `target="_blank"` and `rel="noreferrer"`, retains the authority label, and shows `Data as of August 24, 2026`. `ScheduleResult` uses semantic table markup on desktop with headings CRN, Section, Days, Time, and Instructor. Each cell receives a `data-label` matching its column so the CSS can render labeled rows below 600px.

`ChatWorkspace` renders:

- the user question in a compact warm-neutral bubble;
- a `role="status" aria-live="polite"` Thinking row while `phase === "thinking"`;
- the transparent assistant document block, `ScheduleResult`, and `SourceList` while `phase === "answer"`;
- the composer as a sticky bottom element in both conversation states.

The Thinking mark is a 24px gold rule with a scale animation. Reduced motion keeps the rule static.

- [ ] **Step 5: Verify the mock flow and full unit suite**

Run: `npm test && npm run lint && npm run typecheck && npm run build`

Expected: all unit tests pass, static checks exit 0, and `/` builds successfully.

- [ ] **Step 6: Commit the complete mock shell**

```bash
git add src/app/page.tsx src/components/buzzbot tests/buzzbot-app.test.tsx
git commit -m "feat: add evidence-rich mock conversation"
```

---

### Task 5: Prove responsive, accessible, and visual behavior

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/shell.spec.ts`
- Modify: `src/components/buzzbot/buzzbot.module.css`
- Create: `README.md`

**Interfaces:**
- Consumes: the completed `/` route and accessible names defined in Tasks 2–4.
- Produces: deterministic desktop and mobile screenshots and one `npm run verify` handoff command.

- [ ] **Step 1: Write failing browser checks before responsive fixes**

```ts
// e2e/shell.spec.ts
import { expect, test } from "@playwright/test";

test("desktop sidebar collapses and the untouched composer stays compact", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const sidebar = page.getByRole("complementary", { name: "Chat sidebar" });
  await expect(sidebar).toHaveCSS("width", "260px");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveCSS("width", "56px");

  const composer = page.getByRole("form", { name: "Message BuzzBot" });
  const box = await composer.boundingBox();
  expect(box?.height).toBeLessThanOrEqual(52);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280);
  await expect(page).toHaveScreenshot("buzzbot-desktop.png", { fullPage: true });
});

test("mobile uses a drawer and preserves phrase-safe layout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.getByRole("complementary", { name: "Chat sidebar" })).toBeHidden();
  await page.getByRole("button", { name: "Open sidebar" }).click();
  await expect(page.getByRole("complementary", { name: "Chat sidebar" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "Chat sidebar" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await expect(page).toHaveScreenshot("buzzbot-mobile.png", { fullPage: true });
});
```

Configure Playwright with Chromium only and a reusable local server:

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Run Playwright and verify RED**

Run: `npx playwright install chromium && npm run test:e2e`

Expected: at least one failure in drawer behavior, width, overflow, or missing screenshot baseline.

- [ ] **Step 3: Complete the responsive CSS and mobile drawer behavior**

At `max-width: 767px`:

- fix the sidebar to the left viewport edge with `width: min(320px, calc(100vw - 48px))`;
- use `transform: translateX(-100%)` when closed and `translateX(0)` when open;
- render a fixed full-viewport backdrop behind the open drawer;
- remove the desktop rail from layout flow;
- keep the main canvas width at 100%;
- set interactive targets to at least 44px;
- keep the composer at `width: calc(100% - 32px)`;
- stack schedule rows with visible `data-label` values below 600px.

`BuzzBotApp` listens for Escape only while the mobile drawer is open and returns focus to the Open sidebar button after closing. The desktop media query remains purely CSS-driven; do not attach a resize event listener.

- [ ] **Step 4: Generate and inspect screenshot baselines**

Run: `npm run test:e2e -- --update-snapshots`

Inspect both PNGs and reject the baseline if any of these appear:

- title wraps to three lines;
- a Korean or Japanese phrase breaks inside a word;
- composer exceeds 52px before typing;
- drawer or table creates horizontal overflow;
- trust note collides with the composer or viewport edge;
- selected, hover, or focus state loses 4.5:1 text contrast;
- assistant citations are separated from the claim they support.

After inspection, run: `npm run test:e2e`

Expected: both browser tests pass against committed baselines.

- [ ] **Step 5: Add the concise repository handoff**

`README.md` must include:

````markdown
# BuzzBot Web

Frontend for BuzzBot, a Georgia Tech student assistant grounded in official sources.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Verification

```bash
npm run verify
npm run test:e2e
```

This first frontend milestone uses representative local data. It does not call the BuzzBot backend.
````

- [ ] **Step 6: Run final verification from a clean dependency install**

Run:

```bash
npm ci
npm run verify
npm run test:e2e
git diff --check
git status --short
```

Expected: install succeeds from the lockfile; lint, type checking, unit tests, production build, and Playwright pass; `git diff --check` is silent; only intentional source, test, screenshot, and documentation files are modified.

- [ ] **Step 7: Commit the verified frontend shell**

```bash
git add README.md playwright.config.ts e2e src/components/buzzbot/buzzbot.module.css
git commit -m "test: verify responsive BuzzBot shell"
```

---

## PR1 Exit Checklist

- [ ] The empty state has one heading, one compact composer, and three likely questions.
- [ ] Desktop sidebar switches between 260px and 56px without shifting content outside the viewport.
- [ ] Mobile sidebar is an accessible drawer and closes via button, backdrop, and Escape.
- [ ] Chat history and Settings never compete with the main conversation canvas.
- [ ] Mock thinking, answer, citation, and schedule states are reviewable without backend access.
- [ ] GT identity is visible through the approved palette and typography, not decorative AI imagery.
- [ ] English, Korean, and Japanese text preserve phrase boundaries.
- [ ] Unit tests, Playwright, lint, type checking, build, and `git diff --check` all pass.
- [ ] No backend, authentication, persistence, personalization, dark mode, or streaming code is present.
