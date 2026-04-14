import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { supportsPush, computeInitialInstalled } from '../composables/usePwa'

describe('supportsPush', () => {
  // supportsPush is a static runtime feature-detection that can't be
  // usefully tested against happy-dom because happy-dom doesn't ship
  // Notification or ServiceWorker. What we CAN verify: it's a boolean.
  it('is a boolean', () => {
    expect(typeof supportsPush).toBe('boolean')
  })

  it('is false in the test environment (happy-dom has no ServiceWorker)', () => {
    // #given the happy-dom test environment has no real SW / notification APIs
    // #then supportsPush is false here
    // (In a real Chromium desktop, it would be true.)
    expect(supportsPush).toBe(false)
  })
})

describe('computeInitialInstalled', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    // Default: matchMedia returns not-matching
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('returns false when not in standalone display mode', () => {
    expect(computeInitialInstalled()).toBe(false)
  })

  it('returns true when matchMedia reports standalone', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    expect(computeInitialInstalled()).toBe(true)
  })

  it('returns false when matchMedia is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).matchMedia = undefined
    expect(computeInitialInstalled()).toBe(false)
  })
})
