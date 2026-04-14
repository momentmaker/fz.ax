import { describe, it, expect } from 'vitest'
import { isReasonableDob } from '../utils/dob'

describe('isReasonableDob', () => {
  it('rejects the empty string', () => {
    // #given an empty input
    // #then it is not reasonable
    expect(isReasonableDob('')).toBe(false)
  })

  it('rejects an unparseable date string', () => {
    // #given garbage input
    // #then it is not reasonable
    expect(isReasonableDob('not-a-date')).toBe(false)
  })

  it('rejects a future date', () => {
    // #given a date one day in the future
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    // #then it is not reasonable
    expect(isReasonableDob(tomorrow)).toBe(false)
  })

  it('rejects a year before 1900', () => {
    // #given a pre-1900 dob
    // #then it is not reasonable
    expect(isReasonableDob('1850-05-15')).toBe(false)
  })

  it('accepts a typical past date', () => {
    // #given a typical dob
    // #then it is reasonable
    expect(isReasonableDob('1990-05-15')).toBe(true)
  })

  it('accepts the 1900-01-01 boundary', () => {
    // #given the earliest allowed date
    // #then it is reasonable
    expect(isReasonableDob('1900-01-01')).toBe(true)
  })

  it('accepts a date from yesterday', () => {
    // #given a date one day in the past
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    // #then it is reasonable
    expect(isReasonableDob(yesterday)).toBe(true)
  })
})
