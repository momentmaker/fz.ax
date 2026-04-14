import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useFzState, __resetForTests } from '../composables/useFzState'
import { STORAGE_KEY, LEGACY_DOB_KEY } from '../types/state'

function aValidPersistedState(dob = '1990-05-15', weeks: Record<number, unknown> = {}) {
  return {
    version: 1,
    dob,
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: {
      theme: 'auto',
      pushOptIn: false,
      reducedMotion: 'auto',
      weekStart: 'mon',
    },
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('useFzState', () => {
  beforeEach(() => {
    // #given a clean localStorage and a fresh module singleton per test
    localStorage.clear()
    __resetForTests()
  })

  afterEach(() => {
    // #then leave no test state behind
    localStorage.clear()
  })

  it('returns null state when there is no prior storage', () => {
    // #when we call the composable with empty storage
    const { state } = useFzState()
    // #then the reactive state is null
    expect(state.value).toBeNull()
  })

  it('loads existing v1 state from localStorage on first call', () => {
    // #given a persisted v1 state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aValidPersistedState()))
    // #when we call the composable
    const { state } = useFzState()
    // #then the reactive state reflects it
    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1990-05-15')
  })

  it('migrates legacy dob on first call', () => {
    // #given a v0 legacy dob key
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    // #when we call the composable
    const { state } = useFzState()
    // #then the legacy value is lifted and the old key is gone
    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1985-03-21')
    expect(localStorage.getItem(LEGACY_DOB_KEY)).toBeNull()
  })

  it('setDob initializes state when none exists', () => {
    // #given no prior state
    const { state, setDob } = useFzState()
    expect(state.value).toBeNull()
    // #when setDob is called
    setDob('1990-05-15')
    // #then a fresh state is created with that dob
    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1990-05-15')
  })

  it('setDob persists the new state to localStorage', () => {
    // #when we setDob with no prior state
    const { setDob } = useFzState()
    setDob('1990-05-15')
    // #then the new state is in localStorage under STORAGE_KEY
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).dob).toBe('1990-05-15')
  })

  it('setDob updates an existing state without touching other fields', () => {
    // #given a state with an existing marked week
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        aValidPersistedState('1990-05-15', {
          100: { mark: '❤', markedAt: '2025-01-01T00:00:00.000Z' },
        }),
      ),
    )
    const { state, setDob } = useFzState()
    // #when we change the dob
    setDob('1991-06-16')
    // #then the dob updates but the mark is preserved
    expect(state.value!.dob).toBe('1991-06-16')
    expect(state.value!.weeks[100]).toEqual({
      mark: '❤',
      markedAt: '2025-01-01T00:00:00.000Z',
    })
  })

  it('resetState clears storage and the in-memory state', () => {
    // #given a composable with a set state
    const { state, setDob, resetState } = useFzState()
    setDob('1990-05-15')
    expect(state.value).not.toBeNull()
    // #when resetState is called
    resetState()
    // #then both memory and localStorage are cleared
    expect(state.value).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns the same reactive ref across multiple calls', () => {
    // #when we call useFzState twice
    const a = useFzState()
    const b = useFzState()
    // #then both calls share the same ref (singleton semantics)
    expect(a.state).toBe(b.state)
  })

  describe('setMark', () => {
    it('throws when state is null (no dob set yet)', () => {
      // #given no prior state
      const { setMark } = useFzState()
      // #when setMark is called
      // #then it throws because there's no state to mutate
      expect(() => setMark(100, '❤')).toThrow(/no state/i)
    })

    it('sets a mark on a fresh week', () => {
      // #given a state with a dob but no marks
      const { state, setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #when we mark week 100 with a heart
      setMark(100, '❤')
      // #then the week now has that mark
      const entry = state.value!.weeks[100]
      expect(entry).not.toBeUndefined()
      expect(entry!.mark).toBe('❤')
      expect(typeof entry!.markedAt).toBe('string')
    })

    it('persists the mark to localStorage', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #when we mark a week
      setMark(100, '❤')
      // #then the mark is in localStorage
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed.weeks[100].mark).toBe('❤')
    })

    it('overwrites an existing mark but preserves the whisper', () => {
      // #given a state with a marked and whispered week (seeded via localStorage)
      const persisted = {
        version: 1,
        dob: '1990-05-15',
        weeks: {
          100: {
            mark: '❤',
            whisper: 'first kiss',
            markedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto', pushOptIn: false, reducedMotion: 'auto', weekStart: 'mon' },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
      const { state, setMark } = useFzState()
      // #when we change the mark
      setMark(100, '☀')
      // #then the mark is new but the whisper stays
      const entry = state.value!.weeks[100]
      expect(entry!.mark).toBe('☀')
      expect(entry!.whisper).toBe('first kiss')
    })

    it('throws for a negative week index', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects negative week indices
      expect(() => setMark(-1, '❤')).toThrow(/week/i)
    })

    it('throws for a week index >= totalWeeks', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects indices beyond the grid
      expect(() => setMark(4000, '❤')).toThrow(/week/i)
    })

    it('throws for a non-integer week index', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects non-integer indices
      expect(() => setMark(1.5, '❤')).toThrow(/week/i)
    })

    it('throws for an empty mark', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects an empty-string mark
      expect(() => setMark(100, '')).toThrow(/mark/i)
    })

    it('throws for a multi-character mark', () => {
      // #given a state with a dob
      const { setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #then setMark rejects a two-character mark
      expect(() => setMark(100, 'ab')).toThrow(/mark/i)
    })

    it('accepts a ZWJ-sequence emoji as a single grapheme', () => {
      // #given a state with a dob
      const { state, setDob, setMark } = useFzState()
      setDob('1990-05-15')
      // #when we mark with a family emoji (1 user-perceived char, 8 code units)
      setMark(100, '👨‍👩‍👧')
      // #then it is accepted
      expect(state.value!.weeks[100]!.mark).toBe('👨‍👩‍👧')
    })
  })

  describe('setWhisper', () => {
    it('throws when state is null', () => {
      // #given no prior state
      const { setWhisper } = useFzState()
      // #then setWhisper throws
      expect(() => setWhisper(100, 'hi')).toThrow(/no state/i)
    })

    it('throws when the week has no mark', () => {
      // #given a state with a dob but no marks
      const { setDob, setWhisper } = useFzState()
      setDob('1990-05-15')
      // #then setWhisper throws because you can't whisper to an unmarked week
      expect(() => setWhisper(100, 'hi')).toThrow(/no mark|unmarked/i)
    })

    it('sets a whisper on a marked week', () => {
      // #given a marked week
      const { state, setDob, setMark, setWhisper } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      // #when we whisper
      setWhisper(100, 'first kiss')
      // #then the whisper is stored
      expect(state.value!.weeks[100]!.whisper).toBe('first kiss')
      expect(state.value!.weeks[100]!.mark).toBe('❤')
    })

    it('persists the whisper to localStorage', () => {
      // #given a marked week
      const { setDob, setMark, setWhisper } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      // #when we whisper
      setWhisper(100, 'first kiss')
      // #then localStorage reflects it
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).weeks[100].whisper).toBe('first kiss')
    })

    it('empty string removes the whisper but keeps the mark', () => {
      // #given a marked and whispered week
      const { state, setDob, setMark, setWhisper } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      setWhisper(100, 'first kiss')
      // #when we set an empty whisper
      setWhisper(100, '')
      // #then the whisper is gone but the mark stays
      expect(state.value!.weeks[100]!.whisper).toBeUndefined()
      expect(state.value!.weeks[100]!.mark).toBe('❤')
    })

    it('throws for a non-integer week', () => {
      const { setDob, setWhisper } = useFzState()
      setDob('1990-05-15')
      expect(() => setWhisper(1.5, 'hi')).toThrow(/week/i)
    })

    it('throws for a week out of range', () => {
      const { setDob, setWhisper } = useFzState()
      setDob('1990-05-15')
      expect(() => setWhisper(4000, 'hi')).toThrow(/week/i)
    })
  })

  describe('clearMark', () => {
    it('throws when state is null', () => {
      // #given no prior state
      const { clearMark } = useFzState()
      // #then clearMark throws
      expect(() => clearMark(100)).toThrow(/no state/i)
    })

    it('removes the entire WeekEntry', () => {
      // #given a marked and whispered week
      const { state, setDob, setMark, setWhisper, clearMark } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      setWhisper(100, 'first kiss')
      // #when we clear
      clearMark(100)
      // #then the week is gone from the sparse map
      expect(state.value!.weeks[100]).toBeUndefined()
    })

    it('persists the removal to localStorage', () => {
      // #given a marked week
      const { setDob, setMark, clearMark } = useFzState()
      setDob('1990-05-15')
      setMark(100, '❤')
      // #when we clear
      clearMark(100)
      // #then localStorage no longer has the week
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).weeks[100]).toBeUndefined()
    })

    it('is a silent no-op on an unmarked week', () => {
      // #given a state with a dob but no marks
      const { state, setDob, clearMark } = useFzState()
      setDob('1990-05-15')
      // #when we clear a never-marked week
      // #then no throw, no state change
      expect(() => clearMark(100)).not.toThrow()
      expect(state.value!.weeks).toEqual({})
    })

    it('throws for an out-of-range week', () => {
      const { setDob, clearMark } = useFzState()
      setDob('1990-05-15')
      expect(() => clearMark(4000)).toThrow(/week/i)
    })
  })

  describe('setLastSundayPrompt', () => {
    it('throws when state is null', () => {
      const { setLastSundayPrompt } = useFzState()
      expect(() => setLastSundayPrompt('2026-04-12')).toThrow(/no state/i)
    })

    it('sets meta.lastSundayPrompt', () => {
      const { state, setDob, setLastSundayPrompt } = useFzState()
      setDob('1990-05-15')
      setLastSundayPrompt('2026-04-12')
      expect(state.value!.meta.lastSundayPrompt).toBe('2026-04-12')
    })

    it('persists to localStorage', () => {
      const { setDob, setLastSundayPrompt } = useFzState()
      setDob('1990-05-15')
      setLastSundayPrompt('2026-04-12')
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).meta.lastSundayPrompt).toBe('2026-04-12')
    })
  })

  describe('setLastEcho', () => {
    it('throws when state is null', () => {
      const { setLastEcho } = useFzState()
      expect(() => setLastEcho('2026-04-14')).toThrow(/no state/i)
    })

    it('sets meta.lastEcho', () => {
      const { state, setDob, setLastEcho } = useFzState()
      setDob('1990-05-15')
      setLastEcho('2026-04-14')
      expect(state.value!.meta.lastEcho).toBe('2026-04-14')
    })
  })

  describe('replaceState', () => {
    it('replaces an existing state', () => {
      const { state, setDob, replaceState } = useFzState()
      setDob('1990-05-15')
      const next = {
        version: 1 as const,
        dob: '1991-06-16',
        weeks: {},
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto' as const, pushOptIn: false, reducedMotion: 'auto' as const, weekStart: 'mon' as const },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      replaceState(next)
      expect(state.value!.dob).toBe('1991-06-16')
    })

    it('works even when no prior state exists', () => {
      const { state, replaceState } = useFzState()
      expect(state.value).toBeNull()
      const next = {
        version: 1 as const,
        dob: '1991-06-16',
        weeks: {},
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto' as const, pushOptIn: false, reducedMotion: 'auto' as const, weekStart: 'mon' as const },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      replaceState(next)
      expect(state.value!.dob).toBe('1991-06-16')
    })

    it('throws on an invalid shape', () => {
      const { replaceState } = useFzState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => replaceState({ nope: true } as any)).toThrow(/invalid/i)
    })

    it('persists the replacement', () => {
      const { replaceState } = useFzState()
      const next = {
        version: 1 as const,
        dob: '1991-06-16',
        weeks: {},
        vow: null,
        letters: [],
        anchors: [],
        prefs: { theme: 'auto' as const, pushOptIn: false, reducedMotion: 'auto' as const, weekStart: 'mon' as const },
        meta: { createdAt: '2025-01-01T00:00:00.000Z' },
      }
      replaceState(next)
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(JSON.parse(raw!).dob).toBe('1991-06-16')
    })
  })
})
