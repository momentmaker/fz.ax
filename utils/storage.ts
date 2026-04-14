import type { FzState } from '../types/state'
import { STORAGE_KEY, LEGACY_DOB_KEY } from '../types/state'
import { totalWeeks } from '../composables/useTime'

/**
 * All localStorage interaction in fz.ax goes through this module. Every
 * public function is safe to call even when the browser denies storage
 * (Safari Private Browsing, Firefox strict privacy, corporate-locked
 * environments) or when the quota is exhausted — in those cases we
 * degrade silently rather than crashing the entire component tree.
 *
 * NOTE on schema evolution: when a future stage introduces a new required
 * field in FzState, bump `version` and add a v1-→-vN migration path
 * BEFORE tightening the validator. The current validator rejects any
 * version !== 1, so unplanned bumps would wipe every existing user's data.
 */

/**
 * Wrap a localStorage read so that SecurityError / any other exception
 * is treated as "no value" instead of crashing.
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Wrap a localStorage write so that QuotaExceededError / SecurityError
 * is silently swallowed. Returns true on success, false on failure so
 * callers who care can react. Stage 1 callers don't check; Stage 2+ will.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Wrap a localStorage remove so that any exception is swallowed.
 */
function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Intentionally ignored — nothing to recover from on removal.
  }
}

/**
 * Read the persisted state from localStorage, or null if absent, invalid,
 * or inaccessible. Defensive: a corrupt blob or a blocked storage API is
 * treated as "no state" so the app can recover by re-running first-run
 * rather than throwing on every page load.
 */
export function readState(): FzState | null {
  const raw = safeGetItem(STORAGE_KEY)
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
 * to be treated as an FzState. Validates top-level fields and deep-checks
 * every WeekEntry, because Stage 2+ code reads `state.weeks[i].mark` and
 * would crash on a missing field.
 *
 * When Stage 2+ accesses nested fields beyond WeekEntry, extend the helper
 * below (not the top-level checker) so each sub-shape has its own validator.
 */
function isValidFzState(value: unknown): value is FzState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    typeof v.dob === 'string' &&
    hasValidWeeks(v.weeks) &&
    (v.vow === null || typeof v.vow === 'object') &&
    Array.isArray(v.letters) &&
    Array.isArray(v.anchors) &&
    typeof v.prefs === 'object' && v.prefs !== null &&
    typeof v.meta === 'object' && v.meta !== null
  )
}

/**
 * Validate the sparse weeks map: every key must be a non-negative integer
 * (serialized as a string in JSON), and every value must be a well-formed
 * WeekEntry with a non-empty mark and a markedAt timestamp. An optional
 * whisper is allowed; any other field is allowed too (forward compatibility).
 */
function hasValidWeeks(weeks: unknown): weeks is Record<number, { mark: string; whisper?: string; markedAt: string }> {
  if (weeks === null || typeof weeks !== 'object' || Array.isArray(weeks)) {
    return false
  }
  for (const [key, entry] of Object.entries(weeks as Record<string, unknown>)) {
    if (!/^\d+$/.test(key)) return false
    // Reject indices outside the renderable grid window so hand-edited
    // localStorage can't poison the state with orphan entries.
    const n = Number(key)
    if (!Number.isFinite(n) || n >= totalWeeks) return false
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return false
    const e = entry as Record<string, unknown>
    if (typeof e.mark !== 'string' || e.mark === '') return false
    if (typeof e.markedAt !== 'string') return false
    // Lightweight ISO-ish parse check — usePalette feeds markedAt into
    // new Date(...).getTime() and would produce NaN scores otherwise.
    if (Number.isNaN(new Date(e.markedAt).getTime())) return false
    if (e.whisper !== undefined && typeof e.whisper !== 'string') return false
  }
  return true
}

/**
 * Persist the state under STORAGE_KEY. Returns true on success, false if
 * the write was blocked (quota exceeded or storage disabled). Stage 1
 * callers ignore the return value; Stage 2+ should surface failures to
 * the user.
 */
export function writeState(state: FzState): boolean {
  return safeSetItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Remove the persisted state. Safe to call even when storage is disabled.
 */
export function clearState(): void {
  safeRemoveItem(STORAGE_KEY)
}

/**
 * Read the legacy v0 DOB key. Returns null if absent or inaccessible.
 * Used only by the migration helper.
 */
export function readLegacyDob(): string | null {
  return safeGetItem(LEGACY_DOB_KEY)
}

/**
 * Remove the legacy v0 DOB key. Safe to call even when storage is disabled.
 * Used only by the migration helper.
 */
export function clearLegacyDob(): void {
  safeRemoveItem(LEGACY_DOB_KEY)
}
