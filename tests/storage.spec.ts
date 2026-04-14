import { describe, it, expect, beforeEach } from 'vitest'
import { readState, writeState, clearState } from '../utils/storage'
import type { FzState } from '../types/state'
import { STORAGE_KEY, DEFAULT_PREFS } from '../types/state'

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

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no state has been written', () => {
    expect(readState()).toBeNull()
  })

  it('round-trips a full state', () => {
    writeState(sampleState)
    expect(readState()).toEqual(sampleState)
  })

  it('writes JSON under the STORAGE_KEY', () => {
    writeState(sampleState)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual(sampleState)
  })

  it('returns null when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(readState()).toBeNull()
  })

  it('returns null when the stored value parses but is not an object', () => {
    localStorage.setItem(STORAGE_KEY, '"a string"')
    expect(readState()).toBeNull()
  })

  it('clears the state', () => {
    writeState(sampleState)
    clearState()
    expect(readState()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
