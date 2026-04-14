import { describe, it, expect } from 'vitest'
import { hashString } from '../utils/hash'

describe('hashString', () => {
  it('returns 0 for the empty string', () => {
    // #given empty input
    // #then hash is 0
    expect(hashString('')).toBe(0)
  })

  it('is deterministic across calls', () => {
    // #given the same input twice
    // #then the same hash is returned
    expect(hashString('1990-05-15')).toBe(hashString('1990-05-15'))
  })

  it('differs for different inputs', () => {
    // #given two different strings
    // #then the hashes differ
    expect(hashString('1990-05-15')).not.toBe(hashString('1991-05-15'))
  })

  it('handles unicode characters', () => {
    // #given a string with non-ASCII chars
    // #when we hash it
    const h = hashString('❤喜')
    // #then we get a finite non-negative integer
    expect(Number.isFinite(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('returns a non-negative integer', () => {
    // #given any input
    // #then the hash is always a non-negative integer
    for (const s of ['a', 'ab', 'abc', 'lorem ipsum', '1990-05-15']) {
      const h = hashString(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
    }
  })
})
