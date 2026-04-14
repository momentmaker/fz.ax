import { describe, it, expect, beforeEach } from 'vitest'
import { useHighlight, __resetUseHighlightForTests } from '../composables/useHighlight'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function makeState(overrides: Partial<FzState> = {}): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks: {
      10: { mark: '❤', whisper: 'first kiss', markedAt: '2025-01-01T00:00:00.000Z' },
      20: { mark: '❤', whisper: 'wedding day', markedAt: '2025-02-01T00:00:00.000Z' },
      30: { mark: '☀', whisper: 'good day', markedAt: '2025-03-01T00:00:00.000Z' },
      40: { mark: '❤', markedAt: '2025-04-01T00:00:00.000Z' }, // no whisper
    },
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2025-01-01T00:00:00.000Z' },
    ...overrides,
  }
}

describe('useHighlight', () => {
  beforeEach(() => {
    __resetUseHighlightForTests()
  })

  it('starts in idle state with empty lit set', () => {
    const h = useHighlight()
    expect(h.state.value.type).toBe('idle')
    expect(h.lit.value.size).toBe(0)
    expect(h.isActive.value).toBe(false)
  })

  describe('setConstellation', () => {
    it('lights up all weeks with the same glyph', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      expect(h.state.value.type).toBe('constellation')
      expect(h.lit.value.has(10)).toBe(true)
      expect(h.lit.value.has(20)).toBe(true)
      expect(h.lit.value.has(40)).toBe(true)
      expect(h.lit.value.has(30)).toBe(false) // ☀, not ❤
    })

    it('isActive becomes true', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      expect(h.isActive.value).toBe(true)
    })

    it('does nothing when state is null', () => {
      const h = useHighlight()
      h.setConstellation(null, '❤', 10)
      expect(h.lit.value.size).toBe(0)
      expect(h.state.value.type).toBe('idle')
    })

    it('records the source week', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 20)
      if (h.state.value.type === 'constellation') {
        expect(h.state.value.sourceWeek).toBe(20)
        expect(h.state.value.glyph).toBe('❤')
      }
    })
  })

  describe('setSearch', () => {
    it('lights up weeks whose whisper contains the query (case-insensitive)', () => {
      const h = useHighlight()
      h.setSearch(makeState(), 'KISS')
      expect(h.state.value.type).toBe('search')
      expect(h.lit.value.has(10)).toBe(true) // 'first kiss'
      expect(h.lit.value.has(20)).toBe(false) // 'wedding day'
    })

    it('skips weeks without a whisper', () => {
      const h = useHighlight()
      h.setSearch(makeState(), '❤')
      // mark glyphs are not searched — only whispers
      expect(h.lit.value.size).toBe(0)
    })

    it('empty query returns to idle', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      h.setSearch(makeState(), '')
      expect(h.state.value.type).toBe('idle')
      expect(h.lit.value.size).toBe(0)
    })

    it('opening search clears constellation', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      expect(h.state.value.type).toBe('constellation')
      h.setSearch(makeState(), 'kiss')
      expect(h.state.value.type).toBe('search')
    })

    it('does nothing when state is null', () => {
      const h = useHighlight()
      h.setSearch(null, 'kiss')
      expect(h.lit.value.size).toBe(0)
      expect(h.state.value.type).toBe('idle')
    })
  })

  describe('clear', () => {
    it('returns to idle from constellation', () => {
      const h = useHighlight()
      h.setConstellation(makeState(), '❤', 10)
      h.clear()
      expect(h.state.value.type).toBe('idle')
      expect(h.lit.value.size).toBe(0)
    })

    it('returns to idle from search', () => {
      const h = useHighlight()
      h.setSearch(makeState(), 'kiss')
      h.clear()
      expect(h.state.value.type).toBe('idle')
      expect(h.lit.value.size).toBe(0)
    })
  })
})
