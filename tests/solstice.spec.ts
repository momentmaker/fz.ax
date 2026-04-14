import { describe, it, expect } from 'vitest'
import { currentSolsticeOrEquinox, getSolsticeQuote } from '../utils/solstice'

describe('currentSolsticeOrEquinox', () => {
  it('returns null on a non-solstice day', () => {
    // April 14, 2026 — not a solstice/equinox
    expect(currentSolsticeOrEquinox(new Date(2026, 3, 14))).toBeNull()
  })

  it('returns "vernal" on the 2026 vernal equinox (March 20)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 2, 20))).toBe('vernal')
  })

  it('returns "summer" on the 2026 summer solstice (June 21)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 5, 21))).toBe('summer')
  })

  it('returns "autumnal" on the 2026 autumnal equinox (September 22)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 8, 22))).toBe('autumnal')
  })

  it('returns "winter" on the 2026 winter solstice (December 21)', () => {
    expect(currentSolsticeOrEquinox(new Date(2026, 11, 21))).toBe('winter')
  })

  it('returns null for a year outside the table', () => {
    expect(currentSolsticeOrEquinox(new Date(2200, 5, 21))).toBeNull()
  })
})

describe('getSolsticeQuote', () => {
  it('returns a non-empty string for each of the four kinds', () => {
    expect(getSolsticeQuote('vernal').length).toBeGreaterThan(0)
    expect(getSolsticeQuote('summer').length).toBeGreaterThan(0)
    expect(getSolsticeQuote('autumnal').length).toBeGreaterThan(0)
    expect(getSolsticeQuote('winter').length).toBeGreaterThan(0)
  })
})
