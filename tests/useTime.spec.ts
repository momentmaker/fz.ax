import { describe, it, expect } from 'vitest'
import {
  weekIndex,
  weekRange,
  totalWeeks,
  isCurrentWeek,
  pastCount,
  futureCount,
} from '../composables/useTime'

describe('weekIndex', () => {
  it('returns 0 when today is the same day as dob', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-01T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(0)
  })

  it('returns 0 for any day in the first 7 days after dob', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-06T00:00:00.000Z') // 5 days later
    expect(weekIndex(dob, today)).toBe(0)
  })

  it('returns 1 exactly 7 days after dob', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-08T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(1)
  })

  it('returns 52 one year (365 days) later', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(52) // 365/7 = 52.14 → floor = 52
  })

  it('handles a leap year correctly (366 days = 52)', () => {
    const dob = new Date('2000-01-01T00:00:00.000Z')
    const today = new Date('2000-12-31T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(52) // 365/7 = 52.14 → floor = 52
  })

  it('returns 0 when today is before dob (clamped)', () => {
    const dob = new Date('2000-01-01T00:00:00.000Z')
    const today = new Date('1999-01-01T00:00:00.000Z')
    expect(weekIndex(dob, today)).toBe(0)
  })
})

describe('weekRange', () => {
  it('returns the start and end dates of the first week', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const range = weekRange(dob, 0)
    expect(range.start.toISOString().slice(0, 10)).toBe('1990-01-01')
    expect(range.end.toISOString().slice(0, 10)).toBe('1990-01-07')
  })

  it('returns the start and end dates of week 100', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const range = weekRange(dob, 100)
    // 100 weeks * 7 days = 700 days after 1990-01-01 → 1991-12-02
    expect(range.start.toISOString().slice(0, 10)).toBe('1991-12-02')
    // end is 6 days later → 1991-12-08
    expect(range.end.toISOString().slice(0, 10)).toBe('1991-12-08')
  })
})

describe('totalWeeks', () => {
  it('is exactly 4000', () => {
    expect(totalWeeks).toBe(4000)
  })
})

describe('isCurrentWeek', () => {
  it('returns true for the index that matches today', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2026-04-13T00:00:00.000Z')
    const idx = weekIndex(dob, today)
    expect(isCurrentWeek(dob, today, idx)).toBe(true)
  })

  it('returns false for any other index', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2026-04-13T00:00:00.000Z')
    const idx = weekIndex(dob, today)
    expect(isCurrentWeek(dob, today, idx + 1)).toBe(false)
    expect(isCurrentWeek(dob, today, idx - 1)).toBe(false)
  })
})

describe('pastCount and futureCount', () => {
  it('pastCount equals the current week index', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    expect(pastCount(dob, today)).toBe(52)
  })

  it('futureCount equals (totalWeeks - 1 - currentIndex)', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    expect(futureCount(dob, today)).toBe(4000 - 1 - 52)
  })

  it('past + 1 (current) + future = totalWeeks', () => {
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2010-06-15T00:00:00.000Z')
    expect(pastCount(dob, today) + 1 + futureCount(dob, today)).toBe(4000)
  })
})
