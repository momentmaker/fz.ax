import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  readState,
  writeState,
  clearState,
  readLegacyDob,
  clearLegacyDob,
} from '../utils/storage'
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

  it('writeState returns true on success', () => {
    // #given nothing in particular
    // #then writing succeeds
    expect(writeState(sampleState)).toBe(true)
  })
})

describe('storage with a hostile localStorage', () => {
  beforeEach(() => {
    // #given a clean storage so hostile patches start from zero
    localStorage.clear()
  })

  afterEach(() => {
    // #then restore all spies so later tests see real localStorage
    vi.restoreAllMocks()
  })

  it('readState returns null when getItem throws (private browsing)', () => {
    // #given a SecurityError-throwing localStorage.getItem
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    // #then readState recovers gracefully
    expect(readState()).toBeNull()
  })

  it('writeState returns false when setItem throws (quota exceeded)', () => {
    // #given a QuotaExceededError-throwing localStorage.setItem
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    })
    // #then writeState reports failure instead of crashing
    expect(writeState(sampleState)).toBe(false)
  })

  it('clearState does not throw when removeItem throws', () => {
    // #given a throwing localStorage.removeItem
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('forbidden', 'SecurityError')
    })
    // #then clearState is a no-op, not a crash
    expect(() => clearState()).not.toThrow()
  })

  it('readLegacyDob returns null when getItem throws', () => {
    // #given a hostile localStorage
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('forbidden', 'SecurityError')
    })
    // #then readLegacyDob does not propagate
    expect(readLegacyDob()).toBeNull()
  })

  it('clearLegacyDob does not throw when removeItem throws', () => {
    // #given a throwing localStorage
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('forbidden', 'SecurityError')
    })
    // #then clearLegacyDob is a no-op
    expect(() => clearLegacyDob()).not.toThrow()
  })
})
