import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { findAnniversaries, type AnniversaryEntry } from './useAnniversary'
import { useEcho, type EchoEntry } from './useEcho'

/**
 * F2.4 collision rule: Anniversary takes precedence over Echo.
 * They never appear simultaneously. This is the single resolver
 * that decides which banner (if any) shows on page load.
 *
 * Used by FzPage to render the single FzBanner component, which
 * dispatches on the `type` field. The existing useEcho composable
 * is composed inside as the fallback path.
 */

export type TodaysBanner =
  | { type: 'anniversary'; entries: AnniversaryEntry[] }
  | { type: 'echo'; entry: EchoEntry }
  | null

export function useTodaysBanner(
  state: Ref<FzState | null>,
  today: Ref<Date>,
): ComputedRef<TodaysBanner> {
  const echo = useEcho(state, today)
  return computed(() => {
    if (state.value === null) return null
    const anniversaries = findAnniversaries(state.value, today.value)
    if (anniversaries.length > 0) {
      return { type: 'anniversary', entries: anniversaries }
    }
    if (echo.value !== null) {
      return { type: 'echo', entry: echo.value }
    }
    return null
  })
}
