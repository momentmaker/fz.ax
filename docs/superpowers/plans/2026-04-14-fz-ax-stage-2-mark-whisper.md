# fz.ax Stage 2 — The Mark + The Whisper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make fz.ax interactive. Clicking any hexagon opens a popover where the user can mark the week with a single character, tap a recently-used palette glyph, and whisper one sentence. 4,000 hexagons become a living mosaic.

**Architecture:** A new `FzMarkPopover` centered modal is hosted by `FzPage`. Opens on `FzGrid`'s `hex-click` event. Reads/writes through three new `useFzState` actions (`setMark`, `setWhisper`, `clearMark`) that validate at the composable boundary. A new `usePalette` composable derives the top 8 marks by recency-weighted frequency. `FzHexagon` gains `mark` and `whisper` props; `FzGrid` uses `v-memo` so a single `setMark` re-renders only one hexagon. `isValidFzState` deepens to validate `WeekEntry` shape.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript strict, Vitest, Intl.Segmenter for grapheme clusters.

**Spec reference:** `docs/superpowers/specs/2026-04-14-fz-ax-stage-2-mark-whisper-design.md` — this plan implements that spec exactly. Parent spec: `docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md`.

**Pre-flight sanity check:** Before starting:
- You are in `/Users/rubberduck/GitHub/momentmaker/fz.ax`
- `git status` → clean
- `git tag --list stage-1-foundations` → exists
- `pnpm test` → 59 passing
- `pnpm lint && pnpm typecheck` → clean

---

## Task 1: Grapheme cluster utility (TDD)

**Files:**
- Create: `tests/grapheme.spec.ts`
- Create: `utils/grapheme.ts`

**Why:** `setMark` must validate that the mark is exactly one grapheme cluster. `'❤'.length === 1` but `'👨‍👩‍👧'.length === 8` and `'a\u0308'.length === 2` ("ä" as combining). JavaScript's `.length` counts UTF-16 code units, which is the wrong unit. We need `Intl.Segmenter` with `granularity: 'grapheme'`.

- [ ] **Step 1: Write the failing tests**

Create `tests/grapheme.spec.ts` with this exact content:

```ts
import { describe, it, expect } from 'vitest'
import { isSingleGrapheme, graphemeCount } from '../utils/grapheme'

describe('isSingleGrapheme', () => {
  it('rejects the empty string', () => {
    // #given an empty input
    // #then it is not a single grapheme
    expect(isSingleGrapheme('')).toBe(false)
  })

  it('accepts a simple ASCII character', () => {
    // #given one letter
    // #then it is one grapheme
    expect(isSingleGrapheme('a')).toBe(true)
  })

  it('rejects two ASCII characters', () => {
    // #given two letters
    // #then it is not a single grapheme
    expect(isSingleGrapheme('ab')).toBe(false)
  })

  it('accepts a single emoji', () => {
    // #given a BMP emoji
    // #then it is one grapheme
    expect(isSingleGrapheme('❤')).toBe(true)
  })

  it('accepts a family emoji (ZWJ sequence of 4 code points)', () => {
    // #given a multi-person emoji that is 8 UTF-16 code units but 1 user-perceived char
    // #then it is still one grapheme
    expect(isSingleGrapheme('👨‍👩‍👧')).toBe(true)
  })

  it('rejects two emoji', () => {
    // #given two hearts
    // #then it is not a single grapheme
    expect(isSingleGrapheme('❤❤')).toBe(false)
  })

  it('accepts a CJK character', () => {
    // #given a kanji
    // #then it is one grapheme
    expect(isSingleGrapheme('喜')).toBe(true)
  })

  it('accepts a combining character sequence', () => {
    // #given "a" + combining diaeresis → "ä" (2 code units, 1 grapheme)
    // #then it is still one grapheme
    expect(isSingleGrapheme('a\u0308')).toBe(true)
  })
})

describe('graphemeCount', () => {
  it('returns 0 for empty string', () => {
    expect(graphemeCount('')).toBe(0)
  })

  it('returns 1 for a simple char', () => {
    expect(graphemeCount('a')).toBe(1)
  })

  it('returns the correct count for a mix', () => {
    expect(graphemeCount('a❤喜')).toBe(3)
  })

  it('counts a ZWJ sequence as one', () => {
    expect(graphemeCount('👨‍👩‍👧')).toBe(1)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test tests/grapheme.spec.ts
```

Expected: tests fail with "Cannot find module '../utils/grapheme'". Exit non-zero.

- [ ] **Step 3: Implement utils/grapheme.ts**

Create `utils/grapheme.ts` with this exact content:

```ts
/**
 * Grapheme-cluster utilities for Mark validation.
 *
 * A "grapheme cluster" is what a user perceives as one character. It may be
 * composed of multiple Unicode code points (e.g., a family emoji with zero-
 * width joiners) or multiple UTF-16 code units (e.g., a surrogate pair).
 *
 * We need real grapheme counting because The Mark is "exactly one character"
 * per the spec, and JavaScript's `.length` counts UTF-16 code units, which
 * gives the wrong answer for anything outside the BMP or anything combined.
 *
 * `Intl.Segmenter` is available in all modern browsers (Chrome 87+,
 * Firefox 125+, Safari 14.1+, Node 16+). A pre-computed Segmenter is reused
 * across calls for performance.
 */

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * True if `value` is a non-empty string containing exactly one grapheme cluster.
 */
export function isSingleGrapheme(value: string): boolean {
  if (value === '') return false
  return graphemeCount(value) === 1
}

/**
 * Count the grapheme clusters in `value`. Returns 0 for the empty string.
 */
export function graphemeCount(value: string): number {
  if (value === '') return 0
  let count = 0
  for (const _ of segmenter.segment(value)) {
    count++
  }
  return count
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
pnpm test tests/grapheme.spec.ts
```

Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/grapheme.spec.ts utils/grapheme.ts
git commit -m "$(cat <<'EOF'
add grapheme cluster utility (TDD)

stage 2 prep: setMark needs to validate "exactly one character" for
The Mark, and JavaScript's .length counts UTF-16 code units which
gives the wrong answer for emoji ZWJ sequences, surrogate pairs,
and combining characters. Intl.Segmenter with granularity grapheme
is the right tool and is available in every modern browser. the
segmenter instance is module-scope for reuse.
EOF
)"
```

---

## Task 2: Tighten `isValidFzState` to deep-check `WeekEntry` shape (TDD)

**Files:**
- Modify: `tests/storage.spec.ts` (add 5 new tests)
- Modify: `utils/storage.ts` (add `hasValidWeeks` helper)

**Why:** The current validator only checks that `weeks` is an object. Stage 2 reads `state.value.weeks[i].mark`, so if a week entry is missing `mark` or `markedAt`, the read returns `undefined` and downstream code crashes. The Stage 1 seam comment in `useFzState.ts` explicitly flagged this: "Before Stage 2 reads `state.value.weeks[i].mark`, either tighten the validator…"

- [ ] **Step 1: Write the failing tests**

Open `tests/storage.spec.ts`. Find the `it('clears the state', ...)` test. Right after that test (before the `it('writeState returns true on success', ...)` test), add these 5 tests:

```ts
  it('rejects a blob where weeks has a non-object entry', () => {
    // #given a v1 blob where weeks[100] is a number instead of an object
    const bad = { ...sampleState, weeks: { 100: 42 } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where a WeekEntry is missing mark', () => {
    // #given a week entry without a mark field
    const bad = {
      ...sampleState,
      weeks: { 100: { markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where WeekEntry.mark is an empty string', () => {
    // #given a week entry with an empty-string mark
    const bad = {
      ...sampleState,
      weeks: { 100: { mark: '', markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where weeks has a non-integer key', () => {
    // #given a week key that isn't a parseable non-negative integer
    const bad = {
      ...sampleState,
      weeks: { 'hundred': { mark: '❤', markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('accepts a blob with multiple valid week entries', () => {
    // #given a state with several correctly-shaped weeks
    const ok = {
      ...sampleState,
      weeks: {
        100: { mark: '❤', markedAt: '2025-01-01T00:00:00.000Z' },
        200: { mark: '☀', whisper: 'good day', markedAt: '2025-02-01T00:00:00.000Z' },
        300: { mark: 'w', markedAt: '2025-03-01T00:00:00.000Z' },
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    // #then readState accepts and returns the whole thing
    const result = readState()
    expect(result).toEqual(ok)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test tests/storage.spec.ts
```

Expected: the 4 rejection tests fail (the current shallow validator accepts them), and the 5th (the happy-path multi-week test) also fails or passes depending on timing. The important thing is that rejection tests fail.

- [ ] **Step 3: Update `utils/storage.ts`**

Open `utils/storage.ts`. Find the `isValidFzState` function. Replace it and add the helper, so the relevant section reads:

```ts
/**
 * Narrow validation — confirms the parsed blob has the minimum shape required
 * to be treated as an FzState. Validates top-level fields and deep-checks
 * every WeekEntry, because Stage 2+ code reads `state.weeks[i].mark` and
 * would crash on a missing field.
 *
 * When Stage 2+ accesses nested fields beyond WeekEntry, extend the helper
 * below (not the top-level checker) so each sub-shape has its own validator.
 */
function isValidFzState(value: unknown): value is FzState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    typeof v.dob === 'string' &&
    hasValidWeeks(v.weeks) &&
    (v.vow === null || typeof v.vow === 'object') &&
    Array.isArray(v.letters) &&
    Array.isArray(v.anchors) &&
    typeof v.prefs === 'object' && v.prefs !== null &&
    typeof v.meta === 'object' && v.meta !== null
  )
}

/**
 * Validate the sparse weeks map: every key must be a non-negative integer
 * (serialized as a string in JSON), and every value must be a well-formed
 * WeekEntry with a non-empty mark and a markedAt timestamp. An optional
 * whisper is allowed; any other field is allowed too (forward compatibility).
 */
function hasValidWeeks(weeks: unknown): weeks is Record<number, { mark: string; whisper?: string; markedAt: string }> {
  if (weeks === null || typeof weeks !== 'object' || Array.isArray(weeks)) {
    return false
  }
  for (const [key, entry] of Object.entries(weeks as Record<string, unknown>)) {
    if (!/^\d+$/.test(key)) return false
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return false
    const e = entry as Record<string, unknown>
    if (typeof e.mark !== 'string' || e.mark === '') return false
    if (typeof e.markedAt !== 'string') return false
    if (e.whisper !== undefined && typeof e.whisper !== 'string') return false
  }
  return true
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
pnpm test tests/storage.spec.ts
```

Expected: all storage tests pass, including the 5 new deep-validation tests.

- [ ] **Step 5: Run the full suite to make sure nothing broke**

Run:
```bash
pnpm test
```

Expected: all tests pass. Existing migrate and useFzState tests may need attention since they use an `aValidV1State` helper that includes `weeks: {}` — this should still pass since empty object is valid.

- [ ] **Step 6: Commit**

```bash
git add tests/storage.spec.ts utils/storage.ts
git commit -m "$(cat <<'EOF'
deep-validate WeekEntry shape in isValidFzState (TDD)

stage 2 prep: the stage 1 seam note in useFzState.ts flagged that
isValidFzState only checked top-level fields, so a malformed weeks
entry would pass and crash downstream code. now hasValidWeeks checks
every week: keys must be non-negative integers, values must be
objects with a non-empty mark string and a markedAt timestamp.
optional whisper is allowed. a malformed weeks entry now causes the
entire state to be rejected and the user falls back to first-run.
+5 tests covering the rejection paths and the valid multi-week
happy path.
EOF
)"
```

---

## Task 3: Add `setMark` to `useFzState` (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts` (add setMark tests)
- Modify: `composables/useFzState.ts` (add `setMark`, extend `UseFzStateReturn`)

**Why:** The core mutation. Validates at the composable boundary. Preserves any existing whisper on the week. Updates localStorage immediately.

- [ ] **Step 1: Write the failing tests**

Open `tests/useFzState.spec.ts`. After the last existing test (`it('returns the same reactive ref across multiple calls', …)`) and before the closing `})` of the top-level `describe`, add this test suite:

```ts
  describe('setMark', () => {
    it('throws when state is null (no dob set yet)', () => {
      // #given no prior state
      const { setMark } = useFzState()
      // #when setMark is called
      // #then it throws because there's no state to mutate
      expect(() => setMark(100, '❤')).toThrow(/no state/i)
    })

    it('sets a mark on a fresh week', () => {
      // #given a state with a dob but no marks
      const { state, setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #when we mark week 100 with a heart
      setMark(100, '❤')
      // #then the week now has that mark
      const entry = state.value!.weeks[100]
      expect(entry).not.toBeUndefined()
      expect(entry!.mark).toBe('❤')
      expect(typeof entry!.markedAt).toBe('string')
    })

    it('persists the mark to localStorage', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #when we mark a week
      setMark(100, '❤')
      // #then the mark is in localStorage
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed.weeks[100].mark).toBe('❤')
    })

    it('overwrites an existing mark but preserves the whisper', () => {
      // #given a state with a marked and whispered week
      const { state, setDob, setMark, setWhisper } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      setWhisper(100, 'first kiss')
      // #when we change the mark
      setMark(100, '☀')
      // #then the mark is new but the whisper stays
      const entry = state.value!.weeks[100]
      expect(entry!.mark).toBe('☀')
      expect(entry!.whisper).toBe('first kiss')
    })

    it('throws for a negative week index', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects negative week indices
      expect(() => setMark(-1, '❤')).toThrow(/week/i)
    })

    it('throws for a week index >= totalWeeks', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects indices beyond the grid
      expect(() => setMark(4000, '❤')).toThrow(/week/i)
    })

    it('throws for a non-integer week index', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects non-integer indices
      expect(() => setMark(1.5, '❤')).toThrow(/week/i)
    })

    it('throws for an empty mark', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects an empty-string mark
      expect(() => setMark(100, '')).toThrow(/mark/i)
    })

    it('throws for a multi-character mark', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects a two-character mark
      expect(() => setMark(100, 'ab')).toThrow(/mark/i)
    })

    it('accepts a ZWJ-sequence emoji as a single grapheme', () => {
      // #given a state with a dob
      const { state, setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #when we mark with a family emoji (1 user-perceived char, 8 code units)
      setMark(100, '👨‍👩‍👧')
      // #then it is accepted
      expect(state.value!.weeks[100]!.mark).toBe('👨‍👩‍👧')
    })
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm test tests/useFzState.spec.ts
```

Expected: all 10 new tests fail (setMark is not yet defined on the return type). Existing tests still pass.

- [ ] **Step 3: Update `composables/useFzState.ts`**

Open the file. Add imports at the top:

```ts
import { totalWeeks } from './useTime'
import { isSingleGrapheme } from '../utils/grapheme'
```

Now add the `setMark` function and the `assertState` helper. After the existing `setDob` function (and before `resetState`), insert:

```ts
/**
 * Assert the loaded state is non-null, returning a type-narrowed reference
 * suitable for mutation. Throws if called before any dob is set — the Stage 2
 * action surface refuses to operate on an uninitialized state rather than
 * silently creating one (which would lose the user's expectation).
 */
function assertState(): FzState {
  const state = ensureLoaded()
  if (state.value === null) {
    throw new Error('useFzState: no state loaded — call setDob first')
  }
  return state.value
}

/**
 * Assert `week` is a valid grid index. Throws otherwise.
 */
function assertWeek(week: number): void {
  if (!Number.isInteger(week) || week < 0 || week >= totalWeeks) {
    throw new Error(`useFzState: week index ${week} is out of range [0, ${totalWeeks})`)
  }
}

/**
 * Assert `mark` is exactly one grapheme cluster. Throws otherwise.
 */
function assertSingleGrapheme(mark: string): void {
  if (!isSingleGrapheme(mark)) {
    throw new Error(`useFzState: mark must be exactly one grapheme cluster, got "${mark}"`)
  }
}

/**
 * Set a Mark on a week. Preserves any existing whisper. Writes to localStorage
 * immediately. Reference-replaces state at the top level — consumers should use
 * v-memo or per-hexagon computed values to avoid re-rendering all 4000 hexagons.
 */
function setMark(week: number, mark: string): void {
  const state = ensureLoaded()
  const current = assertState()
  assertWeek(week)
  assertSingleGrapheme(mark)
  const existing = current.weeks[week]
  const next: FzState = {
    ...current,
    weeks: {
      ...current.weeks,
      [week]: {
        mark,
        ...(existing?.whisper !== undefined ? { whisper: existing.whisper } : {}),
        markedAt: new Date().toISOString(),
      },
    },
  }
  state.value = next
  writeState(next)
}
```

Note the `assertState` + `ensureLoaded` pattern: `ensureLoaded` gives us the ref so we can mutate `state.value`; `assertState` gives us the guaranteed-non-null current value for reads.

Update the `UseFzStateReturn` interface to include the new action:

```ts
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  resetState: () => void
}
```

And update the `useFzState` return:

```ts
export function useFzState(): UseFzStateReturn {
  return {
    state: ensureLoaded(),
    setDob,
    setMark,
    resetState,
  }
}
```

- [ ] **Step 4: Run the setMark tests**

Run:
```bash
pnpm test tests/useFzState.spec.ts
```

Expected: some pass, some still fail because the tests also call `setWhisper` which we haven't added yet. That's fine — note which fail and move on. The tests specifically testing `setMark` in isolation should pass.

Actually, one of the setMark tests calls setWhisper. Let me fix this: change the test to use direct localStorage manipulation instead. Or accept the failure and fix after setWhisper is added.

Update the `overwrites an existing mark but preserves the whisper` test to seed the whisper directly into state:

Find the test and replace its body:

```ts
    it('overwrites an existing mark but preserves the whisper', () => {
      // #given a state with a marked and whispered week (seeded via localStorage)
      const persisted = {
        version: 1,
        dob: '1990-05-15',
        weeks: {
          100: {
            mark: '❤',
            whisper: 'first kiss',
            markedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto', pushOptIn: false, reducedMotion: 'auto', weekStart: 'mon' },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
      const { state, setMark } = useFzState()
      // #when we change the mark
      setMark(100, '☀')
      // #then the mark is new but the whisper stays
      const entry = state.value!.weeks[100]
      expect(entry!.mark).toBe('☀')
      expect(entry!.whisper).toBe('first kiss')
    })
```

Now re-run:

```bash
pnpm test tests/useFzState.spec.ts
```

Expected: all 10 setMark tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
add setMark to useFzState (TDD)

stage 2 core mutation. validates at the composable boundary per the
stage 1 seam note: throws for out-of-range week, throws for
multi-grapheme mark, throws for empty mark, throws when no state is
loaded (requires setDob first). uses isSingleGrapheme from the new
grapheme utility so ZWJ emoji and combining characters work. the
upsert pattern spreads weeks and merges a new WeekEntry with the
existing whisper preserved. reference-replace on state — consumers
must use v-memo to avoid 4000-hex re-render explosion. +10 tests
covering all validation paths and the emoji happy path.
EOF
)"
```

---

## Task 4: Add `setWhisper` to `useFzState` (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** The companion to `setMark`. Attaches a sentence to a week. Requires the week to already have a mark (no orphan whispers).

- [ ] **Step 1: Write the failing tests**

Open `tests/useFzState.spec.ts`. After the closing `})` of the `describe('setMark', ...)` block, add:

```ts
  describe('setWhisper', () => {
    it('throws when state is null', () => {
      // #given no prior state
      const { setWhisper } = useFzState()
      // #then setWhisper throws
      expect(() => setWhisper(100, 'hi')).toThrow(/no state/i)
    })

    it('throws when the week has no mark', () => {
      // #given a state with a dob but no marks
      const { setDob, setWhisper } = useFzState()
      setDob('1990-05-15')
      // #then setWhisper throws because you can't whisper to an unmarked week
      expect(() => setWhisper(100, 'hi')).toThrow(/no mark|unmarked/i)
    })

    it('sets a whisper on a marked week', () => {
      // #given a marked week
      const { state, setDob, setMark, setWhisper } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      // #when we whisper
      setWhisper(100, 'first kiss')
      // #then the whisper is stored
      expect(state.value!.weeks[100]!.whisper).toBe('first kiss')
      expect(state.value!.weeks[100]!.mark).toBe('❤')
    })

    it('persists the whisper to localStorage', () => {
      // #given a marked week
      const { setDob, setMark, setWhisper } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      // #when we whisper
      setWhisper(100, 'first kiss')
      // #then localStorage reflects it
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).weeks[100].whisper).toBe('first kiss')
    })

    it('empty string removes the whisper but keeps the mark', () => {
      // #given a marked and whispered week
      const { state, setDob, setMark, setWhisper } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      setWhisper(100, 'first kiss')
      // #when we set an empty whisper
      setWhisper(100, '')
      // #then the whisper is gone but the mark stays
      expect(state.value!.weeks[100]!.whisper).toBeUndefined()
      expect(state.value!.weeks[100]!.mark).toBe('❤')
    })

    it('throws for a non-integer week', () => {
      const { setDob, setWhisper } = useFzState()
      setDob('1990-05-15')
      expect(() => setWhisper(1.5, 'hi')).toThrow(/week/i)
    })

    it('throws for a week out of range', () => {
      const { setDob, setWhisper } = useFzState()
      setDob('1990-05-15')
      expect(() => setWhisper(4000, 'hi')).toThrow(/week/i)
    })
  })
```

- [ ] **Step 2: Run to verify failures**

Run:
```bash
pnpm test tests/useFzState.spec.ts
```

Expected: the 7 new setWhisper tests fail (function doesn't exist). Existing setMark tests still pass.

- [ ] **Step 3: Implement `setWhisper`**

In `composables/useFzState.ts`, after the `setMark` function, add:

```ts
/**
 * Set a Whisper on a week. The week must already have a Mark — you cannot
 * whisper to an unmarked week (the UI never allows this, and the data would
 * be orphaned). An empty whisper string removes the whisper field but keeps
 * the Mark. Writes to localStorage immediately.
 */
function setWhisper(week: number, whisper: string): void {
  const state = ensureLoaded()
  const current = assertState()
  assertWeek(week)
  const existing = current.weeks[week]
  if (existing === undefined) {
    throw new Error(`useFzState: cannot whisper to an unmarked week ${week}; setMark first`)
  }
  const next: FzState = {
    ...current,
    weeks: {
      ...current.weeks,
      [week]: whisper === ''
        ? { mark: existing.mark, markedAt: existing.markedAt }
        : { mark: existing.mark, whisper, markedAt: new Date().toISOString() },
    },
  }
  state.value = next
  writeState(next)
}
```

Note: empty-string whisper preserves the original `markedAt` (because it's removing content, not adding). Non-empty whisper updates `markedAt` to now (because it's a new edit).

Extend `UseFzStateReturn` and the `useFzState` return:

```ts
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  resetState: () => void
}

export function useFzState(): UseFzStateReturn {
  return {
    state: ensureLoaded(),
    setDob,
    setMark,
    setWhisper,
    resetState,
  }
}
```

- [ ] **Step 4: Run the tests**

Run:
```bash
pnpm test tests/useFzState.spec.ts
```

Expected: all tests pass. Go back to the `setMark` test `overwrites an existing mark but preserves the whisper` — it should now work with `setWhisper` too. You can (optionally) simplify it back to use `setWhisper` directly.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
add setWhisper to useFzState (TDD)

stage 2 mutation: attach one sentence to a marked week. empty
string removes the whisper while preserving the mark (and its
original markedAt). non-empty whisper refreshes markedAt since
it's a content edit. throws when called on an unmarked week
(no orphan whispers per the soul rule). +7 tests covering
validation, persistence, and the empty-string removal path.
EOF
)"
```

---

## Task 5: Add `clearMark` to `useFzState` (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** Un-marking a week removes the entire `WeekEntry` (mark + whisper together). Idempotent: calling it on an already-unmarked week is a silent no-op.

- [ ] **Step 1: Write the failing tests**

After the `describe('setWhisper', …)` block in `tests/useFzState.spec.ts`, add:

```ts
  describe('clearMark', () => {
    it('throws when state is null', () => {
      // #given no prior state
      const { clearMark } = useFzState()
      // #then clearMark throws
      expect(() => clearMark(100)).toThrow(/no state/i)
    })

    it('removes the entire WeekEntry', () => {
      // #given a marked and whispered week
      const { state, setDob, setMark, setWhisper, clearMark } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      setWhisper(100, 'first kiss')
      // #when we clear
      clearMark(100)
      // #then the week is gone from the sparse map
      expect(state.value!.weeks[100]).toBeUndefined()
    })

    it('persists the removal to localStorage', () => {
      // #given a marked week
      const { setDob, setMark, clearMark } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      // #when we clear
      clearMark(100)
      // #then localStorage no longer has the week
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).weeks[100]).toBeUndefined()
    })

    it('is a silent no-op on an unmarked week', () => {
      // #given a state with a dob but no marks
      const { state, setDob, clearMark } = useFzState()
      setDob('1990-05-15')
      // #when we clear a never-marked week
      // #then no throw, no state change
      expect(() => clearMark(100)).not.toThrow()
      expect(state.value!.weeks).toEqual({})
    })

    it('throws for an out-of-range week', () => {
      const { setDob, clearMark } = useFzState()
      setDob('1990-05-15')
      expect(() => clearMark(4000)).toThrow(/week/i)
    })
  })
```

- [ ] **Step 2: Run to verify failures**

Run:
```bash
pnpm test tests/useFzState.spec.ts
```

Expected: the 5 new tests fail.

- [ ] **Step 3: Implement `clearMark`**

After `setWhisper` in `composables/useFzState.ts`:

```ts
/**
 * Remove the Mark (and any Whisper) from a week. Idempotent — calling this
 * on an unmarked week is a silent no-op, not a throw. Writes to localStorage
 * immediately when a mutation actually happens.
 */
function clearMark(week: number): void {
  const state = ensureLoaded()
  const current = assertState()
  assertWeek(week)
  if (current.weeks[week] === undefined) return
  // Clone weeks without the target key (preserving forward-compatibility
  // fields on other entries).
  const nextWeeks: Record<number, FzState['weeks'][number]> = {}
  for (const [key, entry] of Object.entries(current.weeks)) {
    if (Number(key) !== week) {
      nextWeeks[Number(key)] = entry
    }
  }
  const next: FzState = { ...current, weeks: nextWeeks }
  state.value = next
  writeState(next)
}
```

Extend the return type and composable:

```ts
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  clearMark: (week: number) => void
  resetState: () => void
}

export function useFzState(): UseFzStateReturn {
  return {
    state: ensureLoaded(),
    setDob,
    setMark,
    setWhisper,
    clearMark,
    resetState,
  }
}
```

- [ ] **Step 4: Run all tests**

Run:
```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
add clearMark to useFzState (TDD)

stage 2 mutation: removes both the mark and the whisper from a week.
idempotent — clearing an already-unmarked week is a silent no-op
instead of a throw (less surprising for callers, and matches the
intuition that "undo" on a no-op is a no-op). throws for an
out-of-range week index. the implementation rebuilds the weeks map
without the target key so forward-compatible fields on other
entries are preserved. +5 tests covering happy path, persistence,
no-op branch, and validation.
EOF
)"
```

---

## Task 6: Build the `usePalette` composable (TDD)

**Files:**
- Create: `tests/usePalette.spec.ts`
- Create: `composables/usePalette.ts`

**Why:** The Personal Palette — top 8 most-used marks by recency-weighted frequency. Pure composable. Consumed by `FzMarkPopover`.

- [ ] **Step 1: Write the failing tests**

Create `tests/usePalette.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { usePalette } from '../composables/usePalette'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(weeks: FzState['weeks']): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('usePalette', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty for null state', () => {
    // #given no state
    const state = ref<FzState | null>(null)
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the palette is empty
    expect(usePalette(state, today).value).toEqual([])
  })

  it('returns empty when weeks is empty', () => {
    // #given a state with no marks
    const state = ref<FzState | null>(stateWith({}))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the palette is empty
    expect(usePalette(state, today).value).toEqual([])
  })

  it('returns a single glyph when only one mark exists', () => {
    // #given one marked week
    const state = ref<FzState | null>(stateWith({
      100: { mark: '❤', markedAt: '2026-04-01T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the palette is just that glyph
    expect(usePalette(state, today).value).toEqual(['❤'])
  })

  it('ranks recent marks ahead of older ones', () => {
    // #given an old "w" mark and a recent "❤" mark
    const state = ref<FzState | null>(stateWith({
      10: { mark: 'w', markedAt: '2020-01-01T00:00:00.000Z' },
      200: { mark: '❤', markedAt: '2026-04-10T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the recent one comes first
    expect(usePalette(state, today).value).toEqual(['❤', 'w'])
  })

  it('sums scores for repeated glyphs', () => {
    // #given one "❤" mark and three "w" marks
    const state = ref<FzState | null>(stateWith({
      10: { mark: '❤', markedAt: '2026-04-01T00:00:00.000Z' },
      20: { mark: 'w', markedAt: '2026-04-02T00:00:00.000Z' },
      30: { mark: 'w', markedAt: '2026-04-03T00:00:00.000Z' },
      40: { mark: 'w', markedAt: '2026-04-04T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then "w" has a higher total score despite the individual "❤" being close in recency
    expect(usePalette(state, today).value[0]).toBe('w')
  })

  it('limits the palette to 8 entries by default', () => {
    // #given 10 distinct glyphs marked on different weeks
    const weeks: FzState['weeks'] = {}
    const glyphs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    glyphs.forEach((g, i) => {
      weeks[i * 10] = { mark: g, markedAt: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` }
    })
    const state = ref<FzState | null>(stateWith(weeks))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then only 8 come back
    expect(usePalette(state, today).value.length).toBe(8)
  })

  it('respects a custom limit', () => {
    // #given 5 marks
    const weeks: FzState['weeks'] = {
      1: { mark: 'a', markedAt: '2026-04-01T00:00:00.000Z' },
      2: { mark: 'b', markedAt: '2026-04-02T00:00:00.000Z' },
      3: { mark: 'c', markedAt: '2026-04-03T00:00:00.000Z' },
      4: { mark: 'd', markedAt: '2026-04-04T00:00:00.000Z' },
      5: { mark: 'e', markedAt: '2026-04-05T00:00:00.000Z' },
    }
    const state = ref<FzState | null>(stateWith(weeks))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the limit parameter caps the list
    expect(usePalette(state, today, 3).value.length).toBe(3)
  })

  it('is reactive to state changes', () => {
    // #given a state with one mark
    const state = ref<FzState | null>(stateWith({
      1: { mark: 'a', markedAt: '2026-04-01T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    const palette = usePalette(state, today)
    expect(palette.value).toEqual(['a'])
    // #when we update state with a new mark
    state.value = stateWith({
      1: { mark: 'a', markedAt: '2026-04-01T00:00:00.000Z' },
      2: { mark: 'b', markedAt: '2026-04-13T00:00:00.000Z' },
    })
    // #then the palette updates reactively
    expect(palette.value).toEqual(['b', 'a'])
  })
})
```

- [ ] **Step 2: Run to verify failures**

Run:
```bash
pnpm test tests/usePalette.spec.ts
```

Expected: tests fail with "Cannot find module '../composables/usePalette'".

- [ ] **Step 3: Implement `composables/usePalette.ts`**

Create the file:

```ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DEFAULT_LIMIT = 8

/**
 * The Personal Palette — top N most-used marks by recency-weighted frequency.
 *
 * Each entry contributes `1 / (1 + daysSinceMarked)` to its mark's total score.
 * This blends "used often" with "used recently" so yesterday's glyph beats
 * 100 occurrences from five years ago, but one occurrence from yesterday
 * doesn't beat three from last month.
 *
 * Ties break by first occurrence order (Map insertion order), then by the
 * original sort's stability.
 *
 * Reactive — recomputes when either `state` or `today` changes.
 */
export function usePalette(
  state: Ref<FzState | null>,
  today: Ref<Date>,
  limit: number = DEFAULT_LIMIT,
): ComputedRef<string[]> {
  return computed(() => {
    const s = state.value
    if (s === null) return []
    const now = today.value.getTime()
    const scores = new Map<string, number>()
    for (const entry of Object.values(s.weeks)) {
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

- [ ] **Step 4: Run the tests**

Run:
```bash
pnpm test tests/usePalette.spec.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/usePalette.spec.ts composables/usePalette.ts
git commit -m "$(cat <<'EOF'
add usePalette composable (TDD)

stage 2 derivation: the personal palette is the top N marks by
recency-weighted frequency. each entry contributes 1/(1+daysSince)
to its mark's score, which blends "used often" with "used recently"
so yesterday's glyph beats a thousand from five years ago. default
limit 8. reactive — recomputes when state or today changes. 8 tests
cover null, empty, single, ranking, sum-for-repeats, default limit,
custom limit, and reactivity.
EOF
)"
```

---

## Task 7: Extend `FzHexagon` with mark + whisper props and the glow animation

**Files:**
- Modify: `components/FzHexagon.vue`

**Why:** F0.4 — when a week is marked, the hexagon renders the mark glyph in yellow regardless of state. Current state is conveyed by a glow animation instead of symbol substitution.

- [ ] **Step 1: Update FzHexagon.vue**

Replace the entire contents of `components/FzHexagon.vue` with:

```vue
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Week index from 0 to totalWeeks-1 */
  index: number
  /** Visual state: past, current, or future */
  state: 'past' | 'current' | 'future'
  /** Hover tooltip text — the date range */
  hoverText: string
  /** The user's Mark for this week, if any */
  mark?: string
  /** The user's Whisper for this week, if any */
  whisper?: string
  /** Whether a modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mark: undefined,
  whisper: undefined,
  modalOpen: false,
})

const displayGlyph = computed(() => {
  if (props.mark !== undefined) return props.mark
  if (props.state === 'past') return '⬢'
  if (props.state === 'current') return '⏣'
  return '⬡'
})

const isCurrent = computed(() => props.state === 'current')
const isMarked = computed(() => props.mark !== undefined)
</script>

<template>
  <div
    class="hexagon"
    :class="{
      'current-week': isCurrent,
      'marked': isMarked,
    }"
  >
    {{ displayGlyph }}
    <span
      class="hover-text"
      :class="{ 'hide-hover-text': modalOpen }"
    >
      {{ hoverText }}
      <span v-if="whisper !== undefined" class="hover-whisper">{{ whisper }}</span>
    </span>
  </div>
</template>

<style scoped>
.hexagon {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
  color: #0847F7;
}

.hexagon.marked {
  color: #F7B808;
  font-weight: 700;
}

.hexagon.current-week {
  color: #F7B808;
  animation: current-glow 2.4s ease-in-out infinite;
}

@keyframes current-glow {
  0%, 100% { text-shadow: 0 0 0 transparent; }
  50% { text-shadow: 0 0 6px #F7B808; }
}

@media (prefers-reduced-motion: reduce) {
  .hexagon.current-week {
    animation: none;
    text-shadow: 0 0 4px #F7B808;
  }
}

.hover-text {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 0.75rem;
  visibility: hidden;
  white-space: nowrap;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hover-whisper {
  font-style: italic;
  color: #ddd;
  max-width: 240px;
  white-space: normal;
  text-align: center;
}

.hexagon:hover .hover-text {
  visibility: visible;
}

.hide-hover-text {
  display: none;
}
</style>
```

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm typecheck
```

Expected: no errors. If the compiler complains about the optional props defaulting to `undefined`, that's fine — `withDefaults` handles it.

- [ ] **Step 3: Commit**

```bash
git add components/FzHexagon.vue
git commit -m "$(cat <<'EOF'
FzHexagon: accept mark/whisper props and add current-week glow

stage 2 F0.4: marked weeks render their mark glyph in yellow
regardless of past/current/future state. "current" is conveyed by a
text-shadow glow animation (2.4s, ease-in-out, infinite) so a marked
current week shows the mark with a glow instead of substituting the
⏣ symbol. hover tooltip now shows the whisper under the date range
in italic when present. prefers-reduced-motion users get a static
text-shadow instead of the animation.
EOF
)"
```

---

## Task 8: Create `FzMarkPopover.vue`

**Files:**
- Create: `components/FzMarkPopover.vue`

**Why:** F0.1 + F0.2 + F0.3 interactive surface. Centered modal, palette + one-char input + whisper textarea + clear affordance + save/close button. Auto-saves on mutation.

- [ ] **Step 1: Create the file**

Create `components/FzMarkPopover.vue`:

```vue
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { usePalette } from '../composables/usePalette'
import { weekRange } from '../composables/useTime'
import { isSingleGrapheme } from '../utils/grapheme'

interface Props {
  open: boolean
  weekIndex: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state, setMark, setWhisper, clearMark } = useFzState()
const today = ref(new Date())
const palette = usePalette(state, today)

const oneCharInput = ref<HTMLInputElement | null>(null)
const firstPaletteButton = ref<HTMLButtonElement | null>(null)

const pendingMark = ref<string>('')
const pendingWhisper = ref<string>('')

const currentEntry = computed(() => {
  if (props.weekIndex === null || state.value === null) return null
  return state.value.weeks[props.weekIndex] ?? null
})

const dateRangeLabel = computed(() => {
  if (props.weekIndex === null || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, props.weekIndex)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  return `${range.start.toLocaleDateString(undefined, opts)} — ${range.end.toLocaleDateString(undefined, opts)}`
})

watch(
  () => [props.open, props.weekIndex] as const,
  ([isOpen]) => {
    if (isOpen) {
      pendingMark.value = currentEntry.value?.mark ?? ''
      pendingWhisper.value = currentEntry.value?.whisper ?? ''
      void nextTick(() => {
        if (palette.value.length > 0) {
          firstPaletteButton.value?.focus()
        } else {
          oneCharInput.value?.focus()
        }
      })
    }
  },
  { immediate: true },
)

function applyMark(mark: string): void {
  if (props.weekIndex === null) return
  if (!isSingleGrapheme(mark)) return
  setMark(props.weekIndex, mark)
  pendingMark.value = mark
}

function onOneCharEnter(): void {
  if (pendingMark.value !== '' && isSingleGrapheme(pendingMark.value)) {
    applyMark(pendingMark.value)
  }
}

function onWhisperBlur(): void {
  if (props.weekIndex === null) return
  if (state.value === null) return
  const entry = state.value.weeks[props.weekIndex]
  if (entry === undefined) return
  if (pendingWhisper.value !== (entry.whisper ?? '')) {
    setWhisper(props.weekIndex, pendingWhisper.value)
  }
}

function onClear(): void {
  if (props.weekIndex === null) return
  clearMark(props.weekIndex)
  emit('close')
}

function onClose(): void {
  // Flush any pending whisper edit before closing.
  if (
    props.weekIndex !== null
    && state.value !== null
    && state.value.weeks[props.weekIndex] !== undefined
    && pendingWhisper.value !== (state.value.weeks[props.weekIndex]?.whisper ?? '')
  ) {
    setWhisper(props.weekIndex, pendingWhisper.value)
  }
  emit('close')
}

function onBackdropClick(): void {
  onClose()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    onClose()
  }
}
</script>

<template>
  <div
    v-if="props.open && props.weekIndex !== null"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Mark this week"
    @click="onBackdropClick"
    @keydown="onKey"
  >
    <div class="modal-content" @click.stop>
      <div class="pop-head">
        <span class="pop-label">{{ dateRangeLabel }}</span>
        <button class="pop-close" aria-label="close" @click="onClose">×</button>
      </div>

      <div v-if="palette.length > 0" class="pop-section">
        <div class="pop-section-label">palette</div>
        <div class="pop-palette">
          <button
            v-for="(glyph, i) in palette"
            :key="glyph"
            :ref="(el) => { if (i === 0) firstPaletteButton = el as HTMLButtonElement }"
            class="pop-glyph"
            :aria-label="`apply mark ${glyph}`"
            @click="applyMark(glyph)"
          >{{ glyph }}</button>
        </div>
      </div>

      <div class="pop-section">
        <div class="pop-section-label">your mark</div>
        <input
          ref="oneCharInput"
          v-model="pendingMark"
          class="pop-one-char"
          type="text"
          maxlength="4"
          :placeholder="'·'"
          @keyup.enter="onOneCharEnter"
          @blur="onOneCharEnter"
        >
      </div>

      <div class="pop-section">
        <div class="pop-section-label">whisper</div>
        <textarea
          v-model="pendingWhisper"
          class="pop-whisper"
          rows="3"
          placeholder="one sentence (optional)"
          @blur="onWhisperBlur"
        />
        <div class="pop-counter" :class="{ 'pop-counter-warn': pendingWhisper.length > 200 }">
          {{ pendingWhisper.length }}
        </div>
      </div>

      <div class="pop-foot">
        <button
          v-if="currentEntry !== null"
          class="pop-clear"
          @click="onClear"
        >clear</button>
        <span v-else />
        <button class="btn-76" @click="onClose">4⬢⏣⬡</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 1.75rem;
  width: 360px;
  max-width: calc(100vw - 2rem);
  text-align: center;
  z-index: 1001;
  box-shadow: 6px 6px 0 0 #F7B808;
  border: 2px solid #0847F7;
}

.pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed #cccccc;
}

.pop-label {
  font-size: 0.7rem;
  color: #0847F7;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 800;
}

.pop-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #0847F7;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
}

.pop-section {
  padding: 0.9rem 0;
  border-bottom: 1px dashed #cccccc;
}

.pop-section:last-of-type {
  border-bottom: none;
}

.pop-section-label {
  font-size: 0.6rem;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.5rem;
}

.pop-palette {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}

.pop-glyph {
  width: 36px;
  height: 36px;
  background: white;
  color: #F7B808;
  border: 1.5px solid #0847F7;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.1s;
}

.pop-glyph:hover,
.pop-glyph:focus-visible {
  background: #fffbe6;
  outline: none;
}

.pop-one-char {
  width: 60px;
  height: 40px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: #F7B808;
  border: 1.5px solid #0847F7;
  background: white;
  padding: 0;
  margin: 0 auto;
  display: block;
}

.pop-one-char:focus-visible {
  background: #fffbe6;
  outline: 2px solid #F7B808;
  outline-offset: 2px;
}

.pop-whisper {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-family: 'Roboto', sans-serif;
  color: #333;
  border: 1.5px solid #0847F7;
  background: white;
  font-style: italic;
}

.pop-whisper:focus-visible {
  background: #fffbe6;
  outline: none;
}

.pop-counter {
  font-size: 0.6rem;
  color: #888888;
  text-align: right;
  margin-top: 0.25rem;
}

.pop-counter-warn {
  color: #ff3b30;
}

.pop-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.9rem;
  border-top: 1px dashed #cccccc;
}

.pop-clear {
  background: none;
  border: none;
  color: #ff3b30;
  font-size: 0.75rem;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.btn-76 {
  -webkit-tap-highlight-color: transparent;
  background-color: #F7B808;
  color: #fff;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif;
  font-size: 100%;
  font-weight: 900;
  border: 0 solid;
  outline: 4px solid #fff;
  outline-offset: -4px;
  overflow: hidden;
  padding: 0.55rem 0.9rem;
  position: relative;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
  --neon: #0847F7;
}

.btn-76:hover,
.btn-76:focus-visible {
  background: var(--neon);
  box-shadow: 0 0 5px var(--neon), 0 0 25px var(--neon), 0 0 50px var(--neon);
  color: #fff;
  outline-color: transparent;
  outline: none;
  transition: 0.2s linear 0.3s;
}
</style>
```

Note on the `maxlength="4"` on the one-char input: we can't use `maxlength="1"` because a single grapheme can span multiple UTF-16 code units (a family emoji is 8). We set `maxlength="4"` to allow most multi-code-unit characters through (BMP + surrogate pairs + some ZWJ), while `isSingleGrapheme` is the real validator. The `onOneCharEnter` and `applyMark` both check `isSingleGrapheme` before committing.

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm typecheck
```

Expected: no errors. The `(el) => { if (i === 0) firstPaletteButton = el as HTMLButtonElement }` ref callback may cause a TS warning — if so, change to:
```ts
:ref="(el) => setFirstPaletteRef(el, i)"
```
and add:
```ts
function setFirstPaletteRef(el: unknown, i: number): void {
  if (i === 0) {
    firstPaletteButton.value = el as HTMLButtonElement
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/FzMarkPopover.vue
git commit -m "$(cat <<'EOF'
add FzMarkPopover component

stage 2 F0.1/F0.2/F0.3 interactive surface. centered modal (mirrors
FzDobModal) with: date range header + close affordance; palette row
(up to 8 one-tap buttons from usePalette); one-char input with
Enter-to-save and blur-to-save; whisper textarea with blur-to-save
and soft counter at 200; clear affordance; 4⬢⏣⬡ close button. auto-
saves on every mutation. escape and backdrop close. focus lands on
the first palette button (or one-char input if palette is empty).
aria role=dialog + aria-modal=true.
EOF
)"
```

---

## Task 9: Wire `FzGrid` to emit `hex-click` and use `v-memo`

**Files:**
- Modify: `components/FzGrid.vue`

**Why:** When the user clicks a hexagon, `FzGrid` needs to bubble that up so `FzPage` can open the popover. Also: without `v-memo`, every `setMark` call re-renders all 4000 hexagons. With `v-memo`, only the mutated one re-renders.

- [ ] **Step 1: Replace `components/FzGrid.vue`**

Replace the entire file with:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { currentGridIndex, weekRange, totalWeeks } from '../composables/useTime'

interface Props {
  /** Whether a modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
})

const emit = defineEmits<{
  hexClick: [week: number]
}>()

const { state } = useFzState()
const today = ref(new Date())

const indices: number[] = Array.from({ length: totalWeeks }, (_, i) => i)

const dobDate = computed(() => {
  if (state.value === null) return null
  return new Date(state.value.dob)
})

const currentIndex = computed(() => {
  if (dobDate.value === null) return 0
  return currentGridIndex(dobDate.value, today.value)
})

function getState(index: number): 'past' | 'current' | 'future' {
  if (index < currentIndex.value) return 'past'
  if (index === currentIndex.value) return 'current'
  return 'future'
}

function getHoverText(index: number): string {
  if (dobDate.value === null) return ''
  const range = weekRange(dobDate.value, index)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }
  return `${range.start.toLocaleDateString(undefined, opts)} - ${range.end.toLocaleDateString(undefined, opts)}`
}

function markFor(index: number): string | undefined {
  return state.value?.weeks[index]?.mark
}

function whisperFor(index: number): string | undefined {
  return state.value?.weeks[index]?.whisper
}

function onHexClick(index: number): void {
  emit('hexClick', index)
}

function scrollToCurrent(): void {
  void nextTick(() => {
    const el = document.getElementById('current-week')
    if (el !== null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

onMounted(() => {
  scrollToCurrent()
})

defineExpose({ scrollToCurrent })
</script>

<template>
  <div class="hexagon-grid">
    <FzHexagon
      v-for="i in indices"
      :key="i"
      :id="i === currentIndex ? 'current-week' : undefined"
      v-memo="[i === currentIndex, markFor(i), whisperFor(i), props.modalOpen]"
      :index="i"
      :state="getState(i)"
      :hover-text="getHoverText(i)"
      :mark="markFor(i)"
      :whisper="whisperFor(i)"
      :modal-open="props.modalOpen"
      @click="onHexClick(i)"
    />
  </div>
</template>

<style scoped>
.hexagon-grid {
  display: grid;
  grid-template-columns: repeat(21, 1fr);
  grid-gap: 5px;
}

@media (max-width: 1024px) {
  .hexagon-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}

@media (max-width: 768px) {
  .hexagon-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

Run:
```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/FzGrid.vue
git commit -m "$(cat <<'EOF'
FzGrid: emit hex-click and use v-memo on FzHexagon

stage 2 wiring. every hexagon now emits a click that bubbles up as
hex-click with the week index. the parent (FzPage) opens the mark
popover on that event. also: v-memo on each FzHexagon keyed by
[isCurrent, mark, whisper, modalOpen] so a single setMark write
only re-renders the one hexagon whose tuple changed. this is the
"4000-hex re-render explosion" mitigation called out in the stage
1 seam note.
EOF
)"
```

---

## Task 10: Wire `FzPage` to host the popover

**Files:**
- Modify: `components/FzPage.vue`

**Why:** `FzPage` already hosts `FzDobModal`. It needs to also host `FzMarkPopover`, track which week is being edited, and open/close in response to `FzGrid`'s `hex-click`.

- [ ] **Step 1: Update `components/FzPage.vue`**

Find the `<script setup>` section. Add the popover state:

```ts
const markPopoverOpen = ref(false)
const markPopoverWeek = ref<number | null>(null)

function openMarkPopover(week: number): void {
  markPopoverWeek.value = week
  markPopoverOpen.value = true
}

function closeMarkPopover(): void {
  markPopoverOpen.value = false
  // Leave week set briefly so the closing transition can still render; null out next tick.
  void nextTick(() => {
    markPopoverWeek.value = null
  })
}
```

Import `nextTick` alongside the existing Vue imports. The import line becomes:

```ts
import { ref, computed, onMounted, nextTick } from 'vue'
```

The `modalOpen` prop on `FzGrid` should become true when either modal is open. Update the existing template:

Find this block:
```vue
  <FzGrid ref="gridRef" :modal-open="showModal" />
```

Change it to:
```vue
  <FzGrid
    ref="gridRef"
    :modal-open="showModal || markPopoverOpen"
    @hex-click="openMarkPopover"
  />
  <FzMarkPopover
    :open="markPopoverOpen"
    :week-index="markPopoverWeek"
    @close="closeMarkPopover"
  />
```

`FzMarkPopover` is auto-imported by Nuxt.

- [ ] **Step 2: Typecheck + lint**

Run:
```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

Run:
```bash
pnpm test
```

Expected: all passing (should be 85+ now).

- [ ] **Step 4: Commit**

```bash
git add components/FzPage.vue
git commit -m "$(cat <<'EOF'
FzPage: host FzMarkPopover

stage 2 assembly. the page now tracks markPopoverOpen and
markPopoverWeek, listens to FzGrid's hex-click event to open the
popover for a specific week, and closes it on the popover's close
event. modalOpen on FzGrid is true when either modal is open so
hover tooltips suppress correctly during both dob editing and
mark editing.
EOF
)"
```

---

## Task 11: Manual smoke test

**Files:**
- None — pure verification

**Why:** Stage 2 is now fully wired. Before final commit, we walk through every user flow in the browser.

- [ ] **Step 1: Run the dev server**

```bash
pnpm dev > /tmp/fz-ax-stage2-dev.log 2>&1 &
sleep 10
```

- [ ] **Step 2: Verify basic serve**

Run:
```bash
curl -s http://localhost:3000 | grep -c "four-thousand weekz"
```

Expected: prints at least `1`.

- [ ] **Step 3: Walk through the user flows**

Open http://localhost:3000 in a real browser:

1. **First-mark flow:** Title pulses yellow. Grid shows 4000 hexagons. Click any hexagon in the past or future. → Popover opens centered. Palette section is absent (no marks yet). Focus is in the one-char input. Type `❤` and press Enter. → Popover stays open. The hexagon in the grid shows a yellow `❤`. Type "first kiss" in the whisper textarea. Click the `4⬢⏣⬡` button. → Popover closes. Hexagon still shows `❤`.

2. **Palette growth flow:** Mark 3 more weeks with different glyphs (`☀`, `w`, `☆`). Open the popover on a new week. → The palette now shows 4 glyphs: the one you just used (most recent) should be leftmost. Tap one of them. → The new hexagon gets that glyph instantly. Popover stays open. Close it.

3. **Re-edit flow:** Click an already-marked hexagon. → Popover opens pre-filled with that glyph in the one-char input and the whisper (if any) in the textarea. Tap a different palette glyph. → The mark updates. Close.

4. **Whisper-on-hover flow:** Hover a marked hexagon that has a whisper. → Tooltip shows the date range on line 1 and the whisper in italic on line 2.

5. **Clear flow:** Click a marked hexagon. Click the small `clear` link in the popover footer. → Popover closes. Hexagon reverts to `⬢`/`⏣`/`⬡` (depending on past/current/future).

6. **Current-week glow:** Find the current week (or set your DOB to make the current week reachable). → The `⏣` glyph glows yellow with a 2.4s pulse. Mark it with a glyph. → The mark replaces `⏣`, and the glow continues on the new glyph.

7. **Escape key:** Click a hexagon to open the popover. Press Escape. → Popover closes.

8. **Backdrop click:** Open the popover. Click outside the card. → Popover closes.

9. **Persistence:** Mark a week, close the popover, refresh the page. → The mark is still there. Check DevTools → Application → Local Storage → `fz.ax.state` → the `weeks` object contains your mark.

10. **V-memo sanity check:** Open Vue devtools. Mark a new week. → In the components tree, only one `FzHexagon` should re-render (the one you marked). If Vue devtools reports 4000 re-renders, `v-memo` isn't working and this task is NOT complete.

If any of these fail, STOP and report the failure. Do NOT proceed to the commit step.

- [ ] **Step 4: Stop the dev server**

```bash
pkill -f "nuxt dev" || true
```

- [ ] **Step 5: No commit** — this is a verification-only step. If you got here, proceed to Task 12.

---

## Task 12: Final verification + stage tag

**Files:**
- None — pure verification

**Why:** Like Stage 1's final task, we run every check once more end-to-end and tag the completion.

- [ ] **Step 1: Clean install**

```bash
rm -rf node_modules .nuxt .output
pnpm install
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: no errors, no warnings.

- [ ] **Step 4: Tests**

```bash
pnpm test
```

Expected: all tests pass. Count is approximately 85+ (59 from Stage 1 + ~30 new in Stage 2).

- [ ] **Step 5: Build**

```bash
pnpm generate
```

Expected: build succeeds, `.output/public/index.html` and `.output/public/CNAME` present.

- [ ] **Step 6: Tag stage 2 completion**

```bash
git tag -a stage-2-mark-whisper -m "Stage 2 — The Mark + The Whisper"
git log --oneline stage-1-foundations..stage-2-mark-whisper
```

Expected: prints the list of commits added in Stage 2 (~8-10 commits).

---

## Self-review checklist

After all tasks:

- [ ] Every F0.x feature has a task implementing it
- [ ] No placeholders, no TODOs in the committed code
- [ ] All composable mutations validate at the boundary and throw loudly
- [ ] `v-memo` is in place on `FzHexagon` in `FzGrid`
- [ ] `isValidFzState` deep-checks `WeekEntry` shape
- [ ] `usePalette` is reactive and tested
- [ ] Grapheme cluster detection uses `Intl.Segmenter`
- [ ] All Stage 1 tests still pass
- [ ] `prefers-reduced-motion` disables the glow animation
- [ ] `FzMarkPopover` has `role="dialog"` and `aria-modal="true"`
- [ ] `FzMarkPopover` focuses the first palette button (or one-char input) on open
- [ ] Escape and backdrop both close the popover

## Definition of done for Stage 2

- All 12 tasks complete
- Roughly 85+ tests passing across 7+ test files
- `pnpm generate` produces a static `.output/public/` ready for GH Pages
- Manual smoke test walked through every user flow
- `stage-2-mark-whisper` tag exists at the head of master
- No features from F1.x or later have been implemented yet — that's the next stage
