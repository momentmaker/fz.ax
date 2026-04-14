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
    // #given a clean localStorage between each test
    localStorage.clear()
  })

  it('returns null when no state has been written', () => {
    // #when / #then
    expect(readState()).toBeNull()
  })

  it('round-trips a full state', () => {
    // #given a sample state
    // #when we persist and re-read it
    writeState(sampleState)
    // #then the re-read matches the original exactly
    expect(readState()).toEqual(sampleState)
  })

  it('writes JSON under the STORAGE_KEY', () => {
    // #when we persist a state
    writeState(sampleState)
    // #then the raw entry at STORAGE_KEY matches the serialized state
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual(sampleState)
  })

  it('returns null when the stored value is not valid JSON', () => {
    // #given a malformed JSON blob in localStorage
    localStorage.setItem(STORAGE_KEY, '{not-json')
    // #then readState returns null rather than throwing
    expect(readState()).toBeNull()
  })

  it('returns null when the stored value parses but is not an object', () => {
    // #given a JSON string (valid JSON, wrong shape)
    localStorage.setItem(STORAGE_KEY, '"a string"')
    // #then readState returns null
    expect(readState()).toBeNull()
  })

  it('returns null when the stored value is an object missing required fields', () => {
    // #given an object without the v1 shape
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }))
    // #then readState returns null
    expect(readState()).toBeNull()
  })

  it('returns null when version is not 1', () => {
    // #given a future-version state
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sampleState, version: 2 }))
    // #then readState refuses to trust it
    expect(readState()).toBeNull()
  })

  it('clears the state', () => {
    // #given a persisted state
    writeState(sampleState)
    // #when we clear
    clearState()
    // #then both the read and the raw entry are null
    expect(readState()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
