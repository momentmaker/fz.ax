import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'
import { readState, writeState, readLegacyDob, clearLegacyDob } from './storage'
import { isReasonableDob } from './dob'

/**
 * Build a brand-new FzState given a date of birth.
 * Used by the migration path and by first-run.
 */
export function createFreshState(dob: string): FzState {
  return {
    version: 1,
    dob,
    weeks: {},
    vow: null,
    letters: [],
    anchors: [],
    prefs: { ...DEFAULT_PREFS },
    meta: { createdAt: new Date().toISOString() },
  }
}

/**
 * Migrate any prior storage to v1. Resolution order:
 *
 *   1. If a v1 state already exists at STORAGE_KEY, return it unchanged.
 *   2. Else if the legacy `localStorage['dob']` key exists, lift it into
 *      a fresh v1 state, persist it, and remove the legacy key.
 *   3. Else return null (no prior data, caller will trigger first-run).
 *
 * This function is idempotent — calling it twice has the same effect as
 * calling it once. It must be safe to invoke at every page load, even in
 * environments where localStorage is unavailable (storage helpers guard
 * the underlying calls).
 *
 * Future versions: when FzState evolves past v1, change readState's
 * validator to accept newer versions, add a v1→vN migration step here,
 * and write the migrated shape back under STORAGE_KEY.
 */
export function migrate(): FzState | null {
  const existing = readState()
  if (existing !== null) return existing

  const legacy = readLegacyDob()
  if (legacy === null) return null

  // Guard the boundary: a legacy blob could contain anything if the user
  // hand-edited it, a browser extension mangled it, or a prior buggy write
  // happened. If the value is not a reasonable DOB, treat the migration as
  // "no prior state" so first-run triggers and the user re-enters their DOB.
  // Clear the legacy key either way so we don't re-evaluate it on next load.
  if (!isReasonableDob(legacy)) {
    clearLegacyDob()
    return null
  }

  const fresh = createFreshState(legacy)
  writeState(fresh)
  clearLegacyDob()
  return fresh
}
