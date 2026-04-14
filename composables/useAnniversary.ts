import type { FzState } from '../types/state'
import { weekOfYear, weekRange, weekIndex } from './useTime'

/**
 * F2.4 Anniversary Echo: surface marks/whispers from previous years
 * that fall on the same calendar week-of-year as the current week.
 *
 * Match criteria:
 *   1. Whisper must be non-empty (the surface is the whisper text;
 *      a bare glyph anniversary would be a featureless dot)
 *   2. Entry's week index must be < current week index (it's in the past)
 *   3. The entry's start date and today must share the same ISO
 *      week-of-year (1-53)
 *   4. yearsAgo (today's year minus entry-start-date's year) must be ≥ 1
 *      so the same-week-this-year doesn't qualify
 *
 * Returns up to 3 entries, sorted by yearsAgo descending (oldest first
 * — older anniversaries feel weightier).
 */

export interface AnniversaryEntry {
  weekIndex: number
  mark: string
  whisper: string
  yearsAgo: number
  markedAt: string
}

export function findAnniversaries(state: FzState | null, today: Date): AnniversaryEntry[] {
  if (state === null) return []
  const dob = new Date(state.dob)
  if (Number.isNaN(dob.getTime())) return []
  const currentIdx = weekIndex(dob, today)
  const todayWeek = weekOfYear(today)
  const todayYear = today.getFullYear()

  const results: AnniversaryEntry[] = []
  for (const [keyStr, entry] of Object.entries(state.weeks)) {
    const idx = Number(keyStr)
    if (!Number.isInteger(idx)) continue
    if (idx >= currentIdx) continue
    if (entry.whisper === undefined || entry.whisper === '') continue
    const start = weekRange(dob, idx).start
    if (weekOfYear(start) !== todayWeek) continue
    const yearsAgo = todayYear - start.getFullYear()
    if (yearsAgo < 1) continue
    results.push({
      weekIndex: idx,
      mark: entry.mark,
      whisper: entry.whisper,
      yearsAgo,
      markedAt: entry.markedAt,
    })
  }

  // Sort by yearsAgo descending (oldest first), then by weekIndex
  // descending as a deterministic tiebreaker.
  results.sort((a, b) => {
    if (b.yearsAgo !== a.yearsAgo) return b.yearsAgo - a.yearsAgo
    return b.weekIndex - a.weekIndex
  })

  return results.slice(0, 3)
}
