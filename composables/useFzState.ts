import { ref, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { writeState, clearState } from '../utils/storage'
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
  state.value = next
  writeState(next)
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
  state.value = next
  writeState(next)
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
  state.value = next
  writeState(next)
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
