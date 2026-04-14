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
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as FzState
  } catch {
    return null
  }
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
