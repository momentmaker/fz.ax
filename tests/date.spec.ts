import { describe, it, expect } from 'vitest'
import { localDateString, nextSundayAt21 } from '../utils/date'

describe('localDateString', () => {
  it('returns YYYY-MM-DD in local time', () => {
    // #given a local Date
    const d = new Date(2026, 3, 12, 20, 30) // 2026-04-12 20:30 local
    // #then the formatter returns the local-date form
    expect(localDateString(d)).toBe('2026-04-12')
  })
})

describe('nextSundayAt21', () => {
  it('returns the next Sunday at 21:00 when today is Monday', () => {
    // #given a Monday at noon (2026-04-13 is a Monday)
    const monday = new Date(2026, 3, 13, 12, 0)
    // #when we compute the next Sunday 21:00
    const next = nextSundayAt21(monday)
    // #then it's the following Sunday at 21:00 local
    expect(next.getDay()).toBe(0) // Sunday
    expect(next.getHours()).toBe(21)
    expect(next.getMinutes()).toBe(0)
    expect(next.getSeconds()).toBe(0)
    // 2026-04-13 is Monday → next Sunday is 2026-04-19
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(3)
    expect(next.getDate()).toBe(19)
  })

  it('returns today at 21:00 if today is Sunday before 21:00', () => {
    // #given a Sunday at 15:00 (2026-04-12 is Sunday)
    const sundayAfternoon = new Date(2026, 3, 12, 15, 0)
    // #when we compute
    const next = nextSundayAt21(sundayAfternoon)
    // #then it's today at 21:00
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(12)
    expect(next.getHours()).toBe(21)
  })

  it('returns next Sunday if today is Sunday at 21:00 exactly', () => {
    // #given a Sunday at 21:00 exactly
    const sundayAt21 = new Date(2026, 3, 12, 21, 0)
    // #when we compute
    const next = nextSundayAt21(sundayAt21)
    // #then it's next Sunday — 21:00 exactly doesn't count as "future"
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
    expect(next.getHours()).toBe(21)
  })

  it('returns next Sunday if today is Sunday at 22:00', () => {
    // #given a Sunday at 22:00 (past the 21:00 trigger)
    const sundayLate = new Date(2026, 3, 12, 22, 0)
    // #when we compute
    const next = nextSundayAt21(sundayLate)
    // #then it rolls to next Sunday
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
  })

  it('returns this coming Sunday when today is Wednesday', () => {
    // #given a Wednesday (2026-04-15)
    const wed = new Date(2026, 3, 15, 10, 0)
    // #when we compute
    const next = nextSundayAt21(wed)
    // #then it's the upcoming Sunday
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
    expect(next.getHours()).toBe(21)
  })

  it('returns tomorrow 21:00 when today is Saturday', () => {
    // #given a Saturday morning (2026-04-18)
    const sat = new Date(2026, 3, 18, 9, 0)
    // #when we compute
    const next = nextSundayAt21(sat)
    // #then it's tomorrow at 21:00
    expect(next.getDay()).toBe(0)
    expect(next.getDate()).toBe(19)
    expect(next.getHours()).toBe(21)
  })
})
