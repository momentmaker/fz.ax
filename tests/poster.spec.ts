import { describe, it, expect } from 'vitest'
import { generatePoster } from '../utils/poster'
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

describe('generatePoster', () => {
  it('returns a string that starts with an SVG element', () => {
    // #given an empty state
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then it's an SVG document
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('declares an A2 viewBox in mm', () => {
    // #given any state
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then viewBox matches A2 (420 × 594 mm)
    expect(svg).toMatch(/viewBox="0 0 420 594"/)
  })

  it('includes the title text', () => {
    // #given any state
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then the title is in the SVG
    expect(svg).toContain('four-thousand weekz')
  })

  it('renders a <text> for each mark', () => {
    // #given a state with 3 marks
    const state = stateWith({
      10: { mark: '❤', markedAt: '2020-01-01T00:00:00.000Z' },
      20: { mark: '☀', markedAt: '2020-02-01T00:00:00.000Z' },
      30: { mark: 'w', markedAt: '2020-03-01T00:00:00.000Z' },
    })
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then each mark glyph appears in the SVG
    expect(svg).toContain('❤')
    expect(svg).toContain('☀')
    expect(svg).toContain('w</text>')
  })

  it('contains the export date in the footer', () => {
    // #given a known export date
    const state = stateWith({})
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then the year is in the footer somewhere
    expect(svg).toContain('2026')
  })

  it('renders exactly 4003 positioned text elements (1 title + 4000 weeks + 2 footer)', () => {
    // #given an empty state
    const state = stateWith({})
    // #when we generate
    const svg = generatePoster(state, new Date('2026-04-14T00:00:00.000Z'))
    // #then the count of positioned <text x=... elements is stable
    // — regression guard against future layout changes dropping cells
    const count = (svg.match(/<text x="/g) ?? []).length
    expect(count).toBe(4003)
  })

  it('renders an anchor ring for each anchored week', () => {
    // #given a state with a single anchored week
    const state: FzState = {
      version: 1,
      dob: '1990-05-15',
      weeks: { 100: { mark: '⭐', markedAt: '2025-01-01T00:00:00.000Z' } },
      vow: null,
      letters: [],
      anchors: [100],
      prefs: DEFAULT_PREFS,
      meta: { createdAt: '2020-01-01T00:00:00.000Z' },
    }
    // #when we generate the poster SVG
    const svg = generatePoster(state, new Date(2026, 3, 14))
    // #then it includes a rect with the anchor red stroke
    expect(svg).toContain('stroke="#ff3b30"')
  })

  it('does not render anchor rings when there are no anchors', () => {
    // #given a state with marks but no anchors
    const state = stateWith({
      100: { mark: '⭐', markedAt: '2025-01-01T00:00:00.000Z' },
    })
    const svg = generatePoster(state, new Date(2026, 3, 14))
    expect(svg).not.toContain('stroke="#ff3b30"')
  })
})
