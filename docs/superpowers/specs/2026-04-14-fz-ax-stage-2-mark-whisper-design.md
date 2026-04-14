---
title: fz.ax Stage 2 · The Mark + The Whisper
status: draft
date: 2026-04-14
author: autopilot run
parent: docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md
stage: 2
feature_ids: [F0.1, F0.2, F0.3, F0.4]
---

# fz.ax Stage 2 · The Mark + The Whisper

> One character. One sentence. One click.

## Goal

Turn the static 4,000-hexagon grid into a living practice by letting the user mark any week with a single character and whisper one sentence to it. Stage 2 is the core interactive spine of the whole redesign — every tier-1/tier-2/tier-3 feature (Library, Echo, Constellation, Anniversary, Annual Letter, Whisper Search) reads from or writes to the Mark + Whisper data that Stage 2 establishes.

**In scope** (Tier 0 of the parent spec): F0.1 The Mark, F0.2 The Personal Palette, F0.3 The Whisper, F0.4 Hexagon glyph rules update.

**Out of scope:** Sunday ritual, Library quotes, Echo, Poster, Backup, PWA, First Run Ceremony, Dark Mode, Keyboard navigation, every other feature. Those are later stages.

## Context

Stage 1 (shipped, tag `stage-1-foundations`) established:
- `FzState` types with `weeks: Record<number, WeekEntry>` already defined
- `useFzState` composable with `setDob`, `resetState`, and the singleton pattern
- `FzGrid` rendering 4,000 `FzHexagon` instances
- `FzHexagon` with `index`, `state` (past/current/future), `hoverText`, `modalOpen` props
- Hardened `localStorage` wrappers and a top-level `isValidFzState` validator
- Inline Stage 2 guidance in `composables/useFzState.ts` about validation at the boundary, `WeekEntry | undefined`, reference-replace re-render cost, and deep validation

Stage 2 builds on all of it. The existing types already cover the Stage 2 data shape — no breaking changes.

## Soul (unchanged from parent spec)

- Local-first only. Every mark and whisper lives in `localStorage`, never sent to a server.
- Single page, single purpose. Marks open a popover; the popover is dismissable and never navigates.
- The aesthetic is sacred. Yellow `#F7B808`, blue `#0847F7`, hexagon glyphs, the existing voice.
- The constraint is the feature. Exactly one character per Mark. Exactly one sentence per Whisper.
- No accounts, no cloud, no analytics, no third-party scripts.

## Feature design

### F0.1 · The Mark

**What it does.** Each week can hold exactly one character. Clicking a hexagon opens a centered modal-style popover anchored to that week. Inside the popover: a date range header, the personal palette (up to 8 recently-used Marks as one-tap buttons), a one-character free-text input, a whisper textarea, and save/clear affordances.

**One character means one grapheme cluster.** `'❤'.length === 1` but `'👨‍👩‍👧'.length === 8`. We use `Intl.Segmenter` with granularity `'grapheme'` to count exactly one user-perceived character. The text input's `maxlength` attribute is a fallback hint but the real validation is at the composable boundary (see below).

**Save flow.** The popover auto-saves every mutation:
- Tapping a palette button: writes the mark instantly.
- Typing in the one-char input and pressing Enter (or input blur): writes the mark.
- Typing in the whisper textarea: writes on blur, debounced if typing actively.
- Clicking the `4⬢⏣⬡` button or pressing Escape or clicking the backdrop: closes the popover. Unsaved in-progress input is discarded (matches the existing FzDobModal behavior).

**Clear flow.** A tiny "clear" affordance in the popover deletes the Mark (and the Whisper) for that week. The week returns to an unmarked state.

**`setMark(week, mark)` composable action.** Validates:
- `week` is an integer in `[0, totalWeeks)` — else throws.
- `mark` is a string containing exactly one grapheme cluster — else throws.

Validation at the boundary is non-negotiable per the seam comment in `useFzState.ts`. Throws instead of silent failure because the UI should never pass invalid data (and if it does, the test suite should catch it loudly).

Upsert pattern:
```ts
state.value = {
  ...state.value,
  weeks: {
    ...state.value.weeks,
    [week]: {
      mark,
      whisper: state.value.weeks[week]?.whisper,
      markedAt: new Date().toISOString(),
    },
  },
}
```

Note the `?.whisper`: if a week already had a whisper, setting a new mark preserves it. If it didn't, the whisper is `undefined` and omitted from the stored entry via JSON serialization semantics.

### F0.2 · The Personal Palette

**What it does.** Reading `state.value.weeks`, derive the top 8 most-used Marks ordered by recency-weighted frequency, and display them in the popover as one-tap palette buttons.

**Why recency-weighted.** A user who marked lots of "w" (work) in 2019 but is now marking "❤" in 2025 should see "❤" first. Pure frequency would keep "w" on top forever. Pure recency would demote anything older than yesterday. The blend: each mark contributes `1 / (1 + days_since_marked)` to its glyph's score.

**The algorithm:**
```ts
function usePalette(state: Ref<FzState | null>, today: Ref<Date>, limit = 8): ComputedRef<string[]> {
  return computed(() => {
    if (state.value === null) return []
    const scores = new Map<string, number>()
    const now = today.value.getTime()
    for (const entry of Object.values(state.value.weeks)) {
      const markedAt = new Date(entry.markedAt).getTime()
      const daysSince = Math.max(0, (now - markedAt) / MS_PER_DAY)
      const weight = 1 / (1 + daysSince)
      scores.set(entry.mark, (scores.get(entry.mark) ?? 0) + weight)
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([mark]) => mark)
  })
}
```

**Edge cases:**
- Empty palette when no weeks are marked: popover shows only the free-text input.
- User has marked more than 8 unique glyphs: the bottom 8 are hidden (still searchable via whisper search later).
- Two glyphs tied in score: sort stable by first occurrence, then lexicographic.

**Where it lives.** A new composable `composables/usePalette.ts`. Pure function. Fully unit-tested.

### F0.3 · The Whisper

**What it does.** Each marked week can also hold exactly one sentence (soft-capped at 240 chars per parent spec). Visible on the desktop hover tooltip (inline in `FzHexagon`'s existing `hover-text` span) and inside the popover for touch users.

**`setWhisper(week, whisper)` composable action.** Validates:
- `week` is an integer in `[0, totalWeeks)` — else throws.
- `whisper` is a string. Empty string removes the whisper field but keeps the Mark. No length enforcement (soft cap is a UI concern).
- `week` must already have a Mark — else throws. (You can't whisper to an unmarked week; a whisper without a mark is orphaned data the grid can't display.)

Upsert pattern:
```ts
const existing = state.value.weeks[week]
if (existing === undefined) {
  throw new Error(`setWhisper: week ${week} has no mark; call setMark first`)
}
state.value = {
  ...state.value,
  weeks: {
    ...state.value.weeks,
    [week]: whisper === ''
      ? { mark: existing.mark, markedAt: existing.markedAt }
      : { mark: existing.mark, whisper, markedAt: new Date().toISOString() },
  },
}
```

**Desktop hover tooltip.** Currently `FzHexagon` shows only the date range on hover. Extend it to show the whisper under the date range when one exists, separated by a subtle divider.

**Touch path.** On touch devices, there is no hover state. The whisper is visible inside the popover (which opens on tap). The hexagon component behaves the same on desktop and touch — the only difference is that `hover-text` never becomes visible on touch (CSS `:hover` is a no-op).

### F0.4 · Hexagon glyph rules — the Stage 2 delta

**Current (Stage 1) behavior.** `FzHexagon` renders `⬢` for past, `⏣` for current, `⬡` for future. The current week has yellow color. No marks, no Mark display.

**New (Stage 2) behavior.** `FzHexagon` receives a new optional prop `mark?: string`. When `mark` is present, the hexagon renders the mark glyph in yellow, regardless of past/current/future state. When `mark` is absent, the existing state-based symbol is rendered.

The "current week" visual signal changes from symbol substitution (`⏣`) to a soft glow animation. The glow runs whether or not the week is marked. A marked current week shows its mark with the glow on top. An unmarked current week shows `⏣` with the glow.

```css
.hexagon.current-week {
  animation: current-glow 2.4s ease-in-out infinite;
}
@keyframes current-glow {
  0%, 100% { text-shadow: 0 0 0 transparent; }
  50% { text-shadow: 0 0 6px #F7B808; }
}
```

Reduced motion users get the glow as a static `text-shadow` instead of an animation.

## Data model (no changes)

The parent spec already defined `WeekEntry`:

```ts
export interface WeekEntry {
  mark: string
  whisper?: string
  markedAt: string
}
```

Stage 2 uses this shape as-is. No new types. No version bump.

## Composable API additions

`useFzState` gains three new actions. The `UseFzStateReturn` interface grows:

```ts
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  clearMark: (week: number) => void
  resetState: () => void
}
```

All three new actions:
- Validate arguments and throw `Error` on violations (not silent no-ops).
- Require `state.value !== null` — throws if called before DOB is set.
- Write through to `localStorage` via `writeState()` on success.

`clearMark(week)` removes the entire WeekEntry from `state.value.weeks`.

A new composable `usePalette(state, today, limit?)` returns `ComputedRef<string[]>` as described above. Exported from `composables/usePalette.ts`.

## Deep validation — tightening `isValidFzState`

The parent spec's Stage 2 seam warning says: *"Before Stage 2 reads `state.value.weeks[i].mark`, either tighten the validator to check `WeekEntry` shape or add a per-entry guard at every access site."*

Stage 2 tightens the validator. New shape:

```ts
function isValidFzState(value: unknown): value is FzState {
  // ... existing top-level checks ...
  if (!hasValidWeeks(v.weeks)) return false
  return true
}

function hasValidWeeks(weeks: unknown): weeks is Record<number, WeekEntry> {
  if (weeks === null || typeof weeks !== 'object' || Array.isArray(weeks)) return false
  for (const [key, entry] of Object.entries(weeks as Record<string, unknown>)) {
    if (!/^\d+$/.test(key)) return false
    if (entry === null || typeof entry !== 'object') return false
    const e = entry as Record<string, unknown>
    if (typeof e.mark !== 'string' || e.mark === '') return false
    if (typeof e.markedAt !== 'string') return false
    if (e.whisper !== undefined && typeof e.whisper !== 'string') return false
  }
  return true
}
```

A malformed `weeks` entry now causes the entire state to be rejected as corrupt and the user falls back to first-run. This trades off strictness for safety — we never read garbage.

## Component changes

### New: `components/FzMarkPopover.vue`

- Props: `open: boolean`, `weekIndex: number | null`
- Emits: `close`
- Reads: `useFzState`, `usePalette`
- Structure:
  - Backdrop (click to close)
  - Card:
    - Header: `.label` showing the week's date range + a tiny `×` close affordance
    - Section: "palette" grid of up to 8 mark buttons (one-tap apply)
    - Section: one-char text input with Enter to save
    - Section: whisper textarea with on-blur save
    - Footer: subtle `clear` link, big yellow `4⬢⏣⬡` save/close button

- Keyboard:
  - `Escape` closes
  - `Enter` in one-char input saves the mark and moves focus to whisper textarea
  - `Tab` through palette → one-char input → whisper → close button in natural order
- Uses the existing `.btn-76` styling for the save button
- Reuses yellow/blue palette and existing modal overlay pattern from `FzDobModal`

### Modified: `components/FzHexagon.vue`

- New optional prop: `mark?: string`
- New optional prop: `whisper?: string` (used to enrich the hover tooltip)
- Template change:
  - If `mark` is present, render `{{ mark }}` instead of the state-derived symbol
  - The `.hover-text` span now renders two lines when a whisper exists: date range, then whisper in italic
- Style change: `.current-week` gains the glow animation (separated from the color, so a marked current week can combine both)

`v-memo` treatment. `FzHexagon` is re-rendered 4,000 times per `FzGrid` render. To avoid re-render explosion on every `setMark` write, `FzGrid` uses `v-memo` on the `FzHexagon`:

```vue
<FzHexagon
  v-for="i in indices"
  :key="i"
  v-memo="[i === currentIndex, markFor(i), whisperFor(i)]"
  :index="i"
  :state="getState(i)"
  :hover-text="getHoverText(i)"
  :mark="markFor(i)"
  :whisper="whisperFor(i)"
  :modal-open="modalOpen"
  @click="onHexClick(i)"
/>
```

With `v-memo`, only hexagons whose `[isCurrent, mark, whisper]` tuple changed re-render on state mutation. A `setMark(100, '❤')` call re-renders exactly one hexagon.

### Modified: `components/FzGrid.vue`

- Passes `mark` and `whisper` props to each `FzHexagon` from `state.value.weeks[i]`
- Adds `onHexClick(index)` that emits up to `FzPage` to open the popover for that week
- The new click handler replaces "do nothing" with "open the mark popover"

### Modified: `components/FzPage.vue`

- Adds state for the popover: `const markPopoverOpen = ref(false)` and `const markPopoverWeek = ref<number | null>(null)`
- Passes `markPopoverOpen` as the `modalOpen` prop to `FzGrid` so hover tooltips suppress while the popover is open (matches existing FzDobModal behavior)
- Listens to `hex-click` from `FzGrid` and opens the popover

## Interaction flows

### Marking a week

1. User clicks hexagon at week 100. `FzGrid` emits `hex-click` with `100`.
2. `FzPage` sets `markPopoverWeek = 100` and `markPopoverOpen = true`.
3. `FzMarkPopover` opens, fetches `state.value.weeks[100]`, pre-fills the one-char input with the existing mark if any and the whisper textarea with the existing whisper if any.
4. User clicks a palette button showing `❤`. `setMark(100, '❤')` fires. State updates. `FzHexagon` at index 100 re-renders (others are v-memo'd out). Popover stays open so the user can also whisper.
5. User types "the first week we knew" in the whisper textarea. On blur or popover close, `setWhisper(100, 'the first week we knew')` fires.
6. User clicks the `4⬢⏣⬡` button or Escape. Popover closes. Hexagon at week 100 now displays `❤` in yellow, with hover text showing the date range + the whisper in italic.

### Clearing a week

1. User clicks an already-marked hexagon. Popover opens pre-filled.
2. User clicks the small `clear` affordance.
3. `clearMark(100)` fires. The entire `WeekEntry` is removed from `state.value.weeks`.
4. Hexagon at index 100 reverts to its state-based symbol (`⬢`/`⏣`/`⬡`).
5. Popover closes immediately after clearing — clearing is a deliberate action and reopening via click is trivial.

### Hover preview (desktop)

1. User hovers hexagon at week 100 (marked with `❤`, whispered "first kiss").
2. Existing `FzHexagon` hover-text span becomes visible.
3. Text shows: `may 14 - may 20, 1995` on line 1, `first kiss` in italic gray on line 2.
4. User moves mouse away. Tooltip hides.

### First mark with an empty palette

1. User's state has no marks yet. `usePalette` returns `[]`.
2. User clicks hexagon at week 100. Popover opens.
3. The palette section renders nothing (pure minimalism — no "your marks appear here" placeholder).
4. User types `w` in the one-char input, presses Enter.
5. `setMark(100, 'w')`. State updates. Palette now has 1 entry.
6. User keeps using `w`. Over time, the palette fills.

## Visual design

### Popover layout

```
┌─────────────────────────────────────┐
│  may 14 — may 20, 1995          × │  ← date range + close
├─────────────────────────────────────┤
│                                     │
│   ❤   ☀   w   ✈   ☆   M   喜   ?  │  ← palette (8 slots)
│                                     │
├─────────────────────────────────────┤
│   your mark                         │
│   ┌───┐                             │
│   │ ❤ │                             │
│   └───┘                             │
├─────────────────────────────────────┤
│   whisper (optional)                │
│   ┌─────────────────────────────┐   │
│   │ the first week we knew      │   │
│   │                             │   │
│   └─────────────────────────────┘   │
├─────────────────────────────────────┤
│       [clear]         [4⬢⏣⬡]       │
└─────────────────────────────────────┘
```

- Overall width: ~360px, centered in the viewport, responsive to small screens
- Backdrop: `rgba(0, 0, 0, 0.75)` matching FzDobModal
- Card: white background, 2rem padding, no border-radius (to match the sharp aesthetic of the site)
- Palette buttons: 40x40px, yellow glyph on white, thin blue border, hover inverts the colors
- One-char input: 60px wide, centered, yellow glyph when filled
- Whisper textarea: full width, 3 lines tall by default, soft counter at 200 chars
- Save button: reuses `.btn-76` from FzDobModal

### Glow animation

- 2.4s ease-in-out infinite
- Uses `text-shadow` not `box-shadow` (works for text glyphs without affecting layout)
- Disabled under `prefers-reduced-motion: reduce` — becomes a static text-shadow

## Testing strategy

Following the Stage 1 pattern: TDD for composables and utilities, visual/manual for components.

### New tests

- `tests/usePalette.spec.ts` — 6–8 tests covering empty state, single-mark state, multi-mark state, recency weighting, ties, `limit` parameter, and integration with `useFzState`
- `tests/useFzState.spec.ts` — extended with tests for:
  - `setMark` happy path
  - `setMark` throws on invalid week
  - `setMark` throws on multi-char mark
  - `setMark` throws when state is null
  - `setMark` preserves existing whisper
  - `setWhisper` happy path
  - `setWhisper` throws when week has no mark
  - `setWhisper` empty string removes the whisper
  - `clearMark` happy path
  - `clearMark` is a no-op when the week is not marked (silent; not a throw)
- `tests/storage.spec.ts` — extended with tests for the tightened `isValidFzState`:
  - rejects a blob with `weeks` containing a non-object entry
  - rejects a blob where a `WeekEntry` is missing `mark`
  - rejects a blob where a `WeekEntry.mark` is an empty string
  - rejects a blob where `weeks` has non-integer keys
  - accepts a valid blob with multiple week entries

### Grapheme cluster utility

A small new utility `utils/grapheme.ts`:

```ts
export function isSingleGrapheme(value: string): boolean {
  if (value === '') return false
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const segments = [...segmenter.segment(value)]
  return segments.length === 1
}
```

Tested in `tests/grapheme.spec.ts`:
- `isSingleGrapheme('')` → false
- `isSingleGrapheme('a')` → true
- `isSingleGrapheme('ab')` → false
- `isSingleGrapheme('❤')` → true
- `isSingleGrapheme('👨‍👩‍👧')` → true (family is one grapheme despite 8 code points)
- `isSingleGrapheme('❤❤')` → false
- `isSingleGrapheme('喜')` → true
- `isSingleGrapheme('a\u0308')` → true (combined character "ä")

`setMark` uses `isSingleGrapheme` for its validation.

## Accessibility

- `FzMarkPopover` uses `role="dialog"` with `aria-modal="true"`
- Focus trap: Tab cycles within the popover only; Shift+Tab at the first element wraps to the last
- Focus lands on the first palette button (or one-char input if palette is empty) when the popover opens
- `Escape` closes the popover and returns focus to the hexagon that opened it
- Palette buttons have `aria-label="apply mark {glyph}"`
- Hexagons gain `role="button"` and `tabindex="0"` (the existing FzHexagon didn't have these because nothing was clickable — Stage 2 makes them interactive)

## Non-goals (Stage 2 explicit exclusions)

- **No keyboard navigation across the grid.** Stage 3+ (Tier 3 F3.5) adds arrow keys. Stage 2 only needs keyboard within the popover.
- **No search across whispers.** Tier 2 F2.7 adds that in a later stage.
- **No constellation lines.** Tier 2 F2.3.
- **No first run ceremony.** Tier 3 F3.1. Stage 2 keeps the existing `FzDobModal`.
- **No Sunday ritual.** Tier 1 F1.1.
- **No libraries, echoes, anniversaries.** Tier 1 + 2.
- **No persistence to anywhere besides localStorage.** The soul rule.
- **No per-hexagon popover positioning.** A centered modal-style popover is simpler and mobile-friendly.

## Risks and open questions

**R1: `Intl.Segmenter` browser support.** Available in all modern browsers (Chrome 87+, Firefox 125+, Safari 14.1+). No polyfill needed for our target audience, but the runtime `typeof Intl.Segmenter === 'undefined'` guard in the utility falls back to a single-code-point count if the API is missing. This keeps older browsers functional if not perfect.

**R2: Auto-save vs explicit save.** The popover auto-saves on every mutation, matching the "single character is the feature, commit instantly" ethos. The alternative would be an explicit save button, but that introduces dirty-state UX and undo concerns. We go with auto-save. The `4⬢⏣⬡` button is a close button that confirms what's already been saved.

**R3: Clearing a mark erases the whisper.** By design — the whisper can't outlive the mark. A user who wants to keep the whisper but change the mark can simply type a new mark without clearing first.

**R4: `v-memo` correctness.** Vue's `v-memo` has some known correctness edge cases when props mutate through shared object identity. We're using immutable spread everywhere, so each re-render sees a new top-level `state` object but per-hexagon `markFor(i)` returns a primitive string. This is the safe path for `v-memo`. A regression test would be nice but we don't unit-test components; we'll rely on manual visual verification that 4,000 hexagons don't re-render when one mark changes (checkable in Vue devtools).

## Decisions (committed for the plan)

These are the calls the plan will follow without re-asking:

- **Popover type:** centered modal, not anchored floating. Mobile-friendly and matches `FzDobModal`.
- **Auto-save:** every mutation writes immediately. No "save" button.
- **`clearMark`:** removes the whole WeekEntry (mark + whisper together).
- **Palette limit:** 8 slots.
- **Palette algorithm:** recency-weighted frequency, `score += 1 / (1 + daysSince)`.
- **Whisper soft cap:** 240 chars, counter visible past 200. No hard cutoff.
- **`setWhisper` without a prior mark:** throws. The UI never allows this.
- **Validation strategy:** throws, not silent no-ops. Tests verify the throws.
- **Grapheme cluster detection:** `Intl.Segmenter` with a code-point fallback for unsupported environments.
- **Re-render strategy:** `v-memo` on `FzHexagon` in `FzGrid`'s `v-for`.
- **Glow animation:** `text-shadow` based, 2.4s, disabled under `prefers-reduced-motion`.
- **Focus on open:** first palette button, or one-char input if palette is empty.
- **Escape:** closes the popover and returns focus to the originating hexagon.

## Files touched

**Created:**
- `composables/usePalette.ts` — recency-weighted palette derivation
- `components/FzMarkPopover.vue` — the click-to-mark popover
- `utils/grapheme.ts` — single-grapheme cluster detection
- `tests/usePalette.spec.ts`
- `tests/grapheme.spec.ts`

**Modified:**
- `composables/useFzState.ts` — adds `setMark`, `setWhisper`, `clearMark`; extends `UseFzStateReturn`
- `utils/storage.ts` — deepens `isValidFzState` to validate `WeekEntry` shape
- `components/FzHexagon.vue` — accepts `mark` and `whisper` props; renders mark when present; glow animation on current
- `components/FzGrid.vue` — passes mark/whisper to each hex; emits `hex-click`; uses `v-memo`
- `components/FzPage.vue` — hosts popover state; opens on `hex-click`
- `tests/useFzState.spec.ts` — +10 tests for the new actions
- `tests/storage.spec.ts` — +5 tests for the deeper validator

**Not touched:** `composables/useTime.ts`, `utils/migrate.ts`, `utils/dob.ts`, `types/state.ts`, `components/FzDobModal.vue`, `components/FzTitle.vue`, `components/FzScrollHex.vue`, `app.vue`, `nuxt.config.ts`, `.github/workflows/deploy.yml`.

## Success criteria

Stage 2 is successful when:

1. Clicking any hexagon opens the Mark popover anchored to that week.
2. Tapping a palette button or typing a single character and pressing Enter persists the Mark and re-renders only that hexagon (verified via Vue devtools).
3. The marked hexagon displays its glyph in yellow, with a glow if it is the current week.
4. Hovering a marked hexagon on desktop shows the date range and, if a whisper exists, the whisper in italic.
5. The palette fills with the user's most-used Marks, ordered by recency-weighted frequency.
6. `setMark` and `setWhisper` reject invalid inputs at the composable boundary with a throw (verified by tests).
7. `isValidFzState` rejects a corrupt `weeks` entry (verified by tests).
8. All existing Stage 1 tests continue to pass.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm generate` all clean.
10. The site still deploys to `fz.ax` via the unchanged GH Actions workflow.
