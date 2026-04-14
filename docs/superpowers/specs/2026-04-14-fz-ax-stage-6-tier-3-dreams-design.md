# fz.ax Stage 6 — Tier 3 Dreams Design Spec

> **The final dreams.** Stage 6 makes fz.ax unforgettable. After this stage, fz.ax is feature-complete per the parent spec — every F0/F1/F2/F3 feature is shipped. This is the stage where the app stops being a tool and becomes a relationship.

---

## Goal

Implement all 5 F3.* features from the parent spec (`docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md`) in a single stage:

- F3.1 First Run Ceremony
- F3.2 Birthday Hexagon
- F3.3 The Annual Letter
- F3.4 Dark Mode
- F3.5 Keyboard navigation

**Built atop:** stage-5-tier-2-rituals (62c06ee) on master with standing user consent.

---

## Soul

Stage 5 raised the aesthetic bar (vow in italic blue, anchors as red rings, solstice with slowed breath). Stage 6 must match that bar. Three principles for this stage:

1. **The first impression and the last impression matter most.** F3.1 is the first 30 seconds a new user spends with fz.ax. F3.3 is the moment the app earns its place in their life ("a letter from a year ago today"). Both must be sacred, not transactional.
2. **Dark mode is designed, not inverted.** Yellow stays gold. The new electric blue (#4A8EFF) is brighter, more vivid in the dark. The background is near-black (#0F0F0F) but not pure black — pure black is harsh.
3. **Mouse-free is a promise to the keyboard user.** The keyboard cursor doesn't follow the mouse. Hover doesn't move it. The cursor is a separate spatial pointer that exists only when keyboard navigation is active.

---

## Architecture commitments

### 1. CSS variables migration for dark mode

The current codebase has 72 hardcoded color references across 15 component files. Stage 6 migrates them to a small set of CSS variables defined in `assets/main.css`:

```css
:root {
  --fz-yellow: #F7B808;
  --fz-yellow-bg: #fffbe6;
  --fz-blue: #0847F7;
  --fz-bg: #FFFFFF;
  --fz-text: #333333;
  --fz-text-quiet: #888888;
  --fz-text-faint: #cccccc;
  --fz-border: #cccccc;
  --fz-red: #ff3b30;
  --fz-red-bg: #fff0ef;
}

[data-theme="dark"] {
  --fz-yellow: #F7B808;          /* unchanged — gold is sacred */
  --fz-yellow-bg: #2a2410;        /* dark amber for echo banner bg */
  --fz-blue: #4A8EFF;              /* lighter, electric in dark */
  --fz-bg: #0F0F0F;                /* near-black, not pure black */
  --fz-text: #e8e8e8;              /* warm light gray */
  --fz-text-quiet: #888888;        /* unchanged — gray is gray */
  --fz-text-faint: #444444;        /* dimmer placeholders */
  --fz-border: #2a2a2a;            /* subtle separators */
  --fz-red: #FF453A;               /* slightly warmer red on dark */
  --fz-red-bg: #2a1010;            /* dark red bg for echo */
}
```

The `data-theme` attribute is set on `<html>` by `useTheme` (see below). All scoped CSS in components migrates to use `var(--fz-yellow)` etc. Solstice CSS keeps its own hardcoded palette (#1a1a2e bg, #f7f7f0 text) — solstice is its own ritual mode, orthogonal to light/dark.

**Migration scope:** ~72 color refs across ~15 components. Each is a one-line find/replace. Bundled into one task because partial migration would leave the app visually inconsistent.

### 2. `composables/useTheme.ts` — singleton with matchMedia listener

Singleton pattern matching `useToday`, `useKeyboard`, etc. Watches `matchMedia('(prefers-color-scheme: dark)')`. Reads `state.prefs.theme` from useFzState. Computes `effectiveTheme: 'light' | 'dark'`. Applies `data-theme` attribute on `<html>` reactively. Provides `setTheme(theme)` which delegates to `useFzState.setTheme`. Solstice mode is checked before applying — if solstice is active, `data-theme` is removed (or set to `solstice` if needed) so the solstice CSS palette takes over.

### 3. `composables/useKeyboard.ts` — extended ShortcutKey type

Adds 6 new keys to the dispatch table:

```ts
type ShortcutKey =
  | 'v' | 'q' | '/' | 'escape' | 'enter'
  | 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright'
  | '?'
```

The input-active rule still applies (Enter, arrows, and `?` only fire when no input is focused, except Escape which always fires). The modifier-key guard (skip Ctrl/Cmd/Alt) still applies.

The `?` key on most layouts is `Shift+/`. Vue dispatches it as `event.key === '?'`. The normalizeKey function handles the literal `?` character.

### 4. `composables/useBirthday.ts` — pure derivation

Single pure function:

```ts
export function birthdayWeeksOfLife(dob: Date): Set<number>
```

Returns a Set of week indices for years 0..76 (inclusive). For each year `y`, compute the birthday date as `new Date(dob.getFullYear() + y, dob.getMonth(), dob.getDate())`. JS auto-rolls Feb 29 to Mar 1 in non-leap years (which is the desired behavior). Convert to a week index via `floor((birthdayDate - dob) / MS_PER_WEEK)`. Filter to indices in `[0, totalWeeks)`. Return as a Set for O(1) lookup.

77 values for a typical user (years 0 through 76). One Set instance per dob.

### 5. New `useFzState` actions

Three new actions, each follows the throw-and-close pattern:

#### `setTheme(theme: 'auto' | 'light' | 'dark'): void`

Validates the value, persists to `state.prefs.theme`, throws on `writeState` failure.

#### `writeAnnualLetter(text: string): void`

- Trims whitespace, validates 1-2000 char range
- Throws if today is not in a birthday week (defense — the UI shouldn't allow this but the action validates)
- Throws if a letter already exists with `sealedAt` in the current birthday week (one letter per birthday)
- Computes `unsealAt` as the date of next year's birthday week start (using birthdayWeeksOfLife + weekRange)
- Appends `{ text, sealedAt: now, unsealAt, read: false }` to `state.letters`
- Sorts the letters array by sealedAt ascending (the validator enforces this invariant at storage boundary)
- Throws on writeState failure

#### `markLetterRead(sealedAt: string): void`

- Finds the letter with the matching `sealedAt` (unique key)
- Sets `read: true`
- No-op if the letter is already read or doesn't exist
- Throws on writeState failure

### 6. Storage validation extensions

`utils/storage.ts` `isValidFzState` adds:

```ts
function hasValidLetters(letters: unknown): letters is LetterEntry[] {
  if (!Array.isArray(letters)) return false
  let prevSealedAt = ''
  for (const l of letters) {
    if (typeof l !== 'object' || l === null) return false
    const e = l as Record<string, unknown>
    if (typeof e.text !== 'string') return false
    if (e.text.length === 0 || e.text.length > 2000) return false
    if (typeof e.sealedAt !== 'string') return false
    if (Number.isNaN(new Date(e.sealedAt).getTime())) return false
    if (typeof e.unsealAt !== 'string') return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.unsealAt)) return false
    if (typeof e.read !== 'boolean') return false
    // Sortedness by sealedAt ascending
    if (prevSealedAt !== '' && e.sealedAt < prevSealedAt) return false
    prevSealedAt = e.sealedAt
  }
  return true
}
```

And tightens the prefs check to validate `prefs.theme` is one of `'auto' | 'light' | 'dark'`.

---

## Feature implementation

### F3.1 First Run Ceremony

**New component:** `components/FzFirstRun.vue`

Three click-to-advance screens. The component owns its own screen state (1, 2, or 3). Screen 3 contains the date input + save button. After save, the component emits `done` and FzPage stops rendering it (state.value !== null).

**Trigger:** FzPage renders `<FzFirstRun v-if="state.value === null" />`. Existing FzDobModal is no longer auto-opened on null state — FzFirstRun replaces that.

**Screen 1:**
- Pure white background (or solstice/dark per current theme)
- Centered, single line: *"the average human life is four-thousand weeks."*
- Typography: 1.1rem, weight 400, italic Roboto, color `#555` (or `var(--fz-text)`)
- Below: tiny gray hint *"(click to continue)"* in 0.6rem `#aaa`
- Click anywhere advances to screen 2 with a 0.4s cross-fade

**Screen 2:**
- Same layout
- Text: *"this page is a quiet place to notice them."*
- The word *"quiet"* is in slightly more italic emphasis (font-style: italic on the whole line, the word itself unchanged — the quiet IS the typographic choice)
- Same hint
- Click advances to screen 3

**Screen 3:**
- Text: *"when did you arrive?"*
- Below the text: a date input + a save button (the `4⬢⏣⬡` glyph button from FzDobModal)
- The date input defaults to "4000 weeks ago" (existing FzDobModal logic)
- On submit (Enter or button click): validate via `isReasonableDob`, then call `setDob`. On success, emit `done`. On failure, show inline error.
- Errors are wrapped in try/catch (writeState may throw on quota exceeded)

**Click delay:** Each screen has a 1500ms delay before clicks register. This prevents speed-tapping through the ceremony. Implementation: a `clickArmed: ref(false)` per screen, set to true after `setTimeout(1500)` on screen mount/transition. The hint text *"(click to continue)"* only appears after the delay. This is explicitly a design choice — the slowness IS the feature.

**Cross-fade:** 0.4s ease-in-out opacity transition between screens. Honors `prefers-reduced-motion`.

**Keyboard:** Pressing any key (except Escape) advances the same way clicks do. Escape on screen 1 or 2 does nothing (no exit during the ceremony). Escape on screen 3 with focus in the date input dismisses... actually no, Escape on screen 3 does nothing because there's no concept of "dismiss the first run." The user MUST enter a DOB.

### F3.2 Birthday Hexagon

**Computation:** `utils/birthday.ts` (new file) exports `birthdayWeeksOfLife(dob: Date): Set<number>`. Returns the 77 birthday week indices.

**Wiring:** FzGrid computes a `birthdaySet` computed from `state.value?.dob` and passes `birthday: boolean` to each FzHexagon. v-memo tuple gets `isBirthday(i)`.

**Visual:** FzHexagon adds a `birthday` prop. CSS:
```css
.hexagon.birthday::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--fz-yellow);
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(247, 184, 8, 0.4);
  pointer-events: none;
}
```

The ::before is a circular ring inscribed inside the square hexagon cell, with a soft radial glow. Static — no pulse. Visible on all 77 birthday weeks past, current, and future. The current week's breathing glow renders ON TOP (current-week class overrides via z-index or stacking).

**Interaction:** Hexagons remain clickable as before. The birthday halo is purely visual — no click behavior change.

### F3.3 The Annual Letter

**New component:** `components/FzAnnualLetter.vue`

The component is always mounted in FzPage. It computes its own internal state from `state.letters` and `today`:

```ts
type LetterMode =
  | { kind: 'idle' }
  | { kind: 'unseal'; queue: LetterEntry[]; current: LetterEntry }
  | { kind: 'write' }
```

**Mode resolution (on mount and on state/today changes):**

1. If state is null, `idle`.
2. Find all letters with `unsealAt <= today.localDateString` and `read === false`. Sort by sealedAt ascending. If non-empty, mode = `{ kind: 'unseal', queue, current: queue[0] }`.
3. Else, check if today is in the user's birthday week (use birthdayWeeksOfLife). If yes, check if a letter exists with `sealedAt` already in the current birthday week (compare via the week containing each sealedAt). If no such letter, mode = `{ kind: 'write' }`.
4. Else, `idle`.

**Unseal flow:**

- Modal opens with the letter's text
- The text fades in over 0.4s (no character-by-character — that's gimmicky)
- Header: *"⌑ a letter from one year ago today"* with the year in tiny gray (e.g., "2025")
- Below the text: *"I read this"* button
- On mount, `markLetterRead(currentLetter.sealedAt)` is called immediately (NOT on dismiss button click). This prevents re-showing if the user closes the modal without clicking the button.
- On button click or backdrop click: dismiss. If the queue has more letters, advance to the next one. If the queue is empty, transition to `write` mode if the user is in their birthday week.

**Write flow:**

- Modal opens with a textarea (8 rows, max 2000 chars)
- Header: *"a letter to yourself, one year from now"*
- Placeholder: *"remember where you are right now"*
- Save button: *"⌁ seal for one year"* (gold)
- On save: call `writeAnnualLetter(text)`. On success, dismiss. On failure (caught), show inline error.
- Backdrop click dismisses without saving (the user chose not to write this year).

**Why one component:** The two flows share the same modal frame, the same z-index, the same dismissal pattern, and the same rule that they never coexist. Splitting into two components would duplicate the modal scaffolding.

**Multiple unseals collision rule (sequential):** If the user has unread letters from years 2023, 2024, 2025 (e.g., they missed three birthday weeks), the unseal flow shows them oldest-first. After dismissing each, the queue advances. After all unseals are done, if the user is in their birthday week, the write flow opens. This is the spec's "unseal first then write" logic generalized.

### F3.4 Dark Mode

**State:** `state.prefs.theme: 'auto' | 'light' | 'dark'` (already typed, default `'auto'`).

**New action on useFzState:** `setTheme(theme)`. Validates the value, persists, throws on writeState failure.

**New composable:** `composables/useTheme.ts`. Singleton.

```ts
export function useTheme(): {
  effectiveTheme: ComputedRef<'light' | 'dark'>
  setTheme: (theme: 'auto' | 'light' | 'dark') => void
  init: () => void  // attaches the matchMedia listener
}
```

The `effectiveTheme` is computed from:
- `state.value?.prefs.theme` (from useFzState)
- The current matchMedia preference (a reactive ref updated by the listener)
- If solstice is active → return 'light' OR remove the data-theme attribute entirely (solstice CSS handles its own colors)

**Application:** A watcher in `useTheme.init()` (or in app.vue) sets `document.documentElement.dataset.theme = effectiveTheme.value` when it changes. When solstice is active, the dataset is removed (or set to a value that does nothing).

**Solstice precedence:** Solstice mode applies its own body class `solstice-{name}` (Stage 5). The solstice CSS in `assets/main.css` uses hardcoded colors (#1a1a2e bg, #f7f7f0 text) that override the CSS vars. Since solstice CSS is more specific (`body[class*="solstice-"]` at a deeper specificity than `[data-theme="dark"]`), it wins automatically. No special logic needed.

**Theme toggle UI:** A new toolbar button `FzThemeToggle.vue` in FzToolbar. Glyph: ◐ (yin/yang style half-moon). Clicking cycles through auto → light → dark → auto. Tooltip shows current value. Position: between the existing push button and install button.

**CSS variables migration:** As described in Architecture commitments. ~72 color refs across ~15 components migrate to use vars in one task. Each component touch is a one-line find/replace per color. The yellow stays the same value in both themes (gold is sacred), but it's still wrapped in a var for consistency.

### F3.5 Keyboard navigation

**Cursor state in FzPage:**

```ts
const cursorIndex = ref(0)        // initialized to currentIndex on mount
const cursorVisible = ref(false)  // toggled true on first arrow press
```

**Cursor visibility model:**

- On mount: cursorIndex = currentIndex (today's week), cursorVisible = false
- First arrow key press: cursorVisible = true (cursor appears at currentIndex)
- Subsequent arrow presses: move cursor by the appropriate delta
- Click on a hexagon: cursorIndex updates to that index, cursorVisible STAYS at its current value (a click is a mouse interaction, not a keyboard one)
- Escape (when nothing else is open): cursorVisible = false (cursor hides)

This keeps mouse and keyboard semantically separate. Mouse-first users never see the cursor. Keyboard-first users see it as soon as they press an arrow.

**Arrow key handling:**

- Up: cursorIndex -= 21 (or column count)
- Down: cursorIndex += 21
- Left: cursorIndex -= 1 (no wrap to previous row)
- Right: cursorIndex += 1
- Clamp to `[0, totalWeeks)` — no wrap

**Column count:** Hardcoded 21 for v1. The grid is responsive (21 / 12 / 7 columns by viewport), but arrow nav is a desktop feature and 21 is the desktop layout. Document this limitation.

**Enter key:**

- Opens FzMarkPopover for cursorIndex (via the same `openMarkPopover` function used by hex clicks)
- Same input-active rule applies (Enter inside a textarea inserts a newline; doesn't fire the shortcut)

**`?` key:**

- Opens `FzKeyboardHelp.vue` modal
- The `?` character is `event.key === '?'` (typically Shift+/)
- Closing the help: `?` again, or Escape

**FzHexagon visual:** new `cursor: boolean` prop. CSS:
```css
.hexagon.cursor::after {
  content: '';
  position: absolute;
  inset: -3px;
  border: 1.5px solid var(--fz-blue);
  pointer-events: none;
}
```

A 1.5px blue ring outside the hexagon's normal box. Distinct from anchor (red, inside), lit (yellow outline + scale), and birthday (yellow, inside, circular). No pulse. No animation.

**v-memo tuple expansion:** FzGrid's v-memo gets two new entries: `isBirthday(i)` and `i === cursorIndex && cursorVisible`. The cursorVisible AND ensures invisible cursor doesn't trigger re-renders.

### FzKeyboardHelp component

**New component:** `components/FzKeyboardHelp.vue`. Modal with a max-width of 480px. Lists every shortcut in a clean two-column layout: kbd-style key on the left, description on the right.

```
↑ ↓ ← →    move cursor
Enter      mark this week
V          edit your vow
Q          quiet mode
/          search whispers
?          this help
Escape     close modals
```

Bottom line: *"no mouse required · all navigation with arrow keys"*

Closes on `?` again, Escape, or backdrop click.

### FzThemeToggle component

**New component:** `components/FzThemeToggle.vue`. Toolbar button with a ◐ glyph (or a sun/moon glyph). Cycles through auto → light → dark → auto on click. Tooltip: *"theme: auto"* / *"theme: light"* / *"theme: dark"*.

Lives in FzToolbar between FzPushButton and FzInstallButton.

---

## Visual design choices (locked)

| Decision | Value | Why |
|---|---|---|
| Dark bg | `#0F0F0F` | Near-black, not pure black — easier on the eyes |
| Dark blue | `#4A8EFF` | Lighter, electric, vivid against dark |
| Dark text | `#e8e8e8` | Warm light gray, not pure white |
| Yellow | `#F7B808` (both themes) | Gold is sacred, unchanged |
| Birthday halo | 1px circular gold ring inside hex + soft glow | Static, no pulse — quiet continuity |
| Cursor ring | 1.5px blue, outside hex box | Distinct from anchor/lit/birthday |
| First Run cross-fade | 0.4s ease-in-out | Slow but not glacial |
| First Run click delay | 1500ms per screen | Forces reading; the slowness IS the feature |
| Letter unseal text reveal | 0.4s fade-in (NOT character-by-character) | Reverent without being gimmicky |
| Letter unseal "I read this" button text | "I read this" (lowercase) | Quiet, like everything else |
| Letter write button text | "⌁ seal for one year" | Ritual language, not transactional |
| Theme toggle glyph | ◐ (half-moon) | Indicates theme choice without committing to sun/moon binary |
| Help overlay layout | kbd boxes + descriptions | Clean, immediately scannable |

---

## Out of scope (not in Stage 6)

- **Letter editing.** Once sealed, cannot be edited. The seal is the point.
- **Multiple letters per birthday.** One per year.
- **Vow auto-reset on birthday.** The user manages the vow.
- **Cursor wrap at edges.** Stop at edges; no wrap.
- **Tab key for cursor navigation.** Tab is for focusable elements (inputs, buttons), not the cursor.
- **PageUp/PageDown/Home/End.** Out of scope.
- **The `cubes.png` background texture in dark mode.** Hidden entirely in dark mode (background is the near-black #0F0F0F).
- **Theme transition animation.** Instant theme switch. A cross-fade is nice but adds CSS complexity that's not worth it for a once-per-session toggle.
- **First Run "skip ceremony" option.** No skip button. The ceremony is once-per-user-ever (until they wipe state). Spec-driven.
- **Solstice icon in toolbar.** Solstice is a passive day-treatment; no toggle needed.

---

## Testing strategy

Stage 6 must keep all 266 existing tests passing AND add ~30 new tests. New spec files:

| Spec file | Tests | Coverage |
|---|---|---|
| `tests/birthday.spec.ts` | 6 | birthdayWeeksOfLife: simple DOB, leap-year DOB Feb 29, year 0 included, 77 results for typical user, returns Set, week 0 inclusion |
| `tests/useTheme.spec.ts` | 5 | Default 'auto', explicit 'dark' override, matchMedia listener, setTheme persist, solstice precedence |
| `tests/useFzState.spec.ts` (extend) | 12 | setTheme (3), writeAnnualLetter (5: 1-2000 bound, dup-prevent, sortedness, ISO unsealAt, throw on null state), markLetterRead (4: idempotent, no-op missing, persist, no-op already-read) |
| `tests/storage.spec.ts` (extend) | 8 | hasValidLetters (5: empty, valid, text-bounds, sortedness, parseable dates), hasValidTheme (3) |
| `tests/useKeyboard.spec.ts` (extend) | 6 | enter, arrow keys, ? — each fires when not in input, blocked by modifier guard |

**Total: ~37 new tests.** Final count: ~303.

Manual smoke test (NOT in vitest):
- F3.1 ceremony renders 3 screens, click delay enforced
- F3.2 halo visible on birthday weeks
- F3.3 unseal modal renders text after unsealAt
- F3.4 dark mode CSS vars apply
- F3.5 cursor moves with arrow keys, hides until first arrow

---

## Implementation order

The plan that follows this spec will lay out ~22 bite-sized tasks. Build sequence:

1. **CSS variables migration** — define vars in main.css, migrate all 15 components in one task (mechanical find/replace), no behavior change, just structural
2. **Storage validators** — `hasValidLetters`, tighten prefs.theme validation, tests
3. **`useFzState.setTheme`** — TDD action
4. **`useFzState.writeAnnualLetter` + `markLetterRead`** — TDD actions
5. **`utils/birthday.ts` + `birthdayWeeksOfLife`** — TDD pure function
6. **`composables/useTheme.ts`** — singleton with matchMedia listener + tests
7. **`composables/useKeyboard.ts` extension** — add enter/arrow*/? to ShortcutKey + tests
8. **`components/FzFirstRun.vue`** — three-screen ceremony component
9. **`components/FzAnnualLetter.vue`** — write/unseal modal
10. **`components/FzThemeToggle.vue`** — toolbar button
11. **`components/FzKeyboardHelp.vue`** — ? overlay
12. **`components/FzHexagon.vue`** — add `birthday` and `cursor` props + CSS
13. **`components/FzGrid.vue`** — wire birthdaySet, expand v-memo tuple
14. **`components/FzPage.vue`** — orchestrate cursor state, arrow handlers, FzFirstRun + FzAnnualLetter mounts, useTheme.init()
15. **`components/FzToolbar.vue`** — add FzThemeToggle button
16. **Smoke test + final verification + tag**

---

## Definition of done

- [ ] All 5 F3.* features implemented per this spec
- [ ] All 266 existing tests still pass
- [ ] ~37 new tests added (final ~303)
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm generate` all clean
- [ ] CSS variables migration complete (all 15 components use vars instead of hardcoded colors)
- [ ] Manual smoke test: ceremony + birthday + letter + dark + keyboard nav all work in a real browser
- [ ] No third-party dependencies added
- [ ] No regressions to Stage 1-5 features
- [ ] Tag `stage-6-tier-3-dreams` at HEAD of master
- [ ] **fz.ax is feature-complete per the parent spec.** All 24 features (F0+F1+F2+F3) shipped.
