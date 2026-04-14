# fz.ax Stage 5 — Tier 2 Rituals Design Spec

> **The calendar of rituals.** Stage 5 transforms fz.ax from a beautiful static visualization into a living weekly practice. The page now has weight and rhythm: it knows what day it is, what week, what year, what season — and it surfaces that knowledge through nine deliberate rituals.

---

## Goal

Implement all nine F2.* features from the parent spec (`docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md`) in a single stage:

- F2.1 The Vow
- F2.2 Monday Ceremony
- F2.3 Constellation Lines
- F2.4 Anniversary Echo
- F2.5 Solstice / Equinox treatment
- F2.6 Quiet Mode
- F2.7 Whisper Search
- F2.8 The Long Now footer
- F2.9 Anchored Weeks

**Built atop:** stage-4-pwa-sunday-push (e3ef387) on master with standing user consent.

**Why one stage instead of two:** F2.5 Solstice is identity-defining for "the calendar of rituals" — deferring it would gut the stage's name. The architectural seams are independent enough that one stage is achievable.

---

## Soul

The aesthetic philosophy from the parent spec (Section: Soul) is non-negotiable:

- **Quiet over loud.** Banners are 12pt italic, not 24pt bold. Anchors get rings, not dots. The vow whispers in blue.
- **Slow over snappy.** All animations are ≥800ms with `ease-in-out`. The Monday transition is 1.2s. The current-week glow stays at its existing 2.4s (and slows to 5.5s on solstice days).
- **Personal over social.** No counts, no badges, no streaks. Anchored weeks have no number — they're simply *anchored*.
- **Constraint = craft.** Every feature has a max line count, a dismissal method, and a typographic ceiling.

If a Stage 5 design choice ever feels like a productivity tool nudge, we cut it.

---

## Architecture commitments

Three NEW singleton composables (each follows the `usePwa` Stage-4 pattern: module-scoped reactive state, public functions, `__resetXForTests` reset):

### 1. `composables/useKeyboard.ts` — global shortcut dispatch

The only place global keys are bound. FzPage mounts it once via `useKeyboard().init()`. Hands V, Q, /, Escape to whatever subscribed. The subscription API is:

```ts
useKeyboard().on('v', () => vowModalOpen.value = true)
useKeyboard().on('q', () => quietMode.value = !quietMode.value)
useKeyboard().on('/', (event) => { event.preventDefault(); searchOpen.value = true })
useKeyboard().on('escape', () => closeAllOverlays())
```

**The input-active rule.** A shortcut fires ONLY if the active element is not a form input or contenteditable. Escape is the lone exception — it always fires, so the user can always close a modal. The check:

```ts
function isInputActive(): boolean {
  const el = document.activeElement
  if (el === null) return false
  return (
    el instanceof HTMLInputElement
    || el instanceof HTMLTextAreaElement
    || (el instanceof HTMLElement && el.isContentEditable)
  )
}
```

**Why one composable instead of per-component listeners:** centralizes the input-active rule (otherwise each component reinvents it and they drift), avoids duplicate handlers, and lets `FzKeyboardHelp` (Stage 6) introspect bindings later.

### 2. `composables/useHighlight.ts` — lit / dim weeks

Single source of truth for which week indices are "lit" and which are "dimmed." Used by both F2.3 Constellation and F2.7 Search. The state is a discriminated union:

```ts
type HighlightState =
  | { type: 'idle' }
  | { type: 'constellation'; glyph: string; weeks: ReadonlySet<number>; sourceWeek: number }
  | { type: 'search'; query: string; weeks: ReadonlySet<number> }
```

API:
- `setConstellation(state, glyph, sourceWeek)` — computes matching weeks from `state.weeks`, sets type 'constellation'
- `setSearch(state, query)` — case-insensitive substring match against whispers, sets type 'search'; empty query → idle
- `clear()` — back to idle
- `lit: ReadonlySet<number>` — the active set (empty when idle)
- `isActive: boolean` — true when type !== 'idle'

**Collision rule (locked):** Opening Search clears Constellation. Pressing Escape clears whichever is active. Clicking a different marked week sets a fresh Constellation. Search query `''` → idle.

**v-memo coupling:** FzGrid passes `lit.has(i)` per hexagon as a prop, and adds it to the v-memo tuple `[isCurrent, mark, whisper, modalOpen, dobString, lit, anchored]`. A typical interaction touches ≤30 hexagons, so the re-render is local.

### 3. `composables/useTodaysBanner.ts` — Anniversary / Echo precedence

Exactly one banner shows per page load. F2.4 Anniversary takes precedence over F1.3 Echo. This composable is the single resolver:

```ts
type BannerKind =
  | { type: 'anniversary'; entries: AnniversaryEntry[] }  // up to 3
  | { type: 'echo'; entry: EchoEntry }
  | null

function useTodaysBanner(state, today): ComputedRef<BannerKind>
```

The existing `FzEcho.vue` is **replaced** by a single `FzBanner.vue` that renders either kind. The `useEcho` composable stays — it's reused inside `useTodaysBanner` for the fallback path. The existing `setLastEcho` action stays — but it's only set when an echo actually shows (not when it's suppressed by an anniversary).

**Anniversary detection:** Find marks where `weekOfYear(weekRange(dob, idx).start) === weekOfYear(today)` AND `idx < currentWeekIndex` AND `whisper !== undefined && whisper !== ''`. Sort by years-ago descending. Take the top 3. (Anniversaries without whispers are skipped — the surface is the whisper text, not the bare glyph.)

---

## Storage validation extensions

`utils/storage.ts` `isValidFzState` already deep-validates `WeekEntry`. Stage 5 adds two more validators:

```ts
function hasValidVow(vow: unknown): vow is VowEntry | null {
  if (vow === null) return true
  if (typeof vow !== 'object' || vow === null) return false
  const v = vow as Record<string, unknown>
  return (
    typeof v.text === 'string'
    && v.text.length > 0
    && v.text.length <= 240
    && typeof v.writtenAt === 'string'
    && !Number.isNaN(new Date(v.writtenAt).getTime())
  )
}

function hasValidAnchors(anchors: unknown): anchors is number[] {
  if (!Array.isArray(anchors)) return false
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i]
    if (!Number.isInteger(a) || a < 0 || a >= totalWeeks) return false
    if (i > 0 && anchors[i - 1] !== undefined && a <= anchors[i - 1]) return false
  }
  return true
}
```

Anchors must be **sorted ascending and unique** at the storage boundary. The `addAnchor` action enforces this before persisting. A backup file with unsorted-or-duplicate anchors is rejected at restore time, exactly like a malformed `WeekEntry`.

---

## New `useFzState` actions

Five new actions, each following the Stage 2 throw-and-close pattern (validate → spread → writeState-or-throw → assign):

### `setVow(text: string): void`

- Throws `"useFzState: vow text must be 1–240 chars"` if `text.length === 0 || text.length > 240`
- Trims leading/trailing whitespace before validation
- Sets `state.vow = { text: trimmed, writtenAt: new Date().toISOString() }`
- Throws on writeState failure (storage disabled / quota exceeded)

### `clearVow(): void`

- Sets `state.vow = null`
- Throws on writeState failure

### `addAnchor(week: number): void`

- Throws if week is out of range `[0, totalWeeks)` (uses existing `assertWeek`)
- Idempotent: if already anchored, no-op (don't throw, don't write)
- Inserts into the sorted position
- Throws on writeState failure

### `removeAnchor(week: number): void`

- Idempotent: if not anchored, no-op
- Throws on writeState failure

### `setLastVisitedWeek(week: number): number | null`

- Returns the **gap** (number of weeks passed since last visit) so FzPage can show the notice. Returns `null` if no notice should display.
- First-ever load (`lastVisitedWeek === undefined`): silently sets, returns `null`
- Same week: no-op, returns `null`
- Backward (clock wrong): no-op, returns `null` — never writes a smaller value
- Forward by N: writes new value, returns `N`
- Throws on writeState failure

**DOB-change interaction:** When `setDob` is called with a value different from the current dob, `lastVisitedWeek` and `lastEcho` are reset to undefined (the week index now refers to a different absolute date). `lastSundayPrompt` is also reset. `vow`, `anchors`, `letters`, and `weeks` are preserved. (This is a Stage-5 refinement to the existing `setDob`.)

---

## Feature implementation

### F2.1 The Vow

**Where it lives:** `FzTitle.vue` gets a new line below the existing title and above the subtitle (between the `<h1>` and the `<h3 class="subtitle">`).

**Display:**
- When set: italic, 0.65rem, weight 300, color `#0847F7` (blue, not yellow — the vow is reflective, not assertive), max-width 320px centered, letter-spacing 0.05em
- When unset: placeholder *"press v to set your vow"* in `#cccccc`, same italic typography
- Click → opens `FzVowModal`. Hover shows a 1px underline in `#0847F7` and `cursor: text`

**Edit:** `FzVowModal.vue` — small modal with a single text input (max 240 chars), a save button (the `4⬢⏣⏣` glyph), and a clear button (the `✕` glyph) only visible when a vow exists. Save calls `setVow`. Clear calls `clearVow`. Both wrapped in try/catch — any throw shows a brief "couldn't save" inline.

**Keyboard:** `V` opens the modal (via `useKeyboard`). The input gets focus on open. Enter saves and closes. Escape closes without saving.

### F2.2 Monday Ceremony

Two paths, exactly as the parent spec describes:

**After-the-fact (always implemented).** In `FzPage.onMounted`:
1. Compute current week index from `useTime.weekIndex(dob, today)`
2. Call `setLastVisitedWeek(currentWeek)`
3. If the return value is `> 0`, render `<FzMondayNotice :weeks="gap" />` for 6 seconds (or until clicked)
4. The notice text: "a week passed." for gap=1, "{N} weeks passed." for gap>1

**Live (also implemented — page open at midnight Monday).** In `FzPage.onMounted`:
1. Compute the timestamp of next local Monday 00:00 via `new Date(y, m, d + daysUntilNextMonday, 0, 0, 0, 0)`
2. `setTimeout(handleMondayTransition, msUntilNextMonday)`
3. When the timer fires:
   - Update `today.value = new Date()` (which causes `currentIndex` in FzGrid to recompute)
   - Trigger the metamorphosis animation: the OLD current hexagon plays a 1.2s fade-and-shrink, the NEW current hexagon plays a 1.2s bloom-from-center with the yellow breathing glow arriving 0.2s into the bloom
   - Re-schedule for the following Monday
4. On `visibilitychange` (tab focus regained after laptop sleep, etc.) recompute the timer — the system clock may have advanced past the original target

**The animation (visual spec):**
- Old current hexagon: `transform: scale(0.6); opacity: 0` over 1.2s, `ease-in-out`. Then snap back to `scale(1); opacity: 1` (it's now the past hexagon, displayed normally)
- New current hexagon: starts at `transform: scale(0); opacity: 0`, transitions to `transform: scale(1); opacity: 1` over 1.2s, `ease-out`. Begin animating 0.2s after the old one started (so the user perceives transformation, not jump)
- Both honor `prefers-reduced-motion`: the animation is skipped, today.value just updates instantly

**Edge cases handled by `setLastVisitedWeek` (see "New useFzState actions" above):** first load (no notice), reload same week (no notice), backward clock (no notice), DST transition (the local-time `new Date(y, m, d + 7, 0, 0, 0, 0)` constructor handles it correctly).

### F2.3 Constellation Lines

**Trigger:** Clicking a marked week opens `FzMarkPopover` (existing). The popover gains a new "constellation" button (small, in the popover footer): pressing it closes the popover and calls `useHighlight().setConstellation(state, glyph, week)`.

Why a button, not the bare click? The bare click already opens the mark editor — that's the existing Stage 2 behavior we don't want to break. A dedicated button inside the popover gives the user explicit access to constellations without overloading the existing tap.

**Visual:**
- Lit hexagons (matching glyph): a 1.5px outline in the same yellow as the glyph, applied via a `.lit` class. They scale to 1.05 with `transform: scale(1.05)`. Transition is 0.4s ease-in-out.
- Non-lit hexagons: opacity 0.3 (visible as context, not hidden)
- The current hexagon's glow continues regardless

**Dismissal:**
- Press Escape → `useHighlight().clear()`
- Click empty space (anywhere on `<body>` except a hexagon or the search input) → clear
- Open Search → clear (and switch to search mode)

**Connecting lines deferred:** The parent spec mentions "lines" by name. We render outline + scale only for v1. Connecting lines is a Stage 6 visual experiment if the outline alone doesn't read as a constellation.

### F2.4 Anniversary Echo

**Detection:** `composables/useAnniversary.ts` exports `findAnniversaries(state, today): AnniversaryEntry[]`:
- For each entry in `state.weeks` with a non-empty whisper:
  - Compute the calendar date of the entry's week start: `weekRange(dob, idx).start`
  - Compare `weekOfYear(entryWeekStart) === weekOfYear(today)` (using the existing `useTime.weekOfYear`)
  - If equal AND idx < currentWeekIndex AND `(today.getFullYear() - entryWeekStart.getFullYear()) >= 1` → it's an anniversary
- Sort by years-ago descending (the oldest anniversary first feels weightier — "this week, 5 years ago")
- Take the top 3
- Return `[{ weekIndex, mark, whisper, yearsAgo }]`

**Banner:** `components/FzBanner.vue` (replaces `FzEcho.vue` at the template site) renders one of three states:
- `{ type: 'anniversary', entries }`: stacked rows, each "⌁ this week, {N} year(s) ago: '{whisper}'", up to 3 lines. Click to dismiss the entire banner.
- `{ type: 'echo', entry }`: identical to the existing FzEcho rendering. Same red-orange `#ff3b30` left border, italic whisper text.
- `null`: nothing rendered.

The label text differs ("anniversary" vs "echo") but the visual treatment is shared — same border color, same italic, same dismissal — because they never appear simultaneously and color sprawl is the enemy of contemplative UIs.

**Precedence enforced via `useTodaysBanner`** (see Architecture above). FzPage uses:
```vue
<FzBanner :banner="todaysBanner" />
```
where `todaysBanner = useTodaysBanner(state, today)`. The `setLastEcho` action only fires when an echo actually displays.

**Once-per-day rule:** Anniversary banners use the SAME `lastEcho` meta key as Echo. If the user already saw an anniversary today, reloading shows nothing. If anniversary fires today, it sets `lastEcho = today` so neither anniversary nor echo shows again that day. This single key handles both because the user-facing concept is "did I see a temporal banner today?"

### F2.5 Solstice / Equinox treatment

**Date detection:** `utils/solstice.ts` exports a hardcoded lookup table for the years 2025–2105 (the maximum lifespan of the 4000-week grid for any user born after 1948). Each entry is the local-calendar UTC date the solstice/equinox occurs:

```ts
const SOLSTICE_DATES: Record<number, { vernal: string; summer: string; autumnal: string; winter: string }> = {
  2025: { vernal: '2025-03-20', summer: '2025-06-21', autumnal: '2025-09-22', winter: '2025-12-21' },
  2026: { vernal: '2026-03-20', summer: '2026-06-21', autumnal: '2026-09-22', winter: '2026-12-21' },
  // ... through 2105
}

export function currentSolsticeOrEquinox(today: Date): 'vernal' | 'summer' | 'autumnal' | 'winter' | null {
  const year = today.getFullYear()
  const entry = SOLSTICE_DATES[year]
  if (entry === undefined) return null
  const todayStr = localDateString(today)
  if (todayStr === entry.vernal) return 'vernal'
  if (todayStr === entry.summer) return 'summer'
  if (todayStr === entry.autumnal) return 'autumnal'
  if (todayStr === entry.winter) return 'winter'
  return null
}
```

**Timezone caveat:** The hardcoded dates are the local-calendar dates for any timezone within ±12h of UTC where the solstice falls within the same calendar day. For the small number of users in extreme east/west timezones where the solstice straddles a day boundary, the treatment may show a day early or a day late. This is acceptable — the granularity is "the local day on which the solstice occurs," and a one-day variance preserves the ritual's intent.

**Visual:** When `currentSolsticeOrEquinox(today)` returns non-null, FzPage applies a body class `solstice-{name}`:

```css
body.solstice-vernal,
body.solstice-summer,
body.solstice-autumnal,
body.solstice-winter {
  background: #1a1a2e;
  color: #f7f7f0;
}
body[class*="solstice-"] .hexagon { color: #f7f7f0; }
body[class*="solstice-"] .hexagon.current-week {
  color: #F7B808;
  animation-duration: 5.5s;  /* the breath slows */
}
```

A small caps date label appears at the top of the page (above the title) for solstice days only:
```vue
<div v-if="solsticeName !== null" class="solstice-label">
  {{ solsticeLabelText }}  <!-- e.g. "VERNAL EQUINOX · 2026" -->
</div>
```
in `font-variant: small-caps`, `letter-spacing: 0.3em`, `color: #F7B808`, `font-size: 0.7rem`, centered.

**Library quote swap:** `useQuotes` already exists. Stage 5 adds a new module `data/solsticeQuotes.ts` with 4 longer curated quotes (one per mile-marker, ~120-200 chars each, from sources like Marcus Aurelius / Montaigne / Annie Dillard — the kind of grounding memento-mori writing). When the body has a `solstice-*` class, `FzLibrary` reads from this corpus instead of the Stage 3 `data/libraryQuotes.ts`.

**Reduced motion:** The slowed breathing and the small-caps label both still show. The transition INTO the solstice mood is not animated — the user opens the page and the mood is already different. There's nothing to skip.

### F2.6 Quiet Mode

**Trigger:** Pressing `Q` (via `useKeyboard`) flips `quietMode.value`. Pressing `Q` again or Escape returns to normal.

**Visual:** Single CSS class on the page root container:
```css
.fz-quiet .title,
.fz-quiet .subtitle,
.fz-quiet .vow-line,
.fz-quiet .toolbar,
.fz-quiet .library,
.fz-quiet .long-now-footer {
  display: none;
}
.fz-quiet .hexagon-grid {
  /* expand to fill viewport */
  max-width: 100vw;
}
```
The grid takes the full viewport width. Modals, banners, and the search input all stay visible if open — Quiet Mode hides chrome, not state.

**One level only.** Progressive Quiet (Q twice for "deepest quiet" with favicon swap) is a Stage 6 idea. v1 is one toggle.

**Persistence:** Quiet Mode is session-only. It doesn't persist to localStorage. The user always opens fz.ax in normal mode; Quiet is for the current viewing session.

### F2.7 Whisper Search

**Trigger:** Pressing `/` (via `useKeyboard`) opens `FzSearch.vue`. The component is a small input bar that appears at the top of the page (below the title, above the grid, in the same horizontal band as the FzBanner area).

**Behavior:**
- Input gets focus immediately on open
- Typing calls `useHighlight().setSearch(state, query)` — debounced 150ms
- Empty query → `useHighlight().clear()`
- Escape closes the search input AND clears the highlight
- Click outside (anywhere not in the input) closes-and-clears

**Visual:**
- Input: 1px solid `#0847F7` border, italic placeholder "search whispers", 0.9rem font, max-width 360px centered
- Lit weeks (matching): full opacity, no extra outline (different from Constellation — search is filtering, not constellating), but a 1.5px outline in `#F7B808` when `lit && !constellation`
- Non-lit weeks: opacity 0.25 (matches the "still visible as context" principle)
- A small count line below the input: "{N} whispers" in `#888888` 0.7rem when N > 0

**Anchored weeks in search:** Anchored weeks that match the query keep their red ring AND get the lit treatment. Anchored weeks that don't match get the dim treatment (opacity 0.25) but the ring stays at full opacity — anchors are always visible. The "anchors float to the top" idea from the spec is reinterpreted as "anchors stay visible even when dimmed" — a more elegant, less list-heavy version.

### F2.8 The Long Now footer

**Component:** `components/FzLongNow.vue`. Mounted once at the bottom of FzPage, after the existing `FzScrollHex` and `FzToolbar`.

**Rendering:**
```vue
<template>
  <div class="long-now-footer">
    <span class="zero">0</span>{{ year }} · the long now
  </div>
</template>
```
Where `year = new Date().getFullYear()`. The leading `0` is wrapped in a span with `color: #F7B808` (yellow). The rest of the line is `color: #888888`, font-size 0.7rem, centered, with `font-style: italic`. Padding 1.5rem above the line so it's clearly a footer.

**Hidden by Quiet Mode.** Hidden by Solstice mode? No — the long-now line is the most contemplative line in the entire app. It stays.

**No Jan 1 pulse animation.** The leading-zero color treatment is enough. Stage 6 may add the pulse.

### F2.9 Anchored Weeks

**Trigger:**
- Right-click on a hexagon → `event.preventDefault()` → toggle anchor (via `addAnchor` or `removeAnchor`)
- Touch long-press (≥500ms with no movement) → toggle anchor

**FzHexagon implementation:**
```ts
let touchStartTime = 0
let touchMoved = false

function onContextMenu(event: MouseEvent): void {
  event.preventDefault()
  emit('anchor-toggle', props.index)
}

function onTouchStart(_: TouchEvent): void {
  touchStartTime = Date.now()
  touchMoved = false
}

function onTouchMove(_: TouchEvent): void {
  touchMoved = true
}

function onTouchEnd(_: TouchEvent): void {
  if (touchMoved) return
  if (Date.now() - touchStartTime >= 500) {
    emit('anchor-toggle', props.index)
  }
}
```
The touch handlers are added inside FzHexagon. FzGrid catches the `anchor-toggle` event and calls `addAnchor` or `removeAnchor` (whichever is appropriate based on current state). All wrapped in try/catch — the existing throw-and-close pattern.

**Visual:** A 3px ring (border) around the hexagon, in `#ff3b30` (the existing anchor red — same as the Echo border, intentional color reuse). No dot inside. The ring is applied via a `.anchored` class on the hexagon. On hover, the ring's `box-shadow: 0 0 6px #ff3b30` activates for a quiet glow.

The ring is independent of the lit/dim/current treatment. An anchored week can be any other state simultaneously.

**Persistence:** Anchors live in `state.anchors` as a sorted, unique array of week indices. The validator at the storage boundary enforces sorted+unique.

**Poster export integration:** `utils/poster.ts` is updated to render anchored weeks with a small ring around their cell in the SVG. The ring uses the same `#ff3b30` and is the same proportional size as the screen ring. No anchor list at the bottom of the poster — the rings on the grid speak for themselves.

**Search integration:** Already covered in F2.7 — anchors stay visible in dimmed search results.

---

## Visual design choices (locked)

| Decision | Value | Why |
|---|---|---|
| Vow color | `#0847F7` (blue, italic) | Reflective, not assertive — different from the assertive yellow of Marks |
| Vow size | 0.65rem | Truly tiny — forces verbal constraint |
| Vow placeholder | "press v to set your vow" | Teaches the keyboard shortcut without UI clutter |
| Anchor color | `#ff3b30` (existing) | Reuse the existing red to avoid color sprawl |
| Anchor visual | 3px ring (no dot) | More sophisticated than dot+ring; doesn't crowd the glyph |
| Constellation lit | 1.5px yellow outline + scale 1.05 | Recognition, not isolation |
| Constellation dim | opacity 0.3 | Visible as context |
| Search lit | 1.5px yellow outline (no scale) | Differentiate from constellation visually |
| Search dim | opacity 0.25 | Slightly more dim than constellation — "tunnel of focus" |
| Solstice background | `#1a1a2e` (dark navy) | Not pure black — too aggressive |
| Solstice breath | 5.5s (vs 2.4s normal) | Time itself slows on mile-marker days |
| Solstice label | small-caps, 0.3em letter-spacing, yellow, 0.7rem | Ceremonial without being loud |
| Anniversary banner | reuses Echo styling, label "anniversary" | One color family, contextual differentiation |
| Long Now footer | leading 0 in `#F7B808`, rest `#888888`, 0.7rem italic | Quiet typographic accent |
| Monday animation | 1.2s metamorphosis-in-place (shrink + bloom) | Time transforms; it doesn't move |

---

## Out of scope (deferred to Stage 6 or later)

- **Constellation connecting lines.** Outline + scale is sufficient for v1.
- **Long Now Jan 1 leading-zero pulse animation.** Steady color is enough.
- **Quiet Mode "deepest quiet" second press.** One toggle in v1.
- **Vow review on birthday.** Belongs with F3.3 Annual Letter in Stage 6.
- **Anchors as a separate result list at the top of search.** Reinterpreted as "anchors stay visible even when dimmed" — same intent, less list-heavy.
- **Live Monday animation across sleep/wake of the device.** Implemented via setTimeout + visibilitychange recomputation; fully reliable on always-on devices but may miss the exact moment if the device was asleep through midnight (the after-the-fact notice catches it on next open, so no information is lost).
- **Astronomical solstice math.** Hardcoded table is sufficient through 2105.
- **`FzKeyboardHelp` `?` overlay.** Stage 6 (F3.5).
- **Arrow-key hexagon cursor.** Stage 6 (F3.5).
- **Theme switching / dark mode.** Stage 6 (F3.4).
- **First Run Ceremony.** Stage 6 (F3.1).
- **Birthday Hexagon halo.** Stage 6 (F3.2).
- **Annual Letter sealed/unsealed.** Stage 6 (F3.3).

---

## Testing strategy

Stage 5 must keep all 179 existing tests passing AND add ~30 new tests. New spec files:

| Spec file | Tests | Coverage |
|---|---|---|
| `tests/useKeyboard.spec.ts` | 6 | Input-active rule, Escape always fires, V/Q// only when not in input, subscription lifecycle |
| `tests/useHighlight.spec.ts` | 8 | Constellation set/clear, Search set/clear, opening Search clears Constellation, empty query → idle, lit set membership, glyph-matching logic, multi-mark non-collision |
| `tests/useAnniversary.spec.ts` | 6 | Find by week-of-year, year filter (must be ≥1 year ago), whisper required, sort by years-ago, top-3 cap, empty case |
| `tests/useTodaysBanner.spec.ts` | 5 | Anniversary precedence over Echo, Echo fallback when no anniversaries, null when neither, lastEcho gates both, state.value === null returns null |
| `tests/solstice.spec.ts` | 5 | Vernal equinox 2026 detection, non-solstice day returns null, year out of table returns null, all four mile markers detected for one year |
| `tests/useFzState.spec.ts` (extend) | 12 | setVow validation (length 1-240, trim, throw on null state, persistence, preserves other fields), clearVow, addAnchor (sorted insert, idempotent, range check), removeAnchor (idempotent), setLastVisitedWeek (first load, gap, same week, backward clock, returns gap value) |
| `tests/storage.spec.ts` (extend) | 6 | hasValidVow accepts valid VowEntry, rejects empty text, rejects 241-char text, rejects bad date; hasValidAnchors accepts sorted unique array, rejects unsorted, rejects duplicates, rejects out-of-range |

**Total: ~48 new tests.** Final count: ~227.

What is NOT tested in Vitest (manual review at smoke-test time):
- F2.2 live Monday animation (timing-dependent)
- F2.3 visual constellation rendering (CSS / DOM)
- F2.5 solstice CSS application
- F2.6 quiet mode CSS application
- F2.9 long-press touch handler (no Vitest touch event harness)

These are verified manually during the build phase smoke test.

---

## Implementation order

The plan that follows this spec will lay these out as ~20 bite-sized tasks. Build sequence (each task small enough for one subagent dispatch):

1. **Storage validation extensions** — `hasValidVow`, `hasValidAnchors`, tests
2. **`useFzState` actions** — `setVow`, `clearVow`, `addAnchor`, `removeAnchor`, `setLastVisitedWeek`, tests
3. **`setDob` refinement** — reset `lastVisitedWeek`/`lastEcho`/`lastSundayPrompt` on DOB change, test
4. **`useKeyboard` composable + tests**
5. **`useHighlight` composable + tests**
6. **`useAnniversary` composable + tests**
7. **`useTodaysBanner` composable + tests**
8. **`utils/solstice.ts` + `data/solsticeQuotes.ts` + tests**
9. **`FzVowModal` component** + wire into FzTitle (Vow display)
10. **`FzMondayNotice` component** + wire into FzPage onMounted
11. **`FzBanner` component** (replaces FzEcho at the template site, FzEcho.vue stays as Stage-3 reference but is no longer rendered) + wire into FzPage
12. **`FzSearch` component** + wire into FzPage
13. **`FzLongNow` component** + wire into FzPage
14. **`FzHexagon` updates** — `lit`, `dim`, `anchored` props; right-click + long-press handlers; v-memo tuple updates
15. **`FzGrid` updates** — pass useHighlight state down; handle anchor-toggle event
16. **`FzMarkPopover` updates** — add the constellation button
17. **`FzPage` orchestration** — mount useKeyboard, wire all the above; Quiet Mode class binding; Solstice body class
18. **`utils/poster.ts` updates** — anchor ring rendering in SVG export
19. **CSS for solstice classes, lit/dim, anchored ring, vow line, long-now footer, monday animation**
20. **Smoke test + final verification + tag**

The plan will inline exact code for each task (per the writing-plans skill format).

---

## Definition of done

- [ ] All 9 F2.* features implemented per this spec
- [ ] All 179 existing tests still pass
- [ ] ~48 new tests added (final count ~227)
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm generate` all clean
- [ ] Manual smoke test: vow set/clear, search lit/dim, anchor right-click + long-press, constellation activate, Q quiet mode, banner shows on a state with anniversary marks, solstice CSS visible when body class is forced, long-now footer rendered, monday notice fires for state with stale lastVisitedWeek
- [ ] No third-party dependencies added
- [ ] No regressions to Stage 1-4 features (poster, backup, restore, easter egg, sunday modal, push, install, library quotes, echo)
- [ ] Tag `stage-5-tier-2-rituals` at HEAD of master
