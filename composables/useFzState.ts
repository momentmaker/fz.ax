import { ref, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { writeState, clearState, isValidFzState } from '../utils/storage'
import { migrate, createFreshState } from '../utils/migrate'
import { totalWeeks } from './useTime'
import { isSingleGrapheme } from '../utils/grapheme'

/**
 * The single global state singleton. Declared at module scope so every
 * call to useFzState() returns the same reactive ref.
 *
 * Lazy-loaded on first call so that SSR builds (which prerender at
 * build time without window/localStorage) don't crash.
 */
let _state: Ref<FzState | null> | null = null

function ensureLoaded(): Ref<FzState | null> {
  if (_state !== null) return _state

  const initial = typeof window === 'undefined' ? null : migrate()
  _state = ref(initial)
  return _state
}

/**
 * Set or replace the date of birth. If no state exists, create one from
 * scratch. If state exists, mutate just the dob field (preserving marks,
 * whispers, anchors, etc.). Persists immediately to localStorage.
 */
function setDob(dob: string): void {
  const state = ensureLoaded()
  if (state.value === null) {
    state.value = createFreshState(dob)
  } else {
    state.value = { ...state.value, dob }
  }
  writeState(state.value)
}

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
 * Set a Mark on a week. Preserves any existing whisper (and any forward-
 * compatible fields on the existing entry) via spread. Writes to localStorage
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
        ...existing,
        mark,
        markedAt: new Date().toISOString(),
      },
    },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Set a Whisper on a week. The week must already have a Mark — you cannot
 * whisper to an unmarked week (the UI never allows this, and the data would
 * be orphaned). An empty whisper string removes the whisper field while
 * preserving the Mark and its original markedAt (removal isn't a content
 * edit). Non-empty whispers refresh markedAt. Existing fields on the entry
 * are preserved via spread. Writes to localStorage immediately.
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
        ? { ...existing, whisper: undefined }
        : { ...existing, whisper, markedAt: new Date().toISOString() },
    },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

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
  const nextWeeks: Record<number, FzState['weeks'][number]> = {}
  for (const [key, entry] of Object.entries(current.weeks)) {
    if (Number(key) !== week) {
      nextWeeks[Number(key)] = entry
    }
  }
  const next: FzState = { ...current, weeks: nextWeeks }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Update meta.lastSundayPrompt. Used by the Sunday Whisper ritual to
 * prevent re-opening the modal on the same day.
 */
function setLastSundayPrompt(dateStr: string): void {
  const state = ensureLoaded()
  const current = assertState()
  const next: FzState = {
    ...current,
    meta: { ...current.meta, lastSundayPrompt: dateStr },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Update meta.lastEcho. Used by FzEcho to mark the day as "echoed already"
 * so the banner doesn't repeat on page reloads within the same day.
 */
function setLastEcho(dateStr: string): void {
  const state = ensureLoaded()
  const current = assertState()
  const next: FzState = {
    ...current,
    meta: { ...current.meta, lastEcho: dateStr },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Update prefs.pushOptIn. Used by usePwa when the user enables or
 * disables the Sunday push notification. The pref is read back on
 * every page load to decide whether to re-schedule the notification.
 */
function setPushOptIn(value: boolean): void {
  const state = ensureLoaded()
  const current = assertState()
  const next: FzState = {
    ...current,
    prefs: { ...current.prefs, pushOptIn: value },
  }
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

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

/**
 * Add a week to the anchors list. Maintains sorted ascending order
 * and uniqueness — a no-op if the week is already anchored. Throws
 * on out-of-range or non-integer week.
 */
function addAnchor(week: number): void {
  const state = ensureLoaded()
  const current = assertState()
  assertWeek(week)
  if (current.anchors.includes(week)) return
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

/**
 * Replace the entire state — used by the backup restore flow. Validates
 * the incoming shape via isValidFzState and throws on rejection. Works
 * even when state is currently null (populates from an external source).
 */
function replaceState(next: FzState): void {
  if (!isValidFzState(next)) {
    throw new Error('useFzState: invalid state shape in replaceState')
  }
  const state = ensureLoaded()
  if (!writeState(next)) {
    throw new Error('useFzState: failed to persist state (storage disabled or quota exceeded)')
  }
  state.value = next
}

/**
 * Wipe all state. Intended for testing and for an eventual user-facing reset.
 */
function resetState(): void {
  const state = ensureLoaded()
  state.value = null
  clearState()
}

/**
 * The shape returned by useFzState. Stage 1 added setDob; Stage 2 added
 * setMark / setWhisper / clearMark; Stage 3+ will extend with setVow,
 * writeAnnualLetter, unsealLetter, addAnchor, removeAnchor, setPref.
 *
 * Seam notes for Stage 3+ implementers:
 *
 *   1. **Validate at the composable boundary, not the call site.** Every
 *      Stage 2 action (setMark/setWhisper/clearMark) does this via the
 *      assertState / assertWeek / assertSingleGrapheme helpers. New actions
 *      should follow the same pattern — throw loudly on invalid input,
 *      don't silently no-op, don't trust UI discipline.
 *
 *   2. **noUncheckedIndexedAccess is enforced in this project.** Reading
 *      `state.value.weeks[i]` yields `WeekEntry | undefined`. Handle the
 *      `undefined` branch explicitly — do NOT use the `!` non-null
 *      assertion. Upsert pattern used throughout Stage 2:
 *        state.value = {
 *          ...state.value,
 *          weeks: { ...state.value.weeks, [week]: nextEntry },
 *        }
 *
 *   3. **Reference-replace triggers all consumers.** The top-level
 *      `state.value = { ... }` pattern invalidates every consumer that
 *      reads `state.value`. FzGrid uses `v-memo` on FzHexagon keyed by
 *      `[isCurrent, mark, whisper, modalOpen]` so a single mark write
 *      only re-renders the one hexagon whose tuple changed. New derived
 *      UI that reads state should use the same pattern or a per-item
 *      computed to avoid the 4000-hexagon re-render explosion.
 *
 *   4. **Deep shape validation lives in `utils/storage.ts`.** Stage 2
 *      tightened `isValidFzState` to deep-check `WeekEntry` shape. When
 *      Stage 3+ adds new nested state (e.g. `LetterEntry`, `Preferences`
 *      sub-fields), extend `isValidFzState` with parallel `hasValidX`
 *      helpers so corrupt blobs are rejected at the storage boundary.
 */
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  clearMark: (week: number) => void
  setLastSundayPrompt: (dateStr: string) => void
  setLastEcho: (dateStr: string) => void
  setPushOptIn: (value: boolean) => void
  setVow: (text: string) => void
  clearVow: () => void
  addAnchor: (week: number) => void
  removeAnchor: (week: number) => void
  setLastVisitedWeek: (week: number) => number | null
  replaceState: (next: FzState) => void
  resetState: () => void
}

/**
 * The composable. Returns the reactive state ref plus typed actions.
 * Stage 3+ will extend `UseFzStateReturn` with setVow, writeAnnualLetter,
 * unsealLetter, addAnchor, removeAnchor, setPref.
 */
export function useFzState(): UseFzStateReturn {
  return {
    state: ensureLoaded(),
    setDob,
    setMark,
    setWhisper,
    clearMark,
    setLastSundayPrompt,
    setLastEcho,
    setPushOptIn,
    setVow,
    clearVow,
    addAnchor,
    removeAnchor,
    setLastVisitedWeek,
    replaceState,
    resetState,
  }
}

/**
 * Test-only reset of the module-level singleton. Vitest needs to clear
 * the in-memory state between tests because it doesn't re-import the
 * module on each spec.
 */
export function __resetForTests(): void {
  _state = null
}
