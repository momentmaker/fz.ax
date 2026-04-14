import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useFzState, __resetForTests } from '../composables/useFzState'
import { STORAGE_KEY, LEGACY_DOB_KEY } from '../types/state'

describe('useFzState', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null state when there is no prior storage', () => {
    const { state } = useFzState()
    expect(state.value).toBeNull()
  })

  it('loads existing v1 state from localStorage on first call', () => {
    const persisted = {
      version: 1,
      dob: '1990-05-15',
      weeks: {},
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    const { state } = useFzState()

    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1990-05-15')
  })

  it('migrates legacy dob on first call', () => {
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')

    const { state } = useFzState()

    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1985-03-21')
    expect(localStorage.getItem(LEGACY_DOB_KEY)).toBeNull()
  })

  it('setDob initializes state when none exists', () => {
    const { state, setDob } = useFzState()
    expect(state.value).toBeNull()

    setDob('1990-05-15')

    expect(state.value).not.toBeNull()
    expect(state.value!.dob).toBe('1990-05-15')
  })

  it('setDob persists the new state to localStorage', () => {
    const { setDob } = useFzState()
    setDob('1990-05-15')

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).dob).toBe('1990-05-15')
  })

  it('setDob updates an existing state without touching other fields', () => {
    const persisted = {
      version: 1,
      dob: '1990-05-15',
      weeks: { 100: { mark: '❤', markedAt: '2025-01-01T00:00:00.000Z' } },
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))

    const { state, setDob } = useFzState()
    setDob('1991-06-16')

    expect(state.value!.dob).toBe('1991-06-16')
    expect(state.value!.weeks[100]).toEqual({
      mark: '❤',
      markedAt: '2025-01-01T00:00:00.000Z',
    })
  })

  it('resetState clears storage and the in-memory state', () => {
    const { state, setDob, resetState } = useFzState()
    setDob('1990-05-15')
    expect(state.value).not.toBeNull()

    resetState()

    expect(state.value).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns the same reactive ref across multiple calls', () => {
    const a = useFzState()
    const b = useFzState()
    expect(a.state).toBe(b.state)
  })
})
