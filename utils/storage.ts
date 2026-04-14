import type { FzState } from '../types/state'
import { STORAGE_KEY } from '../types/state'

/**
 * Read the persisted state from localStorage, or null if absent or invalid.
 * Defensive: a corrupt blob is treated as "no state" so the app can recover
 * by re-running first-run rather than throwing on every page load.
 */
export function readState(): FzState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isValidFzState(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Narrow validation — confirms the parsed blob has the minimum shape required
 * to be treated as an FzState. Does NOT deep-check every field; that would
 * grow the storage layer into a schema validator. We only verify the fields
 * that downstream code would crash on if missing.
 */
function isValidFzState(value: unknown): value is FzState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    typeof v.dob === 'string' &&
    typeof v.weeks === 'object' && v.weeks !== null && !Array.isArray(v.weeks) &&
    (v.vow === null || typeof v.vow === 'object') &&
    Array.isArray(v.letters) &&
    Array.isArray(v.anchors) &&
    typeof v.prefs === 'object' && v.prefs !== null &&
    typeof v.meta === 'object' && v.meta !== null
  )
}

/**
 * Persist the state under STORAGE_KEY. Caller is responsible for shape — there
 * is no schema validation at the storage layer (validation belongs in migrate).
 */
export function writeState(state: FzState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Remove all persisted state. Useful for testing and for a "reset" affordance
 * we may add later.
 */
export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
