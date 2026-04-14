import { describe, it, expect } from 'vitest'
import { exportBackup, parseBackup } from '../utils/backup'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

const sampleState: FzState = {
  version: 1,
  dob: '1990-05-15',
  weeks: {
    100: { mark: '❤', whisper: 'first kiss', markedAt: '2025-01-01T00:00:00.000Z' },
  },
  vow: null,
  letters: [],
  anchors: [],
  prefs: DEFAULT_PREFS,
  meta: { createdAt: '2025-01-01T00:00:00.000Z' },
}

describe('exportBackup', () => {
  it('returns a JSON string with the wrapper', () => {
    // #when we export
    const json = exportBackup(sampleState, new Date('2026-04-14T00:00:00.000Z'))
    // #then it parses and has the wrapper fields
    const parsed = JSON.parse(json)
    expect(parsed.fzAxBackup).toBe(true)
    expect(typeof parsed.exportedAt).toBe('string')
    expect(parsed.state).toEqual(sampleState)
  })
})

describe('parseBackup', () => {
  it('round-trips a valid backup', () => {
    // #given a backup written by exportBackup
    const json = exportBackup(sampleState, new Date('2026-04-14T00:00:00.000Z'))
    // #when we parse it
    const parsed = parseBackup(json)
    // #then we get the original state
    expect(parsed).toEqual(sampleState)
  })

  it('returns null for non-JSON input', () => {
    // #given garbage
    // #then null
    expect(parseBackup('not json {')).toBeNull()
  })

  it('returns null when fzAxBackup wrapper is missing', () => {
    // #given a bare state as JSON
    const json = JSON.stringify(sampleState)
    // #then null
    expect(parseBackup(json)).toBeNull()
  })

  it('returns null when the inner state is invalid', () => {
    // #given a wrapper around a bad state
    const json = JSON.stringify({ fzAxBackup: true, exportedAt: new Date().toISOString(), state: { nope: true } })
    // #then null
    expect(parseBackup(json)).toBeNull()
  })

  it('returns null when fzAxBackup is false', () => {
    // #given a wrapper with fzAxBackup: false
    const json = JSON.stringify({ fzAxBackup: false, exportedAt: new Date().toISOString(), state: sampleState })
    // #then null
    expect(parseBackup(json)).toBeNull()
  })

  it('returns null when state field is missing', () => {
    // #given a wrapper with no state
    const json = JSON.stringify({ fzAxBackup: true, exportedAt: new Date().toISOString() })
    // #then null
    expect(parseBackup(json)).toBeNull()
  })
})
