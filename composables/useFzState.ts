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
 * The composable. Returns the reactive state ref plus typed actions.
 * Later stages will add: setMark, setWhisper, clearMark, setVow,
 * writeAnnualLetter, unsealLetter, addAnchor, removeAnchor, setPref.
 */
export function useFzState() {
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
