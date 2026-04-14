---
title: fz.ax · The Living Practice
status: draft
date: 2026-04-13
author: brainstorm session
---

# fz.ax · The Living Practice

> ⬢⏣⬡ a memento mori you participate in ⬡⏣⬢

## Vision

Today fz.ax is a single-page Nuxt app that draws 4,000 hexagons — past, present, future — and asks for your date of birth. It is beautiful and silent. You look at it, and then you close the tab.

This spec turns fz.ax into a **living practice**: a private, local-first, account-less weekly ritual you return to. You can mark each week with a single character (The Mark), whisper one sentence to it (The Whisper), be reminded of past weeks on their anniversary (The Echo, The Anniversary), witness the ceremony of the week changing (Monday Ceremony), and write a sealed letter to your future self each year (The Annual Letter). The page reads itself differently when you notice the long-now footer.

The rule across every feature: **one person, alone, looking at their own life.** No accounts, no cloud, no analytics, no social, no friction.

## Soul (non-negotiables)

These are the things this upgrade will not compromise:

1. **Local-first only.** Everything lives in `localStorage`. No accounts. No backend. No cloud sync. No telemetry. No analytics. No third-party scripts.
2. **One page, one purpose.** fz.ax remains a single contemplative surface. Every new feature must fit on the same page or appear as a small modal or popover. No multi-page navigation. No dashboards.
3. **The aesthetic is sacred.** Yellow `#F7B808` and blue `#0847F7` stay the primary palette. Hexagonal symbols `⬢ ⏣ ⬡` stay the symbolic vocabulary. The cryptic crypto/web3 voice (`d⬡b`, `4⬢⏣⬡`, `ngmi`/`wagmi`/`beherenow`) stays.
4. **The constraint is the feature.** The Mark is exactly one character. The Whisper is exactly one sentence. The Vow is exactly one sentence. The Annual Letter is exactly one paragraph. Compression is the practice.
5. **Easter eggs are protected and extended.** The ASCII hexagon comment in the page source stays. New eggs are added.
6. **Static-only deploy.** The site is built with `nuxt generate` and served from GitHub Pages. No SSR. No serverless. No edge functions.

## Audience

A single user, on their own device, returning over months and years. They are reflective, compressionist, possibly tired of productivity tools, and possibly fond of typography. They install fz.ax to their phone home screen and look at it most mornings for a few seconds. They mark a week roughly twice a month. They write a Sunday whisper roughly half the time. They write the annual letter once. They show fz.ax to almost no one.

## Feature inventory

Features are grouped by tier. **All tiers are in scope for this redesign.** The tiers describe the layering of the work, not what is or isn't included.

### Tier 0 — Core (the spine)

| ID | Feature | Description |
|---|---|---|
| F0.1 | The Mark | Each week can hold exactly one character (any Unicode codepoint). Click a hexagon → popover opens → choose from your personal palette or type a new character. Saved to `localStorage` immediately. |
| F0.2 | The Personal Palette | Your most-used Marks appear in the popover as a one-tap palette. The palette is derived from usage frequency and grows automatically. You only ever type a character the first time you use it. |
| F0.3 | The Whisper | Each marked week can also hold exactly one sentence. Edited in the same popover as the Mark. Visible only on hover (desktop) or long-press (touch). |
| F0.4 | Hexagon glyph rules | `⬢` past, `⏣` current, `⬡` future. Marked weeks display the Mark glyph instead of the past/future glyph, in yellow. The current week always uses `⏣` regardless of whether it is marked. |

### Tier 1 — Rituals & living layer (v1 expansion)

| ID | Feature | Description |
|---|---|---|
| F1.1 | Sunday Whisper ritual | On the user's local Sunday (any time after 18:00 local), a quiet modal appears once, asking: *"what do you want to remember about this week?"* Tied to the current week's Mark + Whisper. Dismissable. Reappears next Sunday. |
| F1.2 | The Library | A rotating curated list of memento mori quotes appears in faint italic text below the grid. New quote each week (deterministic by week-of-year + DOB hash). |
| F1.3 | The Echo (serendipity) | On each page load, one random past Mark with a Whisper is briefly resurfaced as a banner: *"⌁ echo · {date} · {whisper}"*. Dismisses on click or after 8 seconds. |
| F1.4 | Poster export (SVG) | Generate a printable SVG poster of the user's life-as-hexagons, with all Marks baked in. Client-side only. Triggered from the toolbar. Saved as `fz-ax-{date}.svg`. |
| F1.5 | JSON backup / restore | Export the entire `localStorage` state as a single `.json` file. Re-import the same file on any device to restore. |
| F1.6 | Installable PWA + offline | Complete the manifest story. Service worker pre-caches the app shell. Works fully offline. Installable on iOS / Android / desktop. |
| F1.7 | Sunday Push notification | If installed as PWA, the service worker schedules a local notification for Sunday 21:00 local time: *"⏣ this week is closing — what do you want to remember about it?"* Opt-in. No backend involved. |
| F1.8 | Easter eggs preserved + extended | The existing ASCII hexagon comment stays in the page source. One new egg is added: a key sequence (`fz` typed in quick succession) reveals a hidden quote. |
| F1.9 | Code refactor | Migrate from a single 430-line `app.vue` to TypeScript, composables, split components, and a small Vitest suite for the time math. |

### Tier 2 — The calendar of rituals

| ID | Feature | Description |
|---|---|---|
| F2.1 | The Vow | A single sentence shown in tiny script under the title. The user's intent for the year. Edited via a small "edit vow" affordance in the popover or via keyboard `V`. |
| F2.2 | Monday Ceremony | At local Monday 00:00, the previous current `⏣` becomes `⬢` and the new current `⏣` is born — with a brief, dignified animation (~1.2s). If the user has the page open at that moment, they witness it. The first time they open the page after a Monday transition, a small one-line notice appears: *"a week passed."* |
| F2.3 | Constellation Lines | When the user clicks (or focuses) a marked week, every other week with the *same Mark glyph* lights up across the entire grid. Press Escape or click empty space to dismiss. |
| F2.4 | Anniversary Echo | On page load, if there are Marks/Whispers on the same calendar-week-of-year as the current week from previous years, surface them as anniversary banners: *"⌁ this week, {N} year(s) ago: '{whisper}'"*. Up to 3 lines. |
| F2.5 | Solstice / Equinox treatment | On the four astronomical mile-marker days (vernal equinox, summer solstice, autumnal equinox, winter solstice), the page transforms briefly: dark background, a longer quote from a curated solstice library, a different border. Lasts 24 hours then reverts. |
| F2.6 | Quiet Mode | Pressing `Q` strips title, subtitle, library, toolbar — leaving just the hexagons edge to edge. Press `Q` again or Escape to return. |
| F2.7 | Whisper Search | Pressing `/` opens a small search input. Typed text matches against all Whispers; matching weeks light up; non-matching weeks dim. Escape clears. |
| F2.8 | The Long Now footer | A small line at the foot of the page: *"02026 · the long now"* — using the Long Now Foundation 5-digit year notation. The leading zero is shown in yellow as a quiet typographic accent. |
| F2.9 | Anchored Weeks | Right-click (or long-press on touch) any week to *anchor* it as a life landmark. Anchored weeks display a tiny red dot. Anchors float to the top of Whisper Search results. Anchors are also shown in the Poster export with their own typographic treatment. |

### Tier 3 — The final dreams

| ID | Feature | Description |
|---|---|---|
| F3.1 | First Run Ceremony | Replace the bare DOB modal with three slow, dignified screens (3-4 seconds each, advance on click): (1) *"the average human life is four-thousand weeks."* (2) *"this page is a quiet place to notice them."* (3) *"when did you arrive?"* — and only then, the date input. |
| F3.2 | Birthday Hexagon | Each year, the week containing the user's birthday gets a thin gold halo (a circular border + glow). 77 birthday weeks across 4,000. They become the natural year-pulse markers across the grid. |
| F3.3 | The Annual Letter | Once per year, on the week of the user's birthday, a quiet modal appears: *"write a paragraph to yourself, one year from now."* Sealed (not visible) until exactly 365 days later, when it auto-reveals on opening the page. The most personal feature in the app. |
| F3.4 | Dark Mode | Designed (not inverted) dark variant. Yellow stays gold. Blue becomes electric (lighter shade). Background goes near-black. Auto-switches by `prefers-color-scheme`. Manual override stored in localStorage. |
| F3.5 | Keyboard navigation | Arrow keys move a focused hexagon cursor. `Enter` opens the Mark popover for the focused week. `/` opens search. `Q` toggles quiet. `V` edits vow. `?` shows a help overlay listing every shortcut. The whole grid is mouse-free. |

## Non-goals

These are explicitly out of scope. Listing them protects the soul of the project.

- **No user accounts.** Ever.
- **No cloud sync.** Backup is a JSON file the user manages themselves.
- **No analytics, telemetry, or tracking.** Not even privacy-respecting ones. None.
- **No social features.** No sharing of Marks or Whispers. No public profiles. No "friends." No hexagon-of-the-day. No leaderboard. No comments. No likes.
- **No third-party scripts.** No CDN-loaded fonts, no embedded widgets, no analytics, no chat, no support widgets.
- **No multi-page navigation.** No `/about`, no `/help`, no `/settings`. Help is a `?` overlay. Settings live in localStorage.
- **No SSR.** Pure static generation only.
- **No backend.** Not even a serverless function. Not even one.
- **No notifications beyond the local Sunday push.** No marketing, no engagement nudges, no streaks.
- **No gamification.** No badges. No points. No streaks. No completion percentage. No achievements.
- **No AI features.** No GPT-generated reflections. No suggested whispers. No auto-completion. The user writes their own life.
- **No paid tier, no upsell, no ads.**

## Data model

All state lives in `localStorage` under a single root key. The shape:

```ts
interface FzState {
  version: 1;
  dob: string;              // ISO date YYYY-MM-DD
  weeks: Record<number, WeekEntry>;  // sparse: only marked weeks present
  vow: VowEntry | null;
  letters: LetterEntry[];   // annual letters, sealed and unsealed
  anchors: number[];        // sorted week indices
  prefs: Preferences;
  meta: Meta;
}

interface WeekEntry {
  mark: string;             // single Unicode codepoint
  whisper?: string;         // free text, recommend ≤ 240 chars
  markedAt: string;         // ISO timestamp, last edit
}

interface VowEntry {
  text: string;
  writtenAt: string;        // ISO timestamp
}

interface LetterEntry {
  text: string;
  sealedAt: string;         // ISO timestamp when written
  unsealAt: string;         // ISO date YYYY-MM-DD when it becomes readable
  read: boolean;
}

interface Preferences {
  theme: 'auto' | 'light' | 'dark';
  pushOptIn: boolean;
  reducedMotion: boolean | 'auto';
  weekStart: 'mon' | 'sun';   // default 'mon'
}

interface Meta {
  createdAt: string;          // first run timestamp
  lastSundayPrompt?: string;  // ISO date of last shown Sunday modal
  lastMondayCeremony?: string; // ISO date of last witnessed week change
  lastEcho?: { week: number; shownAt: string };
  lastVisitedWeek?: number;   // for detecting "a week passed" since last open
  installedPwa?: boolean;
}
```

### Storage key

```
localStorage['fz.ax.state'] = JSON.stringify(FzState)
```

A migration helper reads the old single-key `dob` from `localStorage` (the existing v0 storage) and lifts it into the new `FzState` on first load.

### JSON backup format

The backup file is the literal `FzState` object serialized with 2-space indentation, plus a small wrapper:

```json
{
  "fzAxBackup": true,
  "exportedAt": "2026-04-13T12:00:00Z",
  "state": { ...FzState }
}
```

Re-import validates the wrapper, validates the inner `FzState` against the schema (with a tiny hand-written validator — no library dependency), and replaces `localStorage['fz.ax.state']`.

## Architecture

### Tech stack

- **Framework:** Nuxt 3, static generation only (`nuxt generate`).
- **Language:** TypeScript throughout. No `any` without an explicit justification comment.
- **State:** A single `useFzState` composable wrapping a reactive `FzState` object with localStorage persistence. No Pinia (one tiny app, one global state — a hand-rolled composable is simpler than adding a dependency, and Vitest can test it directly).
- **Date math:** A small handful of pure functions in a `composables/useTime.ts` file. Internal week math uses ISO 8601 weeks starting Monday by default. No date library — the math is small, well-defined, and we own it.
- **Testing:** Vitest. Tests cover the time math, the data-model migration, and the JSON backup round-trip. UI is not unit-tested; we rely on visual review.
- **Linting / formatting:** Existing `eslint` from Nuxt's template (or add it if missing). Prettier or biome for formatting.
- **Bundler:** Vite (Nuxt default).

### File structure

```
fz.ax/
├── app.vue                          # Becomes a thin shell that mounts <FzPage/>
├── pages/                           # Single page only
│   └── index.vue
├── components/
│   ├── FzPage.vue                   # Top-level layout (title, sub, grid, footer)
│   ├── FzTitle.vue                  # Title + subtitle + vow line
│   ├── FzGrid.vue                   # The 4000-hexagon grid + scroll behavior
│   ├── FzHexagon.vue                # A single hexagon (props: index, state, mark, anchor)
│   ├── FzMarkPopover.vue            # The click → mark + whisper popover
│   ├── FzToolbar.vue                # Sunday button, poster, backup, theme toggle
│   ├── FzLibrary.vue                # The rotating quote line below the grid
│   ├── FzEcho.vue                   # The Echo banner (random past)
│   ├── FzAnniversary.vue            # The "this week N years ago" banner
│   ├── FzSundayModal.vue            # Sunday Whisper ritual modal
│   ├── FzAnnualLetter.vue           # Annual Letter write + reveal modal
│   ├── FzFirstRun.vue               # Three-screen onboarding ceremony
│   ├── FzScrollHex.vue              # The scroll-to-top hexagon (existing)
│   ├── FzKeyboardHelp.vue           # The "?" shortcut overlay
│   ├── FzQuietBackdrop.vue          # The fullscreen quiet-mode shell
│   └── FzSearch.vue                 # The "/" search input + grid filter
├── composables/
│   ├── useFzState.ts                # The single global state composable
│   ├── useTime.ts                   # Pure week-math functions
│   ├── usePalette.ts                # Personal palette derivation from state
│   ├── useEcho.ts                   # Random-past selection logic
│   ├── useAnniversary.ts            # Anniversary detection logic
│   ├── useSolstice.ts               # Solstice / equinox detection
│   ├── useBirthday.ts               # Birthday-week detection
│   ├── useQuotes.ts                 # The Library + solstice quotes
│   ├── useTheme.ts                  # Light/dark switching
│   ├── usePwa.ts                    # PWA install + Sunday push scheduling
│   └── useKeyboard.ts               # Global keyboard shortcut handling
├── utils/
│   ├── poster.ts                    # SVG poster generation
│   ├── backup.ts                    # JSON export/import + validation
│   ├── migrate.ts                   # v0 → v1 storage migration
│   └── easterEgg.ts                 # ASCII art comment + key sequence reveal
├── data/
│   ├── quotes.ts                    # The Library quote corpus (curated)
│   └── solstice-quotes.ts           # The astronomical-day quote corpus
├── public/
│   ├── CNAME                        # "fz.ax"
│   ├── manifest.webmanifest         # (existing, will be enhanced)
│   ├── sw.js                        # Or generated by Nuxt PWA module
│   └── (existing favicons)
├── tests/
│   ├── useTime.spec.ts
│   ├── usePalette.spec.ts
│   ├── useEcho.spec.ts
│   ├── useAnniversary.spec.ts
│   ├── useBirthday.spec.ts
│   ├── backup.spec.ts
│   └── migrate.spec.ts
├── server/                          # Removed — no server routes needed
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Pages auto-deploy
├── nuxt.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

The current `server/` directory is removed. It only contains a `tsconfig.json` and is unused.

### Component responsibilities

- **`FzPage.vue`** — top-level orchestration. Mounts the title, the grid, the toolbar, the library, the echo banner, the anniversary banner, the footer, and any modals. Handles the global keyboard shortcuts via `useKeyboard`. Reads from `useFzState`.
- **`FzGrid.vue`** — pure grid renderer. Renders 4000 `<FzHexagon>` instances. Handles scroll-to-current. Receives an optional "lit set" prop for Constellation/Search highlighting.
- **`FzHexagon.vue`** — a single hexagon. Props: `index`, `mark?`, `anchored`, `state` (`'past' | 'current' | 'future'`), `lit` (for constellation/search). Emits `click` and `longpress`.
- **`FzMarkPopover.vue`** — the click target. Receives `weekIndex`. Loads the current Mark + Whisper from state. Shows the personal palette. Allows free typing. Shows the Whisper textarea. Saves on input change (debounced).
- **`FzAnnualLetter.vue`** — handles both the write phase (on birthday week) and the unseal phase (on the next birthday week). Manages the sealed/unsealed transitions.
- **`FzFirstRun.vue`** — the three-screen ceremony. Auto-advances or click-advances. Final screen contains the date input.
- **`FzKeyboardHelp.vue`** — modal shown on `?`. Lists every shortcut.
- **`FzQuietBackdrop.vue`** — wraps the page when `Q` is active. Hides everything except the grid.

### Composables

- **`useFzState`** — the single global state composable. Wraps a `reactive(FzState)` declared at module scope so every consumer reads the same object. Persists to localStorage on every mutation (debounced ~200ms). Exposes typed actions: `setMark(week, glyph)`, `setWhisper(week, text)`, `clearMark(week)`, `setVow(text)`, `writeAnnualLetter(text)`, `unsealLetter(id)`, `addAnchor(week)`, `removeAnchor(week)`, `setPref(key, value)`, etc.
- **`useTime`** — pure functions: `weekIndex(dob, today)`, `weekRange(dob, index)`, `dateForWeek(dob, index)`, `isCurrentWeek(dob, today)`, `weekOfYear(date)`, `isBirthdayWeek(dob, today)`, `isMonday(date)`, `isSundayEvening(date)`, `daysUntilNextSolstice(date)`, `currentSolsticeOrEquinox(date)`. All Mon-week-start by default; Sun-start opt-in via prefs.
- **`usePalette`** — derived. Returns the user's most-used Marks ordered by frequency (recency-weighted).
- **`useEcho`** — derived. Returns one random Mark with a Whisper, deterministically seeded by today's date so the same Echo shows on the same day across reloads.
- **`useAnniversary`** — derived. Returns up to 3 past Marks with Whispers that fall on the same calendar week of year as today.
- **`useSolstice`** — returns the current astronomical-day status (`null | 'vernal' | 'summer' | 'autumnal' | 'winter'`).
- **`useBirthday`** — returns whether today is in the user's birthday week, plus a list of past/future birthday week indices.
- **`useQuotes`** — returns the current Library quote (deterministic by week + DOB hash) and the current solstice quote.
- **`useKeyboard`** — registers global keys: `Q`, `/`, `?`, `V`, `Esc`, `←↑↓→`, `⏎`. Centralizes shortcut bindings so help can introspect them.
- **`usePwa`** — handles install prompt, service worker registration, Sunday push scheduling, push permission opt-in.

### Service worker

A single hand-written `sw.js` (or a Nuxt PWA-module-generated equivalent). It does three things:

1. **Cache the app shell** for offline use (HTML, CSS, JS, fonts, favicons).
2. **Schedule a local notification** for Sunday 21:00 local time using the Notifications API + `setInterval`-equivalent Workbox `BackgroundSyncPlugin` or simply checking on each `activate`/`fetch`. Implementation note: true scheduled local notifications require the (still-experimental) `Notification Triggers API`. If unavailable, fall back to scheduling on every `visibilitychange` and using a stored "next prompt time" in IndexedDB.
3. **Cache-first** for app assets, **network-first** for the document.

### GitHub Pages deployment

#### `public/CNAME`

```
fz.ax
```

#### `nuxt.config.ts` additions

```ts
export default defineNuxtConfig({
  // ... existing config
  ssr: false,
  nitro: {
    preset: 'static',
    prerender: { routes: ['/'] }
  },
  app: {
    baseURL: '/',
    cdnURL: ''
  }
})
```

`baseURL: '/'` is correct because we're deploying to a custom domain (`fz.ax`), not a subpath like `username.github.io/fz.ax`.

#### `.github/workflows/deploy.yml`

```yaml
name: deploy
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm generate
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .output/public
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Interaction design (key flows)

### First run

1. User opens fz.ax for the first time. `localStorage['fz.ax.state']` is empty.
2. The First Run Ceremony renders three screens, each ~3-4 seconds, each click-advance:
   - Screen 1: "the average human life is four-thousand weeks."
   - Screen 2: "this page is a quiet place to notice them."
   - Screen 3: "when did you arrive?" + native date input + a `4⬢⏣⬡` button.
3. On submit, state is initialized: `{ version: 1, dob, weeks: {}, vow: null, letters: [], anchors: [], prefs: defaults, meta: { createdAt: now } }`.
4. The grid renders, scrolls to the current week, and the title pulsates.

### Marking a week

1. User clicks (or focuses with arrow keys + presses Enter on) a hexagon.
2. `FzMarkPopover` opens anchored to the hexagon. It shows:
   - The week's date range.
   - The personal palette (most-used Marks as buttons).
   - A free-text input (max 1 character).
   - A whisper textarea below a dashed divider.
3. Tapping a palette item or typing a character + Enter saves the Mark immediately.
4. Typing in the whisper field saves on blur (debounced 500ms while typing).
5. Closing the popover (Escape, click outside, or `4⬢⏣⬡` button) commits and dismisses.

### Sunday Whisper ritual

1. On every `mounted()` of `FzPage`, check: is today Sunday after 18:00 local, AND is `meta.lastSundayPrompt` not equal to today's ISO date?
2. If yes, open `FzSundayModal` with a quiet message: "this week is closing — what do you want to remember about it?"
3. The modal contains the same Mark + Whisper inputs as the popover, scoped to the current week.
4. Saving updates `meta.lastSundayPrompt = today`.
5. Dismissing also updates `meta.lastSundayPrompt = today` so it doesn't reappear that day.

### Annual Letter

1. On `mounted()`, check: is today inside the user's birthday week?
2. If yes:
   - If a Letter exists with `unsealAt <= today` and `read === false`, show the **unseal** flow: "⌑ a letter from one year ago today" → reveal text → mark `read: true`.
   - Else if no Letter exists with `sealedAt` inside the current birthday week, show the **write** flow: a quiet modal with a textarea: "write a paragraph to yourself, one year from now."
   - Saving creates `{ text, sealedAt: now, unsealAt: nextYearBirthdayWeek, read: false }`.

### Constellation Lines

1. User clicks a marked week (or focuses + presses Space).
2. `useFzState` emits a `lit set` containing every other week index whose Mark glyph matches.
3. `FzGrid` receives the `lit set` and applies a `.lit` class to those hexagons (scaled, glow, slightly-larger).
4. Pressing Escape, clicking empty space, or clicking a different glyph clears the set.

### Whisper Search

1. User presses `/`. `FzSearch` opens at the top of the grid.
2. Typing filters: every week whose Whisper contains the substring (case-insensitive) gets a `lit` class. Anchored matches float to the top of a results list shown above the grid.
3. Escape clears.

### Quiet Mode

1. User presses `Q`. `FzQuietBackdrop` activates.
2. Title, subtitle, library, toolbar, footer all `display: none` (or are hidden behind the backdrop).
3. The grid expands to fill the viewport edge to edge.
4. `Q` again or Escape returns to normal.

### Monday Ceremony

1. A small interval (every 30 seconds) checks: has `currentWeekIndex` changed since last check?
2. If yes, the previously-current hexagon plays the `dim` animation (~1.2s) and the new current hexagon plays the `birth` animation. The grid scroll position is preserved.
3. If `meta.lastMondayCeremony` is not today, also show a one-line notice: "a week passed."

### Solstice / Equinox treatment

1. On `mounted()`, `useSolstice` returns `null | 'vernal' | 'summer' | 'autumnal' | 'winter'`.
2. If non-null, the page applies a `solstice-{name}` class on `<body>`, swaps the background, swaps the library quote with the relevant solstice corpus, and swaps the border treatment.
3. The transformation lasts 24 hours (one full day in the user's local timezone).

## Visual design

### Palette (light mode — current)

- Yellow primary: `#F7B808` (existing)
- Blue primary: `#0847F7` (existing)
- Background: `#FFFFFF` with the existing `cubes.png` texture
- Anchor red accent: `#FF3B30`
- Quiet gray (Library, footer): `#888888`
- Faint dashed border gray: `#CCCCCC`

### Palette (dark mode — new)

- Yellow primary: `#F7B808` (unchanged — gold)
- Blue primary: `#4A8EFF` (lighter, electric)
- Background: `#0A0A0A` (near-black)
- Anchor red: `#FF453A`
- Quiet gray: `#666666`
- Border: `#222222`
- The cubes texture is removed in dark mode (or replaced with a very faint version at `opacity: 0.03`).

Auto-switches via `prefers-color-scheme` unless the user has set a manual override.

### Typography

- Existing `Roboto` system fallback stack stays.
- The hexagon glyphs `⬢ ⏣ ⬡` use the system fallback for math symbols. No custom font.
- Marks: rendered in the Roboto family for letters; system emoji font for emoji.
- The pulsating title animation stays (existing `pulsate` keyframe).

### Animation principles

- All animations have a `prefers-reduced-motion` fallback that skips them entirely.
- Animations are **slow and dignified**. Nothing snaps. Nothing bounces aggressively. Easing is `ease-in-out`.
- The current-week glow is a 2.4s breathing cycle.
- The Monday Ceremony is a 1.2s transition.
- The Echo banner fades in over 0.4s and out over 0.6s.
- The Constellation lit-up state has no per-cell stagger — they all light at once.

## Accessibility

- **Keyboard navigation:** every interactive surface is reachable by keyboard. The grid uses a roving tabindex with arrow-key navigation.
- **ARIA:** each hexagon has `role="button"` and `aria-label="week N: {date range}, marked: {mark}, whispered: {whisper truncated}"`. The grid has `role="grid"`.
- **Reduced motion:** all animations check `prefers-reduced-motion` and disable when set. The title pulse, the current-week glow, the Monday Ceremony, the Echo fade — all skip.
- **Color contrast:** in light mode, yellow `#F7B808` on white meets the AAA threshold for graphical objects but not text. The yellow text is therefore **decorative** and always paired with content available in higher-contrast colors. We document this and accept it as the existing aesthetic.
- **Focus indicators:** keyboard focus shows a 2px yellow outline with 2px offset.
- **Screen reader:** the grid is announced as "your life in 4000 weeks." The footer is announced.

## Easter eggs (preserved & extended)

1. **The ASCII hexagon comment** in the page source — preserved verbatim.
2. **The `fz` key sequence** — typing `fz` in quick succession (within 500ms) reveals a hidden quote that fades in for 4 seconds then fades out. The quote is from a small hidden corpus in `data/easter-quotes.ts`.
3. **The cube background texture** stays in light mode (existing `cubes.png`).

## Testing

### What is tested (Vitest)

- `useTime` — every pure function. Edge cases: leap years, week-of-year, Sunday/Monday week-start switching, DOB exactly on a Monday, DOB on Dec 31 / Jan 1, future DOB (should clamp).
- `usePalette` — frequency derivation, recency weighting.
- `useEcho` — deterministic seeding by date.
- `useAnniversary` — same-week-of-year matching across years.
- `useBirthday` — birthday week detection across leap years and DST changes.
- `useSolstice` — solstice/equinox date detection (we hardcode the four dates per year for years -50..+150 from 2026, accepting ±1 day astronomical drift).
- `migrate` — v0 → v1 migration of legacy `dob` localStorage entry.
- `backup` — JSON export → import round-trip preserves state exactly.

### What is not tested (manual review)

- All visual components. Animations, layout, color, hover behavior.
- The PWA install prompt (manual test on iOS, Android, desktop Chrome).
- The Sunday push (manual test by setting system clock to Sunday 21:00).
- The Annual Letter unseal (manual test by setting `unsealAt` to a past date).

### Test command

```bash
pnpm test             # runs vitest once
pnpm test:watch       # vitest watch mode
```

CI runs `pnpm test` before `pnpm generate`.

## Success criteria

This redesign is successful when:

1. A new visitor goes through the First Run Ceremony and writes their DOB without any explanation needed.
2. The user can mark a week, write a Whisper, close the page, return next week, and find their Mark + Whisper exactly where they left them.
3. The user installs fz.ax to their phone home screen and uses it offline.
4. On a Sunday evening, the user receives a single dignified notification asking them to whisper.
5. On the user's birthday week, the page asks them to write a letter to next year. 365 days later, on the same week, the letter unseals itself.
6. The user generates an SVG poster of their life and prints it.
7. The user exports their state as a JSON file, deletes localStorage, re-imports the file, and finds everything intact.
8. The user presses `Q` and looks at their hexagons in silence.
9. The user notices the leading zero on `02026` and reads the page differently for the rest of the day.
10. The user shows fz.ax to one person, who quietly says: "oh."
11. The Vitest suite passes. The site builds via `nuxt generate`. GH Pages deploys on every push to `master`.
12. There is no backend, no analytics, no third-party script, and no telemetry anywhere in the codebase.

## Decisions (committed for the implementation plan)

These are calls I've made so the plan can proceed without round-trips. The user can override any of them in spec review.

- **Solstice quote corpus:** 12 hand-curated quotes (3 per astronomical day), drawn from a deliberate mix of voices: Marcus Aurelius, Bashō, Annie Dillard, and Oliver Burkeman. All public domain or fair-use. Stored as a static object in `data/solstice-quotes.ts`.
- **Library quote corpus:** 60 hand-curated memento mori quotes — enough that weekly rotation does not repeat within a year. Same source rules as above. Stored in `data/quotes.ts`.
- **Personal palette size:** 8 slots in the popover, ordered by recency-weighted frequency. Beyond 8, older glyphs drop off the visible palette but remain searchable.
- **Whisper length cap:** soft-cap at 240 characters. No hard cutoff; the input shows a counter once you cross 200.
- **Sunday push time:** 21:00 in the user's local timezone.
- **Sunday modal trigger window:** any time Sunday from 18:00 local onwards (so the modal can be seen even if the push is missed).
- **Annual Letter trigger window:** the entire calendar week containing the user's birthday. The unseal happens any time inside the same week, exactly one year later.
- **Poster export format:** SVG, ISO A2 (420mm × 594mm) at 100 DPI equivalent. Marks rendered as text in the page font. File naming: `fz-ax-poster-YYYY-MM-DD.svg`.
- **Echo dismissal:** auto-dismisses after 8 seconds OR on click, whichever comes first. Once dismissed, no Echo for the rest of the day.
- **Anchor visual treatment:** a 4px red dot in the top-right corner of the hexagon, slightly oversized so it's visible on small grids.

## Out of scope (for later)

These were considered and consciously deferred:

- **Memorial mode** (DOB + DOD). Lovely idea, but a separate spec — it changes the meaning of the entire page.
- **The Hourglass** at the top of the page. Too much for the current scope; risks visual clutter.
- **Alternate color palettes** beyond light/dark. Possible later, but the yellow/blue identity is too strong to dilute right now.
- **The Honeycomb** (zoom into 7-day sub-grids). A whole separate dimension; would warrant its own spec.
- **The Constellation of sister sites** (5y.ax, 7d.ax, 1d.ax). Separate spec; separate domains; separate work.

## Implementation order (for the plan that follows this spec)

A rough guide for the plan that comes next. Each stage should leave the site fully working:

1. **Stage 1 — Foundations.** TS migration, file structure, `useFzState` composable scaffold, Vitest, ESLint. Nuxt config for static GH Pages. CNAME. GitHub Actions deploy workflow. Migration of v0 → v1 storage. *No new features yet — the site looks identical to today.*
2. **Stage 2 — The Mark + The Whisper.** F0.1, F0.2, F0.3, F0.4. The popover. The personal palette. Storage. Tests. *fz.ax is now interactive.*
3. **Stage 3 — Tier 1 rituals.** F1.1 Sunday, F1.2 Library, F1.3 Echo, F1.4 Poster, F1.5 Backup, F1.8 Easter. *fz.ax is now a practice.*
4. **Stage 4 — PWA + Sunday Push.** F1.6, F1.7. *fz.ax now lives on phones.*
5. **Stage 5 — Tier 2 rituals.** F2.1 Vow, F2.2 Monday, F2.3 Constellation, F2.4 Anniversary, F2.5 Solstice, F2.6 Quiet, F2.7 Search, F2.8 Long Now, F2.9 Anchors. *fz.ax is now a calendar of rituals.*
6. **Stage 6 — Tier 3 dreams.** F3.1 First Run, F3.2 Birthday, F3.3 Annual Letter, F3.4 Dark, F3.5 Keyboard. *fz.ax is unforgettable.*

Each stage:
- Compiles cleanly.
- Passes all existing tests.
- Adds new tests where new pure logic appears.
- Is shippable on its own.
- Gets reviewed before the next stage starts.

---

⬢⏣⬡ that's the dream ⬡⏣⬢
