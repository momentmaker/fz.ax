import { describe, it, expect } from 'vitest'
import { birthdayWeeksOfLife } from '../utils/birthday'

describe('birthdayWeeksOfLife', () => {
  it('returns a Set', () => {
    const dob = new Date(1990, 4, 15)
    const result = birthdayWeeksOfLife(dob)
    expect(result).toBeInstanceOf(Set)
  })

  it('includes week 0 (birth week)', () => {
    const dob = new Date(1990, 4, 15)
    const result = birthdayWeeksOfLife(dob)
    expect(result.has(0)).toBe(true)
  })

  it('returns approximately 77 birthday weeks for a typical DOB', () => {
    const dob = new Date(1990, 4, 15)
    const result = birthdayWeeksOfLife(dob)
    expect(result.size).toBeLessThanOrEqual(77)
    expect(result.size).toBeGreaterThanOrEqual(76)
  })

  it('each subsequent birthday week is ~52 weeks after the previous', () => {
    const dob = new Date(1990, 4, 15)
    const result = birthdayWeeksOfLife(dob)
    const sorted = Array.from(result).sort((a, b) => a - b)
    expect(sorted[1]).toBeGreaterThanOrEqual(51)
    expect(sorted[1]).toBeLessThanOrEqual(53)
  })

  it('handles Feb 29 DOB (leap year) — rolls to Mar 1 in non-leap years', () => {
    const dob = new Date(2000, 1, 29)
    const result = birthdayWeeksOfLife(dob)
    expect(result.has(0)).toBe(true)
    // First anniversary birthday falls on Mar 1, 2001 (non-leap)
    // Mar 1, 2001 is 366 days after Feb 29, 2000
    // weekIndex = floor(366 / 7) = 52
    const sorted = Array.from(result).sort((a, b) => a - b)
    expect(sorted[1]).toBe(52)
  })

  it('stops at totalWeeks boundary (4000)', () => {
    const dob = new Date(1900, 0, 1)
    const result = birthdayWeeksOfLife(dob)
    for (const idx of result) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(4000)
    }
  })
})
