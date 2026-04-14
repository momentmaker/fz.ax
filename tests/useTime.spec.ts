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
    // #given dob and today on the same instant
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-01T00:00:00.000Z')
    // #then the week index is 0
    expect(weekIndex(dob, today)).toBe(0)
  })

  it('returns 0 for any day in the first 7 days after dob', () => {
    // #given today is 5 days after dob
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-06T00:00:00.000Z')
    // #then we're still in week 0
    expect(weekIndex(dob, today)).toBe(0)
  })

  it('returns 1 exactly 7 days after dob', () => {
    // #given today is exactly 7 days after dob
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1990-01-08T00:00:00.000Z')
    // #then we cross into week 1
    expect(weekIndex(dob, today)).toBe(1)
  })

  it('returns 52 one year (365 days) later', () => {
    // #given a year gap (365 days = 52.14 weeks)
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    // #then floor gives 52
    expect(weekIndex(dob, today)).toBe(52)
  })

  it('handles a leap year correctly (366 days = 52)', () => {
    // #given a 365-day gap inside a leap year
    const dob = new Date('2000-01-01T00:00:00.000Z')
    const today = new Date('2000-12-31T00:00:00.000Z')
    // #then still 52 (365/7 = 52.14 → 52)
    expect(weekIndex(dob, today)).toBe(52)
  })

  it('returns 0 when today is before dob (clamped)', () => {
    // #given a future dob
    const dob = new Date('2000-01-01T00:00:00.000Z')
    const today = new Date('1999-01-01T00:00:00.000Z')
    // #then we clamp at 0 instead of returning a negative week
    expect(weekIndex(dob, today)).toBe(0)
  })
})

describe('weekRange', () => {
  it('returns the start and end dates of the first week', () => {
    // #given dob at the start of 1990
    const dob = new Date('1990-01-01T00:00:00.000Z')
    // #when we ask for week 0
    const range = weekRange(dob, 0)
    // #then start is dob and end is +6 days
    expect(range.start.toISOString().slice(0, 10)).toBe('1990-01-01')
    expect(range.end.toISOString().slice(0, 10)).toBe('1990-01-07')
  })

  it('returns the start and end dates of week 100', () => {
    // #given dob at the start of 1990
    const dob = new Date('1990-01-01T00:00:00.000Z')
    // #when we ask for week 100 (700 days later → 1991-12-02)
    const range = weekRange(dob, 100)
    // #then the range spans 1991-12-02 → 1991-12-08
    expect(range.start.toISOString().slice(0, 10)).toBe('1991-12-02')
    expect(range.end.toISOString().slice(0, 10)).toBe('1991-12-08')
  })
})

describe('totalWeeks', () => {
  it('is exactly 4000', () => {
    // #then the namesake is honored
    expect(totalWeeks).toBe(4000)
  })
})

describe('isCurrentWeek', () => {
  it('returns true for the index that matches today', () => {
    // #given a dob and today
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2026-04-13T00:00:00.000Z')
    // #when we check the current index
    const idx = weekIndex(dob, today)
    // #then isCurrentWeek agrees
    expect(isCurrentWeek(dob, today, idx)).toBe(true)
  })

  it('returns false for any other index', () => {
    // #given a dob and today
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2026-04-13T00:00:00.000Z')
    const idx = weekIndex(dob, today)
    // #then neighboring indices are not "current"
    expect(isCurrentWeek(dob, today, idx + 1)).toBe(false)
    expect(isCurrentWeek(dob, today, idx - 1)).toBe(false)
  })
})

describe('pastCount and futureCount', () => {
  it('pastCount equals the current week index', () => {
    // #given a year-apart dob/today pair
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    // #then pastCount is 52
    expect(pastCount(dob, today)).toBe(52)
  })

  it('futureCount equals (totalWeeks - 1 - currentIndex)', () => {
    // #given a year-apart dob/today pair
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('1991-01-01T00:00:00.000Z')
    // #then futureCount is totalWeeks - 1 - 52
    expect(futureCount(dob, today)).toBe(4000 - 1 - 52)
  })

  it('past + 1 (current) + future = totalWeeks', () => {
    // #given any dob/today
    const dob = new Date('1990-01-01T00:00:00.000Z')
    const today = new Date('2010-06-15T00:00:00.000Z')
    // #then the conservation law holds
    expect(pastCount(dob, today) + 1 + futureCount(dob, today)).toBe(4000)
  })
})
