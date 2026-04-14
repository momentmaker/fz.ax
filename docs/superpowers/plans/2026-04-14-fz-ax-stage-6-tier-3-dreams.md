# fz.ax Stage 6 — Tier 3 Dreams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 5 F3.* features (First Run Ceremony, Birthday Hexagon, Annual Letter, Dark Mode, Keyboard Navigation) so fz.ax reaches feature parity with the parent spec.

**Architecture:** CSS variables migration (~10 semantic vars replace ~105 hardcoded color refs), `useTheme` singleton with matchMedia listener, `useKeyboard` extension, 3 new state actions, new storage validators, 5 new components.

**Tech Stack:** Vue 3 Composition API, strict TypeScript, Vitest with happy-dom, hand-written everything.

**Spec reference:** `docs/superpowers/specs/2026-04-14-fz-ax-stage-6-tier-3-dreams-design.md` — this plan implements it exactly.

**Pre-flight check:**
- `git tag --list stage-5-tier-2-rituals` → exists
- `pnpm test` → 266 passing
- `pnpm lint && pnpm typecheck && pnpm generate` → clean
- `git status` → clean

---

## Task 1: CSS variables migration

**Files:**
- Modify: `assets/main.css`
- Modify: every `.vue` file in `components/` that has hardcoded colors (15+ files)

**Why:** Dark mode requires centralized color management. Hardcoded colors across 15 components cannot be theme-switched. Migrating to CSS variables is the principled approach and all other Stage 6 features depend on it.

- [ ] **Step 1: Add variable definitions to `assets/main.css`**

At the TOP of the file (before the existing `body` rule), insert:

```css
:root {
  --fz-yellow: #F7B808;
  --fz-yellow-soft: #fffbe6;
  --fz-yellow-hover: #d99f00;
  --fz-blue: #0847F7;
  --fz-bg: #FFFFFF;
  --fz-bg-texture: url("~/assets/cubes.png");
  --fz-text: #333333;
  --fz-text-quiet: #888888;
  --fz-text-faint: #cccccc;
  --fz-border: #cccccc;
  --fz-red: #ff3b30;
  --fz-red-soft: #fff0ef;
  --fz-shadow-overlay: rgba(0, 0, 0, 0.75);
  --fz-shadow-overlay-soft: rgba(0, 0, 0, 0.55);
}

html[data-theme="dark"] {
  --fz-yellow: #F7B808;
  --fz-yellow-soft: #2a2410;
  --fz-yellow-hover: #d99f00;
  --fz-blue: #4A8EFF;
  --fz-bg: #0F0F0F;
  --fz-bg-texture: none;
  --fz-text: #e8e8e8;
  --fz-text-quiet: #888888;
  --fz-text-faint: #444444;
  --fz-border: #2a2a2a;
  --fz-red: #FF453A;
  --fz-red-soft: #2a1010;
  --fz-shadow-overlay: rgba(0, 0, 0, 0.85);
  --fz-shadow-overlay-soft: rgba(0, 0, 0, 0.65);
}
```

- [ ] **Step 2: Update `assets/main.css` body rule** to use the vars

Find:
```css
body {
  background-color: #FFF;
  background-image: url("~/assets/cubes.png");
  font-family: 'Roboto', sans-serif;
}
```

Replace with:
```css
body {
  background-color: var(--fz-bg);
  background-image: var(--fz-bg-texture);
  font-family: 'Roboto', sans-serif;
  color: var(--fz-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

- [ ] **Step 3: Migrate each component's scoped CSS**

For EACH of these files, do a literal find/replace:

Files to migrate:
- `components/FzBanner.vue`
- `components/FzDobModal.vue`
- `components/FzEasterEgg.vue`
- `components/FzEcho.vue`
- `components/FzHexagon.vue`
- `components/FzInstallButton.vue`
- `components/FzLibrary.vue`
- `components/FzLongNow.vue`
- `components/FzMarkPopover.vue`
- `components/FzMondayNotice.vue`
- `components/FzPage.vue`
- `components/FzPushButton.vue`
- `components/FzScrollHex.vue`
- `components/FzSearch.vue`
- `components/FzSundayModal.vue`
- `components/FzTitle.vue`
- `components/FzToolbar.vue`
- `components/FzVowModal.vue`

Find/replace mappings (apply each across all files):
- `#F7B808` → `var(--fz-yellow)`
- `#f7b808` → `var(--fz-yellow)`
- `#fffbe6` → `var(--fz-yellow-soft)`
- `#d99f00` → `var(--fz-yellow-hover)`
- `#0847F7` → `var(--fz-blue)`
- `#0847f7` → `var(--fz-blue)`
- `#2f62df` → `var(--fz-blue)` (FzScrollHex uses this shade — align to the main blue)
- `#ff3b30` → `var(--fz-red)`
- `#FF3B30` → `var(--fz-red)`
- `#fff0ef` → `var(--fz-red-soft)`
- `#888888` → `var(--fz-text-quiet)`
- `#888` → `var(--fz-text-quiet)`
- `#cccccc` → `var(--fz-border)`
- `#ccc` → `var(--fz-text-faint)`
- `#444` → `var(--fz-text)`
- `#333` → `var(--fz-text)`
- `rgba(0, 0, 0, 0.75)` → `var(--fz-shadow-overlay)`
- `rgba(0, 0, 0, 0.55)` → `var(--fz-shadow-overlay-soft)`

**IMPORTANT:** Leave alone:
- The `#FFFFFF` / `#fff` / `white` values in the toolbar buttons' base style (those are the inner tile color — migrate those to `var(--fz-bg)` ONLY if they're background colors of an element that should theme-switch; otherwise leave as white)
- Solstice body selectors in `main.css` (`body.solstice-*`) keep their hardcoded #1a1a2e and #f7f7f0 — solstice has its own palette
- The backup-restore "tool-failed" red #ff3b30 (already in map)
- The `btn-76` hardcoded colors inside FzMarkPopover and FzDobModal (the dynamic neon-blue effect uses literal CSS values in the `--neon` custom prop — DO migrate the `#0847F7` in `--neon: #0847F7` to `var(--fz-blue)`, but leave the `#fff` white ones as white)
- Anywhere a color is on a BUTTON's background that should stay visually the same regardless of theme (the button outlines itself are already yellow/blue which map to vars)

For each file, after the find/replace, verify the visual intent is preserved (the diff should be one-line changes per color).

- [ ] **Step 4: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -5
```

Expected: all 266 tests still pass. No type or lint errors.

- [ ] **Step 5: Manual visual verification**

```bash
pnpm generate 2>&1 | tail -5
```

Expected: generate clean. The app should look identical to pre-migration in light mode (dark mode is wired in Task 6).

- [ ] **Step 6: Commit**

```bash
git add assets/main.css components/*.vue
git commit -m "$(cat <<'EOF'
css: migrate all colors to CSS variables

stage 6 F3.4 prep: 105 hardcoded color refs across 15 components
and main.css migrate to ~13 semantic CSS variables defined at
:root. html[data-theme="dark"] overrides establish the dark
palette (near-black bg, lighter blue, same gold yellow). no
visual change in light mode — this is a pure refactor.

solstice CSS keeps its own hardcoded palette (#1a1a2e bg,
#f7f7f0 text) because solstice is a parallel ritual mode that
should feel distinct from both light and dark.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Storage validators — hasValidLetters + theme validation (TDD)

**Files:**
- Modify: `tests/storage.spec.ts`
- Modify: `utils/storage.ts`

**Why:** F3.3 Annual Letter writes to `state.letters`. The current validator accepts any Array. We need deep validation (text 1-2000, parseable dates, sortedness). Also tighten `prefs.theme` validation.

- [ ] **Step 1: Write failing tests**

Append to `tests/storage.spec.ts` (after the anchor validation tests):

```ts
describe('storage validation: letters', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts a state with empty letters', () => {
    const ok = { ...sampleState, letters: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('accepts a state with a valid LetterEntry', () => {
    const ok = {
      ...sampleState,
      letters: [
        { text: 'hello future me', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false },
      ],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('rejects a non-array letters field', () => {
    const bad = { ...sampleState, letters: 'not-an-array' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with empty text', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: '', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with text > 2000 chars', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'x'.repeat(2001), sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with unparseable sealedAt', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'ok', sealedAt: 'not-a-date', unsealAt: '2026-05-15', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with unparseable unsealAt', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'ok', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: 'garbage', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with non-boolean read', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'ok', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: 'yes' }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects letters not sorted by sealedAt', () => {
    const bad = {
      ...sampleState,
      letters: [
        { text: 'b', sealedAt: '2026-05-15T00:00:00.000Z', unsealAt: '2027-05-15', read: false },
        { text: 'a', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false },
      ],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })
})

describe('storage validation: prefs.theme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts prefs.theme = auto', () => {
    const ok = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'auto' } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('accepts prefs.theme = light', () => {
    const ok = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'light' } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('accepts prefs.theme = dark', () => {
    const ok = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'dark' } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('rejects prefs.theme = invalid string', () => {
    const bad = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'garbage' } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/storage.spec.ts
```

- [ ] **Step 3: Update `utils/storage.ts`**

Find the `isValidFzState` return statement:
```ts
    Array.isArray(v.letters) &&
    hasValidAnchors(v.anchors) &&
    typeof v.prefs === 'object' && v.prefs !== null &&
```

Replace with:
```ts
    hasValidLetters(v.letters) &&
    hasValidAnchors(v.anchors) &&
    hasValidPrefs(v.prefs) &&
```

After the existing `hasValidAnchors` function, append:

```ts
/**
 * Validate the letters array. Stage 6 introduces annual letters
 * via writeAnnualLetter. Each letter has text (1-2000 chars),
 * parseable sealedAt timestamp, ISO-date unsealAt, boolean read.
 * Array must be sorted ascending by sealedAt (enforced here so
 * downstream code can trust the invariant without re-sorting).
 */
function hasValidLetters(letters: unknown): letters is { text: string; sealedAt: string; unsealAt: string; read: boolean }[] {
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
    if (prevSealedAt !== '' && e.sealedAt < prevSealedAt) return false
    prevSealedAt = e.sealedAt
  }
  return true
}

/**
 * Validate the prefs object shape. Stage 6 tightens the check
 * beyond "is an object" to also validate prefs.theme is one of
 * 'auto' | 'light' | 'dark'. Other prefs fields (pushOptIn,
 * reducedMotion, weekStart) are allowed any value — they're
 * typed but the existing default provides safe fallbacks.
 */
function hasValidPrefs(prefs: unknown): boolean {
  if (typeof prefs !== 'object' || prefs === null) return false
  const p = prefs as Record<string, unknown>
  if (p.theme !== undefined && p.theme !== 'auto' && p.theme !== 'light' && p.theme !== 'dark') {
    return false
  }
  return true
}
```

- [ ] **Step 4: Run all checks**

```bash
pnpm test && pnpm typecheck && pnpm lint
```
Expected: all passing, 266 + 13 = 279 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/storage.spec.ts utils/storage.ts
git commit -m "$(cat <<'EOF'
storage: deep-validate letters + theme at the boundary

stage 6 prep: extends isValidFzState with hasValidLetters
(text 1-2000, parseable sealedAt, ISO-date unsealAt, boolean
read, sorted ascending by sealedAt) and hasValidPrefs (checks
prefs.theme is 'auto' | 'light' | 'dark' or undefined).
13 new tests cover both validators.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: setTheme on useFzState (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** F3.4 Dark Mode needs to persist the user's theme choice.

- [ ] **Step 1: Write failing tests**

Inside the outer `describe('useFzState', ...)`, after the last existing nested describe, append:

```ts
  describe('setTheme', () => {
    it('throws when state is null', () => {
      const { setTheme } = useFzState()
      expect(() => setTheme('dark')).toThrow(/no state/i)
    })

    it('sets prefs.theme to dark', () => {
      const { state, setDob, setTheme } = useFzState()
      setDob('1990-05-15')
      setTheme('dark')
      expect(state.value!.prefs.theme).toBe('dark')
    })

    it('sets prefs.theme to light', () => {
      const { state, setDob, setTheme } = useFzState()
      setDob('1990-05-15')
      setTheme('dark')
      setTheme('light')
      expect(state.value!.prefs.theme).toBe('light')
    })

    it('sets prefs.theme back to auto', () => {
      const { state, setDob, setTheme } = useFzState()
      setDob('1990-05-15')
      setTheme('dark')
      setTheme('auto')
      expect(state.value!.prefs.theme).toBe('auto')
    })

    it('preserves other prefs fields', () => {
      const { state, setDob, setPushOptIn, setTheme } = useFzState()
      setDob('1990-05-15')
      setPushOptIn(true)
      setTheme('dark')
      expect(state.value!.prefs.pushOptIn).toBe(true)
      expect(state.value!.prefs.theme).toBe('dark')
    })
  })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useFzState.spec.ts
```

- [ ] **Step 3: Add `setTheme` to `composables/useFzState.ts`**

After `setPushOptIn` (or before another existing action — anywhere inside the composable), add:

```ts
/**
 * Update prefs.theme. F3.4 Dark Mode — 'auto' follows the OS
 * preference via prefers-color-scheme, 'light' and 'dark' are
 * manual overrides persisted across sessions.
 */
function setTheme(theme: 'auto' | 'light' | 'dark'): void {
  const state = ensureLoaded()
  const current = assertState()
  const next: FzState = {
    ...current,
    prefs: { ...current.prefs, theme },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}
```

Update `UseFzStateReturn` — find:
```ts
  setPushOptIn: (value: boolean) => void
  setVow: (text: string) => void
```

Replace with:
```ts
  setPushOptIn: (value: boolean) => void
  setTheme: (theme: 'auto' | 'light' | 'dark') => void
  setVow: (text: string) => void
```

And the return object — find:
```ts
    setPushOptIn,
    setVow,
```

Replace with:
```ts
    setPushOptIn,
    setTheme,
    setVow,
```

- [ ] **Step 4: Run all checks**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

Expected: 279 + 5 = 284 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
useFzState: add setTheme (TDD)

stage 6 F3.4 prep: persists state.prefs.theme via the throw-
and-close pattern. 'auto' | 'light' | 'dark'. 5 tests cover
null state, set each value, preservation of other prefs.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: writeAnnualLetter + markLetterRead on useFzState (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** F3.3 Annual Letter needs to append sealed letters and mark them read.

- [ ] **Step 1: Write failing tests**

Inside the outer describe, after `setTheme`, append:

```ts
  describe('writeAnnualLetter', () => {
    it('throws when state is null', () => {
      const { writeAnnualLetter } = useFzState()
      expect(() => writeAnnualLetter('hello', '2026-05-15')).toThrow(/no state/i)
    })

    it('throws on empty text', () => {
      const { setDob, writeAnnualLetter } = useFzState()
      setDob('1990-05-15')
      expect(() => writeAnnualLetter('', '2026-05-15')).toThrow(/1.*2000/i)
    })

    it('throws on text longer than 2000 chars', () => {
      const { setDob, writeAnnualLetter } = useFzState()
      setDob('1990-05-15')
      expect(() => writeAnnualLetter('x'.repeat(2001), '2026-05-15')).toThrow(/1.*2000/i)
    })

    it('throws on whitespace-only text', () => {
      const { setDob, writeAnnualLetter } = useFzState()
      setDob('1990-05-15')
      expect(() => writeAnnualLetter('   ', '2026-05-15')).toThrow(/1.*2000/i)
    })

    it('throws on invalid unsealAt format', () => {
      const { setDob, writeAnnualLetter } = useFzState()
      setDob('1990-05-15')
      expect(() => writeAnnualLetter('hello', 'not-iso')).toThrow(/unsealAt/i)
    })

    it('appends a letter with trimmed text + sealedAt + read=false', () => {
      const { state, setDob, writeAnnualLetter } = useFzState()
      setDob('1990-05-15')
      writeAnnualLetter('  hello future me  ', '2026-05-15')
      expect(state.value!.letters.length).toBe(1)
      expect(state.value!.letters[0]?.text).toBe('hello future me')
      expect(state.value!.letters[0]?.unsealAt).toBe('2026-05-15')
      expect(state.value!.letters[0]?.read).toBe(false)
      expect(typeof state.value!.letters[0]?.sealedAt).toBe('string')
    })

    it('maintains sorted order on multiple writes', () => {
      const { state, setDob, writeAnnualLetter } = useFzState()
      setDob('1990-05-15')
      // Two letters with different sealedAt (auto-generated as now)
      writeAnnualLetter('first', '2026-05-15')
      // Sleep would be ideal but we can check the implicit order
      writeAnnualLetter('second', '2027-05-15')
      expect(state.value!.letters.length).toBe(2)
      expect(state.value!.letters[0]?.text).toBe('first')
      expect(state.value!.letters[1]?.text).toBe('second')
    })
  })

  describe('markLetterRead', () => {
    it('throws when state is null', () => {
      const { markLetterRead } = useFzState()
      expect(() => markLetterRead('2025-01-01T00:00:00.000Z')).toThrow(/no state/i)
    })

    it('marks the matching letter as read', () => {
      const { state, setDob, writeAnnualLetter, markLetterRead } = useFzState()
      setDob('1990-05-15')
      writeAnnualLetter('hello', '2026-05-15')
      const sealedAt = state.value!.letters[0]!.sealedAt
      markLetterRead(sealedAt)
      expect(state.value!.letters[0]?.read).toBe(true)
    })

    it('is idempotent (already-read is a no-op)', () => {
      const { state, setDob, writeAnnualLetter, markLetterRead } = useFzState()
      setDob('1990-05-15')
      writeAnnualLetter('hello', '2026-05-15')
      const sealedAt = state.value!.letters[0]!.sealedAt
      markLetterRead(sealedAt)
      expect(() => markLetterRead(sealedAt)).not.toThrow()
      expect(state.value!.letters[0]?.read).toBe(true)
    })

    it('is a no-op for non-matching sealedAt', () => {
      const { state, setDob, writeAnnualLetter, markLetterRead } = useFzState()
      setDob('1990-05-15')
      writeAnnualLetter('hello', '2026-05-15')
      expect(() => markLetterRead('1999-01-01T00:00:00.000Z')).not.toThrow()
      expect(state.value!.letters[0]?.read).toBe(false)
    })
  })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useFzState.spec.ts
```

- [ ] **Step 3: Add actions to `composables/useFzState.ts`**

After `setTheme`, add:

```ts
/**
 * Write an Annual Letter. Trims text, validates 1-2000 chars,
 * validates unsealAt is ISO date format (YYYY-MM-DD). Appends
 * a new LetterEntry with sealedAt=now, read=false to state.letters.
 * Maintains the sorted-by-sealedAt invariant (since new writes
 * always have a sealedAt >= existing entries, this is automatic).
 */
function writeAnnualLetter(text: string, unsealAt: string): void {
  const state = ensureLoaded()
  const current = assertState()
  const trimmed = text.trim()
  if (trimmed.length === 0 || trimmed.length > 2000) {
    throw new Error('useFzState: letter text must be 1-2000 chars after trim')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(unsealAt)) {
    throw new Error('useFzState: unsealAt must be ISO date YYYY-MM-DD')
  }
  const letter = {
    text: trimmed,
    sealedAt: new Date().toISOString(),
    unsealAt,
    read: false,
  }
  const next: FzState = {
    ...current,
    letters: [...current.letters, letter],
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Mark the letter with the given sealedAt as read. Idempotent —
 * already-read letters are a no-op. Non-matching sealedAt is a
 * no-op. Used by FzAnnualLetter when the unseal modal mounts
 * (not when the user clicks dismiss, so closing without clicking
 * the button still marks the letter as seen).
 */
function markLetterRead(sealedAt: string): void {
  const state = ensureLoaded()
  const current = assertState()
  const idx = current.letters.findIndex((l) => l.sealedAt === sealedAt)
  if (idx === -1) return
  const existing = current.letters[idx]
  if (existing === undefined || existing.read === true) return
  const next: FzState = {
    ...current,
    letters: current.letters.map((l, i) => (i === idx ? { ...l, read: true } : l)),
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}
```

Update `UseFzStateReturn`:
```ts
  setTheme: (theme: 'auto' | 'light' | 'dark') => void
  setVow: (text: string) => void
```

Replace with:
```ts
  setTheme: (theme: 'auto' | 'light' | 'dark') => void
  setVow: (text: string) => void
  writeAnnualLetter: (text: string, unsealAt: string) => void
  markLetterRead: (sealedAt: string) => void
```

And the return object:
```ts
    setTheme,
    setVow,
    clearVow,
```

Replace with:
```ts
    setTheme,
    setVow,
    clearVow,
    writeAnnualLetter,
    markLetterRead,
```

- [ ] **Step 4: Run all checks**

```bash
pnpm test && pnpm typecheck && pnpm lint
```
Expected: 284 + 11 = 295 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
useFzState: add writeAnnualLetter + markLetterRead (TDD)

stage 6 F3.3 prep: writeAnnualLetter persists a LetterEntry
with text (1-2000 chars, trimmed), sealedAt=now, provided
unsealAt (ISO YYYY-MM-DD), read=false. markLetterRead is
idempotent and no-op on missing entries. 11 tests cover null
state, text bounds, unsealAt validation, append behavior,
and mark lifecycle.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: birthdayWeeksOfLife pure function (TDD)

**Files:**
- Create: `tests/birthday.spec.ts`
- Create: `utils/birthday.ts`

**Why:** F3.2 Birthday Hexagon needs the set of birthday week indices for a given DOB. Pure function, easily tested.

- [ ] **Step 1: Create `tests/birthday.spec.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { birthdayWeeksOfLife } from '../utils/birthday'

describe('birthdayWeeksOfLife', () => {
  it('returns a Set', () => {
    const dob = new Date(1990, 4, 15) // May 15, 1990
    const result = birthdayWeeksOfLife(dob)
    expect(result).toBeInstanceOf(Set)
  })

  it('includes week 0 (birth week)', () => {
    const dob = new Date(1990, 4, 15)
    const result = birthdayWeeksOfLife(dob)
    expect(result.has(0)).toBe(true)
  })

  it('returns 77 birthday weeks for a typical DOB', () => {
    const dob = new Date(1990, 4, 15)
    const result = birthdayWeeksOfLife(dob)
    expect(result.size).toBeLessThanOrEqual(77)
    expect(result.size).toBeGreaterThanOrEqual(76)
  })

  it('each subsequent birthday week is ~52 weeks after the previous', () => {
    const dob = new Date(1990, 4, 15)
    const result = birthdayWeeksOfLife(dob)
    const sorted = Array.from(result).sort((a, b) => a - b)
    // First birthday (year 1) should be ~52 weeks from birth
    expect(sorted[1]).toBeGreaterThanOrEqual(51)
    expect(sorted[1]).toBeLessThanOrEqual(53)
  })

  it('handles Feb 29 DOB (leap year) — rolls to Mar 1 in non-leap years', () => {
    const dob = new Date(2000, 1, 29) // Feb 29, 2000 (leap year)
    const result = birthdayWeeksOfLife(dob)
    expect(result.has(0)).toBe(true)
    // Year 1 birthday falls on Mar 1, 2001 (non-leap), not Feb 29
    // The week index depends on the offset from Feb 29 2000.
    // Mar 1, 2001 is (366 + 1) - 1 = 366 days after Feb 29, 2000
    // weekIndex = floor(366 / 7) = 52
    const sorted = Array.from(result).sort((a, b) => a - b)
    expect(sorted[1]).toBe(52)
  })

  it('stops at totalWeeks boundary (4000)', () => {
    const dob = new Date(1900, 0, 1) // very old DOB
    const result = birthdayWeeksOfLife(dob)
    for (const idx of result) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(4000)
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/birthday.spec.ts
```

- [ ] **Step 3: Create `utils/birthday.ts`**

```ts
import { totalWeeks } from '../composables/useTime'

const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7

/**
 * F3.2 Birthday Hexagon: compute the set of week indices that
 * contain each year's birthday, for years 0 through 76. Returns
 * a Set for O(1) lookup during grid render.
 *
 * Feb 29 handling: JS Date auto-rolls Feb 29 to Mar 1 in non-leap
 * years. We use new Date(year, month, day) which performs this
 * rollover automatically — a Feb 29 DOB's non-leap-year birthdays
 * fall on Mar 1, which is the documented and intended behavior.
 *
 * Week indices outside [0, totalWeeks) are filtered out — for
 * users with very old DOBs (pre-1948), later birthday weeks may
 * exceed the grid window.
 */
export function birthdayWeeksOfLife(dob: Date): Set<number> {
  const result = new Set<number>()
  for (let year = 0; year <= 76; year++) {
    const birthday = new Date(
      dob.getFullYear() + year,
      dob.getMonth(),
      dob.getDate(),
    )
    const ms = birthday.getTime() - dob.getTime()
    if (ms < 0) continue
    const weekIndex = Math.floor(ms / MS_PER_WEEK)
    if (weekIndex >= 0 && weekIndex < totalWeeks) {
      result.add(weekIndex)
    }
  }
  return result
}
```

- [ ] **Step 4: Run all checks**

```bash
pnpm test tests/birthday.spec.ts && pnpm test && pnpm typecheck && pnpm lint
```
Expected: 295 + 6 = 301 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/birthday.spec.ts utils/birthday.ts
git commit -m "$(cat <<'EOF'
add birthdayWeeksOfLife helper (TDD)

stage 6 F3.2: pure function returning the Set of week indices
for years 0-76 of a given DOB. Feb 29 DOBs auto-roll to Mar 1
in non-leap years (JS Date default behavior). Filters to
[0, totalWeeks). 6 tests cover shape, year 0, 77-entry count,
gap arithmetic, leap year, and grid clamp.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: useTheme composable (TDD)

**Files:**
- Create: `tests/useTheme.spec.ts`
- Create: `composables/useTheme.ts`

**Why:** F3.4 Dark Mode needs a singleton that reads prefs.theme + matchMedia and applies `data-theme` to `<html>`. Singleton pattern matching useKeyboard / useToday.

- [ ] **Step 1: Create `tests/useTheme.spec.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTheme, __resetUseThemeForTests } from '../composables/useTheme'
import { useFzState, __resetForTests as __resetUseFzStateForTests } from '../composables/useFzState'

describe('useTheme', () => {
  const origMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    __resetUseFzStateForTests()
    __resetUseThemeForTests()
    document.documentElement.removeAttribute('data-theme')
    // Default: system prefers light
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = origMatchMedia
    document.documentElement.removeAttribute('data-theme')
  })

  it('effectiveTheme is light when prefs.theme=auto and system prefers light', () => {
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('light')
  })

  it('effectiveTheme is dark when prefs.theme=dark (explicit override)', () => {
    const { setDob, setTheme } = useFzState()
    setDob('1990-05-15')
    setTheme('dark')
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('dark')
  })

  it('effectiveTheme is light when prefs.theme=light (explicit override)', () => {
    // system prefers dark now
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
    const { setDob, setTheme } = useFzState()
    setDob('1990-05-15')
    setTheme('light')
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('light')
  })

  it('effectiveTheme is dark when prefs.theme=auto and system prefers dark', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('dark')
  })

  it('init() is idempotent', () => {
    const addSpy = vi.fn()
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: addSpy,
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
    const t = useTheme()
    t.init()
    t.init()
    // addEventListener should only be called once (for matchMedia change)
    expect(addSpy).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useTheme.spec.ts
```

- [ ] **Step 3: Create `composables/useTheme.ts`**

```ts
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useFzState } from './useFzState'

/**
 * F3.4 Dark Mode singleton. Reads prefs.theme from useFzState
 * and listens to prefers-color-scheme. Computes effectiveTheme
 * and applies data-theme attribute on <html>.
 *
 * Solstice mode is orthogonal: solstice CSS in main.css uses
 * its own hardcoded palette (#1a1a2e bg, #f7f7f0 text) with
 * higher specificity than [data-theme="dark"], so solstice
 * naturally wins whenever body.solstice-* is active.
 */

interface UseThemeReturn {
  effectiveTheme: ComputedRef<'light' | 'dark'>
  setTheme: (theme: 'auto' | 'light' | 'dark') => void
  init: () => void
}

let _module: UseThemeReturn | null = null
let _systemPrefersDark: Ref<boolean> | null = null
let _mediaQuery: MediaQueryList | null = null
let _mediaListener: ((e: MediaQueryListEvent) => void) | null = null
let _watcherStopped = false

function onSystemPreferenceChange(event: MediaQueryListEvent): void {
  if (_systemPrefersDark !== null) {
    _systemPrefersDark.value = event.matches
  }
}

export function useTheme(): UseThemeReturn {
  if (_module !== null) return _module

  if (_systemPrefersDark === null) {
    _systemPrefersDark = ref(false)
  }

  const fzState = useFzState()

  const effectiveTheme = computed<'light' | 'dark'>(() => {
    const pref = fzState.state.value?.prefs.theme ?? 'auto'
    if (pref === 'dark') return 'dark'
    if (pref === 'light') return 'light'
    return _systemPrefersDark!.value ? 'dark' : 'light'
  })

  function setTheme(theme: 'auto' | 'light' | 'dark'): void {
    try {
      fzState.setTheme(theme)
    }
    catch {
      // throw-and-close: writeState failure is recoverable
    }
  }

  function init(): void {
    if (typeof window === 'undefined') return
    if (_mediaQuery === null) {
      _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (_systemPrefersDark !== null) {
        _systemPrefersDark.value = _mediaQuery.matches
      }
      _mediaListener = onSystemPreferenceChange
      _mediaQuery.addEventListener('change', _mediaListener)
    }
    if (!_watcherStopped) {
      watch(
        effectiveTheme,
        (next) => {
          if (typeof document !== 'undefined') {
            // Don't set data-theme when solstice mode is active.
            // Check by inspecting body class.
            const solsticeActive = document.body.className.includes('solstice-')
            if (solsticeActive) {
              document.documentElement.removeAttribute('data-theme')
            }
            else {
              document.documentElement.setAttribute('data-theme', next)
            }
          }
        },
        { immediate: true },
      )
      _watcherStopped = true
    }
  }

  _module = { effectiveTheme, setTheme, init }
  return _module
}

/**
 * Test-only reset of the module singleton.
 */
export function __resetUseThemeForTests(): void {
  if (_mediaQuery !== null && _mediaListener !== null) {
    _mediaQuery.removeEventListener('change', _mediaListener)
  }
  _mediaQuery = null
  _mediaListener = null
  _systemPrefersDark = null
  _watcherStopped = false
  _module = null
}
```

- [ ] **Step 4: Run all checks**

```bash
pnpm test tests/useTheme.spec.ts && pnpm test && pnpm typecheck && pnpm lint
```
Expected: 301 + 5 = 306 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/useTheme.spec.ts composables/useTheme.ts
git commit -m "$(cat <<'EOF'
add useTheme composable (TDD)

stage 6 F3.4: singleton reads prefs.theme from useFzState and
listens to prefers-color-scheme media query. Computes
effectiveTheme ('light' | 'dark'). On changes, applies
data-theme attribute on <html>, EXCEPT when solstice is active
(solstice CSS has its own palette and its body class has
higher specificity, so we remove the data-theme to let solstice
rule). init() is idempotent, matches the usePwa/useKeyboard/
useToday pattern. 5 tests cover the four theme combinations +
init idempotency.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: useKeyboard extension for enter/arrow/? (TDD)

**Files:**
- Modify: `tests/useKeyboard.spec.ts`
- Modify: `composables/useKeyboard.ts`

**Why:** F3.5 Keyboard Navigation needs new keys in the dispatch table.

- [ ] **Step 1: Add failing tests**

Append to `tests/useKeyboard.spec.ts` (inside the outer describe):

```ts
  it('fires enter handler when not in an input', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('enter', fn)
    pressKey('Enter')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fires arrowup handler when not in an input', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('arrowup', fn)
    pressKey('ArrowUp')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fires arrowdown, arrowleft, arrowright handlers', () => {
    const d = vi.fn(), l = vi.fn(), r = vi.fn()
    useKeyboard().init()
    useKeyboard().on('arrowdown', d)
    useKeyboard().on('arrowleft', l)
    useKeyboard().on('arrowright', r)
    pressKey('ArrowDown')
    pressKey('ArrowLeft')
    pressKey('ArrowRight')
    expect(d).toHaveBeenCalledOnce()
    expect(l).toHaveBeenCalledOnce()
    expect(r).toHaveBeenCalledOnce()
  })

  it('fires ? handler when not in an input', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('?', fn)
    pressKey('?')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('does NOT fire arrow handlers when an input has focus', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('arrowup', fn)
    pressKey('ArrowUp')
    expect(fn).not.toHaveBeenCalled()
  })

  it('does NOT fire enter handler when a textarea has focus', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('enter', fn)
    pressKey('Enter')
    expect(fn).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useKeyboard.spec.ts
```

- [ ] **Step 3: Update `composables/useKeyboard.ts`**

Find:
```ts
type ShortcutKey = 'v' | 'q' | '/' | 'escape'
```

Replace with:
```ts
type ShortcutKey =
  | 'v' | 'q' | '/' | 'escape'
  | 'enter' | 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright'
  | '?'
```

Find:
```ts
const _handlers: Record<ShortcutKey, Set<Handler>> = {
  v: new Set(),
  q: new Set(),
  '/': new Set(),
  escape: new Set(),
}
```

Replace with:
```ts
const _handlers: Record<ShortcutKey, Set<Handler>> = {
  v: new Set(),
  q: new Set(),
  '/': new Set(),
  escape: new Set(),
  enter: new Set(),
  arrowup: new Set(),
  arrowdown: new Set(),
  arrowleft: new Set(),
  arrowright: new Set(),
  '?': new Set(),
}
```

Find the `normalizeKey` function:
```ts
function normalizeKey(rawKey: string): ShortcutKey | null {
  const lower = rawKey.toLowerCase()
  if (lower === 'v') return 'v'
  if (lower === 'q') return 'q'
  if (lower === '/') return '/'
  if (lower === 'escape') return 'escape'
  return null
}
```

Replace with:
```ts
function normalizeKey(rawKey: string): ShortcutKey | null {
  const lower = rawKey.toLowerCase()
  if (lower === 'v') return 'v'
  if (lower === 'q') return 'q'
  if (lower === '/') return '/'
  if (lower === 'escape') return 'escape'
  if (lower === 'enter') return 'enter'
  if (lower === 'arrowup') return 'arrowup'
  if (lower === 'arrowdown') return 'arrowdown'
  if (lower === 'arrowleft') return 'arrowleft'
  if (lower === 'arrowright') return 'arrowright'
  if (rawKey === '?') return '?'
  return null
}
```

Find the `__resetUseKeyboardForTests` function:
```ts
  _handlers.v.clear()
  _handlers.q.clear()
  _handlers['/'].clear()
  _handlers.escape.clear()
```

Replace with:
```ts
  _handlers.v.clear()
  _handlers.q.clear()
  _handlers['/'].clear()
  _handlers.escape.clear()
  _handlers.enter.clear()
  _handlers.arrowup.clear()
  _handlers.arrowdown.clear()
  _handlers.arrowleft.clear()
  _handlers.arrowright.clear()
  _handlers['?'].clear()
```

- [ ] **Step 4: Run all checks**

```bash
pnpm test && pnpm typecheck && pnpm lint
```
Expected: 306 + 6 = 312 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/useKeyboard.spec.ts composables/useKeyboard.ts
git commit -m "$(cat <<'EOF'
useKeyboard: add enter / arrow* / ? (TDD)

stage 6 F3.5 prep: extends the ShortcutKey dispatch table to
include Enter, ArrowUp/Down/Left/Right, and ?. All follow the
same input-active rule (shortcut blocked when focus is in a
form input, EXCEPT Escape). Modifier-key guard from cycle 6
of stage 5 still applies. 6 tests cover happy paths and
input-blocks-arrow.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: FzFirstRun.vue component

**Files:**
- Create: `components/FzFirstRun.vue`

**Why:** F3.1 replaces the bare FzDobModal with a 3-screen ceremony for brand-new users.

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { totalWeeks } from '../composables/useTime'
import { isReasonableDob } from '../utils/dob'

const emit = defineEmits<{
  done: []
}>()

const { setDob } = useFzState()
const screen = ref<1 | 2 | 3>(1)
const clickArmed = ref(false)
const localDob = ref<string>('')
const errorMsg = ref<string>('')
const dobInput = ref<HTMLInputElement | null>(null)

function armClicks(): void {
  clickArmed.value = false
  setTimeout(() => {
    clickArmed.value = true
  }, 1500)
}

function advance(): void {
  if (!clickArmed.value) return
  if (screen.value === 1) {
    screen.value = 2
    armClicks()
  }
  else if (screen.value === 2) {
    screen.value = 3
    armClicks()
    void nextTick(() => {
      dobInput.value?.focus()
    })
  }
  // Screen 3 doesn't advance via click — the save button handles it
}

function defaultFourThousandWeeksAgo(): string {
  const ms = totalWeeks * 7 * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms).toISOString().slice(0, 10)
}

function save(): void {
  errorMsg.value = ''
  if (!isReasonableDob(localDob.value)) {
    errorMsg.value = 'that date doesn\'t look right'
    return
  }
  try {
    setDob(localDob.value)
    emit('done')
  }
  catch {
    errorMsg.value = 'couldn\'t save — try disabling private browsing'
  }
}

onMounted(() => {
  localDob.value = defaultFourThousandWeeksAgo()
  armClicks()
})

const screenText = computed(() => {
  if (screen.value === 1) return 'the average human life is four-thousand weeks.'
  if (screen.value === 2) return 'this page is a quiet place to notice them.'
  return 'when did you arrive?'
})
</script>

<template>
  <div class="first-run" @click="advance">
    <transition name="ceremony" mode="out-in">
      <div :key="screen" class="ceremony-screen">
        <p class="ceremony-text">{{ screenText }}</p>

        <div v-if="screen === 3" class="ceremony-input" @click.stop>
          <input
            ref="dobInput"
            v-model="localDob"
            type="date"
            class="dob-input"
            @keyup.enter="save"
          >
          <button class="ceremony-button" @click="save">4⬢⏣⬡</button>
          <p v-if="errorMsg !== ''" class="ceremony-error">{{ errorMsg }}</p>
        </div>

        <p v-if="clickArmed && screen !== 3" class="ceremony-hint">(click to continue)</p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.first-run {
  position: fixed;
  inset: 0;
  background: var(--fz-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: pointer;
  padding: 2rem;
}

.ceremony-screen {
  text-align: center;
  max-width: 520px;
}

.ceremony-text {
  font-size: 1.1rem;
  font-weight: 400;
  font-style: italic;
  color: var(--fz-text);
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

.ceremony-hint {
  font-size: 0.6rem;
  color: var(--fz-text-faint);
  font-style: italic;
  margin: 2rem 0 0;
}

.ceremony-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  cursor: default;
}

.dob-input {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1.5px solid var(--fz-blue);
  background: var(--fz-bg);
  color: var(--fz-text);
}

.ceremony-button {
  background: var(--fz-yellow);
  color: white;
  font-weight: 900;
  font-size: 1rem;
  border: 0;
  outline: 4px solid var(--fz-bg);
  outline-offset: -4px;
  padding: 0.7rem 1rem;
  cursor: pointer;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
}

.ceremony-button:hover {
  background: var(--fz-blue);
  color: white;
}

.ceremony-error {
  margin: 0.25rem 0 0;
  color: var(--fz-red);
  font-size: 0.75rem;
}

.ceremony-enter-active,
.ceremony-leave-active {
  transition: opacity 0.4s ease-in-out;
}
.ceremony-enter-from,
.ceremony-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ceremony-enter-active,
  .ceremony-leave-active {
    transition: none;
  }
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzFirstRun.vue
git commit -m "$(cat <<'EOF'
add FzFirstRun component

stage 6 F3.1: three-screen click-to-advance ceremony that
replaces FzDobModal for brand-new users (state.value === null).
each screen has a 1500ms click delay before accepting the next
click — the slowness IS the feature, forces the user to read
before tapping. screen 3 has the date input + save button.
0.4s cross-fade between screens honors prefers-reduced-motion.
try/catch on setDob handles storage quota errors gracefully.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: FzAnnualLetter.vue component

**Files:**
- Create: `components/FzAnnualLetter.vue`

**Why:** F3.3 — handles both write and unseal flows in one component.

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useToday } from '../composables/useToday'
import { birthdayWeeksOfLife } from '../utils/birthday'
import { currentGridIndex, weekRange } from '../composables/useTime'
import { localDateString } from '../utils/date'

interface LetterEntry {
  text: string
  sealedAt: string
  unsealAt: string
  read: boolean
}

type LetterMode =
  | { kind: 'idle' }
  | { kind: 'unseal'; current: LetterEntry; queueIdx: number; queue: LetterEntry[] }
  | { kind: 'write' }

const { state, writeAnnualLetter, markLetterRead } = useFzState()
const { today } = useToday()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const localText = ref('')
const errorMsg = ref('')
const modeOverride = ref<LetterMode | null>(null)

const dobDate = computed(() => {
  if (state.value === null) return null
  return new Date(state.value.dob)
})

const currentWeek = computed(() => {
  if (dobDate.value === null) return null
  return currentGridIndex(dobDate.value, today.value)
})

const birthdaySet = computed(() => {
  if (dobDate.value === null) return new Set<number>()
  return birthdayWeeksOfLife(dobDate.value)
})

const isInBirthdayWeek = computed(() => {
  if (currentWeek.value === null) return false
  return birthdaySet.value.has(currentWeek.value)
})

const todayStr = computed(() => localDateString(today.value))

const unsealQueue = computed<LetterEntry[]>(() => {
  if (state.value === null) return []
  return state.value.letters
    .filter((l) => l.unsealAt <= todayStr.value && !l.read)
    .slice()
    .sort((a, b) => (a.sealedAt < b.sealedAt ? -1 : 1))
})

const alreadyWroteThisBirthdayWeek = computed(() => {
  if (state.value === null || dobDate.value === null || currentWeek.value === null) return false
  const { start, end } = weekRange(dobDate.value, currentWeek.value)
  const startMs = start.getTime()
  const endMs = end.getTime() + (24 * 60 * 60 * 1000 - 1)
  return state.value.letters.some((l) => {
    const t = new Date(l.sealedAt).getTime()
    return t >= startMs && t <= endMs
  })
})

const mode = computed<LetterMode>(() => {
  if (modeOverride.value !== null) return modeOverride.value
  if (state.value === null) return { kind: 'idle' }
  if (unsealQueue.value.length > 0) {
    return {
      kind: 'unseal',
      queueIdx: 0,
      queue: unsealQueue.value,
      current: unsealQueue.value[0]!,
    }
  }
  if (isInBirthdayWeek.value && !alreadyWroteThisBirthdayWeek.value) {
    return { kind: 'write' }
  }
  return { kind: 'idle' }
})

const visible = computed(() => mode.value.kind !== 'idle')

const unsealYear = computed(() => {
  if (mode.value.kind !== 'unseal') return ''
  return String(new Date(mode.value.current.sealedAt).getFullYear())
})

function dismissUnseal(): void {
  if (mode.value.kind !== 'unseal') return
  const currentQueue = mode.value.queue
  const nextIdx = mode.value.queueIdx + 1
  if (nextIdx < currentQueue.length) {
    modeOverride.value = {
      kind: 'unseal',
      queueIdx: nextIdx,
      queue: currentQueue,
      current: currentQueue[nextIdx]!,
    }
  }
  else if (isInBirthdayWeek.value && !alreadyWroteThisBirthdayWeek.value) {
    modeOverride.value = { kind: 'write' }
  }
  else {
    modeOverride.value = { kind: 'idle' }
  }
}

function dismissWrite(): void {
  modeOverride.value = { kind: 'idle' }
}

function save(): void {
  errorMsg.value = ''
  if (mode.value.kind !== 'write') return
  if (dobDate.value === null || currentWeek.value === null) return
  // Compute next year's birthday week start date as the unsealAt
  const thisBirthdayIdx = currentWeek.value
  // The next birthday week is approximately 52 weeks later; find
  // the next entry in birthdaySet > thisBirthdayIdx.
  const sorted = Array.from(birthdaySet.value).sort((a, b) => a - b)
  const nextBirthdayIdx = sorted.find((idx) => idx > thisBirthdayIdx)
  if (nextBirthdayIdx === undefined) {
    errorMsg.value = 'no next birthday week in your life grid'
    return
  }
  const { start: nextBirthdayStart } = weekRange(dobDate.value, nextBirthdayIdx)
  const unsealAt = localDateString(nextBirthdayStart)
  try {
    writeAnnualLetter(localText.value, unsealAt)
    localText.value = ''
    dismissWrite()
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'couldn\'t save'
  }
}

// On unseal mount: mark the current letter as read immediately
// so closing without clicking the button still records "seen".
watch(
  () => mode.value,
  (m) => {
    if (m.kind === 'unseal') {
      try {
        markLetterRead(m.current.sealedAt)
      }
      catch {
        // ignore — mark-on-dismiss will retry via the button click
      }
    }
    if (m.kind === 'write') {
      void nextTick(() => {
        textareaRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  // Reset modeOverride when state or today meaningfully changes
  // (handled reactively by the computed).
})
</script>

<template>
  <transition name="letter-fade">
    <div v-if="visible" class="letter-overlay" @click="mode.kind === 'unseal' ? dismissUnseal() : dismissWrite()">
      <div class="letter-content" @click.stop>
        <template v-if="mode.kind === 'unseal'">
          <div class="letter-header">⌑ a letter from one year ago today</div>
          <div class="letter-year">{{ unsealYear }}</div>
          <div class="letter-body">{{ mode.current.text }}</div>
          <button class="letter-button" @click="dismissUnseal">i read this</button>
        </template>

        <template v-else-if="mode.kind === 'write'">
          <div class="letter-header">a letter to yourself, one year from now</div>
          <textarea
            ref="textareaRef"
            v-model="localText"
            class="letter-textarea"
            rows="8"
            maxlength="2000"
            placeholder="remember where you are right now"
          />
          <p v-if="errorMsg !== ''" class="letter-error">{{ errorMsg }}</p>
          <div class="letter-actions">
            <button class="letter-button letter-button-save" :disabled="localText.trim() === ''" @click="save">⌁ seal for one year</button>
          </div>
        </template>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.letter-overlay {
  position: fixed;
  inset: 0;
  background: var(--fz-shadow-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: 1rem;
}

.letter-content {
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-yellow);
  padding: 2rem 2.25rem;
  max-width: 540px;
  width: 100%;
  z-index: 1501;
}

.letter-header {
  font-size: 0.75rem;
  color: var(--fz-yellow);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.5rem;
}

.letter-year {
  font-size: 0.65rem;
  color: var(--fz-text-quiet);
  font-style: italic;
  margin-bottom: 1.25rem;
}

.letter-body {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--fz-text);
  font-style: italic;
  margin-bottom: 1.5rem;
  white-space: pre-wrap;
  animation: letter-reveal 0.4s ease-in;
}

.letter-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
  color: var(--fz-text);
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-blue);
  font-style: italic;
  resize: vertical;
  line-height: 1.5;
}

.letter-textarea::placeholder {
  color: var(--fz-text-faint);
  font-style: italic;
}

.letter-error {
  margin: 0.5rem 0 0;
  color: var(--fz-red);
  font-size: 0.75rem;
}

.letter-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.letter-button {
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-blue);
  color: var(--fz-yellow);
  font-weight: 800;
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.letter-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.letter-button:hover:not(:disabled),
.letter-button:focus-visible:not(:disabled) {
  background: var(--fz-yellow-soft);
  outline: none;
}

.letter-button-save {
  background: var(--fz-yellow);
  color: var(--fz-bg);
}

.letter-button-save:hover:not(:disabled) {
  background: var(--fz-yellow-hover);
}

.letter-fade-enter-active,
.letter-fade-leave-active {
  transition: opacity 0.5s ease-in-out;
}
.letter-fade-enter-from,
.letter-fade-leave-to {
  opacity: 0;
}

@keyframes letter-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .letter-fade-enter-active,
  .letter-fade-leave-active {
    transition: none;
  }
  .letter-body {
    animation: none;
  }
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzAnnualLetter.vue
git commit -m "$(cat <<'EOF'
add FzAnnualLetter component

stage 6 F3.3: single component handling both write and unseal
flows via internal mode computed. unseal queue processes
oldest first; after all unseals dismiss, if user is still in
birthday week and hasn't written yet, auto-transitions to write
mode. markLetterRead fires on mode-unseal watch (immediately on
mount, NOT on dismiss click — so closing without interaction
still records "seen"). write computes unsealAt from the next
entry in birthdaySet. try/catch on save handles quota errors.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: FzThemeToggle.vue component

**Files:**
- Create: `components/FzThemeToggle.vue`

**Why:** F3.4 — toolbar button that cycles through auto → light → dark.

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useTheme } from '../composables/useTheme'

const { state } = useFzState()
const { setTheme, effectiveTheme } = useTheme()

const currentPref = computed(() => state.value?.prefs.theme ?? 'auto')

const label = computed(() => {
  const pref = currentPref.value
  if (pref === 'auto') return `theme: auto (${effectiveTheme.value})`
  return `theme: ${pref}`
})

function onClick(): void {
  const current = currentPref.value
  if (current === 'auto') setTheme('light')
  else if (current === 'light') setTheme('dark')
  else setTheme('auto')
}
</script>

<template>
  <button
    class="tool"
    :aria-label="label"
    :title="label"
    @click="onClick"
  >◐</button>
</template>

<style scoped>
.tool {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fz-bg);
  color: var(--fz-yellow);
  border: 1.5px solid var(--fz-blue);
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.tool:hover,
.tool:focus-visible {
  background: var(--fz-yellow-soft);
  outline: none;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzThemeToggle.vue
git commit -m "$(cat <<'EOF'
add FzThemeToggle component

stage 6 F3.4: toolbar button cycling through auto → light →
dark → auto. ◐ glyph. tooltip shows the current preference and
the effective theme when auto. uses useTheme singleton.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: FzKeyboardHelp.vue component

**Files:**
- Create: `components/FzKeyboardHelp.vue`

**Why:** F3.5 — overlay listing every keyboard shortcut.

- [ ] **Step 1: Create the file**

```vue
<script setup lang="ts">
interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

function onBackdropClick(): void {
  emit('close')
}
</script>

<template>
  <div v-if="props.open" class="help-overlay" @click="onBackdropClick">
    <div class="help-content" @click.stop>
      <div class="help-header">keyboard shortcuts</div>
      <div class="help-grid">
        <div class="help-row">
          <div class="help-keys">
            <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
          </div>
          <div class="help-desc">move cursor</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>Enter</kbd></div>
          <div class="help-desc">mark this week</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>V</kbd></div>
          <div class="help-desc">edit your vow</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>Q</kbd></div>
          <div class="help-desc">quiet mode</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>/</kbd></div>
          <div class="help-desc">search whispers</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>?</kbd></div>
          <div class="help-desc">this help</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>Esc</kbd></div>
          <div class="help-desc">close modals</div>
        </div>
      </div>
      <div class="help-footer">no mouse required · all navigation with arrow keys</div>
    </div>
  </div>
</template>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: var(--fz-shadow-overlay-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.help-content {
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-blue);
  padding: 1.75rem 2rem;
  max-width: 480px;
  width: 100%;
  z-index: 1001;
}

.help-header {
  font-size: 0.75rem;
  color: var(--fz-yellow);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 1.25rem;
}

.help-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 1.5rem;
  align-items: center;
}

.help-row {
  display: contents;
}

.help-keys {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.help-desc {
  color: var(--fz-text);
  font-size: 0.85rem;
  font-style: italic;
}

kbd {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.75rem;
  color: var(--fz-blue);
  background: var(--fz-yellow-soft);
  border: 1px solid var(--fz-blue);
  border-radius: 2px;
  min-width: 1.25rem;
  text-align: center;
}

.help-footer {
  margin-top: 1.5rem;
  padding-top: 0.9rem;
  border-top: 1px dashed var(--fz-border);
  color: var(--fz-text-quiet);
  font-size: 0.7rem;
  font-style: italic;
  text-align: center;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzKeyboardHelp.vue
git commit -m "$(cat <<'EOF'
add FzKeyboardHelp component

stage 6 F3.5: ? overlay listing every keyboard shortcut in a
clean two-column layout. kbd-style boxes for keys. Esc or
backdrop click closes. closed by ? again via FzPage's
cascading escape handler.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: FzHexagon.vue — add birthday + cursor props

**Files:**
- Modify: `components/FzHexagon.vue`

**Why:** F3.2 halo + F3.5 cursor visual.

- [ ] **Step 1: Update the Props interface**

Find:
```ts
interface Props {
  index: number
  state: 'past' | 'current' | 'future'
  hoverText: string
  mark?: string
  whisper?: string
  modalOpen?: boolean
  lit?: boolean
  dim?: boolean
  anchored?: boolean
}
```

Replace with:
```ts
interface Props {
  index: number
  state: 'past' | 'current' | 'future'
  hoverText: string
  mark?: string
  whisper?: string
  modalOpen?: boolean
  lit?: boolean
  dim?: boolean
  anchored?: boolean
  birthday?: boolean
  cursor?: boolean
}
```

Find:
```ts
const props = withDefaults(defineProps<Props>(), {
  mark: undefined,
  whisper: undefined,
  modalOpen: false,
  lit: false,
  dim: false,
  anchored: false,
})
```

Replace with:
```ts
const props = withDefaults(defineProps<Props>(), {
  mark: undefined,
  whisper: undefined,
  modalOpen: false,
  lit: false,
  dim: false,
  anchored: false,
  birthday: false,
  cursor: false,
})
```

- [ ] **Step 2: Update the template class binding**

Find:
```vue
    class="hexagon"
    :class="{
      'current-week': isCurrent,
      'marked': isMarked,
      'lit': lit,
      'dim': dim && !lit,
      'anchored': anchored,
    }"
```

Replace with:
```vue
    class="hexagon"
    :class="{
      'current-week': isCurrent,
      'marked': isMarked,
      'lit': lit,
      'dim': dim && !lit,
      'anchored': anchored,
      'birthday': birthday,
      'cursor': cursor,
    }"
```

- [ ] **Step 3: Add CSS for birthday and cursor**

Find the end of the `<style scoped>` block. Before the `@media (prefers-reduced-motion: reduce)` rule, add:

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

.hexagon.cursor::after {
  content: '';
  position: absolute;
  inset: -3px;
  border: 1.5px solid var(--fz-blue);
  pointer-events: none;
}
```

- [ ] **Step 4: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add components/FzHexagon.vue
git commit -m "$(cat <<'EOF'
FzHexagon: add birthday + cursor props

stage 6 F3.2 + F3.5: two new optional boolean props. birthday
renders a 1px circular gold ring inside the hex with a soft
radial glow (via ::before, static, no pulse). cursor renders a
1.5px blue ring outside the hex box (via ::after). both are
independent of lit/dim/anchored so a week can be, for example,
a birthday AND a cursor target AND anchored simultaneously.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: FzGrid.vue — wire birthdaySet + cursor

**Files:**
- Modify: `components/FzGrid.vue`

**Why:** F3.2 + F3.5 — pass birthday/cursor props down, extend v-memo tuple, accept cursor prop from FzPage.

- [ ] **Step 1: Add new imports and props**

Find:
```ts
import { computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useHighlight } from '../composables/useHighlight'
import { useToday } from '../composables/useToday'
import { currentGridIndex, weekRange, totalWeeks } from '../composables/useTime'
```

Replace with:
```ts
import { computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useHighlight } from '../composables/useHighlight'
import { useToday } from '../composables/useToday'
import { currentGridIndex, weekRange, totalWeeks } from '../composables/useTime'
import { birthdayWeeksOfLife } from '../utils/birthday'
```

Find the existing Props:
```ts
interface Props {
  /** Whether a modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
})
```

Replace with:
```ts
interface Props {
  /** Whether a modal is open (suppresses hover text) */
  modalOpen?: boolean
  /** Keyboard cursor index (passed from FzPage) */
  cursorIndex?: number | null
  /** Whether the keyboard cursor is visible */
  cursorVisible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
  cursorIndex: null,
  cursorVisible: false,
})
```

- [ ] **Step 2: Add birthdaySet computed and isBirthday/isCursor helpers**

After the existing `anchorSet` computed, add:

```ts
const birthdaySet = computed<ReadonlySet<number>>(() => {
  if (dobDate.value === null) return new Set<number>()
  return birthdayWeeksOfLife(dobDate.value)
})

function isBirthday(index: number): boolean {
  return birthdaySet.value.has(index)
}

function isCursor(index: number): boolean {
  if (!props.cursorVisible) return false
  return props.cursorIndex === index
}
```

- [ ] **Step 3: Expand the v-memo tuple and pass new props**

Find:
```vue
      v-memo="[i === currentIndex, markFor(i), whisperFor(i), props.modalOpen, dobString, isLit(i), isHighlightActive, isAnchored(i)]"
```

Replace with:
```vue
      v-memo="[i === currentIndex, markFor(i), whisperFor(i), props.modalOpen, dobString, isLit(i), isHighlightActive, isAnchored(i), isBirthday(i), isCursor(i)]"
```

Find the props passed to FzHexagon:
```vue
      :lit="isLit(i)"
      :dim="isHighlightActive && !isLit(i)"
      :anchored="isAnchored(i)"
```

Replace with:
```vue
      :lit="isLit(i)"
      :dim="isHighlightActive && !isLit(i)"
      :anchored="isAnchored(i)"
      :birthday="isBirthday(i)"
      :cursor="isCursor(i)"
```

- [ ] **Step 4: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add components/FzGrid.vue
git commit -m "$(cat <<'EOF'
FzGrid: wire birthdaySet + cursor

stage 6 F3.2 + F3.5: accepts cursorIndex + cursorVisible props
from FzPage. computes birthdaySet from state.dob via
birthdayWeeksOfLife. passes isBirthday + isCursor to each
hexagon and expands the v-memo tuple with both. the cursor
only renders when cursorVisible is true, so mouse-first users
never see it.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: FzPage.vue — orchestrate cursor, arrow handlers, FzFirstRun, FzAnnualLetter, FzKeyboardHelp, useTheme

**Files:**
- Modify: `components/FzPage.vue`

**Why:** F3.1, F3.3, F3.4, F3.5 all need orchestration. The final wire-up task.

- [ ] **Step 1: Add imports and state**

Find the script-setup imports block and add after the existing ones:

```ts
import { useTheme } from '../composables/useTheme'
import { totalWeeks } from '../composables/useTime'
```

After the existing `const { today } = useToday()` line, add:

```ts
const theme = useTheme()
```

After the existing state refs in FzPage, add:

```ts
const keyboardHelpOpen = ref(false)
const cursorIndex = ref(0)
const cursorVisible = ref(false)
const GRID_COLS = 21
```

- [ ] **Step 2: Add helper functions for keyboard cursor**

After the existing `toggleQuietMode` function, add:

```ts
function openKeyboardHelp(): void {
  keyboardHelpOpen.value = true
}

function closeKeyboardHelp(): void {
  keyboardHelpOpen.value = false
}

function ensureCursorVisible(): void {
  if (!cursorVisible.value) {
    cursorVisible.value = true
    // Initial position: current week (today)
    if (state.value !== null) {
      const dob = new Date(state.value.dob)
      cursorIndex.value = weekIndex(dob, today.value)
    }
  }
}

function moveCursor(delta: number): void {
  ensureCursorVisible()
  const next = Math.max(0, Math.min(totalWeeks - 1, cursorIndex.value + delta))
  cursorIndex.value = next
}

function onArrowUp(): void { moveCursor(-GRID_COLS) }
function onArrowDown(): void { moveCursor(GRID_COLS) }
function onArrowLeft(): void { moveCursor(-1) }
function onArrowRight(): void { moveCursor(1) }

function onEnter(): void {
  if (state.value === null) return
  if (!cursorVisible.value) return
  openMarkPopover(cursorIndex.value)
}

function onQuestion(): void {
  if (keyboardHelpOpen.value) {
    closeKeyboardHelp()
  }
  else {
    openKeyboardHelp()
  }
}
```

- [ ] **Step 3: Extend the onEscape cascade**

Find:
```ts
function onEscape(): void {
  // Cascade: close the highest-priority overlay first.
  // FzMarkPopover and FzSundayModal have their own @keydown="onKey"
  // handlers that close on Escape via the locally-focused input. They
  // are still in this cascade as a safety net for cases where focus is
  // not inside the modal (e.g., user clicked the backdrop's edge first).
  if (searchOpen.value) {
    closeSearch()
    return
  }
```

Replace with:
```ts
function onEscape(): void {
  // Cascade: close the highest-priority overlay first.
  if (keyboardHelpOpen.value) {
    closeKeyboardHelp()
    return
  }
  if (searchOpen.value) {
    closeSearch()
    return
  }
```

At the end of onEscape, before the final `quietMode.value = false`:
```ts
  if (cursorVisible.value) {
    cursorVisible.value = false
    return
  }
```

Full updated onEscape:
```ts
function onEscape(): void {
  // Cascade: close the highest-priority overlay first.
  if (keyboardHelpOpen.value) {
    closeKeyboardHelp()
    return
  }
  if (searchOpen.value) {
    closeSearch()
    return
  }
  if (showModal.value) {
    closeModal()
    return
  }
  if (vowModalOpen.value) {
    closeVowModal()
    return
  }
  if (markPopoverOpen.value) {
    closeMarkPopover()
    return
  }
  if (highlight.isActive.value) {
    highlight.clear()
    return
  }
  if (cursorVisible.value) {
    cursorVisible.value = false
    return
  }
  if (quietMode.value) {
    quietMode.value = false
  }
}
```

- [ ] **Step 4: Register new keyboard handlers in onMounted**

Find the existing keyboard registrations:
```ts
  keyboard.init()
  keyboard.on('v', openVowModal)
  keyboard.on('q', toggleQuietMode)
  keyboard.on('/', onSlashKey)
  keyboard.on('escape', onEscape)
```

Replace with:
```ts
  keyboard.init()
  keyboard.on('v', openVowModal)
  keyboard.on('q', toggleQuietMode)
  keyboard.on('/', onSlashKey)
  keyboard.on('escape', onEscape)
  keyboard.on('enter', onEnter)
  keyboard.on('arrowup', onArrowUp)
  keyboard.on('arrowdown', onArrowDown)
  keyboard.on('arrowleft', onArrowLeft)
  keyboard.on('arrowright', onArrowRight)
  keyboard.on('?', onQuestion)

  theme.init()
```

Update `onBeforeUnmount` to also clear the new handlers:

Find:
```ts
  keyboard.off('v', openVowModal)
  keyboard.off('q', toggleQuietMode)
  keyboard.off('/', onSlashKey)
  keyboard.off('escape', onEscape)
```

Replace with:
```ts
  keyboard.off('v', openVowModal)
  keyboard.off('q', toggleQuietMode)
  keyboard.off('/', onSlashKey)
  keyboard.off('escape', onEscape)
  keyboard.off('enter', onEnter)
  keyboard.off('arrowup', onArrowUp)
  keyboard.off('arrowdown', onArrowDown)
  keyboard.off('arrowleft', onArrowLeft)
  keyboard.off('arrowright', onArrowRight)
  keyboard.off('?', onQuestion)
```

- [ ] **Step 5: Update openMarkPopover to update cursor on click**

Find:
```ts
function openMarkPopover(week: number): void {
  // First-run escape: if the user dismissed FzDobModal without saving and
  // then clicked a hexagon, there's no state to mutate. Re-open the dob
  // modal instead of trying to open the mark popover — setMark would
  // throw "no state loaded" and freeze the UI silently.
  if (state.value === null) {
    showModal.value = true
    return
  }
  markPopoverWeek.value = week
  markPopoverOpen.value = true
}
```

Replace with:
```ts
function openMarkPopover(week: number): void {
  // First-run escape: if the user dismissed FzDobModal without saving and
  // then clicked a hexagon, there's no state to mutate. Re-open the dob
  // modal instead of trying to open the mark popover — setMark would
  // throw "no state loaded" and freeze the UI silently.
  if (state.value === null) {
    showModal.value = true
    return
  }
  // Cursor follows clicks (even if cursorVisible is false, update the
  // position so the next arrow press starts from here).
  cursorIndex.value = week
  markPopoverWeek.value = week
  markPopoverOpen.value = true
}
```

- [ ] **Step 6: Update the template to render new components**

Find:
```vue
    <FzDobModal
      :open="showModal"
      @close="closeModal"
      @saved="onSaved"
    />
    <FzVowModal
      :open="vowModalOpen"
      @close="closeVowModal"
    />
    <FzGrid
      ref="gridRef"
      :modal-open="showModal || markPopoverOpen || sundayModalOpen || vowModalOpen"
      @hex-click="openMarkPopover"
    />
```

Replace with:
```vue
    <FzFirstRun v-if="state === null" @done="onSaved" />
    <FzDobModal
      :open="showModal"
      @close="closeModal"
      @saved="onSaved"
    />
    <FzVowModal
      :open="vowModalOpen"
      @close="closeVowModal"
    />
    <FzAnnualLetter />
    <FzKeyboardHelp
      :open="keyboardHelpOpen"
      @close="closeKeyboardHelp"
    />
    <FzGrid
      ref="gridRef"
      :modal-open="showModal || markPopoverOpen || sundayModalOpen || vowModalOpen || keyboardHelpOpen"
      :cursor-index="cursorIndex"
      :cursor-visible="cursorVisible"
      @hex-click="openMarkPopover"
    />
```

Note: FzDobModal is still in the template because it's used for later DOB editing (click the title), but `v-if="state !== null"` is implicit since `showModal` starts false and only opens via user action.

Wait — the existing FzPage DOES auto-open FzDobModal when state is null. That needs to change — FzFirstRun replaces it. Find the onMounted block:

```ts
onMounted(() => {
  if (state.value === null) {
    showModal.value = true
  }
```

Replace with:
```ts
onMounted(() => {
  // Stage 6: FzFirstRun replaces the auto-open of FzDobModal
  // for brand-new users (state.value === null). FzDobModal is
  // still rendered when the user explicitly opens it (e.g., by
  // clicking the title to edit DOB later).
```

Just remove the `if (state.value === null) { showModal.value = true }` block — FzFirstRun handles the brand-new case via v-if.

- [ ] **Step 7: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -8
```

- [ ] **Step 8: Commit**

```bash
git add components/FzPage.vue
git commit -m "$(cat <<'EOF'
FzPage: stage 6 orchestration

mounts useTheme (applies data-theme to <html> reactively).
mounts FzFirstRun for brand-new users (state.value === null)
and FzAnnualLetter always (it decides its own mode internally).
mounts FzKeyboardHelp for the ? overlay.

extends the keyboard cascade with enter/arrow*/? and onEscape
adds cursor-hide + keyboard-help-close. cursorIndex follows
clicks (even when cursorVisible is false) so mixed mouse+
keyboard works naturally. arrow keys toggle cursorVisible=true
on first press, then move by GRID_COLS=21 (hardcoded desktop
layout).

FzFirstRun replaces the old auto-open of FzDobModal on null
state. FzDobModal stays for explicit title clicks.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: FzToolbar.vue — add FzThemeToggle

**Files:**
- Modify: `components/FzToolbar.vue`

**Why:** F3.4 toolbar button for theme cycling.

- [ ] **Step 1: Add FzThemeToggle to the toolbar**

Find:
```vue
    <FzPushButton />
    <FzInstallButton />
```

Replace with:
```vue
    <FzThemeToggle />
    <FzPushButton />
    <FzInstallButton />
```

- [ ] **Step 2: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add components/FzToolbar.vue
git commit -m "$(cat <<'EOF'
FzToolbar: add FzThemeToggle button

stage 6 F3.4 wiring: auto-imported FzThemeToggle renders before
the push/install buttons. click cycles through auto/light/dark.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Smoke test + final verification + tag

**Files:** None — verification only.

- [ ] **Step 1: Run all checks**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm generate
```

Expected: all clean. Test count ~303.

- [ ] **Step 2: Dev-server smoke test**

```bash
pnpm dev > /tmp/fz-ax-stage6-dev.log 2>&1 &
sleep 12
tail -20 /tmp/fz-ax-stage6-dev.log
curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:3000 || curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:3003
pkill -f "nuxt dev" || true
```

- [ ] **Step 3: Tag**

```bash
git tag -a stage-6-tier-3-dreams -m "Stage 6 — Tier 3 Dreams (feature-complete)"
git log --oneline stage-5-tier-2-rituals..stage-6-tier-3-dreams
```

Do NOT push. The autopilot SHIP phase handles that.

---

## Self-review checklist

- [ ] All 5 F3.* features implemented
- [ ] CSS variables defined + 15 components migrated
- [ ] Storage validators for letters + theme
- [ ] 3 new useFzState actions (setTheme, writeAnnualLetter, markLetterRead)
- [ ] useKeyboard extended with enter/arrow*/?
- [ ] useTheme composable + tests
- [ ] birthdayWeeksOfLife utility + tests
- [ ] 5 new components (FzFirstRun, FzAnnualLetter, FzThemeToggle, FzKeyboardHelp, plus updates to FzHexagon/FzGrid/FzPage/FzToolbar)
- [ ] FzFirstRun replaces FzDobModal auto-open on null state
- [ ] All 266 existing tests still pass
- [ ] ~37 new tests added (final ~303)
- [ ] No regressions

## Definition of done

- All 16 tasks complete
- ~303 tests passing
- `stage-6-tier-3-dreams` tag at the head of master
- **fz.ax is feature-complete per the parent spec**
