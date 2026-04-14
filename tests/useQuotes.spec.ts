import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useLibraryQuote } from '../composables/useQuotes'
import { LIBRARY_QUOTES } from '../data/quotes'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(dob: string): FzState {
  return {
    version: 1,
    dob,
    weeks: {},
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('useLibraryQuote', () => {
  it('returns null for null state', () => {
    // #given no state
    const state = ref<FzState | null>(null)
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #then the quote is null
    expect(useLibraryQuote(state, today).value).toBeNull()
  })

  it('returns a LibraryQuote from the corpus when state has a dob', () => {
    // #given a state with a dob
    const state = ref<FzState | null>(stateWith('1990-05-15'))
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #when we read the quote
    const quote = useLibraryQuote(state, today).value
    // #then it's one of the corpus entries
    expect(quote).not.toBeNull()
    expect(LIBRARY_QUOTES).toContainEqual(quote)
  })

  it('is deterministic across calls for the same inputs', () => {
    // #given the same state and today
    const state = ref<FzState | null>(stateWith('1990-05-15'))
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #then two separate calls return the same quote
    expect(useLibraryQuote(state, today).value).toEqual(useLibraryQuote(state, today).value)
  })

  it('differs across DOB values on the same day', () => {
    // #given two different DOBs
    const state1 = ref<FzState | null>(stateWith('1990-05-15'))
    const state2 = ref<FzState | null>(stateWith('1991-06-16'))
    const today = ref(new Date('2026-04-14T12:00:00.000Z'))
    // #then they get different quotes on this realistic pair
    expect(useLibraryQuote(state1, today).value).not.toBe(useLibraryQuote(state2, today).value)
  })

  it('changes across weeks for the same DOB', () => {
    // #given the same DOB on two different weeks
    const state = ref<FzState | null>(stateWith('1990-05-15'))
    const thisWeek = ref(new Date('2026-04-14T12:00:00.000Z'))
    const nextWeek = ref(new Date('2026-04-21T12:00:00.000Z'))
    // #then the quotes differ
    const a = useLibraryQuote(state, thisWeek).value
    const b = useLibraryQuote(state, nextWeek).value
    expect(a).not.toBe(b)
  })
})
