import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { usePalette } from '../composables/usePalette'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function stateWith(weeks: FzState['weeks']): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
  }
}

describe('usePalette', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty for null state', () => {
    // #given no state
    const state = ref<FzState | null>(null)
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the palette is empty
    expect(usePalette(state, today).value).toEqual([])
  })

  it('returns empty when weeks is empty', () => {
    // #given a state with no marks
    const state = ref<FzState | null>(stateWith({}))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the palette is empty
    expect(usePalette(state, today).value).toEqual([])
  })

  it('returns a single glyph when only one mark exists', () => {
    // #given one marked week
    const state = ref<FzState | null>(stateWith({
      100: { mark: '❤', markedAt: '2026-04-01T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the palette is just that glyph
    expect(usePalette(state, today).value).toEqual(['❤'])
  })

  it('ranks recent marks ahead of older ones', () => {
    // #given an old "w" mark and a recent "❤" mark
    const state = ref<FzState | null>(stateWith({
      10: { mark: 'w', markedAt: '2020-01-01T00:00:00.000Z' },
      200: { mark: '❤', markedAt: '2026-04-10T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the recent one comes first
    expect(usePalette(state, today).value).toEqual(['❤', 'w'])
  })

  it('sums scores for repeated glyphs', () => {
    // #given one "❤" mark and three "w" marks
    const state = ref<FzState | null>(stateWith({
      10: { mark: '❤', markedAt: '2026-04-01T00:00:00.000Z' },
      20: { mark: 'w', markedAt: '2026-04-02T00:00:00.000Z' },
      30: { mark: 'w', markedAt: '2026-04-03T00:00:00.000Z' },
      40: { mark: 'w', markedAt: '2026-04-04T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then "w" has a higher total score despite the individual "❤" being close in recency
    expect(usePalette(state, today).value[0]).toBe('w')
  })

  it('limits the palette to 8 entries by default', () => {
    // #given 10 distinct glyphs marked on different weeks
    const weeks: FzState['weeks'] = {}
    const glyphs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    glyphs.forEach((g, i) => {
      weeks[i * 10] = { mark: g, markedAt: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` }
    })
    const state = ref<FzState | null>(stateWith(weeks))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then only 8 come back
    expect(usePalette(state, today).value.length).toBe(8)
  })

  it('respects a custom limit', () => {
    // #given 5 marks
    const weeks: FzState['weeks'] = {
      1: { mark: 'a', markedAt: '2026-04-01T00:00:00.000Z' },
      2: { mark: 'b', markedAt: '2026-04-02T00:00:00.000Z' },
      3: { mark: 'c', markedAt: '2026-04-03T00:00:00.000Z' },
      4: { mark: 'd', markedAt: '2026-04-04T00:00:00.000Z' },
      5: { mark: 'e', markedAt: '2026-04-05T00:00:00.000Z' },
    }
    const state = ref<FzState | null>(stateWith(weeks))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    // #then the limit parameter caps the list
    expect(usePalette(state, today, 3).value.length).toBe(3)
  })

  it('is reactive to state changes', () => {
    // #given a state with one mark
    const state = ref<FzState | null>(stateWith({
      1: { mark: 'a', markedAt: '2026-04-01T00:00:00.000Z' },
    }))
    const today = ref(new Date('2026-04-14T00:00:00.000Z'))
    const palette = usePalette(state, today)
    expect(palette.value).toEqual(['a'])
    // #when we update state with a new mark
    state.value = stateWith({
      1: { mark: 'a', markedAt: '2026-04-01T00:00:00.000Z' },
      2: { mark: 'b', markedAt: '2026-04-13T00:00:00.000Z' },
    })
    // #then the palette updates reactively
    expect(palette.value).toEqual(['b', 'a'])
  })
})
