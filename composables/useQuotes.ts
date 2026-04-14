import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { LIBRARY_QUOTES, type LibraryQuote } from '../data/quotes'
import { weekOfYear } from './useTime'
import { hashString } from '../utils/hash'

/**
 * The Library — returns the current memento mori quote for the user.
 *
 * Rotation is deterministic: the same user sees the same quote for an
 * entire ISO 8601 calendar week and a different quote the next week.
 * Different users (different DOBs) see different orderings.
 *
 * Formula:
 *   index = (hashString(dob) + weekOfYear(today)) mod corpus.length
 *
 * Reactive — recomputes when state.dob changes or today changes.
 * Returns null when state is null (pre-DOB).
 */
export function useLibraryQuote(
  state: Ref<FzState | null>,
  today: Ref<Date>,
): ComputedRef<LibraryQuote | null> {
  return computed(() => {
    const s = state.value
    if (s === null) return null
    if (LIBRARY_QUOTES.length === 0) return null
    const seed = hashString(s.dob) + weekOfYear(today.value)
    const index = seed % LIBRARY_QUOTES.length
    return LIBRARY_QUOTES[index] ?? null
  })
}
