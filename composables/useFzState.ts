import { ref, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { writeState, clearState } from '../utils/storage'
import { migrate, createFreshState } from '../utils/migrate'

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
  resetState: () => void
}

/**
 * The composable. Returns the reactive state ref plus typed actions.
 * Later stages will add: setMark, setWhisper, clearMark, setVow,
 * writeAnnualLetter, unsealLetter, addAnchor, removeAnchor, setPref.
 */
export function useFzState(): UseFzStateReturn {
  return {
    state: ensureLoaded(),
    setDob,
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
