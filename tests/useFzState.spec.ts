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
})
