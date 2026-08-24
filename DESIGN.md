# BuzzBot Design System

## Direction

BuzzBot is a restrained Georgia Tech-native chat product. The default scene is a student checking a consequential campus question on a laptop between classes, under normal ambient light. The default theme is therefore light and calm; dark mode may be added through Settings when personalization is implemented.

The layout borrows the proven conversation flow of modern chat products without copying their identity: an expandable history sidebar, a quiet main canvas, a compact single-line composer, and likely questions beneath it. Georgia Tech identity comes from navy ink, gold actions, the Diploma surface, typography, and official-source language.

## Color

Use a restrained strategy. The main canvas is near-neutral, the sidebar carries the warm institutional surface, navy provides primary ink and actions, and gold is limited to focus, source, and selected states.

```css
:root {
  --color-gt-gold: oklch(67.2% 0.092 80.9);       /* #B39051 */
  --color-gt-dark-gold: oklch(56.6% 0.079 79.8);  /* #8F713D */
  --color-gt-navy: oklch(23.3% 0.061 252.8);      /* #051E39 */
  --color-gt-diploma: oklch(97.1% 0.023 98.6);    /* #F9F6E5 */
  --color-canvas: oklch(98.5% 0.004 91.4);        /* #FBFAF7 */
  --color-ink: oklch(27.6% 0.023 248.7);          /* #1F2933 */
  --color-muted: oklch(45.7% 0.006 228.9);        /* #54585A */
  --color-border: oklch(87.3% 0.014 88.7);        /* #D9D5CB */
  --color-success: oklch(49.0% 0.085 158.4);      /* #2F6F4E */
  --color-danger: oklch(49.8% 0.139 23.7);        /* #A33A3A */
}
```

Do not use bright gold for small text on the light canvas. Use dark gold for source links and gold for selected or active surfaces.

## Typography

- UI, chat, controls, and data: Roboto via `next/font/google`.
- Empty-state statement only: Roboto Condensed, weight 500 or 600.
- Maximum families in PR1: two.
- Empty-state title: 32px desktop, 28px mobile, line height 1.15.
- Body: 16px, line height 1.6, maximum 72ch.
- Labels and metadata: 12–13px, never all-caps sentences.

Apply the following to both titles and body copy:

```css
body,
h1,
h2,
h3,
.big-statement,
.cjk-display {
  word-break: keep-all;
  overflow-wrap: normal;
}
```

Use `text-wrap: balance` on headings and `text-wrap: pretty` on prose. Manual line breaks are allowed only at complete phrase boundaries.

## Layout

- Expanded sidebar: 260px.
- Collapsed desktop rail: 56px.
- Main top bar: 52px.
- Conversation and composer maximum width: 768px.
- Empty-state composer: 50px tall, 15px radius.
- Desktop empty-state group: optically centered slightly above the viewport midpoint.
- Main canvas: `--color-canvas`.
- Sidebar: `--color-gt-diploma` with one light editorial rule at its right edge.
- Mobile below 768px: sidebar becomes an off-canvas drawer; no persistent collapsed rail.

The main empty state has exactly three zones: the question, composer, and likely-question list. Suggestions are text rows separated by editorial rules, not cards.

## Components

### Sidebar

Expanded mode contains BuzzBot wordmark, collapse action, New chat, Search chats, grouped history, Settings, and account identity. Collapsed mode contains only recognizable actions with tooltips. The toggle exposes `aria-expanded` and the mobile drawer uses a native backdrop button and focus-safe close action.

### Composer

The composer begins as a single 50px row. It may grow with multiline input after the user types, up to 160px, but the empty-state footprint stays compact. Enter submits; Shift+Enter inserts a line break. The send action is disabled when the input is empty.

### Conversation

User messages use a small warm-neutral bubble. Assistant answers are document blocks without a surrounding chat bubble. Structured schedule facts use a responsive table on desktop and labeled rows on mobile.

### Evidence

Citations are exact links to official sources. Source authority, document title, and freshness appear next to the answer they support. Source links use dark gold and preserve a visible keyboard focus state.

### Thinking

Use a short gold rule followed by “Thinking”. No spinner, waveform, fake progress, or modal. The indicator uses `role="status"` and `aria-live="polite"`; its scale animation is disabled for reduced-motion users.

## Interaction & Motion

- Sidebar width and drawer movement: 180ms, ease-out-quart.
- Hover and focus transitions: 150ms.
- No decorative page-load sequence.
- No content is hidden by default waiting for JavaScript animation.
- Reduced-motion mode removes movement while retaining instant state changes.

## Editorial Rules

- One strong idea per surface.
- Maximum two primary text zones in the main canvas.
- Use borders as printed rules rather than card chrome.
- Never pair a 1px border with a wide soft shadow. The composer may use one crisp 3px offset shadow.
- Cards and surfaces top out at 16px radius; full-pill treatment is reserved for compact buttons or tags.
- Do not use gradient text, glassmorphism, decorative stripes, or repeated section eyebrows.

