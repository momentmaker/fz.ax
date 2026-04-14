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

/**
 * Wipe all state. Intended for testing and for an eventual user-facing reset.
 */
function resetState(): void {
  const state = ensureLoaded()
  state.value = null
  clearState()
}

/**
 * The shape returned by useFzState. Exported so Stage 2+ can extend
 * it cleanly when adding setMark, setWhisper, etc.
 *
 * Guidance for Stage 2+ implementers:
 *
 *   1. **Validate at the composable boundary, not the call site.** `setDob`
 *      currently trusts callers because `FzDobModal.isReasonableDob` guards
 *      the UI input. Stage 2 actions (`setMark`, `setWhisper`, …) should
 *      validate their own arguments — don't rely on UI discipline.
 *
 *   2. **noUncheckedIndexedAccess is enforced in this project.** Reading
 *      `state.value.weeks[i]` yields `WeekEntry | undefined`. Handle the
 *      `undefined` branch explicitly — do NOT use the `!` non-null
 *      assertion. Upsert pattern:
 *        state.value = {
 *          ...state.value,
 *          weeks: { ...state.value.weeks, [week]: nextEntry },
 *        }
 *
 *   3. **Reference-replace triggers all consumers.** The top-level
 *      `state.value = { ... }` pattern invalidates every consumer that
 *      reads `state.value`. For a 4000-hexagon grid this means every mark
 *      write re-renders every hexagon unless `FzGrid` uses `v-memo` or a
 *      per-hexagon computed to short-circuit equal-mark renders. Plan for
 *      this before `setMark` lands.
 *
 *   4. **Deep shape validation lives in `utils/storage.ts`.** `isValidFzState`
 *      currently only checks top-level fields. Before Stage 2 reads
 *      `state.value.weeks[i].mark`, either tighten the validator to check
 *      `WeekEntry` shape or add a per-entry guard at every access site.
 */
export interface UseFzStateReturn {
  state: Ref<FzState | null>
  setDob: (dob: string) => void
  setMark: (week: number, mark: string) => void
  setWhisper: (week: number, whisper: string) => void
  resetState: () => void
}

/**
 * The composable. Returns the reactive state ref plus typed actions.
 * Later stages will add: setWhisper, clearMark, setVow,
 * writeAnnualLetter, unsealLetter, addAnchor, removeAnchor, setPref.
 */
export function useFzState(): UseFzStateReturn {
  return {
    state: ensureLoaded(),
    setDob,
    setMark,
    setWhisper,
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
