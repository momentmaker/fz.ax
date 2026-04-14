import { describe, it, expect } from 'vitest'
import { findAnniversaries } from '../composables/useAnniversary'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function makeState(weeks: FzState['weeks']): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2020-01-01T00:00:00.000Z' },
  }
}

describe('findAnniversaries', () => {
  it('returns empty when state is null', () => {
    expect(findAnniversaries(null, new Date(2026, 3, 14))).toEqual([])
  })

  it('returns empty when there are no past marks', () => {
    const state = makeState({})
    expect(findAnniversaries(state, new Date(2026, 3, 14))).toEqual([])
  })

  it('finds a mark on the same week-of-year from a previous year', () => {
    // construct a controlled test by computing a known-good week index
    const dob = new Date(1990, 4, 15)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

    // Find a week index whose week start lands in week-of-year 16 of 2025
    let testWeekIdx = -1
    for (let i = 1700; i < 1900; i++) {
      const d = new Date(dob.getTime() + i * ONE_WEEK_MS)
      if (d.getFullYear() === 2025 && weekOfYearLocal(d) === 16) {
        testWeekIdx = i
        break
      }
    }
    expect(testWeekIdx).toBeGreaterThan(0)

    const state = makeState({
      [testWeekIdx]: { mark: '⭐', whisper: 'big day', markedAt: '2025-04-14T00:00:00.000Z' },
    })
    const today = new Date(2026, 3, 14) // April 14, 2026, week 16
    const found = findAnniversaries(state, today)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0]?.whisper).toBe('big day')
    expect(found[0]?.yearsAgo).toBe(1)
  })

  it('skips marks without a whisper', () => {
    const state = makeState({
      1700: { mark: '⭐', markedAt: '2024-01-01T00:00:00.000Z' },
    })
    expect(findAnniversaries(state, new Date(2026, 3, 14))).toEqual([])
  })

  it('skips marks in the same week as today (must be at least 1 year ago)', () => {
    // Even a same-week-of-year hit must be from a prior year.
    const state = makeState({
      1875: { mark: '⭐', whisper: 'this week', markedAt: '2026-04-14T00:00:00.000Z' },
    })
    expect(findAnniversaries(state, new Date(2026, 3, 14)).length).toBeLessThanOrEqual(0)
  })

  it('caps at 3 entries', () => {
    const dob = new Date(1990, 4, 15)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    const weeks: FzState['weeks'] = {}
    let added = 0
    for (let i = 1000; i < 1900 && added < 5; i++) {
      const d = new Date(dob.getTime() + i * ONE_WEEK_MS)
      if (weekOfYearLocal(d) === 16 && d.getFullYear() < 2026) {
        weeks[i] = {
          mark: '⭐',
          whisper: `year ${d.getFullYear()}`,
          markedAt: `${d.getFullYear()}-04-14T00:00:00.000Z`,
        }
        added++
      }
    }
    expect(added).toBeGreaterThanOrEqual(3)

    const state = makeState(weeks)
    const found = findAnniversaries(state, new Date(2026, 3, 14))
    expect(found.length).toBeLessThanOrEqual(3)
  })
})

// Helper: compute ISO week-of-year locally for test setup.
function weekOfYearLocal(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const diff = (target.getTime() - firstThursday.getTime()) / (1000 * 60 * 60 * 24)
  return 1 + Math.round(diff / 7)
}
