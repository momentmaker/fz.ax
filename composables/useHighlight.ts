import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { FzState } from '../types/state'

/**
 * The single source of truth for which weeks are visually "lit" and
 * which are "dimmed." Used by both F2.3 Constellation Lines and F2.7
 * Whisper Search. Discriminated-union state ensures only one mode
 * is active at a time:
 *
 *   - idle: nothing highlighted (the default — full grid normal)
 *   - constellation: a Mark glyph is "selected" and every week with
 *     that same glyph is lit; non-matching weeks dim
 *   - search: a query string filters whispers; matching weeks are
 *     lit; non-matching weeks dim
 *
 * Opening Search clears Constellation. Setting Search query='' goes
 * to idle. clear() goes to idle from any state.
 */

export type HighlightState =
  | { type: 'idle' }
  | { type: 'constellation'; glyph: string; weeks: ReadonlySet<number>; sourceWeek: number }
  | { type: 'search'; query: string; weeks: ReadonlySet<number> }

interface UseHighlightReturn {
  state: Ref<HighlightState>
  lit: ComputedRef<ReadonlySet<number>>
  isActive: ComputedRef<boolean>
  setConstellation: (fzState: FzState | null, glyph: string, sourceWeek: number) => void
  setSearch: (fzState: FzState | null, query: string) => void
  clear: () => void
}

let _module: UseHighlightReturn | null = null

function computeConstellationWeeks(fzState: FzState, glyph: string): Set<number> {
  const result = new Set<number>()
  for (const [keyStr, entry] of Object.entries(fzState.weeks)) {
    if (entry.mark === glyph) {
      const idx = Number(keyStr)
      if (Number.isInteger(idx)) result.add(idx)
    }
  }
  return result
}

function computeSearchWeeks(fzState: FzState, query: string): Set<number> {
  const result = new Set<number>()
  const needle = query.toLowerCase()
  for (const [keyStr, entry] of Object.entries(fzState.weeks)) {
    if (entry.whisper === undefined || entry.whisper === '') continue
    if (entry.whisper.toLowerCase().includes(needle)) {
      const idx = Number(keyStr)
      if (Number.isInteger(idx)) result.add(idx)
    }
  }
  return result
}

export function useHighlight(): UseHighlightReturn {
  if (_module !== null) return _module
  const state = ref<HighlightState>({ type: 'idle' })
  const lit = computed<ReadonlySet<number>>(() => {
    if (state.value.type === 'idle') return new Set<number>()
    return state.value.weeks
  })
  const isActive = computed(() => state.value.type !== 'idle')

  function setConstellation(fzState: FzState | null, glyph: string, sourceWeek: number): void {
    if (fzState === null) return
    const weeks = computeConstellationWeeks(fzState, glyph)
    state.value = { type: 'constellation', glyph, weeks, sourceWeek }
  }

  function setSearch(fzState: FzState | null, query: string): void {
    if (fzState === null) return
    if (query === '') {
      state.value = { type: 'idle' }
      return
    }
    const weeks = computeSearchWeeks(fzState, query)
    state.value = { type: 'search', query, weeks }
  }

  function clear(): void {
    state.value = { type: 'idle' }
  }

  _module = { state, lit, isActive, setConstellation, setSearch, clear }
  return _module
}

/**
 * Test-only reset of the module singleton.
 */
export function __resetUseHighlightForTests(): void {
  _module = null
}
