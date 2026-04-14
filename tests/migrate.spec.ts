import { describe, it, expect, beforeEach } from 'vitest'
import { migrate, createFreshState } from '../utils/migrate'
import { STORAGE_KEY, LEGACY_DOB_KEY, DEFAULT_PREFS } from '../types/state'
import type { FzState } from '../types/state'

function aValidV1State(overrides: Partial<FzState> = {}): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks: {},
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    ...overrides,
  }
}

describe('migrate', () => {
  beforeEach(() => {
    // #given clean localStorage
    localStorage.clear()
  })

  it('returns null when there is no v1 state and no legacy dob', () => {
    // #when / #then
    expect(migrate()).toBeNull()
  })

  it('passes through an existing v1 state without modification', () => {
    // #given a valid v1 state already in localStorage
    const state = aValidV1State()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    // #when / #then migrate returns it unchanged
    expect(migrate()).toEqual(state)
  })

  it('lifts a legacy dob into a fresh v1 state', () => {
    // #given a legacy v0 dob key
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    // #when we migrate
    const result = migrate()
    // #then a fresh v1 state is returned with that dob
    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.dob).toBe('1985-03-21')
    expect(result!.weeks).toEqual({})
    expect(result!.vow).toBeNull()
    expect(result!.letters).toEqual([])
    expect(result!.anchors).toEqual([])
    expect(result!.prefs).toEqual(DEFAULT_PREFS)
    expect(typeof result!.meta.createdAt).toBe('string')
  })

  it('persists the migrated state to STORAGE_KEY', () => {
    // #given a legacy dob key
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    // #when we migrate
    migrate()
    // #then the new v1 state is written to the new storage key
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).dob).toBe('1985-03-21')
  })

  it('removes the legacy dob key after migrating', () => {
    // #given a legacy dob key
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    // #when we migrate
    migrate()
    // #then the legacy key is gone
    expect(localStorage.getItem(LEGACY_DOB_KEY)).toBeNull()
  })

  it('prefers v1 state over legacy dob if both exist', () => {
    // #given both a v1 state and a legacy dob key
    const state = aValidV1State({ dob: '1990-05-15' })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    // #when we migrate
    const result = migrate()
    // #then the v1 state wins
    expect(result!.dob).toBe('1990-05-15')
  })

  describe('createFreshState', () => {
    it('builds a v1 state with the given dob and current timestamp', () => {
      // #given a timestamp window
      const before = Date.now()
      // #when we create a fresh state
      const state = createFreshState('1990-05-15')
      const after = Date.now()
      // #then the shape is correct and createdAt falls inside the window
      expect(state.version).toBe(1)
      expect(state.dob).toBe('1990-05-15')
      expect(state.weeks).toEqual({})
      expect(state.vow).toBeNull()
      expect(state.letters).toEqual([])
      expect(state.anchors).toEqual([])
      expect(state.prefs).toEqual(DEFAULT_PREFS)

      const createdAt = new Date(state.meta.createdAt).getTime()
      expect(createdAt).toBeGreaterThanOrEqual(before)
      expect(createdAt).toBeLessThanOrEqual(after)
    })
  })
})
