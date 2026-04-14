import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useEcho } from '../composables/useEcho'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(weeks: FzState['weeks'], dob = '1990-01-01'): FzState {
  return {
    version: 1,
    dob,
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('useEcho', () => {
  it('returns null for null state', () => {
    // #given no state
    const state = ref<FzState | null>(null)
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns null when no weeks are marked', () => {
    // #given a state with no marks
    const state = ref<FzState | null>(stateWith({}))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns null when marks exist but none have whispers', () => {
    // #given a state with marks but no whispers
    const state = ref<FzState | null>(stateWith({
      10: { mark: '❤', markedAt: '2020-01-01T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo (whispers are required)
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns null when all whispered weeks are future', () => {
    // #given a dob so early that mark on week 2000 is in the future
    const state = ref<FzState | null>(stateWith({
      2000: { mark: '❤', whisper: 'future', markedAt: '2020-01-01T00:00:00.000Z' },
    }, '2000-01-01'))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then no echo (future weeks are filtered out)
    expect(useEcho(state, today).value).toBeNull()
  })

  it('returns a past whispered week when one exists', () => {
    // #given a past week with a whisper
    const state = ref<FzState | null>(stateWith({
      10: { mark: '❤', whisper: 'early memory', markedAt: '2020-01-01T00:00:00.000Z' },
    }, '1990-01-01'))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then that week is the echo
    const echo = useEcho(state, today).value
    expect(echo).not.toBeNull()
    expect(echo!.weekIndex).toBe(10)
    expect(echo!.whisper).toBe('early memory')
    expect(echo!.mark).toBe('❤')
  })

  it('is deterministic across same-day calls', () => {
    // #given multiple eligible echoes
    const weeks: FzState['weeks'] = {
      10: { mark: '❤', whisper: 'a', markedAt: '2020-01-01T00:00:00.000Z' },
      20: { mark: '☀', whisper: 'b', markedAt: '2020-02-01T00:00:00.000Z' },
      30: { mark: 'w', whisper: 'c', markedAt: '2020-03-01T00:00:00.000Z' },
    }
    const state = ref<FzState | null>(stateWith(weeks, '1990-01-01'))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then two separate reads give the same echo
    const a = useEcho(state, today).value
    const b = useEcho(state, today).value
    expect(a).toEqual(b)
  })

  it('returns a valid echo for multiple candidates across different days', () => {
    // #given multiple eligible echoes
    const weeks: FzState['weeks'] = {
      10: { mark: '❤', whisper: 'a', markedAt: '2020-01-01T00:00:00.000Z' },
      20: { mark: '☀', whisper: 'b', markedAt: '2020-02-01T00:00:00.000Z' },
      30: { mark: 'w', whisper: 'c', markedAt: '2020-03-01T00:00:00.000Z' },
      40: { mark: '喜', whisper: 'd', markedAt: '2020-04-01T00:00:00.000Z' },
      50: { mark: '☆', whisper: 'e', markedAt: '2020-05-01T00:00:00.000Z' },
    }
    const state = ref<FzState | null>(stateWith(weeks, '1990-01-01'))
    const day1 = ref(new Date('2026-04-14T00:00:00.000Z'))
    const day2 = ref(new Date('2026-04-15T00:00:00.000Z'))
    // #then both days produce a valid echo (may or may not be the same)
    const a = useEcho(state, day1).value
    const b = useEcho(state, day2).value
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
  })
})
