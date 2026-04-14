import { describe, it, expect, beforeEach } from 'vitest'
import { migrate, createFreshState } from '../utils/migrate'
import { STORAGE_KEY, LEGACY_DOB_KEY, DEFAULT_PREFS } from '../types/state'
import type { FzState } from '../types/state'

describe('migrate', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when there is no v1 state and no legacy dob', () => {
    expect(migrate()).toBeNull()
  })

  it('passes through an existing v1 state without modification', () => {
    const state: FzState = {
      version: 1,
      dob: '1990-05-15',
      weeks: {},
      vow: null,
      letters: [],
      anchors: [],
      prefs: DEFAULT_PREFS,
      meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    expect(migrate()).toEqual(state)
  })

  it('lifts a legacy dob into a fresh v1 state', () => {
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')

    const result = migrate()

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
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    migrate()
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).dob).toBe('1985-03-21')
  })

  it('removes the legacy dob key after migrating', () => {
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')
    migrate()
    expect(localStorage.getItem(LEGACY_DOB_KEY)).toBeNull()
  })

  it('prefers v1 state over legacy dob if both exist', () => {
    const state: FzState = {
      version: 1,
      dob: '1990-05-15',
      weeks: {},
      vow: null,
      letters: [],
      anchors: [],
      prefs: DEFAULT_PREFS,
      meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(LEGACY_DOB_KEY, '1985-03-21')

    const result = migrate()

    expect(result!.dob).toBe('1990-05-15')
  })

  describe('createFreshState', () => {
    it('builds a v1 state with the given dob and current timestamp', () => {
      const before = Date.now()
      const state = createFreshState('1990-05-15')
      const after = Date.now()

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
