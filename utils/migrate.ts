import type { FzState } from '../types/state'
import {
  STORAGE_KEY,
  LEGACY_DOB_KEY,
  DEFAULT_PREFS,
} from '../types/state'
import { readState, writeState } from './storage'

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
 * calling it once. It must be safe to invoke at every page load.
 */
export function migrate(): FzState | null {
  const existing = readState()
  if (existing !== null) return existing

  const legacy = localStorage.getItem(LEGACY_DOB_KEY)
  if (legacy === null) return null

  const fresh = createFreshState(legacy)
  writeState(fresh)
  localStorage.removeItem(LEGACY_DOB_KEY)
  return fresh
}
