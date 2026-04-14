---
title: fz.ax Stage 3 · Tier 1 Rituals
status: draft
date: 2026-04-14
author: autopilot run
parent: docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md
stage: 3
feature_ids: [F1.1, F1.2, F1.3, F1.4, F1.5, F1.8]
---

# fz.ax Stage 3 · Tier 1 Rituals

> The grid grows a voice.

## Goal

Stage 2 made fz.ax interactive (click a hex, mark a week, whisper a sentence). Stage 3 gives the grid *ambient life*: every visit finds a rotating memento mori quote at its foot (The Library), occasionally surfaces a random past whisper ("⌁ echo · may 14 · the week we drove north"), prompts the user once every Sunday evening to reflect on the closing week (The Sunday Ritual), and lets them export the whole mosaic as a printable SVG poster or a portable JSON backup. A tiny new easter egg sits on top of the existing ASCII hexagon source comment. No PWA, no push notifications, no accounts, no cloud — everything runs client-side off the localStorage state that Stage 2 established.

**In scope:** F1.1 Sunday Whisper ritual, F1.2 The Library, F1.3 The Echo, F1.4 Poster export (SVG), F1.5 JSON backup/restore, F1.8 Easter eggs (preserve + extend).

**Out of scope:** F1.6 Installable PWA + offline, F1.7 Sunday Push notification — both are Stage 4. All Tier 2 and Tier 3 features.

## Context

Stage 2 (shipped, tag `stage-2-mark-whisper`, commit `edfac99`) established:
- `useFzState` with `setMark`, `setWhisper`, `clearMark`; every mutation throws on validation failure and on storage-write failure
- `state.value.weeks[n]` is a sparse `WeekEntry` map with `{ mark, whisper?, markedAt }`
- `isValidFzState` deep-validates every week entry (range, mark non-empty, markedAt parseable)
- `FzMarkPopover` opens on hex click, auto-saves via the same actions
- `FzGrid` uses `v-memo` keyed by `[isCurrent, mark, whisper, modalOpen, dobString]` to avoid 4000-hex re-renders
- `meta.lastSundayPrompt` and `meta.lastEcho` already exist in the `FzState` type (defined in Stage 1 for exactly this purpose)

Stage 3 builds on all of it. **No data-model changes** — the type schema already covers everything Tier 1 needs. No breaking changes to existing features.

## Soul (unchanged)

- Local-first only. No network, no cloud, no analytics, no third-party scripts.
- Single page, single purpose.
- Yellow `#F7B808` + blue `#0847F7`; hexagon glyphs `⬢⏣⬡`; existing voice.
- Constraint is the feature — a mark is one glyph, a whisper is one sentence, a ritual is one prompt a week.
- No accounts, no cloud, no analytics, no third-party scripts.

## Feature design

### F1.1 · The Sunday Whisper ritual

**What it does.** On the user's local Sunday, at any time from 18:00 onwards, the first page load of that day triggers a gentle modal: *"this week is closing — what do you want to remember about it?"* The modal contains the same Mark + Whisper inputs as `FzMarkPopover`, scoped to the *current* week. Saving or dismissing updates `meta.lastSundayPrompt` to today's ISO date so it doesn't re-trigger until next Sunday.

**Component.** A new `FzSundayModal.vue`. It deliberately does NOT reuse `FzMarkPopover` wholesale — the framing matters (contemplative header, "this week is closing" language, slightly different visual weight), and the popover is already complex enough that adding a "mode" prop would obscure both flows. The two components share styling patterns (the `.btn-76` close button, the modal overlay) but own their own layout.

**Trigger logic.** A new `composables/useSunday.ts` exports a `shouldPromptToday(state, today)` function that returns `true` when:
1. `state` is not null
2. `today.getDay() === 0` (Sunday — local time)
3. `today.getHours() >= 18`
4. `meta.lastSundayPrompt` is not equal to today's `YYYY-MM-DD`

`FzPage` calls this on `onMounted` and opens `FzSundayModal` if the result is true. Dismissal and save both update `meta.lastSundayPrompt` via a new `useFzState` action `setLastSundayPrompt(dateStr)`.

### F1.2 · The Library

**What it does.** A single memento mori quote appears in faint italic below the grid. The quote rotates once per week, deterministically — the same user sees the same quote for an entire calendar week and a new one next week. Different users see different orderings (seeded by a hash of their DOB).

**Component.** A new `FzLibrary.vue` below `FzGrid` in the FzPage template. Reads `useQuotes` for the current quote, renders it in a `.library` section with the existing dashed-border visual.

**Composable.** `composables/useQuotes.ts` exports `useLibraryQuote(state, today)` returning a `ComputedRef<LibraryQuote | null>`. Formula:

```ts
index = (hashString(dob) + weekOfYear(today)) % quotes.length
```

Where `weekOfYear` is the ISO 8601 week-of-year (1-53), which we add to `composables/useTime.ts`. And `hashString` is a simple djb2 hash (module-scope helper, no library dependency).

**Corpus.** 60 hand-curated quotes in `data/quotes.ts`, each with `text` and `attribution`. Voices: Marcus Aurelius (public domain), Matsuo Bashō (public domain), Seneca (public domain), Annie Dillard (short fair-use excerpts with attribution), Oliver Burkeman (likewise), plus a few anonymous aphorisms from the wider memento mori tradition. Each quote is ≤ 160 characters so the layout doesn't break.

**Null safety.** If `state` is null (pre-DOB), `useLibraryQuote` returns `null` and `FzLibrary` renders nothing. After first-run, it's always populated because the corpus is static.

### F1.3 · The Echo (serendipity)

**What it does.** On each page load, if the user has at least one Mark with a Whisper from a past week, one of those weeks is selected and surfaced as a banner: *"⌁ echo · apr 8, 2024 · the week we drove north and the road forgave us"*. The banner auto-dismisses after 8 seconds or on click, whichever comes first. At most one Echo per day: `meta.lastEcho` tracks the ISO date of the last shown Echo.

**Component.** `FzEcho.vue`. Positioned above the grid (below title + subtitle). Fades in over 0.4s on mount, fades out over 0.6s on dismissal. Click or 8s timeout both dismiss.

**Composable.** `composables/useEcho.ts` exports `useEcho(state, today)` returning a `ComputedRef<EchoEntry | null>`. Filters `state.weeks` to whispered + past-only entries, then picks one deterministically seeded by today's date (so refreshing the page shows the same Echo, not a new random one). If none exist, returns null.

**Deterministic seed.** `hashString(today.toISOString().slice(0, 10))` modulo the number of eligible entries. Same day → same pick.

**Collision with Anniversary (F2.4).** The parent spec's "Echo + Anniversary (collision rule)" says *"Anniversary takes precedence."* Stage 3 doesn't build Anniversary (that's Tier 2, Stage 5). So Echo is unconditional for Stage 3. When Anniversary lands, it will read the same `meta.lastEcho` field to suppress Echo on days it fires. No code change needed in Stage 3 to prepare for this — the field is already there.

**Action.** `useFzState` gains `setLastEcho(dateStr)` to update `meta.lastEcho`. FzEcho calls it once when the component mounts *and* an Echo is chosen — this marks the day as "Echoed" whether or not the user clicks dismiss.

### F1.4 · Poster export (SVG)

**What it does.** A button in a new small toolbar generates an ISO A2 (420×594mm) SVG of the whole 4000-hexagon grid, with every Mark baked in, and saves it as `fz-ax-poster-YYYY-MM-DD.svg`. Entirely client-side: generate the SVG string in memory, wrap it in a Blob, create an object URL, trigger a download. No dependencies.

**Utility.** `utils/poster.ts` exports `generatePoster(state: FzState, today: Date, options?: PosterOptions): string`. Returns a complete SVG document as a string.

**Layout.**
- Canvas: 420×594 mm (A2 portrait). SVG `viewBox="0 0 420 594"`.
- Top: title "four-thousand weekz" in `#F7B808`, `font-size: 24mm`.
- Subtitle: the same `past-⬢ ⏣ ⬡-future` count.
- Grid: 4000 hexagons arranged in a 40×100 layout (wide + tall, respecting the A2 aspect ratio). Each hex is ~8mm wide with 1mm gaps. Marks rendered as SVG `<text>` elements in the yellow. Current week gets a thin yellow halo (no animation — the poster is static).
- Footer area: the user's current Library quote + date of export + the "02026 · the long now" typographic accent.
- Margin: 15mm on all sides.

**Font.** Default to the system fallback stack (same as the web). SVG text rendering uses whatever font the viewer has; Roboto-like outcomes on most systems.

**Download trigger.** A small helper in `utils/poster.ts` called `downloadPoster(state, today)` handles Blob creation and `<a download>` click simulation.

### F1.5 · JSON backup / restore

**What it does.** Two toolbar buttons:
- **Backup:** download the entire `localStorage['fz.ax.state']` as a JSON file wrapped in `{ fzAxBackup: true, exportedAt, state }`. Filename: `fz-ax-backup-YYYY-MM-DD.json`.
- **Restore:** open a `<input type="file">`, read the uploaded file, validate it's a well-formed backup, replace the current state. Reloads state via a new `useFzState` action `replaceState(next: FzState)`.

**Utility.** `utils/backup.ts` exports:
- `exportBackup(state: FzState, exportedAt?: Date): string` — returns the JSON string
- `parseBackup(json: string): FzState | null` — returns the validated inner state or null on any failure (wrapper check, structure check, `isValidFzState` check)
- `downloadBackup(state: FzState, today: Date): void` — Blob + download link helper

**Validator.** The inner `state` must pass the existing `isValidFzState` from `utils/storage.ts` (which Stage 2 already deep-validates). The wrapper check verifies `parsed.fzAxBackup === true`. Unknown wrapper fields are tolerated (forward compat).

**`replaceState` action.** Validates the input via `isValidFzState` at the composable boundary (throws otherwise), calls `writeState` (throws on failure), then updates `state.value`. Consistent with the Stage 2 throw-and-close pattern.

**Safety.** If the user imports a file from a different installation, their entire current state is replaced. We do NOT merge. The user can export their current state first for safety, or use browser-level undo via the back button (which works because the page hasn't reloaded yet — but if they've already dismissed the popover, their old state is gone). For Stage 3 the UX is "click replace, confirm via native file picker" — no confirm dialog. Matches the spec's "constraint is the feature" ethos and is how real text editors handle Open/Save.

### F1.8 · Easter eggs (preserve + extend)

**What's preserved.** The ASCII hexagon comment already appended to `document.body` by `FzPage.onMounted`. No change.

**What's added.** A new key-sequence easter egg: typing `f` then `z` within 500ms reveals a hidden quote overlaid on the page for 4 seconds, then fades out. Only triggers once per sequence; rapid repeats are debounced.

**Component.** `FzEasterEgg.vue` is a full-viewport overlay (pointer-events: none, fixed position) that renders a centered quote when active. Handles its own fade-in/fade-out transitions via CSS.

**Composable.** `composables/useEasterEgg.ts` wires a global `keydown` listener, tracks the `(key, timestamp)` of the most recent keypress, and exposes a `reactive` `{ active: boolean, quote: string | null }` state. `FzPage` mounts the listener on `onMounted` and cleans up on `onBeforeUnmount`. When `f` followed by `z` (both lowercase, case-insensitive via `event.key.toLowerCase()`) is detected within 500ms, it picks one of ~3 hidden quotes from a small corpus in `data/easter-quotes.ts`, sets `active = true`, and schedules `active = false` after 4 seconds.

**Corpus.** 3 hand-written one-line quotes about the nature of fz.ax itself. Examples:
- *"between ⬢ and ⬡ there is ⏣ — and only ⏣ is yours to live in."*
- *"this is not a productivity tool. it is a mirror."*
- *"you are reading this on the week you are. that matters more than the grid."*

**Why 3 quotes.** Enough to surprise on repeat discovery, few enough to feel hand-made. The selection per trigger is random (not deterministic — the easter egg is playful, not ritual).

## Data model (no changes)

`FzState` is already sized correctly. `meta.lastSundayPrompt` and `meta.lastEcho` were reserved in Stage 1 for exactly this purpose:

```ts
interface Meta {
  createdAt: string
  lastSundayPrompt?: string  // used by F1.1
  lastEcho?: string          // used by F1.3
  lastVisitedWeek?: number
  installedPwa?: boolean
}
```

Stage 3 populates these fields; the validator already accepts them.

## Composable API additions

`useFzState` gains three new actions:

```ts
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  clearMark: (week: number) => void
  // NEW in Stage 3:
  setLastSundayPrompt: (dateStr: string) => void
  setLastEcho: (dateStr: string) => void
  replaceState: (next: FzState) => void
  resetState: () => void
}
```

All three new actions:
- Validate arguments (replaceState uses `isValidFzState`, the other two just check state != null)
- Write through `writeState` and throw on failure
- Preserve the existing top-level state spread pattern

**Note:** `setLastSundayPrompt` and `setLastEcho` only mutate `meta`, not `weeks`. They use the spread pattern `{ ...current, meta: { ...current.meta, lastSundayPrompt: dateStr } }`.

## New composables

- **`composables/useSunday.ts`** — `shouldPromptToday(state, today)` helper (pure, no reactivity)
- **`composables/useQuotes.ts`** — `useLibraryQuote(state, today)` returning `ComputedRef<LibraryQuote | null>`
- **`composables/useEcho.ts`** — `useEcho(state, today)` returning `ComputedRef<EchoEntry | null>`
- **`composables/useEasterEgg.ts`** — `useEasterEgg()` returning `{ active: Ref<boolean>, quote: Ref<string | null>, destroy: () => void }`

## New utilities

- **`utils/poster.ts`** — `generatePoster`, `downloadPoster`
- **`utils/backup.ts`** — `exportBackup`, `parseBackup`, `downloadBackup`
- **`utils/hash.ts`** — tiny djb2-style `hashString(value: string): number`. Pure, tested.

## Existing utilities (extended)

- **`composables/useTime.ts`** — add `weekOfYear(date: Date): number` (ISO 8601 week) and `formatDateShort(date: Date, opts?): string` helpers. Pure, tested.

## New components

- `components/FzSundayModal.vue` — the Sunday ritual modal
- `components/FzLibrary.vue` — the rotating quote line below the grid
- `components/FzEcho.vue` — the Echo serendipity banner
- `components/FzToolbar.vue` — a tiny fixed-position toolbar (top-right) with Poster + Backup buttons
- `components/FzEasterEgg.vue` — the hidden-quote overlay

## New data files

- `data/quotes.ts` — the 60-quote Library corpus, exported as `LIBRARY_QUOTES: readonly LibraryQuote[]`
- `data/easter-quotes.ts` — the 3-quote easter-egg corpus, exported as `EASTER_QUOTES: readonly string[]`

## Modified components

- `components/FzPage.vue` — hosts `FzLibrary`, `FzEcho`, `FzSundayModal`, `FzToolbar`, `FzEasterEgg`. Wires the `useEasterEgg` lifecycle. Triggers Sunday modal check on mount.

## Interaction flows

### Sunday ritual

1. User loads the page on a Sunday at 19:00 local.
2. `FzPage.onMounted` calls `shouldPromptToday(state.value, new Date())`.
3. Returns `true` (it's Sunday, it's after 18:00, `lastSundayPrompt` is not today).
4. `FzPage` sets `sundayModalOpen.value = true`.
5. `FzSundayModal` opens, showing the current week's date range, existing Mark (if any), existing Whisper (if any). Input pattern mirrors FzMarkPopover: one-char input + whisper textarea + save button.
6. User saves or dismisses. Both paths call `setLastSundayPrompt(todayIso)` to prevent re-trigger.
7. Modal closes. Normal grid resumes.

If the user is on the page at 17:59 and midnight of the local timezone crosses into 18:00, the modal does NOT auto-open — the check runs only on mount. This is deliberate: we don't want mid-session surprises. They'll see it next page load.

### Library

1. Page loads. `FzLibrary` mounts.
2. `useLibraryQuote(state, today)` computes: `index = (hashString(dob) + weekOfYear(today)) % LIBRARY_QUOTES.length`.
3. Renders the quote + attribution in faint italic below the grid.
4. On DOB change or week-of-year change (next Monday UTC), the computed invalidates and the rendered quote updates.

### Echo

1. Page loads. `FzEcho` mounts.
2. `useEcho(state, today)` filters `state.weeks` for past entries with whispers.
3. If there are any, deterministically seeded pick → one EchoEntry. Otherwise null.
4. If non-null and `meta.lastEcho` is not today's date:
   - Call `setLastEcho(todayIso)` to mark the day as "Echoed"
   - Render the banner with fade-in animation
   - Start an 8-second auto-dismiss timer
5. On click or timer: fade out, unmount.

### Poster export

1. User clicks the "poster" button in `FzToolbar`.
2. `downloadPoster(state, today)` runs:
   - `generatePoster(state, today)` builds the SVG string
   - `new Blob([svg], { type: 'image/svg+xml' })`
   - `URL.createObjectURL(blob)`
   - Creates a hidden `<a download="fz-ax-poster-2026-04-14.svg">` and `.click()`s it
   - `URL.revokeObjectURL` after a tick
3. Browser downloads the SVG. The file opens in any SVG viewer or browser.

### Backup / restore

**Backup:**
1. User clicks "backup" in `FzToolbar`.
2. `downloadBackup(state, today)` runs:
   - `exportBackup(state, today)` returns the JSON string
   - Blob + URL + `<a download>` same as poster
3. File downloaded as `fz-ax-backup-YYYY-MM-DD.json`.

**Restore:**
1. User clicks "restore" in `FzToolbar`.
2. A hidden `<input type="file" accept=".json">` is triggered.
3. On change, `FileReader.readAsText` reads the file.
4. `parseBackup(jsonText)` returns `FzState | null`.
5. If null: silently no-op (matches the spec's "constraint is the feature" ethos — no error dialog for Stage 3; Stage 4+ may add toasts).
6. If valid: `replaceState(parsed)` → state updates, localStorage writes, grid re-renders.

### Easter egg

1. User types `f`, then within 500ms types `z`.
2. `useEasterEgg`'s keydown handler detects the sequence.
3. Picks a random quote from `EASTER_QUOTES`.
4. Sets `active.value = true, quote.value = selectedQuote`.
5. `FzEasterEgg` fades in, displays the quote, starts a 4000ms timer.
6. On timer: `active.value = false`, fade out, unmount.

Escape, click, and any other interaction do NOT cancel the easter egg — it's a 4-second gift that the user watches pass.

## Visual design

### Library

```
  ...hexagon grid...

 ─────────────────────────────
 "the average human lifespan is
  absurdly, terrifyingly,
  insultingly short."
     — oliver burkeman
 ─────────────────────────────
```

Centered, `font-style: italic`, `color: #888888`, `font-size: 0.85rem`, dashed top + bottom border at 1px `#cccccc`. Attribution on its own line in small uppercase blue.

### Echo banner

Positioned between subtitle and grid, width fits content, left-accent border in `#ff3b30` (red). Fades in opacity 0 → 1 over 0.4s. Click or 8s → fades out 1 → 0 over 0.6s.

```
┌──┬─────────────────────────────────────┐
│  │ ⌁ ECHO                              │
│  │ "the week we drove north and the    │
│  │  road forgave us" — apr 8, 2024 · ❤ │
└──┴─────────────────────────────────────┘
```

### Sunday modal

Same overlay pattern as FzDobModal / FzMarkPopover. Header: *"this week is closing"* in blue small uppercase. Body: a brief contemplative sentence (*"what do you want to remember about it?"*), the week's date range, the mark + whisper inputs. Footer: `[dismiss]` (left, subtle) and `[4⬢⏣⬡]` save (right). Escape or backdrop dismisses.

### Toolbar

Fixed position `top: 12px; right: 12px; z-index: 900`. Three small square buttons, each 36×36px. Yellow text on white with a blue border; hover reveals a small tooltip label.

```
  [⬢]  [⬡]  [⌗]
  pst  bck  rst
```

(poster / backup / restore glyphs; tooltips below on hover)

### Easter egg

Full-viewport fixed overlay, `pointer-events: none`, centered quote in large italic yellow text with blue ASCII hex decorations above and below. Fade-in and fade-out via CSS opacity transition.

## Accessibility

- `FzSundayModal` uses `role="dialog"` with `aria-modal="true"`. Focus trap same pattern as FzMarkPopover.
- `FzToolbar` buttons have `aria-label` attributes ("download poster", "download backup", "restore backup").
- `FzEcho` banner has `role="status"` and `aria-live="polite"` so screen readers announce it but don't interrupt.
- `FzLibrary` quote is a regular `<blockquote>` element.
- All new animations respect `prefers-reduced-motion` (Echo fades become instant; easter egg becomes instant).

## Testing strategy

**New unit tests (Vitest, TDD):**

- `tests/hash.spec.ts` — djb2 hashString: empty, single char, ASCII, Unicode, determinism across calls (~6 tests)
- `tests/useTime.spec.ts` — extended with `weekOfYear` tests: first week of year, mid-year, last week, year boundary (~4 tests)
- `tests/useSunday.spec.ts` — `shouldPromptToday`: not Sunday, Sunday before 18, Sunday at 18, Sunday at 23, Sunday but already prompted today, null state (~6 tests)
- `tests/useQuotes.spec.ts` — `useLibraryQuote`: null state, empty corpus edge, determinism across same-day calls, different DOB → different quote, next week → different quote (~5 tests)
- `tests/useEcho.spec.ts` — `useEcho`: null state, no marks, marks without whispers, one eligible entry, multiple eligible (deterministic pick), skips future weeks, honors past-only filter (~6 tests)
- `tests/useFzState.spec.ts` — extended with `setLastSundayPrompt`, `setLastEcho`, `replaceState` tests (~8 tests)
- `tests/backup.spec.ts` — `exportBackup`, `parseBackup` round-trip, malformed JSON, wrong wrapper, invalid inner state, wrong types (~8 tests)
- `tests/poster.spec.ts` — `generatePoster` returns well-formed SVG (parses as XML, contains title, contains expected number of `<text>` elements for marks, contains viewBox) (~5 tests)

**No component unit tests** (per project policy — visual review only). Manual test covers the interactive flows.

Target: roughly 150+ total tests after Stage 3.

## Non-goals (Stage 3 explicit exclusions)

- **No PWA, no manifest polish, no service worker.** F1.6/F1.7 are Stage 4.
- **No Sunday push notification.** Requires PWA + Notification Triggers. Stage 4.
- **No first-run ceremony change.** FzDobModal stays. F3.1 is Stage 6.
- **No Tier 2 features.** Monday ceremony, Constellation, Anniversary, Solstice, Quiet mode, Whisper search, Long Now footer, Anchored weeks — all Stage 5.
- **No dark mode.** F3.4 is Stage 6.
- **No keyboard navigation across the grid.** F3.5 is Stage 6.
- **No toast / error UI.** Backup restore failure is silent (null return). Stage 4+ may add.
- **No undo for replaceState.** The user should export first for safety.

## Risks and open decisions

**R1: Quote licensing.** Dillard and Burkeman are in copyright. We're using very short excerpts with attribution. Standard fair use for a small personal website. Accept.

**R2: Echo on first visit after state migration.** A fresh user has no marked+whispered weeks — `useEcho` returns null, banner doesn't show. No edge case.

**R3: Sunday modal vs FzMarkPopover conflict.** If the user clicks a hexagon at 19:00 on Sunday, do both open? No — the Sunday check runs on `onMounted`, before any user interaction. If the Sunday modal is already open, the FzGrid's `modal-open` class disables grid pointer events. Same protection as Stage 2's popover.

**R4: Poster export on large state.** 4000 hexagons × ~100 chars of SVG each = ~400KB of SVG markup. Plus the marks. String concatenation is fine in V8. Blob creation and download is instant on any modern device.

**R5: Backup import replaces without confirmation.** The user could lose their state to a misclick. We accept this trade-off for the minimal UI. If it becomes a problem post-launch, Stage 4 can add a confirm dialog.

**R6: Easter egg sequence collision.** What if the user is typing `fz` in a whisper textarea? The keydown listener is global. The easter egg would trigger over their whisper input. Fix: if the active element is an `<input>` or `<textarea>`, skip the easter egg detection.

## Decisions (committed)

These are the calls the plan will follow without re-asking:

- **Sunday trigger window:** Sunday 18:00 → 23:59 local, `onMounted` only (no mid-session polling).
- **Library corpus size:** 60 quotes, hand-curated, short (≤160 chars each).
- **Hash function:** djb2, module-scope helper in `utils/hash.ts`.
- **Echo max-per-day:** tracked via `meta.lastEcho`, set once on mount when Echo is chosen.
- **Echo filter:** past weeks only (not current, not future), must have a whisper.
- **Echo dismissal:** 8s auto OR click, whichever first. No replay button.
- **Poster format:** SVG, ISO A2 (420×594mm), string-concatenated, downloaded via Blob.
- **Backup format:** `{ fzAxBackup: true, exportedAt, state }` JSON, indented 2 spaces.
- **Backup restore:** silent null return on invalid, no confirm dialog.
- **Easter egg sequence:** `f` then `z` within 500ms, case-insensitive, skipped when focus is in an input/textarea.
- **Easter egg duration:** 4 seconds visible, fade 0.4s in / 0.6s out.
- **Easter egg corpus:** 3 quotes, random selection per trigger (non-deterministic).

## Files touched

**Created:**
- `data/quotes.ts`
- `data/easter-quotes.ts`
- `composables/useSunday.ts`
- `composables/useQuotes.ts`
- `composables/useEcho.ts`
- `composables/useEasterEgg.ts`
- `utils/hash.ts`
- `utils/poster.ts`
- `utils/backup.ts`
- `components/FzSundayModal.vue`
- `components/FzLibrary.vue`
- `components/FzEcho.vue`
- `components/FzToolbar.vue`
- `components/FzEasterEgg.vue`
- `tests/hash.spec.ts`
- `tests/useSunday.spec.ts`
- `tests/useQuotes.spec.ts`
- `tests/useEcho.spec.ts`
- `tests/backup.spec.ts`
- `tests/poster.spec.ts`

**Modified:**
- `composables/useFzState.ts` — adds `setLastSundayPrompt`, `setLastEcho`, `replaceState`
- `composables/useTime.ts` — adds `weekOfYear`
- `components/FzPage.vue` — hosts FzLibrary, FzEcho, FzSundayModal, FzToolbar, FzEasterEgg; wires Sunday check
- `tests/useFzState.spec.ts` — tests for new actions
- `tests/useTime.spec.ts` — tests for `weekOfYear`

**Not touched:** Everything else — FzHexagon, FzGrid, FzMarkPopover, FzTitle, FzDobModal, FzScrollHex, types/state, storage.ts, migrate.ts, dob.ts, grapheme.ts, usePalette.ts, nuxt.config, deploy.yml.

## Success criteria

Stage 3 is successful when:

1. On a Sunday at 19:00, loading the page triggers the Sunday modal once. Dismissing or saving prevents re-trigger until next Sunday.
2. Below the grid on every visit, a memento mori quote is visible. The same quote for an entire week; a different quote next week; a different starting quote for a different DOB.
3. If the user has at least one whispered past week, the Echo banner appears once on page load with a randomly-picked-but-date-stable past whisper, auto-dismisses in 8s, doesn't repeat that day.
4. Clicking "poster" downloads a well-formed SVG of the whole grid.
5. Clicking "backup" downloads a JSON file. Clicking "restore" and choosing that file restores the state.
6. Typing `f` then `z` rapidly reveals a hidden quote for 4 seconds, then it fades.
7. The ASCII hexagon comment remains in the page source.
8. All existing Stage 1 + Stage 2 tests continue to pass.
9. `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm generate` all clean.
10. The site still deploys to `fz.ax` via the unchanged GH Actions workflow.
11. No new Vue devtools warnings about re-renders — adding FzLibrary / FzEcho / FzToolbar outside the grid doesn't invalidate v-memo.
