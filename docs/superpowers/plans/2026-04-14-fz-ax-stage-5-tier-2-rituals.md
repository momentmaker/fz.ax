# fz.ax Stage 5 — Tier 2 Rituals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 9 F2.* features (Vow, Monday Ceremony, Constellation, Anniversary Echo, Solstice, Quiet Mode, Whisper Search, Long Now footer, Anchored Weeks) in one stage so fz.ax becomes "a calendar of rituals."

**Architecture:** Three new singleton composables form the backbone — `useKeyboard` (global shortcut dispatch with input-active rule), `useHighlight` (single source of truth for lit/dim weeks shared by Constellation + Search), `useTodaysBanner` (Anniversary/Echo precedence resolver). Five new actions on `useFzState`. Storage validation extended for vow + anchors. Solstice via hardcoded year table.

**Tech Stack:** Vue 3 Composition API, strict TypeScript (`noUncheckedIndexedAccess`), Vitest with happy-dom, hand-written everything (no new dependencies).

**Spec reference:** `docs/superpowers/specs/2026-04-14-fz-ax-stage-5-tier-2-rituals-design.md` — this plan implements it exactly.

**Pre-flight check:**
- `git tag --list stage-4-pwa-sunday-push` → exists
- `pnpm test` → 179 passing
- `pnpm lint && pnpm typecheck && pnpm generate` → clean
- `git status` → clean

---

## Task 1: Storage validators for vow + anchors (TDD)

**Files:**
- Modify: `tests/storage.spec.ts`
- Modify: `utils/storage.ts`

**Why:** `state.vow` and `state.anchors` need deep validation at the storage boundary so a hand-edited or corrupt backup can't poison runtime code that reads them.

- [ ] **Step 1: Write failing tests**

In `tests/storage.spec.ts`, append after the existing `describe('storage with a hostile localStorage')` block:

```ts
describe('storage validation: vow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts a state with vow === null', () => {
    // #given a v1 state with vow null
    const ok = { ...sampleState, vow: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    // #then it loads
    expect(readState()).not.toBeNull()
  })

  it('accepts a state with a valid VowEntry', () => {
    // #given a state with a real vow
    const ok = {
      ...sampleState,
      vow: { text: 'be more present', writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    // #then it loads
    const loaded = readState()
    expect(loaded?.vow?.text).toBe('be more present')
  })

  it('rejects a vow with empty text', () => {
    const bad = {
      ...sampleState,
      vow: { text: '', writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a vow with text > 240 chars', () => {
    const bad = {
      ...sampleState,
      vow: { text: 'x'.repeat(241), writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a vow with a non-string text', () => {
    const bad = {
      ...sampleState,
      vow: { text: 42, writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a vow with an unparseable writtenAt', () => {
    const bad = {
      ...sampleState,
      vow: { text: 'ok', writtenAt: 'not-a-date' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })
})

describe('storage validation: anchors', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts a state with empty anchors', () => {
    const ok = { ...sampleState, anchors: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('accepts a sorted unique anchors array', () => {
    const ok = { ...sampleState, anchors: [50, 100, 1500] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    const loaded = readState()
    expect(loaded?.anchors).toEqual([50, 100, 1500])
  })

  it('rejects a non-array anchors field', () => {
    const bad = { ...sampleState, anchors: 'not-an-array' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects an unsorted anchors array', () => {
    const bad = { ...sampleState, anchors: [100, 50] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a duplicate anchor', () => {
    const bad = { ...sampleState, anchors: [50, 50] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a negative anchor', () => {
    const bad = { ...sampleState, anchors: [-1, 50] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects an out-of-range anchor', () => {
    const bad = { ...sampleState, anchors: [4000] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a non-integer anchor', () => {
    const bad = { ...sampleState, anchors: [50.5] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/storage.spec.ts
```

Expected: the new vow/anchor tests fail because the validators don't exist yet.

- [ ] **Step 3: Add the validators to `utils/storage.ts`**

Find the existing `isValidFzState` function. Replace its return statement:

```ts
  return (
    v.version === 1 &&
    typeof v.dob === 'string' &&
    isReasonableDob(v.dob) &&
    hasValidWeeks(v.weeks) &&
    (v.vow === null || typeof v.vow === 'object') &&
    Array.isArray(v.letters) &&
    Array.isArray(v.anchors) &&
    typeof v.prefs === 'object' && v.prefs !== null &&
    typeof v.meta === 'object' && v.meta !== null
  )
```

with:

```ts
  return (
    v.version === 1 &&
    typeof v.dob === 'string' &&
    isReasonableDob(v.dob) &&
    hasValidWeeks(v.weeks) &&
    hasValidVow(v.vow) &&
    Array.isArray(v.letters) &&
    hasValidAnchors(v.anchors) &&
    typeof v.prefs === 'object' && v.prefs !== null &&
    typeof v.meta === 'object' && v.meta !== null
  )
```

After the existing `hasValidWeeks` function, append:

```ts
/**
 * Validate the vow shape. Stage 5 introduces the vow as a single sentence
 * (max 240 chars) plus a writtenAt timestamp. null is the unset state.
 */
function hasValidVow(vow: unknown): vow is { text: string; writtenAt: string } | null {
  if (vow === null) return true
  if (typeof vow !== 'object' || Array.isArray(vow)) return false
  const v = vow as Record<string, unknown>
  if (typeof v.text !== 'string') return false
  if (v.text.length === 0 || v.text.length > 240) return false
  if (typeof v.writtenAt !== 'string') return false
  if (Number.isNaN(new Date(v.writtenAt).getTime())) return false
  return true
}

/**
 * Validate the anchors array. Stage 5 introduces anchors as a sorted-
 * ascending, unique array of valid week indices in [0, totalWeeks).
 * Sortedness and uniqueness are enforced here so downstream code can
 * trust the invariant without resorting on every read.
 */
function hasValidAnchors(anchors: unknown): anchors is number[] {
  if (!Array.isArray(anchors)) return false
  let prev = -1
  for (const a of anchors) {
    if (!Number.isInteger(a)) return false
    if (a < 0 || a >= totalWeeks) return false
    if (a <= prev) return false
    prev = a
  }
  return true
}
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

Expected: all passing, ~13 new tests added (final ~192).

- [ ] **Step 5: Commit**

```bash
git add tests/storage.spec.ts utils/storage.ts
git commit -m "$(cat <<'EOF'
storage: deep-validate vow + anchors at the boundary

stage 5 prep: extends isValidFzState with hasValidVow (text 1-240,
parseable writtenAt) and hasValidAnchors (sorted ascending, unique,
in range [0, totalWeeks)). a hand-edited or corrupt backup with a
malformed vow or unsorted anchors is rejected at load time so
downstream code can trust the invariants. 13 new tests cover the
happy path plus every rejection branch.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: setVow + clearVow on useFzState (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** F2.1 needs to persist the user's yearly intent. Follows the throw-and-close pattern.

- [ ] **Step 1: Write failing tests**

In `tests/useFzState.spec.ts`, after the existing `setPushOptIn` describe block but still inside the outer `describe('useFzState', ...)`, append:

```ts
  describe('setVow', () => {
    it('throws when state is null', () => {
      const { setVow } = useFzState()
      expect(() => setVow('be present')).toThrow(/no state/i)
    })

    it('throws on empty text', () => {
      const { setDob, setVow } = useFzState()
      setDob('1990-05-15')
      expect(() => setVow('')).toThrow(/1.*240/i)
    })

    it('throws on text longer than 240 chars', () => {
      const { setDob, setVow } = useFzState()
      setDob('1990-05-15')
      expect(() => setVow('x'.repeat(241))).toThrow(/1.*240/i)
    })

    it('trims whitespace before validation', () => {
      const { state, setDob, setVow } = useFzState()
      setDob('1990-05-15')
      setVow('   be present   ')
      expect(state.value!.vow?.text).toBe('be present')
    })

    it('throws if trimmed text is empty (whitespace only)', () => {
      const { setDob, setVow } = useFzState()
      setDob('1990-05-15')
      expect(() => setVow('   ')).toThrow(/1.*240/i)
    })

    it('persists writtenAt as an ISO string', () => {
      const { state, setDob, setVow } = useFzState()
      setDob('1990-05-15')
      setVow('be present')
      const writtenAt = state.value!.vow?.writtenAt ?? ''
      expect(writtenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(Number.isNaN(new Date(writtenAt).getTime())).toBe(false)
    })

    it('overwrites an existing vow', () => {
      const { state, setDob, setVow } = useFzState()
      setDob('1990-05-15')
      setVow('first')
      setVow('second')
      expect(state.value!.vow?.text).toBe('second')
    })

    it('preserves other state fields', () => {
      const { state, setDob, setMark, setVow } = useFzState()
      setDob('1990-05-15')
      setMark(42, 'x')
      setVow('be present')
      expect(state.value!.weeks[42]?.mark).toBe('x')
      expect(state.value!.dob).toBe('1990-05-15')
    })
  })

  describe('clearVow', () => {
    it('throws when state is null', () => {
      const { clearVow } = useFzState()
      expect(() => clearVow()).toThrow(/no state/i)
    })

    it('sets vow back to null', () => {
      const { state, setDob, setVow, clearVow } = useFzState()
      setDob('1990-05-15')
      setVow('be present')
      clearVow()
      expect(state.value!.vow).toBeNull()
    })

    it('is idempotent (clearing an already-null vow is a no-op)', () => {
      const { state, setDob, clearVow } = useFzState()
      setDob('1990-05-15')
      expect(() => clearVow()).not.toThrow()
      expect(state.value!.vow).toBeNull()
    })
  })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useFzState.spec.ts
```

Expected: 11 failures (setVow + clearVow not exported).

- [ ] **Step 3: Add `setVow` and `clearVow` to `composables/useFzState.ts`**

Insert these functions after `setPushOptIn` and before `replaceState`:

```ts
/**
 * Set or replace the yearly Vow. Trims whitespace before validation.
 * Text must be 1-240 chars after trim (an empty vow is meaningless;
 * 240 chars is the soft cap that mirrors WeekEntry.whisper).
 */
function setVow(text: string): void {
  const state = ensureLoaded()
  const current = assertState()
  const trimmed = text.trim()
  if (trimmed.length === 0 || trimmed.length > 240) {
    throw new Error('useFzState: vow text must be 1-240 chars after trim')
  }
  const next: FzState = {
    ...current,
    vow: { text: trimmed, writtenAt: new Date().toISOString() },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Clear the Vow back to null. Idempotent — clearing an already-null
 * vow is a successful no-op.
 */
function clearVow(): void {
  const state = ensureLoaded()
  const current = assertState()
  if (current.vow === null) return
  const next: FzState = { ...current, vow: null }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}
```

Update `UseFzStateReturn` to add `setVow` and `clearVow`:

Find:
```ts
  setPushOptIn: (value: boolean) => void
  replaceState: (next: FzState) => void
  resetState: () => void
}
```

Replace with:
```ts
  setPushOptIn: (value: boolean) => void
  setVow: (text: string) => void
  clearVow: () => void
  replaceState: (next: FzState) => void
  resetState: () => void
}
```

And update the return object in `useFzState()`:

Find:
```ts
    setPushOptIn,
    replaceState,
    resetState,
```

Replace with:
```ts
    setPushOptIn,
    setVow,
    clearVow,
    replaceState,
    resetState,
```

- [ ] **Step 4: Run tests**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
useFzState: add setVow + clearVow (TDD)

stage 5 F2.1 prep: persists state.vow via the throw-and-close
pattern. trims whitespace, validates 1-240 char range, throws on
violation. clearVow is idempotent (already-null is a no-op).
11 tests cover null state, empty, too-long, trim, whitespace-only,
ISO writtenAt, overwrite, field preservation, and clear lifecycle.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: addAnchor + removeAnchor on useFzState (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** F2.9 needs to add and remove anchored weeks. Maintains the sorted+unique invariant from the storage validator.

- [ ] **Step 1: Write failing tests**

After the `clearVow` describe in `tests/useFzState.spec.ts`, append:

```ts
  describe('addAnchor', () => {
    it('throws when state is null', () => {
      const { addAnchor } = useFzState()
      expect(() => addAnchor(50)).toThrow(/no state/i)
    })

    it('throws on out-of-range week', () => {
      const { setDob, addAnchor } = useFzState()
      setDob('1990-05-15')
      expect(() => addAnchor(-1)).toThrow(/out of range/i)
      expect(() => addAnchor(4000)).toThrow(/out of range/i)
    })

    it('throws on non-integer week', () => {
      const { setDob, addAnchor } = useFzState()
      setDob('1990-05-15')
      expect(() => addAnchor(50.5)).toThrow(/out of range/i)
    })

    it('adds the first anchor', () => {
      const { state, setDob, addAnchor } = useFzState()
      setDob('1990-05-15')
      addAnchor(100)
      expect(state.value!.anchors).toEqual([100])
    })

    it('inserts in sorted order', () => {
      const { state, setDob, addAnchor } = useFzState()
      setDob('1990-05-15')
      addAnchor(200)
      addAnchor(50)
      addAnchor(150)
      expect(state.value!.anchors).toEqual([50, 150, 200])
    })

    it('is idempotent (adding an existing anchor is a no-op)', () => {
      const { state, setDob, addAnchor } = useFzState()
      setDob('1990-05-15')
      addAnchor(100)
      addAnchor(100)
      expect(state.value!.anchors).toEqual([100])
    })

    it('preserves other state fields', () => {
      const { state, setDob, setMark, addAnchor } = useFzState()
      setDob('1990-05-15')
      setMark(42, 'x')
      addAnchor(42)
      expect(state.value!.weeks[42]?.mark).toBe('x')
      expect(state.value!.anchors).toEqual([42])
    })
  })

  describe('removeAnchor', () => {
    it('throws when state is null', () => {
      const { removeAnchor } = useFzState()
      expect(() => removeAnchor(50)).toThrow(/no state/i)
    })

    it('removes an existing anchor', () => {
      const { state, setDob, addAnchor, removeAnchor } = useFzState()
      setDob('1990-05-15')
      addAnchor(50)
      addAnchor(100)
      removeAnchor(50)
      expect(state.value!.anchors).toEqual([100])
    })

    it('is idempotent (removing a non-existent anchor is a no-op)', () => {
      const { state, setDob, removeAnchor } = useFzState()
      setDob('1990-05-15')
      expect(() => removeAnchor(100)).not.toThrow()
      expect(state.value!.anchors).toEqual([])
    })

    it('preserves sortedness after removal', () => {
      const { state, setDob, addAnchor, removeAnchor } = useFzState()
      setDob('1990-05-15')
      addAnchor(50)
      addAnchor(100)
      addAnchor(200)
      removeAnchor(100)
      expect(state.value!.anchors).toEqual([50, 200])
    })
  })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useFzState.spec.ts
```

Expected: 11 failures (addAnchor / removeAnchor not exported).

- [ ] **Step 3: Add to `composables/useFzState.ts`**

Insert after `clearVow` and before `replaceState`:

```ts
/**
 * Add a week to the anchors list. Maintains sorted ascending order
 * and uniqueness — a no-op if the week is already anchored. Throws
 * on out-of-range or non-integer week.
 */
function addAnchor(week: number): void {
  const state = ensureLoaded()
  const current = assertState()
  assertWeek(week)
  // Idempotent: if already present, do nothing.
  if (current.anchors.includes(week)) return
  // Insert in sorted position.
  const next = [...current.anchors, week].sort((a, b) => a - b)
  const nextState: FzState = { ...current, anchors: next }
  if (!writeState(nextState)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = nextState
}

/**
 * Remove a week from the anchors list. Idempotent — removing a
 * non-anchored week is a successful no-op.
 */
function removeAnchor(week: number): void {
  const state = ensureLoaded()
  const current = assertState()
  if (!current.anchors.includes(week)) return
  const next = current.anchors.filter((a) => a !== week)
  const nextState: FzState = { ...current, anchors: next }
  if (!writeState(nextState)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = nextState
}
```

Update `UseFzStateReturn`:

Find:
```ts
  setVow: (text: string) => void
  clearVow: () => void
  replaceState: (next: FzState) => void
```

Replace with:
```ts
  setVow: (text: string) => void
  clearVow: () => void
  addAnchor: (week: number) => void
  removeAnchor: (week: number) => void
  replaceState: (next: FzState) => void
```

And the return object:

Find:
```ts
    setVow,
    clearVow,
    replaceState,
```

Replace with:
```ts
    setVow,
    clearVow,
    addAnchor,
    removeAnchor,
    replaceState,
```

- [ ] **Step 4: Run tests**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
useFzState: add addAnchor + removeAnchor (TDD)

stage 5 F2.9 prep: maintains the sorted-ascending unique invariant
that the storage validator enforces. addAnchor inserts in sorted
position and is idempotent on existing anchors. removeAnchor is
idempotent on missing anchors. both throw on null state and on
out-of-range / non-integer week index. 11 tests cover ranges,
sorting, idempotency, and field preservation.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: setLastVisitedWeek on useFzState (TDD)

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** F2.2 Monday Ceremony needs to know "how many weeks have passed since the user last opened the page" so it can show the notice. The action returns the gap so FzPage can decide whether to render.

- [ ] **Step 1: Write failing tests**

After the `removeAnchor` describe, append:

```ts
  describe('setLastVisitedWeek', () => {
    it('throws when state is null', () => {
      const { setLastVisitedWeek } = useFzState()
      expect(() => setLastVisitedWeek(100)).toThrow(/no state/i)
    })

    it('returns null on first ever load (lastVisitedWeek undefined)', () => {
      const { state, setDob, setLastVisitedWeek } = useFzState()
      setDob('1990-05-15')
      // freshly created state has no lastVisitedWeek
      expect(state.value!.meta.lastVisitedWeek).toBeUndefined()
      const gap = setLastVisitedWeek(1500)
      expect(gap).toBeNull()
      // and the value IS persisted silently
      expect(state.value!.meta.lastVisitedWeek).toBe(1500)
    })

    it('returns null and is a no-op when called with the same week', () => {
      const { state, setDob, setLastVisitedWeek } = useFzState()
      setDob('1990-05-15')
      setLastVisitedWeek(1500)
      const gap = setLastVisitedWeek(1500)
      expect(gap).toBeNull()
      expect(state.value!.meta.lastVisitedWeek).toBe(1500)
    })

    it('returns the positive gap and updates when forward', () => {
      const { state, setDob, setLastVisitedWeek } = useFzState()
      setDob('1990-05-15')
      setLastVisitedWeek(1500)
      const gap = setLastVisitedWeek(1503)
      expect(gap).toBe(3)
      expect(state.value!.meta.lastVisitedWeek).toBe(1503)
    })

    it('returns null and does not move backward when called with a smaller week', () => {
      const { state, setDob, setLastVisitedWeek } = useFzState()
      setDob('1990-05-15')
      setLastVisitedWeek(1500)
      const gap = setLastVisitedWeek(1490)
      expect(gap).toBeNull()
      // Importantly, lastVisitedWeek stayed at 1500 — not decremented.
      expect(state.value!.meta.lastVisitedWeek).toBe(1500)
    })

    it('preserves other meta fields', () => {
      const { state, setDob, setLastSundayPrompt, setLastVisitedWeek } = useFzState()
      setDob('1990-05-15')
      setLastSundayPrompt('2026-04-12')
      setLastVisitedWeek(1500)
      expect(state.value!.meta.lastSundayPrompt).toBe('2026-04-12')
      expect(state.value!.meta.lastVisitedWeek).toBe(1500)
    })
  })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useFzState.spec.ts
```

- [ ] **Step 3: Add to `composables/useFzState.ts`**

Insert after `removeAnchor` and before `replaceState`:

```ts
/**
 * Update meta.lastVisitedWeek from a freshly computed current week.
 * Returns the number of weeks that have passed since the previous
 * recorded visit (so FzPage can show the "a week passed" notice), or
 * null when no notice should display:
 *
 *   - First-ever load (lastVisitedWeek === undefined): silently set
 *     and return null. We don't want to greet a brand-new user with
 *     "1500 weeks passed."
 *   - Same week as before: no-op, return null.
 *   - Backward (the user's clock is wrong, or a DOB change made the
 *     index numerically smaller): no-op, return null. Never write a
 *     smaller value than the existing one.
 *   - Forward by N: write the new value and return N.
 */
function setLastVisitedWeek(week: number): number | null {
  const state = ensureLoaded()
  const current = assertState()
  const previous = current.meta.lastVisitedWeek
  if (previous === undefined) {
    const next: FzState = {
      ...current,
      meta: { ...current.meta, lastVisitedWeek: week },
    }
    if (!writeState(next)) {
      throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
    }
    state.value = next
    return null
  }
  if (week <= previous) return null
  const gap = week - previous
  const next: FzState = {
    ...current,
    meta: { ...current.meta, lastVisitedWeek: week },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
  return gap
}
```

Update `UseFzStateReturn`:

Find:
```ts
  addAnchor: (week: number) => void
  removeAnchor: (week: number) => void
  replaceState: (next: FzState) => void
```

Replace with:
```ts
  addAnchor: (week: number) => void
  removeAnchor: (week: number) => void
  setLastVisitedWeek: (week: number) => number | null
  replaceState: (next: FzState) => void
```

And the return object:

Find:
```ts
    addAnchor,
    removeAnchor,
    replaceState,
```

Replace with:
```ts
    addAnchor,
    removeAnchor,
    setLastVisitedWeek,
    replaceState,
```

- [ ] **Step 4: Run tests**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
useFzState: add setLastVisitedWeek (TDD)

stage 5 F2.2 prep: tracks the user's last-seen current week so the
Monday Ceremony notice can show "N weeks passed" when they reload
after a gap. returns the gap so FzPage can decide what to render,
or null when no notice should display:

- first ever load (undefined): silently set, return null
- same week: no-op, return null
- backward (clock wrong / dob change): no-op, return null
- forward by N: write, return N

never writes a smaller value than the existing one. 6 tests cover
all four cases plus other-meta-field preservation.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: setDob refinement — reset stale meta on DOB change

**Files:**
- Modify: `tests/useFzState.spec.ts`
- Modify: `composables/useFzState.ts`

**Why:** When the user changes their DOB, all meta fields keyed by week index or ISO date become semantically wrong. Reset them.

- [ ] **Step 1: Write failing test**

In `tests/useFzState.spec.ts`, find the existing `describe('setDob', ...)` block. After its last test, append:

```ts
    it('resets lastVisitedWeek, lastEcho, lastSundayPrompt when DOB changes', () => {
      // #given a state with all the date-keyed meta fields populated
      const { state, setDob, setLastVisitedWeek, setLastEcho, setLastSundayPrompt } = useFzState()
      setDob('1990-05-15')
      setLastVisitedWeek(1500)
      setLastEcho('2026-04-14')
      setLastSundayPrompt('2026-04-12')
      // #when the user changes DOB
      setDob('1985-01-01')
      // #then the meta fields keyed by date or week-index are reset
      expect(state.value!.meta.lastVisitedWeek).toBeUndefined()
      expect(state.value!.meta.lastEcho).toBeUndefined()
      expect(state.value!.meta.lastSundayPrompt).toBeUndefined()
      // and the new dob is stored
      expect(state.value!.dob).toBe('1985-01-01')
    })

    it('preserves vow, anchors, weeks, prefs on DOB change', () => {
      const { state, setDob, setMark, setVow, addAnchor, setPushOptIn } = useFzState()
      setDob('1990-05-15')
      setMark(42, 'x')
      setVow('be present')
      addAnchor(100)
      setPushOptIn(true)
      setDob('1985-01-01')
      expect(state.value!.weeks[42]?.mark).toBe('x')
      expect(state.value!.vow?.text).toBe('be present')
      expect(state.value!.anchors).toEqual([100])
      expect(state.value!.prefs.pushOptIn).toBe(true)
    })

    it('does NOT reset meta when setDob is called with the same value', () => {
      const { state, setDob, setLastVisitedWeek } = useFzState()
      setDob('1990-05-15')
      setLastVisitedWeek(1500)
      setDob('1990-05-15')
      expect(state.value!.meta.lastVisitedWeek).toBe(1500)
    })
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useFzState.spec.ts
```

- [ ] **Step 3: Update `setDob` in `composables/useFzState.ts`**

Find:
```ts
function setDob(dob: string): void {
  const state = ensureLoaded()
  if (state.value === null) {
    state.value = createFreshState(dob)
  } else {
    state.value = { ...state.value, dob }
  }
  writeState(state.value)
}
```

Replace with:
```ts
function setDob(dob: string): void {
  const state = ensureLoaded()
  if (state.value === null) {
    state.value = createFreshState(dob)
  } else if (state.value.dob !== dob) {
    // The DOB changed — meta fields keyed by week index or ISO date
    // (lastVisitedWeek, lastEcho, lastSundayPrompt) now refer to a
    // different absolute timeline and would mis-trigger Monday/Echo/
    // Sunday banners. Reset them. Vow, anchors, weeks, prefs all
    // survive: they're personal content, not date-keyed cache.
    const { lastVisitedWeek: _lvw, lastEcho: _le, lastSundayPrompt: _lsp, ...preservedMeta } = state.value.meta
    state.value = { ...state.value, dob, meta: preservedMeta }
  } else {
    state.value = { ...state.value, dob }
  }
  writeState(state.value)
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

The lint may complain about unused variable names. The `_lvw`, `_le`, `_lsp` underscore prefix is the standard convention for intentionally-discarded destructured fields; if the project's eslint config rejects them, use a manual delete approach instead:

```ts
} else if (state.value.dob !== dob) {
  const next: FzState = { ...state.value, dob, meta: { ...state.value.meta } }
  delete next.meta.lastVisitedWeek
  delete next.meta.lastEcho
  delete next.meta.lastSundayPrompt
  state.value = next
} else {
```

Pick whichever passes lint cleanly.

- [ ] **Step 5: Commit**

```bash
git add tests/useFzState.spec.ts composables/useFzState.ts
git commit -m "$(cat <<'EOF'
useFzState: setDob resets stale date-keyed meta fields

stage 5 prep: when the user changes DOB, the meta fields keyed by
week index or ISO date (lastVisitedWeek, lastEcho, lastSundayPrompt)
refer to a different absolute timeline and would mis-trigger Monday
notice / echo / sunday prompt on the next mount. reset them.
vow, anchors, weeks, prefs survive — they're personal content, not
date-keyed cache. 3 tests cover the reset path, the preservation
path, and the no-op when dob is unchanged.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: useKeyboard composable (TDD)

**Files:**
- Create: `tests/useKeyboard.spec.ts`
- Create: `composables/useKeyboard.ts`

**Why:** Single dispatch point for global keys (V, Q, /, Escape) with the deterministic input-active rule.

- [ ] **Step 1: Write failing tests**

Create `tests/useKeyboard.spec.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useKeyboard, __resetUseKeyboardForTests } from '../composables/useKeyboard'

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useKeyboard', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetUseKeyboardForTests()
  })

  afterEach(() => {
    // Clean up any input-active state
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      document.activeElement.blur()
    }
    // Remove any input we may have appended
    document.querySelectorAll('input,textarea').forEach((el) => el.remove())
  })

  it('fires v handler when not in an input', () => {
    // #given a registered v handler
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    // #when v is pressed
    pressKey('v')
    // #then it fires
    expect(fn).toHaveBeenCalledOnce()
  })

  it('does NOT fire v handler when an input has focus', () => {
    // #given an active input
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    // #when v is pressed
    pressKey('v')
    // #then nothing fires (the input gets the v naturally)
    expect(fn).not.toHaveBeenCalled()
  })

  it('does NOT fire q handler when a textarea has focus', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('q', fn)
    pressKey('q')
    expect(fn).not.toHaveBeenCalled()
  })

  it('Escape ALWAYS fires, even from inside an input', () => {
    // #given an active input AND a registered escape handler
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('escape', fn)
    // #when Escape is pressed
    pressKey('Escape')
    // #then it fires — escape is the universal close key
    expect(fn).toHaveBeenCalledOnce()
  })

  it('case-insensitive on letter keys', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    pressKey('V') // uppercase
    expect(fn).toHaveBeenCalledOnce()
  })

  it('init() is idempotent (calling twice does not double-bind)', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    pressKey('v')
    expect(fn).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useKeyboard.spec.ts
```

Expected: module not found.

- [ ] **Step 3: Create `composables/useKeyboard.ts`**

```ts
/**
 * Single dispatch point for global keyboard shortcuts. Stage 5 binds
 * V (vow), Q (quiet), / (search), and Escape. The deterministic
 * input-active rule: shortcuts only fire when the active element is
 * NOT a form input or contenteditable, EXCEPT Escape, which always
 * fires (so the user can always close a modal from anywhere).
 *
 * Centralized to keep the input-active rule from drifting between
 * V, Q, /, and Escape — it lived in three components in an earlier
 * draft and predictably diverged. One file, one rule.
 */

type ShortcutKey = 'v' | 'q' | '/' | 'escape'
type Handler = (event: KeyboardEvent) => void

interface UseKeyboardReturn {
  init: () => void
  on: (key: ShortcutKey, handler: Handler) => void
  off: (key: ShortcutKey, handler: Handler) => void
  __isInputActive: () => boolean
}

let _module: UseKeyboardReturn | null = null
let _listenerInstalled = false
const _handlers: Record<ShortcutKey, Set<Handler>> = {
  v: new Set(),
  q: new Set(),
  '/': new Set(),
  escape: new Set(),
}

function isInputActive(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  if (el === null) return false
  if (el instanceof HTMLInputElement) return true
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLElement && el.isContentEditable) return true
  return false
}

function normalizeKey(rawKey: string): ShortcutKey | null {
  const lower = rawKey.toLowerCase()
  if (lower === 'v') return 'v'
  if (lower === 'q') return 'q'
  if (lower === '/') return '/'
  if (lower === 'escape') return 'escape'
  return null
}

function onKeyDown(event: KeyboardEvent): void {
  const key = normalizeKey(event.key)
  if (key === null) return
  // Escape always fires. V/Q// only fire when not in an input.
  if (key !== 'escape' && isInputActive()) return
  const set = _handlers[key]
  for (const handler of set) {
    handler(event)
  }
}

/**
 * The composable. Returns init/on/off plus a test-only inputActive
 * accessor. init() is idempotent — calling it more than once does
 * not double-bind the listener.
 */
export function useKeyboard(): UseKeyboardReturn {
  if (_module !== null) return _module
  _module = {
    init() {
      if (_listenerInstalled) return
      if (typeof window === 'undefined') return
      window.addEventListener('keydown', onKeyDown)
      _listenerInstalled = true
    },
    on(key, handler) {
      _handlers[key].add(handler)
    },
    off(key, handler) {
      _handlers[key].delete(handler)
    },
    __isInputActive: isInputActive,
  }
  return _module
}

/**
 * Test-only reset. Removes the global keydown listener, clears all
 * registered handlers, and rebuilds the singleton on the next call.
 */
export function __resetUseKeyboardForTests(): void {
  if (typeof window !== 'undefined' && _listenerInstalled) {
    window.removeEventListener('keydown', onKeyDown)
  }
  _listenerInstalled = false
  _handlers.v.clear()
  _handlers.q.clear()
  _handlers['/'].clear()
  _handlers.escape.clear()
  _module = null
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/useKeyboard.spec.ts && pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add tests/useKeyboard.spec.ts composables/useKeyboard.ts
git commit -m "$(cat <<'EOF'
add useKeyboard composable (TDD)

stage 5 architecture: single dispatch point for global keyboard
shortcuts (V, Q, /, Escape). centralizes the input-active rule so
it can't drift between four separate components: shortcuts only
fire when the active element is NOT a form input or contenteditable,
EXCEPT Escape, which always fires so the user can always close a
modal from anywhere.

singleton pattern matches usePwa: module-scoped state, init() is
idempotent, __resetUseKeyboardForTests for vitest isolation.

6 tests cover happy v, input-blocks-v, textarea-blocks-q,
escape-always-fires, case-insensitive letters, init idempotency.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: useHighlight composable (TDD)

**Files:**
- Create: `tests/useHighlight.spec.ts`
- Create: `composables/useHighlight.ts`

**Why:** Single source of truth for which weeks are "lit" (highlighted) and which are "dimmed." Used by F2.3 Constellation and F2.7 Search.

- [ ] **Step 1: Write failing tests**

Create `tests/useHighlight.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useHighlight, __resetUseHighlightForTests } from '../composables/useHighlight'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function makeState(overrides: Partial<FzState> = {}): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks: {
      10: { mark: '❤', whisper: 'first kiss', markedAt: '2025-01-01T00:00:00.000Z' },
      20: { mark: '❤', whisper: 'wedding day', markedAt: '2025-02-01T00:00:00.000Z' },
      30: { mark: '☀', whisper: 'good day', markedAt: '2025-03-01T00:00:00.000Z' },
      40: { mark: '❤', markedAt: '2025-04-01T00:00:00.000Z' }, // no whisper
    },
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    ...overrides,
  }
}

describe('useHighlight', () => {
  beforeEach(() => {
    __resetUseHighlightForTests()
  })

  it('starts in idle state with empty lit set', () => {
    const h = useHighlight()
    expect(h.state.value.type).toBe('idle')
    expect(h.lit.value.size).toBe(0)
    expect(h.isActive.value).toBe(false)
  })

  describe('setConstellation', () => {
    it('lights up all weeks with the same glyph', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      expect(h.state.value.type).toBe('constellation')
      expect(h.lit.value.has(10)).toBe(true)
      expect(h.lit.value.has(20)).toBe(true)
      expect(h.lit.value.has(40)).toBe(true)
      expect(h.lit.value.has(30)).toBe(false) // ☀, not ❤
    })

    it('isActive becomes true', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      expect(h.isActive.value).toBe(true)
    })

    it('does nothing when state is null', () => {
      const h = useHighlight()
      h.setConstellation(null, '❤', 10)
      expect(h.lit.value.size).toBe(0)
      expect(h.state.value.type).toBe('idle')
    })

    it('records the source week', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 20)
      if (h.state.value.type === 'constellation') {
        expect(h.state.value.sourceWeek).toBe(20)
        expect(h.state.value.glyph).toBe('❤')
      }
    })
  })

  describe('setSearch', () => {
    it('lights up weeks whose whisper contains the query (case-insensitive)', () => {
      const h = useHighlight()
      h.setSearch(makeState(), 'KISS')
      expect(h.state.value.type).toBe('search')
      expect(h.lit.value.has(10)).toBe(true) // 'first kiss'
      expect(h.lit.value.has(20)).toBe(false) // 'wedding day'
    })

    it('skips weeks without a whisper', () => {
      const h = useHighlight()
      h.setSearch(makeState(), '❤')
      // mark glyphs are not searched — only whispers
      expect(h.lit.value.size).toBe(0)
    })

    it('empty query returns to idle', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      h.setSearch(makeState(), '')
      expect(h.state.value.type).toBe('idle')
      expect(h.lit.value.size).toBe(0)
    })

    it('opening search clears constellation', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      expect(h.state.value.type).toBe('constellation')
      h.setSearch(makeState(), 'kiss')
      expect(h.state.value.type).toBe('search')
    })

    it('does nothing when state is null', () => {
      const h = useHighlight()
      h.setSearch(null, 'kiss')
      expect(h.lit.value.size).toBe(0)
      expect(h.state.value.type).toBe('idle')
    })
  })

  describe('clear', () => {
    it('returns to idle from constellation', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      h.clear()
      expect(h.state.value.type).toBe('idle')
      expect(h.lit.value.size).toBe(0)
    })

    it('returns to idle from search', () => {
      const h = useHighlight()
      h.setSearch(makeState(), 'kiss')
      h.clear()
      expect(h.state.value.type).toBe('idle')
      expect(h.lit.value.size).toBe(0)
    })
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useHighlight.spec.ts
```

- [ ] **Step 3: Create `composables/useHighlight.ts`**

```ts
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { FzState } from '../types/state'

/**
 * The single source of truth for which weeks are visually "lit" and
 * which are "dimmed." Used by both F2.3 Constellation Lines and F2.7
 * Whisper Search. Discriminated-union state ensures only one mode
 * is active at a time:
 *
 *   - idle: nothing highlighted (the default — full grid normal)
 *   - constellation: a Mark glyph is "selected" and every week with
 *     that same glyph is lit; non-matching weeks dim
 *   - search: a query string filters whispers; matching weeks are
 *     lit; non-matching weeks dim
 *
 * Opening Search clears Constellation. Setting Search query='' goes
 * to idle. clear() goes to idle from any state.
 */

export type HighlightState =
  | { type: 'idle' }
  | { type: 'constellation'; glyph: string; weeks: ReadonlySet<number>; sourceWeek: number }
  | { type: 'search'; query: string; weeks: ReadonlySet<number> }

interface UseHighlightReturn {
  state: Ref<HighlightState>
  lit: ComputedRef<ReadonlySet<number>>
  isActive: ComputedRef<boolean>
  setConstellation: (fzState: FzState | null, glyph: string, sourceWeek: number) => void
  setSearch: (fzState: FzState | null, query: string) => void
  clear: () => void
}

let _module: UseHighlightReturn | null = null

function computeConstellationWeeks(fzState: FzState, glyph: string): Set<number> {
  const result = new Set<number>()
  for (const [keyStr, entry] of Object.entries(fzState.weeks)) {
    if (entry.mark === glyph) {
      const idx = Number(keyStr)
      if (Number.isInteger(idx)) result.add(idx)
    }
  }
  return result
}

function computeSearchWeeks(fzState: FzState, query: string): Set<number> {
  const result = new Set<number>()
  const needle = query.toLowerCase()
  for (const [keyStr, entry] of Object.entries(fzState.weeks)) {
    if (entry.whisper === undefined || entry.whisper === '') continue
    if (entry.whisper.toLowerCase().includes(needle)) {
      const idx = Number(keyStr)
      if (Number.isInteger(idx)) result.add(idx)
    }
  }
  return result
}

export function useHighlight(): UseHighlightReturn {
  if (_module !== null) return _module
  const state = ref<HighlightState>({ type: 'idle' })
  const lit = computed<ReadonlySet<number>>(() => {
    if (state.value.type === 'idle') return new Set<number>()
    return state.value.weeks
  })
  const isActive = computed(() => state.value.type !== 'idle')

  function setConstellation(fzState: FzState | null, glyph: string, sourceWeek: number): void {
    if (fzState === null) return
    const weeks = computeConstellationWeeks(fzState, glyph)
    state.value = { type: 'constellation', glyph, weeks, sourceWeek }
  }

  function setSearch(fzState: FzState | null, query: string): void {
    if (fzState === null) return
    if (query === '') {
      state.value = { type: 'idle' }
      return
    }
    const weeks = computeSearchWeeks(fzState, query)
    state.value = { type: 'search', query, weeks }
  }

  function clear(): void {
    state.value = { type: 'idle' }
  }

  _module = { state, lit, isActive, setConstellation, setSearch, clear }
  return _module
}

/**
 * Test-only reset of the module singleton.
 */
export function __resetUseHighlightForTests(): void {
  _module = null
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/useHighlight.spec.ts && pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add tests/useHighlight.spec.ts composables/useHighlight.ts
git commit -m "$(cat <<'EOF'
add useHighlight composable (TDD)

stage 5 architecture: single source of truth for "lit" (highlighted)
and "dimmed" weeks. used by F2.3 Constellation and F2.7 Search.
discriminated-union state: idle / constellation / search. opening
search clears constellation. empty search query returns to idle.

12 tests cover the happy paths, case-insensitive search, glyph-only
constellation matching, mutual-exclusion behaviors, and the
state-is-null guards (no crash, no-op).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: useAnniversary composable (TDD)

**Files:**
- Create: `tests/useAnniversary.spec.ts`
- Create: `composables/useAnniversary.ts`

**Why:** F2.4 finds Marks/Whispers from previous years that fall on the same calendar week-of-year as today's current week.

- [ ] **Step 1: Write failing tests**

Create `tests/useAnniversary.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { findAnniversaries, type AnniversaryEntry } from '../composables/useAnniversary'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function makeState(weeks: FzState['weeks']): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2020-01-01T00:00:00.000Z' },
  }
}

describe('findAnniversaries', () => {
  it('returns empty when state is null', () => {
    expect(findAnniversaries(null, new Date(2026, 3, 14))).toEqual([])
  })

  it('returns empty when there are no past marks', () => {
    const state = makeState({})
    expect(findAnniversaries(state, new Date(2026, 3, 14))).toEqual([])
  })

  it('finds a mark on the same week-of-year from a previous year', () => {
    // #given a mark from week 1500 (some past week with a whisper)
    // The user's DOB is 1990-05-15; week 1500 is roughly 28.8 years
    // later → roughly 2019-03-something. We craft a controlled test
    // by computing a known-good week index.
    // For simplicity, use a week we KNOW falls in the same week-of-year
    // as today (2026-04-14, which is week 16 of the year).

    // Place a mark on a previous year's same week. Easiest:
    // dob 1990-05-15, today 2026-04-14 → currentWeekIndex roughly 1875
    // A mark at week 1875 - 52 (1 year prior) should land in the same
    // week-of-year. Let's just construct the state and trust the math:
    const dob = new Date(1990, 4, 15)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

    // Find a week index whose week start lands in week-of-year 16 of 2025
    // (1 year before 2026-04-14)
    let testWeekIdx = -1
    for (let i = 1700; i < 1900; i++) {
      const d = new Date(dob.getTime() + i * ONE_WEEK_MS)
      if (d.getFullYear() === 2025 && weekOfYearLocal(d) === 16) {
        testWeekIdx = i
        break
      }
    }
    expect(testWeekIdx).toBeGreaterThan(0)

    const state = makeState({
      [testWeekIdx]: { mark: '⭐', whisper: 'big day', markedAt: '2025-04-14T00:00:00.000Z' },
    })
    const today = new Date(2026, 3, 14) // April 14, 2026, week 16
    const found = findAnniversaries(state, today)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0]?.whisper).toBe('big day')
    expect(found[0]?.yearsAgo).toBe(1)
  })

  it('skips marks without a whisper', () => {
    const state = makeState({
      1700: { mark: '⭐', markedAt: '2024-01-01T00:00:00.000Z' },
    })
    expect(findAnniversaries(state, new Date(2026, 3, 14))).toEqual([])
  })

  it('skips marks in the same week as today (must be at least 1 year ago)', () => {
    // Even if a whisper exists on a same-week-of-year entry, if it's
    // less than a year ago it's not an "anniversary" — it's just the
    // recent past.
    const state = makeState({
      1875: { mark: '⭐', whisper: 'this week', markedAt: '2026-04-14T00:00:00.000Z' },
    })
    expect(findAnniversaries(state, new Date(2026, 3, 14)).length).toBeLessThanOrEqual(0)
  })

  it('caps at 3 entries', () => {
    // Build a state with 5+ valid anniversaries (different past years,
    // each on the same week-of-year). For simplicity we shotgun marks
    // at years' worth of week offsets from a base anniversary index
    // and trust the computation.
    const dob = new Date(1990, 4, 15)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    const weeks: FzState['weeks'] = {}
    let added = 0
    for (let i = 1000; i < 1900 && added < 5; i++) {
      const d = new Date(dob.getTime() + i * ONE_WEEK_MS)
      if (weekOfYearLocal(d) === 16 && d.getFullYear() < 2026) {
        weeks[i] = {
          mark: '⭐',
          whisper: `year ${d.getFullYear()}`,
          markedAt: `${d.getFullYear()}-04-14T00:00:00.000Z`,
        }
        added++
      }
    }
    expect(added).toBeGreaterThanOrEqual(3)

    const state = makeState(weeks)
    const found = findAnniversaries(state, new Date(2026, 3, 14))
    expect(found.length).toBeLessThanOrEqual(3)
  })
})

// Helper: compute ISO week-of-year locally for test setup.
function weekOfYearLocal(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const diff = (target.getTime() - firstThursday.getTime()) / (1000 * 60 * 60 * 24)
  return 1 + Math.round(diff / 7)
}
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useAnniversary.spec.ts
```

- [ ] **Step 3: Create `composables/useAnniversary.ts`**

```ts
import type { FzState } from '../types/state'
import { weekOfYear, weekRange, weekIndex } from './useTime'

/**
 * F2.4 Anniversary Echo: surface marks/whispers from previous years
 * that fall on the same calendar week-of-year as the current week.
 *
 * Match criteria:
 *   1. Whisper must be non-empty (the surface is the whisper text;
 *      a bare glyph anniversary would be a featureless dot)
 *   2. Entry's week index must be < current week index (it's in the past)
 *   3. The entry's start date and today must share the same ISO
 *      week-of-year (1-53)
 *   4. yearsAgo (today's year minus entry-start-date's year) must be ≥ 1
 *      so the same-week-this-year doesn't qualify
 *
 * Returns up to 3 entries, sorted by yearsAgo descending (oldest first
 * — older anniversaries feel weightier).
 */

export interface AnniversaryEntry {
  weekIndex: number
  mark: string
  whisper: string
  yearsAgo: number
  markedAt: string
}

export function findAnniversaries(state: FzState | null, today: Date): AnniversaryEntry[] {
  if (state === null) return []
  const dob = new Date(state.dob)
  if (Number.isNaN(dob.getTime())) return []
  const currentIdx = weekIndex(dob, today)
  const todayWeek = weekOfYear(today)
  const todayYear = today.getFullYear()

  const results: AnniversaryEntry[] = []
  for (const [keyStr, entry] of Object.entries(state.weeks)) {
    const idx = Number(keyStr)
    if (!Number.isInteger(idx)) continue
    if (idx >= currentIdx) continue
    if (entry.whisper === undefined || entry.whisper === '') continue
    const start = weekRange(dob, idx).start
    if (weekOfYear(start) !== todayWeek) continue
    const yearsAgo = todayYear - start.getFullYear()
    if (yearsAgo < 1) continue
    results.push({
      weekIndex: idx,
      mark: entry.mark,
      whisper: entry.whisper,
      yearsAgo,
      markedAt: entry.markedAt,
    })
  }

  // Sort by yearsAgo descending (oldest first), then by weekIndex
  // descending as a deterministic tiebreaker.
  results.sort((a, b) => {
    if (b.yearsAgo !== a.yearsAgo) return b.yearsAgo - a.yearsAgo
    return b.weekIndex - a.weekIndex
  })

  return results.slice(0, 3)
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/useAnniversary.spec.ts && pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add tests/useAnniversary.spec.ts composables/useAnniversary.ts
git commit -m "$(cat <<'EOF'
add useAnniversary composable (TDD)

stage 5 F2.4: pure function findAnniversaries(state, today) that
finds past whispers on the same calendar week-of-year as today.
match criteria: whisper non-empty AND entry in past AND same ISO
week-of-year AND yearsAgo >= 1. sorted by yearsAgo desc, capped at
3 entries. uses the existing useTime.weekOfYear helper.

6 tests cover null state, empty marks, happy path, no-whisper skip,
same-year filter, and the 3-entry cap.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: useTodaysBanner composable (TDD)

**Files:**
- Create: `tests/useTodaysBanner.spec.ts`
- Create: `composables/useTodaysBanner.ts`

**Why:** Single resolver for which banner shows on page load: Anniversary > Echo > nothing.

- [ ] **Step 1: Write failing tests**

Create `tests/useTodaysBanner.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTodaysBanner } from '../composables/useTodaysBanner'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function makeState(weeks: FzState['weeks'] = {}): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2020-01-01T00:00:00.000Z' },
  }
}

describe('useTodaysBanner', () => {
  it('returns null when state is null', () => {
    const state = ref<FzState | null>(null)
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value).toBeNull()
  })

  it('returns null when no anniversaries and no eligible echo', () => {
    const state = ref<FzState | null>(makeState({}))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value).toBeNull()
  })

  it('returns echo when no anniversaries but eligible echo exists', () => {
    // a single past whispered mark, no week-of-year match
    const state = ref<FzState | null>(makeState({
      100: { mark: '✨', whisper: 'arbitrary whisper', markedAt: '2020-06-01T00:00:00.000Z' },
    }))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value?.type).toBe('echo')
  })

  it('returns anniversary when anniversaries exist (precedence over echo)', () => {
    // construct a mark that IS on the same week-of-year as today
    const dob = new Date(1990, 4, 15)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    let testWeekIdx = -1
    for (let i = 1700; i < 1900; i++) {
      const d = new Date(dob.getTime() + i * ONE_WEEK_MS)
      if (d.getFullYear() === 2025 && d.getMonth() === 3 && d.getDate() >= 13 && d.getDate() <= 19) {
        testWeekIdx = i
        break
      }
    }
    expect(testWeekIdx).toBeGreaterThan(0)
    const state = ref<FzState | null>(makeState({
      [testWeekIdx]: { mark: '⭐', whisper: 'anniversary year', markedAt: '2025-04-14T00:00:00.000Z' },
      // Also a different mark with a whisper that would satisfy the
      // echo path. Anniversary should still win.
      500: { mark: '✨', whisper: 'echo material', markedAt: '2020-06-01T00:00:00.000Z' },
    }))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value?.type).toBe('anniversary')
  })

  it('the banner is reactive — switches when state changes', () => {
    const state = ref<FzState | null>(makeState({}))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value).toBeNull()
    state.value = makeState({
      100: { mark: '✨', whisper: 'now there is content', markedAt: '2020-06-01T00:00:00.000Z' },
    })
    expect(banner.value?.type).toBe('echo')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/useTodaysBanner.spec.ts
```

- [ ] **Step 3: Create `composables/useTodaysBanner.ts`**

```ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { findAnniversaries, type AnniversaryEntry } from './useAnniversary'
import { useEcho, type EchoEntry } from './useEcho'

/**
 * F2.4 collision rule: Anniversary takes precedence over Echo.
 * They never appear simultaneously. This is the single resolver
 * that decides which banner (if any) shows on page load.
 *
 * Used by FzPage to render the single FzBanner component, which
 * dispatches on the `type` field. The existing useEcho composable
 * is composed inside as the fallback path.
 */

export type TodaysBanner =
  | { type: 'anniversary'; entries: AnniversaryEntry[] }
  | { type: 'echo'; entry: EchoEntry }
  | null

export function useTodaysBanner(
  state: Ref<FzState | null>,
  today: Ref<Date>,
): ComputedRef<TodaysBanner> {
  const echo = useEcho(state, today)
  return computed(() => {
    if (state.value === null) return null
    const anniversaries = findAnniversaries(state.value, today.value)
    if (anniversaries.length > 0) {
      return { type: 'anniversary', entries: anniversaries }
    }
    if (echo.value !== null) {
      return { type: 'echo', entry: echo.value }
    }
    return null
  })
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/useTodaysBanner.spec.ts && pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add tests/useTodaysBanner.spec.ts composables/useTodaysBanner.ts
git commit -m "$(cat <<'EOF'
add useTodaysBanner composable (TDD)

stage 5 F2.4 collision rule: anniversary takes precedence over
echo. they never appear simultaneously. this composable is the
single resolver — FzPage uses it to render exactly one FzBanner.
the existing useEcho composable is composed inside as the fallback
path; the existing setLastEcho behavior stays unchanged.

5 tests cover null state, no-content, echo-only, anniversary
precedence, and reactive switching when state changes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: utils/solstice.ts + data/solsticeQuotes.ts (TDD)

**Files:**
- Create: `tests/solstice.spec.ts`
- Create: `utils/solstice.ts`
- Create: `data/solsticeQuotes.ts` (small data file)

**Why:** F2.5 needs to know if today is a solstice/equinox day, and what quote to display. Hardcoded year table avoids astronomical math.

- [ ] **Step 1: Write failing tests**

Create `tests/solstice.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { currentSolsticeOrEquinox, getSolsticeQuote } from '../utils/solstice'

describe('currentSolsticeOrEquinox', () => {
  it('returns null on a non-solstice day', () => {
    // April 14, 2026 — not a solstice/equinox
    expect(currentSolsticeOrEquinox(new Date(2026, 3, 14))).toBeNull()
  })

  it('returns "vernal" on the 2026 vernal equinox (March 20)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 2, 20))).toBe('vernal')
  })

  it('returns "summer" on the 2026 summer solstice (June 21)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 5, 21))).toBe('summer')
  })

  it('returns "autumnal" on the 2026 autumnal equinox (September 22)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 8, 22))).toBe('autumnal')
  })

  it('returns "winter" on the 2026 winter solstice (December 21)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 11, 21))).toBe('winter')
  })

  it('returns null for a year outside the table', () => {
    expect(currentSolsticeOrEquinox(new Date(2200, 5, 21))).toBeNull()
  })
})

describe('getSolsticeQuote', () => {
  it('returns a non-empty string for each of the four kinds', () => {
    expect(getSolsticeQuote('vernal').length).toBeGreaterThan(0)
    expect(getSolsticeQuote('summer').length).toBeGreaterThan(0)
    expect(getSolsticeQuote('autumnal').length).toBeGreaterThan(0)
    expect(getSolsticeQuote('winter').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test tests/solstice.spec.ts
```

- [ ] **Step 3: Create `data/solsticeQuotes.ts`**

```ts
/**
 * Curated quotes for the four astronomical mile-marker days. One per
 * kind. The longer-form Library quote (~120-200 chars) chosen to
 * ground the user in the slower breath of solstice mode. Sources
 * are memento-mori and contemplative writers — Marcus Aurelius,
 * Annie Dillard, Mary Oliver, Rumi.
 */

export const SOLSTICE_QUOTES: Record<'vernal' | 'summer' | 'autumnal' | 'winter', string> = {
  vernal: 'And now we welcome the new year, full of things that have never been. — Rainer Maria Rilke',
  summer: 'How we spend our days is, of course, how we spend our lives. — Annie Dillard',
  autumnal: 'Tell me, what is it you plan to do with your one wild and precious life? — Mary Oliver',
  winter: 'You could leave life right now. Let that determine what you do and say and think. — Marcus Aurelius',
}
```

- [ ] **Step 4: Create `utils/solstice.ts`**

```ts
import { localDateString } from './date'
import { SOLSTICE_QUOTES } from '../data/solsticeQuotes'

/**
 * F2.5 Solstice / Equinox detection.
 *
 * Hardcoded lookup table for the years 2025-2105 (covering the maximum
 * lifespan of a 4000-week grid for any user born in 1948+). Each entry
 * is the local-calendar date the astronomical event falls on for users
 * within ±12h of UTC — the variance is acceptable for the once-per-day
 * granularity. Astronomical math (Jean Meeus formulas) would gain only
 * ±1h precision the user doesn't notice.
 */

export type SolsticeKind = 'vernal' | 'summer' | 'autumnal' | 'winter'

interface YearEntry {
  vernal: string
  summer: string
  autumnal: string
  winter: string
}

// Source: NOAA / USNO mean dates. ±1 day accuracy in extreme timezones.
const SOLSTICE_DATES: Record<number, YearEntry> = {
  2025: { vernal: '2025-03-20', summer: '2025-06-21', autumnal: '2025-09-22', winter: '2025-12-21' },
  2026: { vernal: '2026-03-20', summer: '2026-06-21', autumnal: '2026-09-22', winter: '2026-12-21' },
  2027: { vernal: '2027-03-20', summer: '2027-06-21', autumnal: '2027-09-23', winter: '2027-12-22' },
  2028: { vernal: '2028-03-20', summer: '2028-06-20', autumnal: '2028-09-22', winter: '2028-12-21' },
  2029: { vernal: '2029-03-20', summer: '2029-06-21', autumnal: '2029-09-22', winter: '2029-12-21' },
  2030: { vernal: '2030-03-20', summer: '2030-06-21', autumnal: '2030-09-22', winter: '2030-12-21' },
  2031: { vernal: '2031-03-20', summer: '2031-06-21', autumnal: '2031-09-23', winter: '2031-12-22' },
  2032: { vernal: '2032-03-20', summer: '2032-06-20', autumnal: '2032-09-22', winter: '2032-12-21' },
  2033: { vernal: '2033-03-20', summer: '2033-06-21', autumnal: '2033-09-22', winter: '2033-12-21' },
  2034: { vernal: '2034-03-20', summer: '2034-06-21', autumnal: '2034-09-22', winter: '2034-12-21' },
  2035: { vernal: '2035-03-20', summer: '2035-06-21', autumnal: '2035-09-23', winter: '2035-12-22' },
  2036: { vernal: '2036-03-20', summer: '2036-06-20', autumnal: '2036-09-22', winter: '2036-12-21' },
  2037: { vernal: '2037-03-20', summer: '2037-06-21', autumnal: '2037-09-22', winter: '2037-12-21' },
  2038: { vernal: '2038-03-20', summer: '2038-06-21', autumnal: '2038-09-22', winter: '2038-12-21' },
  2039: { vernal: '2039-03-20', summer: '2039-06-21', autumnal: '2039-09-23', winter: '2039-12-22' },
  2040: { vernal: '2040-03-20', summer: '2040-06-20', autumnal: '2040-09-22', winter: '2040-12-21' },
  2041: { vernal: '2041-03-20', summer: '2041-06-21', autumnal: '2041-09-22', winter: '2041-12-21' },
  2042: { vernal: '2042-03-20', summer: '2042-06-21', autumnal: '2042-09-22', winter: '2042-12-21' },
  2043: { vernal: '2043-03-20', summer: '2043-06-21', autumnal: '2043-09-23', winter: '2043-12-22' },
  2044: { vernal: '2044-03-20', summer: '2044-06-20', autumnal: '2044-09-22', winter: '2044-12-21' },
  2045: { vernal: '2045-03-20', summer: '2045-06-21', autumnal: '2045-09-22', winter: '2045-12-21' },
  2046: { vernal: '2046-03-20', summer: '2046-06-21', autumnal: '2046-09-22', winter: '2046-12-21' },
  2047: { vernal: '2047-03-20', summer: '2047-06-21', autumnal: '2047-09-23', winter: '2047-12-22' },
  2048: { vernal: '2048-03-20', summer: '2048-06-20', autumnal: '2048-09-22', winter: '2048-12-21' },
  2049: { vernal: '2049-03-20', summer: '2049-06-21', autumnal: '2049-09-22', winter: '2049-12-21' },
  2050: { vernal: '2050-03-20', summer: '2050-06-21', autumnal: '2050-09-22', winter: '2050-12-21' },
  2051: { vernal: '2051-03-20', summer: '2051-06-21', autumnal: '2051-09-23', winter: '2051-12-22' },
  2052: { vernal: '2052-03-20', summer: '2052-06-20', autumnal: '2052-09-22', winter: '2052-12-21' },
  2053: { vernal: '2053-03-20', summer: '2053-06-21', autumnal: '2053-09-22', winter: '2053-12-21' },
  2054: { vernal: '2054-03-20', summer: '2054-06-21', autumnal: '2054-09-22', winter: '2054-12-21' },
  2055: { vernal: '2055-03-21', summer: '2055-06-21', autumnal: '2055-09-23', winter: '2055-12-22' },
  2056: { vernal: '2056-03-20', summer: '2056-06-20', autumnal: '2056-09-22', winter: '2056-12-21' },
  2057: { vernal: '2057-03-20', summer: '2057-06-21', autumnal: '2057-09-22', winter: '2057-12-21' },
  2058: { vernal: '2058-03-20', summer: '2058-06-21', autumnal: '2058-09-22', winter: '2058-12-21' },
  2059: { vernal: '2059-03-20', summer: '2059-06-21', autumnal: '2059-09-23', winter: '2059-12-22' },
  2060: { vernal: '2060-03-20', summer: '2060-06-20', autumnal: '2060-09-22', winter: '2060-12-21' },
  2061: { vernal: '2061-03-20', summer: '2061-06-21', autumnal: '2061-09-22', winter: '2061-12-21' },
  2062: { vernal: '2062-03-20', summer: '2062-06-21', autumnal: '2062-09-22', winter: '2062-12-21' },
  2063: { vernal: '2063-03-20', summer: '2063-06-21', autumnal: '2063-09-23', winter: '2063-12-22' },
  2064: { vernal: '2064-03-19', summer: '2064-06-20', autumnal: '2064-09-22', winter: '2064-12-21' },
  2065: { vernal: '2065-03-20', summer: '2065-06-21', autumnal: '2065-09-22', winter: '2065-12-21' },
  2066: { vernal: '2066-03-20', summer: '2066-06-21', autumnal: '2066-09-22', winter: '2066-12-21' },
  2067: { vernal: '2067-03-20', summer: '2067-06-21', autumnal: '2067-09-23', winter: '2067-12-22' },
  2068: { vernal: '2068-03-19', summer: '2068-06-20', autumnal: '2068-09-22', winter: '2068-12-21' },
  2069: { vernal: '2069-03-20', summer: '2069-06-21', autumnal: '2069-09-22', winter: '2069-12-21' },
  2070: { vernal: '2070-03-20', summer: '2070-06-21', autumnal: '2070-09-22', winter: '2070-12-21' },
  2071: { vernal: '2071-03-20', summer: '2071-06-21', autumnal: '2071-09-22', winter: '2071-12-22' },
  2072: { vernal: '2072-03-19', summer: '2072-06-20', autumnal: '2072-09-22', winter: '2072-12-21' },
  2073: { vernal: '2073-03-20', summer: '2073-06-21', autumnal: '2073-09-22', winter: '2073-12-21' },
  2074: { vernal: '2074-03-20', summer: '2074-06-21', autumnal: '2074-09-22', winter: '2074-12-21' },
  2075: { vernal: '2075-03-20', summer: '2075-06-21', autumnal: '2075-09-22', winter: '2075-12-21' },
  2076: { vernal: '2076-03-19', summer: '2076-06-20', autumnal: '2076-09-22', winter: '2076-12-21' },
  2077: { vernal: '2077-03-19', summer: '2077-06-20', autumnal: '2077-09-22', winter: '2077-12-21' },
  2078: { vernal: '2078-03-20', summer: '2078-06-21', autumnal: '2078-09-22', winter: '2078-12-21' },
  2079: { vernal: '2079-03-20', summer: '2079-06-21', autumnal: '2079-09-22', winter: '2079-12-21' },
  2080: { vernal: '2080-03-19', summer: '2080-06-20', autumnal: '2080-09-22', winter: '2080-12-21' },
  2081: { vernal: '2081-03-19', summer: '2081-06-20', autumnal: '2081-09-22', winter: '2081-12-21' },
  2082: { vernal: '2082-03-20', summer: '2082-06-21', autumnal: '2082-09-22', winter: '2082-12-21' },
  2083: { vernal: '2083-03-20', summer: '2083-06-21', autumnal: '2083-09-22', winter: '2083-12-21' },
  2084: { vernal: '2084-03-19', summer: '2084-06-20', autumnal: '2084-09-22', winter: '2084-12-21' },
  2085: { vernal: '2085-03-19', summer: '2085-06-20', autumnal: '2085-09-22', winter: '2085-12-21' },
  2086: { vernal: '2086-03-20', summer: '2086-06-21', autumnal: '2086-09-22', winter: '2086-12-21' },
  2087: { vernal: '2087-03-20', summer: '2087-06-21', autumnal: '2087-09-22', winter: '2087-12-21' },
  2088: { vernal: '2088-03-19', summer: '2088-06-20', autumnal: '2088-09-22', winter: '2088-12-21' },
  2089: { vernal: '2089-03-19', summer: '2089-06-20', autumnal: '2089-09-22', winter: '2089-12-21' },
  2090: { vernal: '2090-03-20', summer: '2090-06-21', autumnal: '2090-09-22', winter: '2090-12-21' },
  2091: { vernal: '2091-03-20', summer: '2091-06-21', autumnal: '2091-09-22', winter: '2091-12-21' },
  2092: { vernal: '2092-03-19', summer: '2092-06-20', autumnal: '2092-09-22', winter: '2092-12-21' },
  2093: { vernal: '2093-03-19', summer: '2093-06-20', autumnal: '2093-09-22', winter: '2093-12-21' },
  2094: { vernal: '2094-03-20', summer: '2094-06-21', autumnal: '2094-09-22', winter: '2094-12-21' },
  2095: { vernal: '2095-03-20', summer: '2095-06-21', autumnal: '2095-09-22', winter: '2095-12-22' },
  2096: { vernal: '2096-03-19', summer: '2096-06-20', autumnal: '2096-09-22', winter: '2096-12-21' },
  2097: { vernal: '2097-03-19', summer: '2097-06-20', autumnal: '2097-09-22', winter: '2097-12-21' },
  2098: { vernal: '2098-03-20', summer: '2098-06-21', autumnal: '2098-09-22', winter: '2098-12-21' },
  2099: { vernal: '2099-03-20', summer: '2099-06-21', autumnal: '2099-09-22', winter: '2099-12-21' },
  2100: { vernal: '2100-03-20', summer: '2100-06-21', autumnal: '2100-09-22', winter: '2100-12-21' },
  2101: { vernal: '2101-03-20', summer: '2101-06-21', autumnal: '2101-09-23', winter: '2101-12-22' },
  2102: { vernal: '2102-03-21', summer: '2102-06-21', autumnal: '2102-09-23', winter: '2102-12-22' },
  2103: { vernal: '2103-03-21', summer: '2103-06-22', autumnal: '2103-09-23', winter: '2103-12-22' },
  2104: { vernal: '2104-03-20', summer: '2104-06-21', autumnal: '2104-09-22', winter: '2104-12-21' },
  2105: { vernal: '2105-03-20', summer: '2105-06-21', autumnal: '2105-09-23', winter: '2105-12-22' },
}

export function currentSolsticeOrEquinox(today: Date): SolsticeKind | null {
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

/**
 * Return the curated quote for a given solstice/equinox kind. Used by
 * FzLibrary to swap its rotating quote for the day.
 */
export function getSolsticeQuote(kind: SolsticeKind): string {
  return SOLSTICE_QUOTES[kind]
}

/**
 * Return the small-caps display label for the solstice/equinox header.
 */
export function getSolsticeLabel(kind: SolsticeKind, year: number): string {
  const labels: Record<SolsticeKind, string> = {
    vernal: 'VERNAL EQUINOX',
    summer: 'SUMMER SOLSTICE',
    autumnal: 'AUTUMNAL EQUINOX',
    winter: 'WINTER SOLSTICE',
  }
  return `${labels[kind]} · ${year}`
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test tests/solstice.spec.ts && pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add tests/solstice.spec.ts utils/solstice.ts data/solsticeQuotes.ts
git commit -m "$(cat <<'EOF'
add solstice/equinox detection + quotes (TDD)

stage 5 F2.5: hardcoded lookup table for years 2025-2105 (covers
the max lifespan of a 4000-week grid for any user born in 1948+).
±1 day variance in extreme east/west timezones is acceptable for
the once-per-day granularity — astronomical math would gain only
±1h precision the user doesn't notice.

currentSolsticeOrEquinox(today) returns 'vernal' | 'summer' |
'autumnal' | 'winter' | null. getSolsticeQuote(kind) returns one
of four curated longer-form quotes (Rilke, Dillard, Oliver,
Marcus Aurelius). getSolsticeLabel(kind, year) returns the
small-caps header text.

7 tests cover the four mile markers, a non-solstice day, an out-of-
table year, and quote presence for all four kinds.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: FzVowModal component + FzTitle vow line

**Files:**
- Create: `components/FzVowModal.vue`
- Modify: `components/FzTitle.vue`

**Why:** F2.1 — display the vow under the title, click or V to edit.

- [ ] **Step 1: Create `components/FzVowModal.vue`**

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state, setVow, clearVow } = useFzState()
const localText = ref('')
const errorMsg = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localText.value = state.value?.vow?.text ?? ''
      errorMsg.value = ''
      void nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  },
  { immediate: true },
)

function save(): void {
  errorMsg.value = ''
  try {
    setVow(localText.value)
    emit('close')
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'could not save'
  }
}

function clear(): void {
  errorMsg.value = ''
  try {
    clearVow()
    emit('close')
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'could not clear'
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    save()
  }
}

function onBackdropClick(): void {
  emit('close')
}
</script>

<template>
  <div v-if="props.open" class="vow-overlay" @click="onBackdropClick">
    <div class="vow-content" @click.stop>
      <p class="vow-prompt">what do you want this year to mean?</p>
      <input
        ref="inputRef"
        v-model="localText"
        class="vow-input"
        type="text"
        maxlength="240"
        placeholder="be present"
        @keydown="onKeydown"
      >
      <p v-if="errorMsg !== ''" class="vow-error">{{ errorMsg }}</p>
      <div class="vow-actions">
        <button class="vow-btn vow-save" :disabled="localText.trim() === ''" @click="save">4⬢⏣⏣</button>
        <button v-if="state?.vow !== null && state?.vow !== undefined" class="vow-btn vow-clear" @click="clear">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vow-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.vow-content {
  background: white;
  border: 1.5px solid #0847F7;
  padding: 1.5rem 1.75rem;
  max-width: 380px;
  width: 100%;
  z-index: 1001;
}

.vow-prompt {
  margin: 0 0 0.75rem;
  color: #0847F7;
  font-size: 0.85rem;
  font-style: italic;
}

.vow-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #0847F7;
  background: transparent;
  color: #0847F7;
  font-size: 1rem;
  font-style: italic;
  padding: 0.4rem 0;
  outline: none;
}

.vow-input::placeholder {
  color: #ccc;
  font-style: italic;
}

.vow-error {
  margin: 0.5rem 0 0;
  color: #ff3b30;
  font-size: 0.75rem;
}

.vow-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.vow-btn {
  background: white;
  border: 1.5px solid #0847F7;
  color: #F7B808;
  font-weight: 800;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}

.vow-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vow-btn:hover:not(:disabled),
.vow-btn:focus-visible:not(:disabled) {
  background: #fffbe6;
  outline: none;
}

.vow-clear {
  color: #ff3b30;
  border-color: #ff3b30;
}
</style>
```

- [ ] **Step 2: Update `components/FzTitle.vue`** to add the vow line

Find:
```vue
<template>
  <h1 class="title" @click="emit('openModal')">four-thousand weekz</h1>
  <h3 class="subtitle">
    <span class="ngmi">{{ past }}</span>-⬢
    <span class="beherenow" @click="emit('scrollToCurrent')">⏣</span>
    ⬡-<span class="wagmi">{{ future }}</span>
  </h3>
</template>
```

Replace with:
```vue
<template>
  <h1 class="title" @click="emit('openModal')">four-thousand weekz</h1>
  <p class="vow-line" @click="emit('openVow')">
    <em v-if="vowText !== null">{{ vowText }}</em>
    <em v-else class="vow-empty">press v to set your vow</em>
  </p>
  <h3 class="subtitle">
    <span class="ngmi">{{ past }}</span>-⬢
    <span class="beherenow" @click="emit('scrollToCurrent')">⏣</span>
    ⬡-<span class="wagmi">{{ future }}</span>
  </h3>
</template>
```

In the script section, find:
```ts
const emit = defineEmits<{
  openModal: []
  scrollToCurrent: []
}>()
```

Replace with:
```ts
const emit = defineEmits<{
  openModal: []
  scrollToCurrent: []
  openVow: []
}>()
```

After the existing `const future = computed(...)` definition, add:
```ts
const vowText = computed<string | null>(() => state.value?.vow?.text ?? null)
```

In the `<style scoped>` block, add the vow-line styles before the closing `</style>`:
```css
.vow-line {
  margin: 0.25rem 0 0.5rem;
  font-size: 0.65rem;
  font-weight: 300;
  color: #0847F7;
  letter-spacing: 0.05em;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
  cursor: text;
  font-style: italic;
}

.vow-line:hover em {
  border-bottom: 1px solid #0847F7;
}

.vow-empty {
  color: #ccc;
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add components/FzVowModal.vue components/FzTitle.vue
git commit -m "$(cat <<'EOF'
add FzVowModal + vow line in FzTitle

stage 5 F2.1: the vow displays as a tiny italic blue (0.65rem,
weight 300, #0847F7) line under the title. when unset, a quiet
gray placeholder reads "press v to set your vow" (teaching the
shortcut without UI clutter). clicking the line opens FzVowModal,
a small modal with one input (max 240 chars) + save (4⬢⏣⏣) +
clear (✕). save and clear are wrapped in try/catch (throw-and-
close pattern). enter saves. backdrop click closes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: FzMondayNotice component

**Files:**
- Create: `components/FzMondayNotice.vue`

**Why:** F2.2 after-the-fact path — small one-line notice when the user reloads after one or more Mondays have passed.

- [ ] **Step 1: Create `components/FzMondayNotice.vue`**

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

interface Props {
  weeks: number | null
}

const props = defineProps<Props>()

const visible = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const text = computed(() => {
  if (props.weeks === null) return ''
  if (props.weeks === 1) return 'a week passed.'
  return `${props.weeks} weeks passed.`
})

function dismiss(): void {
  visible.value = false
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

watch(
  () => props.weeks,
  (next) => {
    if (next !== null && next > 0) {
      visible.value = true
      if (dismissTimer !== null) clearTimeout(dismissTimer)
      dismissTimer = setTimeout(dismiss, 6000)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (dismissTimer !== null) clearTimeout(dismissTimer)
})
</script>

<template>
  <transition name="monday-fade">
    <div
      v-if="visible && props.weeks !== null && props.weeks > 0"
      class="monday-notice"
      role="status"
      aria-live="polite"
      @click="dismiss"
    >
      ⌁ {{ text }}
    </div>
  </transition>
</template>

<style scoped>
.monday-notice {
  max-width: 360px;
  margin: 0.75rem auto 0;
  padding: 0.5rem 1rem;
  background: #fffbe6;
  border-left: 3px solid #F7B808;
  cursor: pointer;
  text-align: center;
  font-size: 0.85rem;
  font-style: italic;
  color: #555;
}

.monday-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.monday-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.monday-fade-enter-from,
.monday-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .monday-fade-enter-active,
  .monday-fade-leave-active {
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
git add components/FzMondayNotice.vue
git commit -m "$(cat <<'EOF'
add FzMondayNotice component

stage 5 F2.2 after-the-fact path: small one-line italic banner
shown on page load when N >= 1 weeks have passed since the user's
last visit. text is "a week passed." for n=1 or "N weeks passed."
for n>1. yellow left border (matches the Sunday color family).
auto-dismisses after 6s. click to dismiss early.
prefers-reduced-motion strips the fade transition.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: FzBanner component (replaces FzEcho rendering)

**Files:**
- Create: `components/FzBanner.vue`

**Why:** F2.4 — single banner component that renders either an anniversary or echo (or nothing) based on the resolver's output. Replaces `FzEcho.vue` at the template site, but FzEcho.vue stays as a Stage-3 reference.

- [ ] **Step 1: Create `components/FzBanner.vue`**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useTodaysBanner } from '../composables/useTodaysBanner'
import { weekRange } from '../composables/useTime'
import { localDateString } from '../utils/date'

const { state, setLastEcho } = useFzState()
const today = ref(new Date())
const banner = useTodaysBanner(state, today)

const visible = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const todayDateStr = computed(() => localDateString(today.value))

const echoDateRangeLabel = computed(() => {
  if (banner.value === null || banner.value.type !== 'echo' || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, banner.value.entry.weekIndex)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  return range.start.toLocaleDateString(undefined, opts)
})

function dismiss(): void {
  visible.value = false
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function showIfAppropriate(): void {
  if (banner.value === null) return
  if (state.value === null) return
  if (state.value.meta.lastEcho === todayDateStr.value) return
  visible.value = true
  try {
    setLastEcho(todayDateStr.value)
  }
  catch {
    // Storage failure — show banner in-session anyway.
  }
  // Anniversary gets 12 seconds (longer reflection); echo keeps 8.
  const dismissAfter = banner.value.type === 'anniversary' ? 12000 : 8000
  dismissTimer = setTimeout(dismiss, dismissAfter)
}

onMounted(() => {
  showIfAppropriate()
})

watch(banner, (next, prev) => {
  if (prev === null && next !== null && !visible.value) {
    showIfAppropriate()
  }
})

onBeforeUnmount(() => {
  if (dismissTimer !== null) clearTimeout(dismissTimer)
})
</script>

<template>
  <transition name="banner-fade">
    <div
      v-if="visible && banner !== null"
      class="banner"
      :class="banner.type === 'anniversary' ? 'banner-anniversary' : 'banner-echo'"
      role="status"
      aria-live="polite"
      @click="dismiss"
    >
      <template v-if="banner.type === 'anniversary'">
        <div class="banner-label">⌁ anniversary</div>
        <div v-for="entry in banner.entries" :key="entry.weekIndex" class="banner-row">
          this week, {{ entry.yearsAgo }} year{{ entry.yearsAgo === 1 ? '' : 's' }} ago:
          <em>'{{ entry.whisper }}'</em>
          <span class="banner-meta"> · {{ entry.mark }}</span>
        </div>
      </template>
      <template v-else-if="banner.type === 'echo'">
        <div class="banner-label">⌁ echo</div>
        <div class="banner-body">
          <em class="banner-whisper">{{ banner.entry.whisper }}</em>
          <span class="banner-meta">· {{ echoDateRangeLabel }} · {{ banner.entry.mark }}</span>
        </div>
      </template>
    </div>
  </transition>
</template>

<style scoped>
.banner {
  max-width: 560px;
  margin: 0.75rem auto 0;
  padding: 0.75rem 1rem;
  background: #fffbe6;
  border-left: 3px solid #ff3b30;
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  color: #444;
}

.banner-label {
  color: #ff3b30;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.15rem;
}

.banner-row {
  margin: 0.15rem 0;
  font-style: normal;
  color: #444;
}

.banner-row em {
  color: #333;
  font-style: italic;
}

.banner-whisper {
  color: #333;
  font-style: italic;
}

.banner-meta {
  color: #888;
  font-size: 0.75rem;
}

.banner-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.banner-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .banner-fade-enter-active,
  .banner-fade-leave-active {
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
git add components/FzBanner.vue
git commit -m "$(cat <<'EOF'
add FzBanner component

stage 5 F2.4: single banner component that renders either an
anniversary (up to 3 stacked rows) or an echo (single row) based
on useTodaysBanner's resolved output. they never appear together
because anniversary takes precedence.

reuses the existing red left-border styling from FzEcho — color
sprawl is the enemy. visual differentiator is the LABEL ("anniversary"
vs "echo") and the layout (multi-row vs single-row).

setLastEcho fires when EITHER kind shows, gating both for the rest
of the day. anniversary gets 12s dismissal (longer reflection),
echo keeps 8s.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: FzSearch component

**Files:**
- Create: `components/FzSearch.vue`

**Why:** F2.7 — search input bar that filters whispers via useHighlight.

- [ ] **Step 1: Create `components/FzSearch.vue`**

```vue
<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useHighlight } from '../composables/useHighlight'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state } = useFzState()
const highlight = useHighlight()
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      query.value = ''
      void nextTick(() => {
        inputRef.value?.focus()
      })
    }
    else {
      highlight.clear()
    }
  },
  { immediate: true },
)

watch(query, (next) => {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    highlight.setSearch(state.value, next)
  }, 150)
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

onBeforeUnmount(() => {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
})
</script>

<template>
  <div v-if="props.open" class="search-bar">
    <input
      ref="inputRef"
      v-model="query"
      class="search-input"
      type="text"
      placeholder="search whispers"
      @keydown="onKeydown"
    >
    <span v-if="highlight.lit.value.size > 0" class="search-count">
      {{ highlight.lit.value.size }} {{ highlight.lit.value.size === 1 ? 'whisper' : 'whispers' }}
    </span>
  </div>
</template>

<style scoped>
.search-bar {
  max-width: 380px;
  margin: 0.75rem auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.search-input {
  width: 100%;
  border: 1px solid #0847F7;
  background: white;
  color: #0847F7;
  font-size: 0.9rem;
  font-style: italic;
  padding: 0.4rem 0.6rem;
  outline: none;
}

.search-input::placeholder {
  color: #ccc;
  font-style: italic;
}

.search-count {
  font-size: 0.7rem;
  color: #888;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzSearch.vue
git commit -m "$(cat <<'EOF'
add FzSearch component

stage 5 F2.7: small input bar with italic blue border. typing
debounces 150ms then calls useHighlight.setSearch which lights up
matching whispers and dims the rest. count line below the input
("3 whispers"). escape close. closing clears the highlight.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: FzLongNow component

**Files:**
- Create: `components/FzLongNow.vue`

**Why:** F2.8 — quiet footer line.

- [ ] **Step 1: Create `components/FzLongNow.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'

const year = computed(() => new Date().getFullYear())
</script>

<template>
  <div class="long-now-footer">
    <span class="long-now-zero">0</span>{{ year }} · the long now
  </div>
</template>

<style scoped>
.long-now-footer {
  margin: 1.5rem auto 0.75rem;
  text-align: center;
  font-size: 0.7rem;
  font-style: italic;
  color: #888;
  letter-spacing: 0.05em;
}

.long-now-zero {
  color: #F7B808;
  font-weight: 700;
}
</style>
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzLongNow.vue
git commit -m "$(cat <<'EOF'
add FzLongNow component

stage 5 F2.8: quiet footer line. format "02026 · the long now"
with the leading 0 in yellow (#F7B808, weight 700) and the rest
in italic gray (#888). 0.7rem font-size. centered. 1.5rem top
margin to feel like a footer.

honors the Long Now Foundation 5-digit year notation as a quiet
typographic accent.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: FzHexagon updates — lit / dim / anchored + right-click + long-press

**Files:**
- Modify: `components/FzHexagon.vue`

**Why:** F2.3, F2.7, F2.9 all touch the hexagon visual / interaction.

- [ ] **Step 1: Update `components/FzHexagon.vue`**

Find the existing `interface Props` and replace with:
```ts
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
  /** Whether this hexagon is in the active highlight set (constellation/search) */
  lit?: boolean
  /** Whether a highlight is active overall (so non-lit weeks dim) */
  dim?: boolean
  /** Whether this week is anchored as a life landmark */
  anchored?: boolean
}
```

Replace the existing `withDefaults` call:
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

Replace the existing `defineEmits` (or add it if absent) right after the props:
```ts
const emit = defineEmits<{
  click: []
  anchorToggle: []
}>()
```

After `const isMarked = computed(...)`, add:
```ts
let touchStartTime = 0
let touchMoved = false

function onClick(): void {
  emit('click')
}

function onContextMenu(event: MouseEvent): void {
  // Right-click anchors. Prevent the browser's context menu so
  // the user gets the toggle without the dropdown.
  event.preventDefault()
  emit('anchorToggle')
}

function onTouchStart(_event: TouchEvent): void {
  touchStartTime = Date.now()
  touchMoved = false
}

function onTouchMove(_event: TouchEvent): void {
  // Any movement during the touch invalidates the long-press
  // (the user is scrolling or dragging, not anchoring).
  touchMoved = true
}

function onTouchEnd(_event: TouchEvent): void {
  if (touchMoved) return
  if (Date.now() - touchStartTime >= 500) {
    emit('anchorToggle')
  }
}
```

Replace the existing `<template>` block:
```vue
<template>
  <div
    class="hexagon"
    :class="{
      'current-week': isCurrent,
      'marked': isMarked,
      'lit': lit,
      'dim': dim && !lit,
      'anchored': anchored,
    }"
    @click="onClick"
    @contextmenu="onContextMenu"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
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
```

Add to the `<style scoped>` block (before the closing `</style>`):
```css
.hexagon {
  /* ensure the box can host an outline ring without affecting layout */
  outline-offset: 0;
}

.hexagon.lit {
  outline: 1.5px solid #F7B808;
  transform: scale(1.05);
  transition: transform 0.4s ease-in-out, outline 0.4s ease-in-out;
}

.hexagon.dim {
  opacity: 0.3;
  transition: opacity 0.4s ease-in-out;
}

.hexagon.anchored {
  outline: 3px solid #ff3b30;
  outline-offset: 1px;
}

.hexagon.anchored.lit {
  /* When both lit and anchored, the anchor ring stays visible
     and the lit yellow outline merges into a thicker treatment. */
  outline: 3px solid #ff3b30;
  box-shadow: 0 0 0 1.5px #F7B808;
}

.hexagon.anchored:hover {
  box-shadow: 0 0 6px #ff3b30;
}

@media (prefers-reduced-motion: reduce) {
  .hexagon.lit,
  .hexagon.dim {
    transition: none;
  }
  .hexagon.lit {
    transform: none;
  }
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/FzHexagon.vue
git commit -m "$(cat <<'EOF'
FzHexagon: lit / dim / anchored + right-click + long-press

stage 5 F2.3 + F2.7 + F2.9: three new optional boolean props
control visual state. lit gets a 1.5px yellow outline + 1.05
scale. dim gets opacity 0.3 (visible as context). anchored gets
a 3px red ring (#ff3b30, the existing anchor color — no color
sprawl). all three transition with prefers-reduced-motion
fallbacks to none.

right-click toggles anchor (preventDefault on contextmenu).
touch long-press (>=500ms with no movement) toggles anchor.
both emit anchorToggle; FzGrid handles the add/remove decision.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: FzGrid updates — pass lit/dim/anchored, handle anchor-toggle

**Files:**
- Modify: `components/FzGrid.vue`

**Why:** Wire useHighlight + anchors into the grid; pass per-hexagon props; v-memo tuple expansion.

- [ ] **Step 1: Update `components/FzGrid.vue`**

In the `<script setup>` section, replace the imports line:
```ts
import { computed, onMounted, ref, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { currentGridIndex, weekRange, totalWeeks } from '../composables/useTime'
```

with:
```ts
import { computed, onMounted, ref, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useHighlight } from '../composables/useHighlight'
import { currentGridIndex, weekRange, totalWeeks } from '../composables/useTime'
```

After the existing `const { state } = useFzState()` line, add:
```ts
const { state, addAnchor, removeAnchor } = useFzState()
const highlight = useHighlight()
```

Replace the destructure-only line `const { state } = useFzState()` if it's still there.

After the existing `function whisperFor(...)` function, add:
```ts
const litSet = computed(() => highlight.lit.value)
const isHighlightActive = computed(() => highlight.isActive.value)

function isLit(index: number): boolean {
  return litSet.value.has(index)
}

function isAnchored(index: number): boolean {
  return state.value?.anchors.includes(index) ?? false
}

function onAnchorToggle(index: number): void {
  if (state.value === null) return
  try {
    if (isAnchored(index)) {
      removeAnchor(index)
    }
    else {
      addAnchor(index)
    }
  }
  catch {
    // throw-and-close: writeState failure is recoverable on next try
  }
}
```

In the `<template>`, replace the existing `<FzHexagon>` element:

```vue
    <FzHexagon
      v-for="i in indices"
      :id="i === currentIndex ? 'current-week' : undefined"
      :key="i"
      v-memo="[i === currentIndex, markFor(i), whisperFor(i), props.modalOpen, dobString, isLit(i), isHighlightActive, isAnchored(i)]"
      :index="i"
      :state="getState(i)"
      :hover-text="getHoverText(i)"
      :mark="markFor(i)"
      :whisper="whisperFor(i)"
      :modal-open="props.modalOpen"
      :lit="isLit(i)"
      :dim="isHighlightActive && !isLit(i)"
      :anchored="isAnchored(i)"
      @click="onHexClick(i)"
      @anchor-toggle="onAnchorToggle(i)"
    />
```

- [ ] **Step 2: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -8
```

- [ ] **Step 3: Commit**

```bash
git add components/FzGrid.vue
git commit -m "$(cat <<'EOF'
FzGrid: wire useHighlight + anchors

stage 5 F2.3 + F2.7 + F2.9 wiring: passes lit/dim/anchored down
to each FzHexagon. v-memo tuple expanded to include the new
props so a constellation toggle only re-renders the affected
hexagons (typically the matching glyph cluster + the formerly-
non-dim weeks).

handles anchor-toggle by reading state.anchors.includes and
calling addAnchor or removeAnchor as appropriate. wrapped in
try/catch (throw-and-close).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: FzMarkPopover — add constellation button

**Files:**
- Modify: `components/FzMarkPopover.vue`

**Why:** F2.3 trigger lives inside the popover (so the existing click-to-mark behavior stays intact). The popover already has `state`, `props.weekIndex`, `currentEntry`, and `emit`, so the new code reuses them.

- [ ] **Step 1: Add `useHighlight` import and constellation handler**

In `components/FzMarkPopover.vue`, find the existing imports block:

```ts
import { ref, computed, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { usePalette } from '../composables/usePalette'
import { weekRange } from '../composables/useTime'
import { isSingleGrapheme } from '../utils/grapheme'
```

Replace with:

```ts
import { ref, computed, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useHighlight } from '../composables/useHighlight'
import { usePalette } from '../composables/usePalette'
import { weekRange } from '../composables/useTime'
import { isSingleGrapheme } from '../utils/grapheme'
```

After the existing line `const palette = usePalette(state, today)`, add:

```ts
const highlight = useHighlight()
```

After the existing `function onClear(): void { ... }` block (before `function onClose`), add:

```ts
function onConstellation(): void {
  if (props.weekIndex === null) return
  if (state.value === null) return
  const entry = state.value.weeks[props.weekIndex]
  if (entry === undefined) return
  highlight.setConstellation(state.value, entry.mark, props.weekIndex)
  emit('close')
}
```

- [ ] **Step 2: Add the constellation button to the popover footer**

In the `<template>`, find the existing `pop-foot` block:

```vue
      <div class="pop-foot">
        <button
          v-if="currentEntry !== null"
          class="pop-clear"
          @click="onClear"
        >clear</button>
        <span v-else />
        <button class="btn-76" @click="onClose">4⬢⏣⬡</button>
      </div>
```

Replace with:

```vue
      <div class="pop-foot">
        <button
          v-if="currentEntry !== null"
          class="pop-clear"
          @click="onClear"
        >clear</button>
        <span v-else />
        <button
          v-if="currentEntry !== null"
          class="pop-constellation"
          aria-label="show constellation of this mark"
          title="constellation"
          @click="onConstellation"
        >✦</button>
        <button class="btn-76" @click="onClose">4⬢⏣⬡</button>
      </div>
```

In the `<style scoped>`, add the `.pop-constellation` rule (anywhere before the closing `</style>`, e.g. right after `.pop-clear`):

```css
.pop-constellation {
  background: white;
  border: 1.5px solid #0847F7;
  color: #F7B808;
  font-weight: 800;
  cursor: pointer;
  padding: 0.3rem 0.55rem;
  font-size: 0.9rem;
}

.pop-constellation:hover,
.pop-constellation:focus-visible {
  background: #fffbe6;
  outline: none;
}
```

- [ ] **Step 3: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add components/FzMarkPopover.vue
git commit -m "$(cat <<'EOF'
FzMarkPopover: add constellation button

stage 5 F2.3 trigger: a small ✦ button in the popover footer
that only renders when the week has a mark. clicking it closes
the popover and calls useHighlight.setConstellation with the
current glyph + week. doesn't overload the existing click-to-
edit behavior.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: FzPage orchestration

**Files:**
- Modify: `components/FzPage.vue`

**Why:** Mount useKeyboard, render FzVowModal/FzMondayNotice/FzBanner/FzSearch/FzLongNow, manage Quiet Mode class, manage Solstice body class, handle the live Monday transition timer.

- [ ] **Step 1: Update `components/FzPage.vue`**

Replace the `<script setup>` section's imports and top-level state with an extended version. Find the existing imports:
```ts
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { usePwa } from '../composables/usePwa'
import { shouldPromptToday } from '../composables/useSunday'
```

Replace with:
```ts
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useFzState } from '../composables/useFzState'
import { usePwa } from '../composables/usePwa'
import { useKeyboard } from '../composables/useKeyboard'
import { useHighlight } from '../composables/useHighlight'
import { shouldPromptToday } from '../composables/useSunday'
import { weekIndex } from '../composables/useTime'
import { currentSolsticeOrEquinox, getSolsticeLabel, type SolsticeKind } from '../utils/solstice'
```

After the existing `const { state } = useFzState()` and `const { register: registerPwa } = usePwa()`, add:
```ts
const keyboard = useKeyboard()
const highlight = useHighlight()

const vowModalOpen = ref(false)
const searchOpen = ref(false)
const quietMode = ref(false)
const weeksPassedGap = ref<number | null>(null)
const today = ref(new Date())

const solsticeKind = computed<SolsticeKind | null>(() => currentSolsticeOrEquinox(today.value))
const solsticeLabel = computed(() => {
  if (solsticeKind.value === null) return ''
  return getSolsticeLabel(solsticeKind.value, today.value.getFullYear())
})

let mondayTimer: ReturnType<typeof setTimeout> | null = null
```

After `function closeSundayModal(): void { ... }`, add:
```ts
function openVowModal(): void {
  vowModalOpen.value = true
}

function closeVowModal(): void {
  vowModalOpen.value = false
}

function openSearch(): void {
  // Opening search clears any active constellation
  highlight.clear()
  searchOpen.value = true
}

function closeSearch(): void {
  searchOpen.value = false
  highlight.clear()
}

function toggleQuietMode(): void {
  quietMode.value = !quietMode.value
}

function onEscape(): void {
  // Cascade: close the highest-priority overlay first
  if (searchOpen.value) {
    closeSearch()
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
  if (quietMode.value) {
    quietMode.value = false
  }
}

function msUntilNextMonday(from: Date): number {
  // 0 = Sunday, 1 = Monday, ...
  const day = from.getDay()
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7
  const target = new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysUntilMonday, 0, 0, 0, 0)
  return target.getTime() - from.getTime()
}

function scheduleNextMondayTransition(): void {
  if (mondayTimer !== null) clearTimeout(mondayTimer)
  const wait = msUntilNextMonday(new Date())
  mondayTimer = setTimeout(() => {
    today.value = new Date()
    scheduleNextMondayTransition()
  }, wait)
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    today.value = new Date()
    scheduleNextMondayTransition()
  }
}

function onBodyClick(event: MouseEvent): void {
  // Click outside any hexagon clears the highlight when active.
  // We bail if the click landed on a hexagon (the hex's own click handler runs)
  // or on an interactive element. The simplest test: if the clicked
  // element has the .hexagon class anywhere in its ancestor chain, ignore.
  if (!highlight.isActive.value) return
  const target = event.target as HTMLElement | null
  if (target === null) return
  if (target.closest('.hexagon')) return
  if (target.closest('.vow-overlay')) return
  if (target.closest('.search-bar')) return
  if (target.closest('.popover')) return
  highlight.clear()
}
```

In the existing `onMounted` block, AFTER the existing `void registerPwa()` line, append:

```ts
  // Stage 5: mount keyboard listener and bind shortcuts
  keyboard.init()
  keyboard.on('v', openVowModal)
  keyboard.on('q', toggleQuietMode)
  keyboard.on('/', (event) => {
    event.preventDefault()
    openSearch()
  })
  keyboard.on('escape', onEscape)

  // Stage 5 F2.2: monday ceremony — after-the-fact notice
  if (state.value !== null) {
    const dob = new Date(state.value.dob)
    const currentWeek = weekIndex(dob, today.value)
    try {
      const { setLastVisitedWeek } = useFzState()
      weeksPassedGap.value = setLastVisitedWeek(currentWeek)
    }
    catch {
      // throw-and-close
    }
  }

  // Stage 5 F2.2: monday ceremony — live transition (timer + visibilitychange)
  scheduleNextMondayTransition()
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.addEventListener('click', onBodyClick)
```

Add an `onBeforeUnmount` hook (right after the existing `onMounted`):

```ts
onBeforeUnmount(() => {
  if (mondayTimer !== null) clearTimeout(mondayTimer)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    document.removeEventListener('click', onBodyClick)
  }
})
```

Add a `watch` to apply / remove the solstice body class:
```ts
watch(solsticeKind, (next, prev) => {
  if (typeof document === 'undefined') return
  if (prev !== null) {
    document.body.classList.remove(`solstice-${prev}`)
  }
  if (next !== null) {
    document.body.classList.add(`solstice-${next}`)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof document !== 'undefined' && solsticeKind.value !== null) {
    document.body.classList.remove(`solstice-${solsticeKind.value}`)
  }
})
```

Update `containerClasses` to include the quiet-mode class:
```ts
const containerClasses = computed(() => ({
  'modal-open': showModal.value || markPopoverOpen.value || sundayModalOpen.value || vowModalOpen.value,
  'fz-quiet': quietMode.value,
}))
```

Replace the `<template>` body. Find:
```vue
<template>
  <div :class="['container', containerClasses]">
    <FzTitle
      @open-modal="openModal"
      @scroll-to-current="scrollToCurrent"
    />
    <FzDobModal
      :open="showModal"
      @close="closeModal"
      @saved="onSaved"
    />
    <FzGrid
      ref="gridRef"
      :modal-open="showModal || markPopoverOpen || sundayModalOpen"
      @hex-click="openMarkPopover"
    />
    <FzMarkPopover
      :open="markPopoverOpen"
      :week-index="markPopoverWeek"
      @close="closeMarkPopover"
    />
    <FzSundayModal
      :open="sundayModalOpen"
      @close="closeSundayModal"
    />
    <FzEcho />
    <FzLibrary />
  </div>
  <FzScrollHex />
  <FzToolbar />
  <FzEasterEgg />
</template>
```

Replace with:
```vue
<template>
  <div :class="['container', containerClasses]">
    <div v-if="solsticeKind !== null" class="solstice-label">{{ solsticeLabel }}</div>
    <FzTitle
      @open-modal="openModal"
      @scroll-to-current="scrollToCurrent"
      @open-vow="openVowModal"
    />
    <FzMondayNotice :weeks="weeksPassedGap" />
    <FzBanner />
    <FzSearch :open="searchOpen" @close="closeSearch" />
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
    <FzMarkPopover
      :open="markPopoverOpen"
      :week-index="markPopoverWeek"
      @close="closeMarkPopover"
    />
    <FzSundayModal
      :open="sundayModalOpen"
      @close="closeSundayModal"
    />
    <FzLibrary />
    <FzLongNow />
  </div>
  <FzScrollHex />
  <FzToolbar />
  <FzEasterEgg />
</template>
```

Note: `FzEcho` is removed from the template — its job is now done by `FzBanner`.

In the `<style scoped>`, add:
```css
.fz-quiet :deep(.title),
.fz-quiet :deep(.subtitle),
.fz-quiet :deep(.vow-line),
.fz-quiet :deep(.toolbar),
.fz-quiet :deep(.library),
.fz-quiet :deep(.long-now-footer),
.fz-quiet :deep(.solstice-label) {
  display: none;
}
.fz-quiet :deep(.hexagon-grid) {
  max-width: 100vw;
}

.solstice-label {
  text-align: center;
  font-variant: small-caps;
  letter-spacing: 0.3em;
  color: #F7B808;
  font-size: 0.7rem;
  margin-bottom: 0.5rem;
}
```

In the project's `assets/main.css` (or the equivalent global stylesheet), add the solstice body styles. First check where global CSS lives:

```bash
ls assets/
```

Then append to `assets/main.css`:
```css
body.solstice-vernal,
body.solstice-summer,
body.solstice-autumnal,
body.solstice-winter {
  background: #1a1a2e;
  color: #f7f7f0;
}

body[class*="solstice-"] .hexagon {
  color: #f7f7f0;
}

body[class*="solstice-"] .hexagon.current-week {
  color: #F7B808;
  animation-duration: 5.5s;
}

body[class*="solstice-"] .vow-line {
  color: #4A8EFF;
}

body[class*="solstice-"] .vow-empty {
  color: #444;
}

body[class*="solstice-"] .long-now-footer {
  color: #888;
}
```

- [ ] **Step 2: Typecheck + lint + test**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -8
```

- [ ] **Step 3: Commit**

```bash
git add components/FzPage.vue assets/main.css
git commit -m "$(cat <<'EOF'
FzPage: stage 5 orchestration

mounts useKeyboard with V/Q//// bindings and a cascading escape
handler. mounts FzVowModal, FzMondayNotice, FzBanner, FzSearch,
FzLongNow. removes FzEcho from the template (FzBanner replaces it).

monday ceremony: setLastVisitedWeek on mount captures the gap,
which feeds FzMondayNotice. live transition uses a setTimeout
that recomputes today.value at next local Monday 00:00, plus a
visibilitychange handler so a sleeping device that wakes after
midnight catches up.

quiet mode: a fz-quiet class on the container hides chrome via
:deep selectors. solstice mode: a watch applies/removes
solstice-{name} body classes; assets/main.css carries the dark
navy + slowed 5.5s breath + small-caps label. body click outside
hexagons / overlays clears any active highlight.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: utils/poster.ts — anchor ring rendering

**Files:**
- Modify: `utils/poster.ts`
- Modify: `tests/poster.spec.ts`

**Why:** F2.9 Anchors get visual treatment in the SVG poster export. The existing loop has `cx`, `cy`, and `CELL_SIZE` per cell — the ring centers on the cell.

- [ ] **Step 1: Update the loop in `utils/poster.ts`**

Find the existing loop body in `generatePoster`:

```ts
  // Grid
  for (let i = 0; i < totalWeeks; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx = GRID_X_START + col * CELL_SIZE + CELL_SIZE / 2
    const cy = GRID_Y_START + row * CELL_SIZE + CELL_SIZE / 2

    const entry = state.weeks[i]
    let glyph: string
    let fill: string

    if (entry !== undefined) {
      glyph = entry.mark
      fill = yellow
    }
    else if (i < currentIdx) {
      glyph = '⬢'
      fill = blue
    }
    else if (i === currentIdx) {
      glyph = '⏣'
      fill = yellow
    }
    else {
      glyph = '⬡'
      fill = blue
    }

    parts.push(
      `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${(CELL_SIZE * 0.75).toFixed(2)}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${escapeXml(glyph)}</text>`,
    )
  }
```

Replace with:

```ts
  // Build a Set for O(1) anchor lookup during the loop.
  const anchorSet = new Set(state.anchors)
  const anchorRed = '#ff3b30'

  // Grid
  for (let i = 0; i < totalWeeks; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const cx = GRID_X_START + col * CELL_SIZE + CELL_SIZE / 2
    const cy = GRID_Y_START + row * CELL_SIZE + CELL_SIZE / 2

    const entry = state.weeks[i]
    let glyph: string
    let fill: string

    if (entry !== undefined) {
      glyph = entry.mark
      fill = yellow
    }
    else if (i < currentIdx) {
      glyph = '⬢'
      fill = blue
    }
    else if (i === currentIdx) {
      glyph = '⏣'
      fill = yellow
    }
    else {
      glyph = '⬡'
      fill = blue
    }

    parts.push(
      `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="${(CELL_SIZE * 0.75).toFixed(2)}" fill="${fill}" text-anchor="middle" dominant-baseline="central">${escapeXml(glyph)}</text>`,
    )

    if (anchorSet.has(i)) {
      // Anchored weeks get a 0.6mm-stroke red square ring around their
      // cell — the same red as on-screen, scaled to A2 cell size.
      const ringX = (cx - CELL_SIZE / 2 + 0.4).toFixed(2)
      const ringY = (cy - CELL_SIZE / 2 + 0.4).toFixed(2)
      const ringSize = (CELL_SIZE - 0.8).toFixed(2)
      parts.push(
        `<rect x="${ringX}" y="${ringY}" width="${ringSize}" height="${ringSize}" fill="none" stroke="${anchorRed}" stroke-width="0.6"/>`,
      )
    }
  }
```

- [ ] **Step 2: Add an anchor test to `tests/poster.spec.ts`**

In `tests/poster.spec.ts`, append a new test inside whatever describe block the existing tests live in (typically `describe('generatePoster', ...)`):

```ts
  it('renders an anchor ring for each anchored week', () => {
    // #given a state with a single anchored week
    const state: FzState = {
      version: 1,
      dob: '1990-05-15',
      weeks: { 100: { mark: '⭐', markedAt: '2025-01-01T00:00:00.000Z' } },
      vow: null,
      letters: [],
      anchors: [100],
      prefs: DEFAULT_PREFS,
      meta: { createdAt: '2020-01-01T00:00:00.000Z' },
    }
    // #when we generate the poster SVG
    const svg = generatePoster(state, new Date(2026, 3, 14))
    // #then it includes a rect with the anchor red stroke
    expect(svg).toContain('stroke="#ff3b30"')
  })

  it('does not render anchor rings when there are no anchors', () => {
    // #given a state with marks but no anchors
    const state: FzState = {
      version: 1,
      dob: '1990-05-15',
      weeks: { 100: { mark: '⭐', markedAt: '2025-01-01T00:00:00.000Z' } },
      vow: null,
      letters: [],
      anchors: [],
      prefs: DEFAULT_PREFS,
      meta: { createdAt: '2020-01-01T00:00:00.000Z' },
    }
    const svg = generatePoster(state, new Date(2026, 3, 14))
    expect(svg).not.toContain('stroke="#ff3b30"')
  })
```

If the existing test file doesn't yet import `FzState` and `DEFAULT_PREFS`, add them to the existing imports at the top of `tests/poster.spec.ts`:

```ts
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'
```

- [ ] **Step 4: Run tests + typecheck + lint**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add utils/poster.ts tests/poster.spec.ts
git commit -m "$(cat <<'EOF'
poster: render anchored weeks with a red ring

stage 5 F2.9: anchored weeks get a 1.5px red ring (#ff3b30) in
the SVG export, matching the on-screen treatment in FzHexagon.
no anchor list at the bottom of the poster — the rings on the
grid speak for themselves.

1 new test verifies the stroke color is present in the output
SVG when anchors exist.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: Smoke test + final verification + tag

**Files:** None — verification only.

- [ ] **Step 1: Run all checks**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm generate
```

Expected: all clean. Test count ~227.

- [ ] **Step 2: Dev-server smoke test**

```bash
pnpm dev > /tmp/fz-ax-stage5-dev.log 2>&1 &
sleep 12
tail -20 /tmp/fz-ax-stage5-dev.log
curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:3000 || curl -s -o /dev/null -w "root: %{http_code}\n" http://localhost:3003
pkill -f "nuxt dev" || true
```

Expected: dev server boots, root returns 200.

- [ ] **Step 3: Tag the stage**

```bash
git tag -a stage-5-tier-2-rituals -m "Stage 5 — Tier 2 rituals (calendar of rituals)"
git log --oneline stage-4-pwa-sunday-push..stage-5-tier-2-rituals
```

Expected: ~21 commits in the stage 5 range.

Do NOT push in this task. The autopilot SHIP phase handles that separately.

---

## Self-review checklist

- [ ] All 9 F2.* features implemented
- [ ] Storage validators for vow + anchors
- [ ] All 5 new useFzState actions (setVow, clearVow, addAnchor, removeAnchor, setLastVisitedWeek)
- [ ] setDob refinement: resets stale meta on DOB change
- [ ] 3 new singleton composables (useKeyboard, useHighlight, useTodaysBanner)
- [ ] 1 new pure helper composable (useAnniversary)
- [ ] utils/solstice.ts with year table 2025-2105
- [ ] data/solsticeQuotes.ts with 4 curated quotes
- [ ] 6 new components (FzVowModal, FzMondayNotice, FzBanner, FzSearch, FzLongNow, plus the existing FzEcho stays in repo as Stage 3 reference but is not rendered)
- [ ] FzHexagon updates: lit/dim/anchored props + right-click + long-press
- [ ] FzGrid updates: useHighlight wiring, anchor toggle handling, v-memo tuple expansion
- [ ] FzTitle update: vow display line
- [ ] FzMarkPopover update: constellation button
- [ ] FzPage orchestration: keyboard, monday timer, solstice body class, quiet mode class, banner replacement
- [ ] utils/poster.ts: anchor ring in SVG
- [ ] All existing 179 tests still pass
- [ ] ~48 new tests added
- [ ] No third-party dependencies added
- [ ] No regressions to Stage 1-4 features

## Definition of done

- All 21 tasks complete
- ~227 tests passing
- `stage-5-tier-2-rituals` tag at the head of master
- No Tier 3 features shipped
