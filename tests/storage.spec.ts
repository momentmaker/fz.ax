import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
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

  it('rejects a blob where weeks has a non-object entry', () => {
    // #given a v1 blob where weeks[100] is a number instead of an object
    const bad = { ...sampleState, weeks: { 100: 42 } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where a WeekEntry is missing mark', () => {
    // #given a week entry without a mark field
    const bad = {
      ...sampleState,
      weeks: { 100: { markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where WeekEntry.mark is an empty string', () => {
    // #given a week entry with an empty-string mark
    const bad = {
      ...sampleState,
      weeks: { 100: { mark: '', markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where weeks has a non-integer key', () => {
    // #given a week key that isn't a parseable non-negative integer
    const bad = {
      ...sampleState,
      weeks: { 'hundred': { mark: '❤', markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('accepts a blob with multiple valid week entries', () => {
    // #given a state with several correctly-shaped weeks
    const ok = {
      ...sampleState,
      weeks: {
        100: { mark: '❤', markedAt: '2025-01-01T00:00:00.000Z' },
        200: { mark: '☀', whisper: 'good day', markedAt: '2025-02-01T00:00:00.000Z' },
        300: { mark: 'w', markedAt: '2025-03-01T00:00:00.000Z' },
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    // #then readState accepts and returns the whole thing
    const result = readState()
    expect(result).toEqual(ok)
  })

  it('writeState returns true on success', () => {
    // #given nothing in particular
    // #then writing succeeds
    expect(writeState(sampleState)).toBe(true)
  })

  it('rejects a blob where dob is not a parseable date', () => {
    // #given a state blob with garbage in the dob field
    const bad = { ...sampleState, dob: 'not-a-date' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it at the storage boundary so downstream
    //   code never sees Invalid Date / NaN side-effects
    expect(readState()).toBeNull()
  })

  it('rejects a blob where dob is in the future', () => {
    // #given a state with a future dob
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const bad = { ...sampleState, dob: tomorrow }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where dob is before 1900', () => {
    // #given a state with a pre-1900 dob
    const bad = { ...sampleState, dob: '1850-05-15' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it
    expect(readState()).toBeNull()
  })

  it('rejects a blob where a WeekEntry.mark is multi-grapheme', () => {
    // #given a week entry with "ab" (two graphemes) as the mark
    const bad = {
      ...sampleState,
      weeks: { 100: { mark: 'ab', markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    // #then readState rejects it — the storage validator enforces the
    //   single-grapheme contract at the same boundary as setMark
    expect(readState()).toBeNull()
  })

  it('accepts a valid family-emoji mark (ZWJ sequence is one grapheme)', () => {
    // #given a state where the mark is an 8-code-unit family emoji
    const ok = {
      ...sampleState,
      weeks: { 100: { mark: '👨‍👩‍👧', markedAt: '2025-01-01T00:00:00.000Z' } },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    // #then readState accepts it
    expect(readState()).not.toBeNull()
  })
})

describe('storage validation: vow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts a state with vow === null', () => {
    // #given a v1 state with vow null
    const ok = { ...sampleState, vow: null }
    writeState(ok)
    // #then it loads
    expect(readState()).not.toBeNull()
  })

  it('accepts a state with a valid VowEntry', () => {
    // #given a state with a real vow
    const ok = {
      ...sampleState,
      vow: { text: 'be more present', writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    writeState(ok)
    // #then it loads
    const loaded = readState()
    expect(loaded?.vow?.text).toBe('be more present')
  })

  it('rejects a vow with empty text', () => {
    const bad = {
      ...sampleState,
      vow: { text: '', writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a vow with text > 240 chars', () => {
    const bad = {
      ...sampleState,
      vow: { text: 'x'.repeat(241), writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a vow with a non-string text', () => {
    const bad = {
      ...sampleState,
      vow: { text: 42, writtenAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a vow with an unparseable writtenAt', () => {
    const bad = {
      ...sampleState,
      vow: { text: 'ok', writtenAt: 'not-a-date' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })
})

describe('storage validation: anchors', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts a state with empty anchors', () => {
    const ok = { ...sampleState, anchors: [] }
    writeState(ok)
    expect(readState()).not.toBeNull()
  })

  it('accepts a sorted unique anchors array', () => {
    const ok = { ...sampleState, anchors: [50, 100, 1500] }
    writeState(ok)
    const loaded = readState()
    expect(loaded?.anchors).toEqual([50, 100, 1500])
  })

  it('rejects a non-array anchors field', () => {
    const bad = { ...sampleState, anchors: 'not-an-array' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects an unsorted anchors array', () => {
    const bad = { ...sampleState, anchors: [100, 50] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a duplicate anchor', () => {
    const bad = { ...sampleState, anchors: [50, 50] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a negative anchor', () => {
    const bad = { ...sampleState, anchors: [-1, 50] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects an out-of-range anchor', () => {
    const bad = { ...sampleState, anchors: [4000] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a non-integer anchor', () => {
    const bad = { ...sampleState, anchors: [50.5] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })
})

describe('storage validation: letters', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts a state with empty letters', () => {
    const ok = { ...sampleState, letters: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('accepts a state with a valid LetterEntry', () => {
    const ok = {
      ...sampleState,
      letters: [
        { text: 'hello future me', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false },
      ],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('rejects a non-array letters field', () => {
    const bad = { ...sampleState, letters: 'not-an-array' } as unknown as typeof sampleState
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with empty text', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: '', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with text > 2000 chars', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'x'.repeat(2001), sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with unparseable sealedAt', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'ok', sealedAt: 'not-a-date', unsealAt: '2026-05-15', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with unparseable unsealAt', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'ok', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: 'garbage', read: false }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects a letter with non-boolean read', () => {
    const bad = {
      ...sampleState,
      letters: [{ text: 'ok', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: 'yes' }],
    } as unknown as typeof sampleState
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })

  it('rejects letters not sorted by sealedAt', () => {
    const bad = {
      ...sampleState,
      letters: [
        { text: 'b', sealedAt: '2026-05-15T00:00:00.000Z', unsealAt: '2027-05-15', read: false },
        { text: 'a', sealedAt: '2025-05-15T00:00:00.000Z', unsealAt: '2026-05-15', read: false },
      ],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
  })
})

describe('storage validation: prefs.theme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts prefs.theme = auto', () => {
    const ok = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'auto' as const } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('accepts prefs.theme = light', () => {
    const ok = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'light' as const } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('accepts prefs.theme = dark', () => {
    const ok = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'dark' as const } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok))
    expect(readState()).not.toBeNull()
  })

  it('rejects prefs.theme = invalid string', () => {
    const bad = { ...sampleState, prefs: { ...sampleState.prefs, theme: 'garbage' } } as unknown as typeof sampleState
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(readState()).toBeNull()
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

  afterAll(() => {
    // #ensure complete cleanup after all hostile tests
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
