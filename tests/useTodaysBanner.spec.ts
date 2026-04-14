import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTodaysBanner } from '../composables/useTodaysBanner'
import type { FzState } from '../types/state'
import { DEFAULT_PREFS } from '../types/state'

function makeState(weeks: FzState['weeks'] = {}): FzState {
  return {
    version: 1,
    dob: '1990-05-15',
    weeks,
    vow: null,
    letters: [],
    anchors: [],
    prefs: DEFAULT_PREFS,
    meta: { createdAt: '2020-01-01T00:00:00.000Z' },
  }
}

describe('useTodaysBanner', () => {
  it('returns null when state is null', () => {
    const state = ref<FzState | null>(null)
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value).toBeNull()
  })

  it('returns null when no anniversaries and no eligible echo', () => {
    const state = ref<FzState | null>(makeState({}))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value).toBeNull()
  })

  it('returns echo when no anniversaries but eligible echo exists', () => {
    // a single past whispered mark, no week-of-year match
    // week 50 starts ~1992-11-17, week-of-year 47, different from today's week 16
    const state = ref<FzState | null>(makeState({
      50: { mark: '✨', whisper: 'arbitrary whisper', markedAt: '2020-06-01T00:00:00.000Z' },
    }))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value?.type).toBe('echo')
  })

  it('returns anniversary when anniversaries exist (precedence over echo)', () => {
    const dob = new Date(1990, 4, 15)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    let testWeekIdx = -1
    for (let i = 1700; i < 1900; i++) {
      const d = new Date(dob.getTime() + i * ONE_WEEK_MS)
      if (d.getFullYear() === 2025 && d.getMonth() === 3 && d.getDate() >= 13 && d.getDate() <= 19) {
        testWeekIdx = i
        break
      }
    }
    expect(testWeekIdx).toBeGreaterThan(0)
    const state = ref<FzState | null>(makeState({
      [testWeekIdx]: { mark: '⭐', whisper: 'anniversary year', markedAt: '2025-04-14T00:00:00.000Z' },
      // Also a different mark with a whisper that would satisfy the
      // echo path. Anniversary should still win.
      500: { mark: '✨', whisper: 'echo material', markedAt: '2020-06-01T00:00:00.000Z' },
    }))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value?.type).toBe('anniversary')
  })

  it('the banner is reactive — switches when state changes', () => {
    const state = ref<FzState | null>(makeState({}))
    const today = ref(new Date(2026, 3, 14))
    const banner = useTodaysBanner(state, today)
    expect(banner.value).toBeNull()
    state.value = makeState({
      50: { mark: '✨', whisper: 'now there is content', markedAt: '2020-06-01T00:00:00.000Z' },
    })
    expect(banner.value?.type).toBe('echo')
  })
})
