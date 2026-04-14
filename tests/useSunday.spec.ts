import { describe, it, expect } from 'vitest'
import { shouldPromptToday, sundayDateString } from '../composables/useSunday'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(lastSundayPrompt?: string): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks: {},
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: {
      createdAt: '2025-01-01T00:00:00.000Z',
      ...(lastSundayPrompt !== undefined ? { lastSundayPrompt } : {}),
    },
  }
}

describe('shouldPromptToday', () => {
  it('returns false when state is null', () => {
    // #given no state
    const today = new Date('2026-04-12T19:00:00') // Sunday 19:00 local
    // #then no prompt
    expect(shouldPromptToday(null, today)).toBe(false)
  })

  it('returns false when today is not Sunday', () => {
    // #given state and a monday
    const state = stateWith()
    const monday = new Date('2026-04-13T19:00:00')
    // #then no prompt
    expect(shouldPromptToday(state, monday)).toBe(false)
  })

  it('returns false on Sunday before 18:00', () => {
    // #given sunday at 17:59 local
    const state = stateWith()
    const sundayAfternoon = new Date('2026-04-12T17:59:00')
    // #then no prompt yet
    expect(shouldPromptToday(state, sundayAfternoon)).toBe(false)
  })

  it('returns true on Sunday at 18:00 with no prior prompt today', () => {
    // #given sunday at 18:00
    const state = stateWith()
    const sundayEvening = new Date('2026-04-12T18:00:00')
    // #then prompt
    expect(shouldPromptToday(state, sundayEvening)).toBe(true)
  })

  it('returns true on Sunday at 23:59 with no prior prompt today', () => {
    // #given sunday at 23:59
    const state = stateWith()
    const sundayLate = new Date('2026-04-12T23:59:00')
    // #then prompt
    expect(shouldPromptToday(state, sundayLate)).toBe(true)
  })

  it('returns false if lastSundayPrompt matches today', () => {
    // #given sunday evening with today already logged
    const state = stateWith('2026-04-12')
    const sundayEvening = new Date('2026-04-12T20:00:00')
    // #then no re-prompt
    expect(shouldPromptToday(state, sundayEvening)).toBe(false)
  })

  it('returns true if lastSundayPrompt is a prior Sunday', () => {
    // #given state logged last sunday, today is next sunday
    const state = stateWith('2026-04-05')
    const sundayEvening = new Date('2026-04-12T20:00:00')
    // #then re-prompt
    expect(shouldPromptToday(state, sundayEvening)).toBe(true)
  })
})

describe('sundayDateString', () => {
  it('returns YYYY-MM-DD in local time', () => {
    // #given a date
    const d = new Date('2026-04-12T20:30:00')
    // #then the formatter returns the local-date form
    expect(sundayDateString(d)).toBe('2026-04-12')
  })
})
