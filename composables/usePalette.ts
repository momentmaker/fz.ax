import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DEFAULT_LIMIT = 8

/**
 * The Personal Palette — top N most-used marks by recency-weighted frequency.
 *
 * Each entry contributes `1 / (1 + daysSinceMarked)` to its mark's total score.
 * This blends "used often" with "used recently" so yesterday's glyph beats
 * 100 occurrences from five years ago, but one occurrence from yesterday
 * doesn't beat three from last month.
 *
 * Ties break by first occurrence order (Map insertion order), then by the
 * original sort's stability.
 *
 * Reactive — recomputes when either `state` or `today` changes.
 */
export function usePalette(
  state: Ref<FzState | null>,
  today: Ref<Date>,
  limit: number = DEFAULT_LIMIT,
): ComputedRef<string[]> {
  return computed(() => {
    const s = state.value
    if (s === null) return []
    const now = today.value.getTime()
    const scores = new Map<string, number>()
    for (const entry of Object.values(s.weeks)) {
      const markedAt = new Date(entry.markedAt).getTime()
      const daysSince = Math.max(0, (now - markedAt) / MS_PER_DAY)
      const weight = 1 / (1 + daysSince)
      scores.set(entry.mark, (scores.get(entry.mark) ?? 0) + weight)
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([mark]) => mark)
  })
}
