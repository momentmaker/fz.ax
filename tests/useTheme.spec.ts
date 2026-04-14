import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTheme, __resetUseThemeForTests } from '../composables/useTheme'
import { useFzState, __resetForTests as __resetUseFzStateForTests } from '../composables/useFzState'

describe('useTheme', () => {
  const origMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    __resetUseFzStateForTests()
    __resetUseThemeForTests()
    document.documentElement.removeAttribute('data-theme')
    document.body.className = ''
    // Default: system prefers light
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = origMatchMedia
    document.documentElement.removeAttribute('data-theme')
    document.body.className = ''
  })

  it('effectiveTheme is light when prefs.theme=auto and system prefers light', () => {
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('light')
  })

  it('effectiveTheme is dark when prefs.theme=dark (explicit override)', () => {
    const { setDob, setTheme } = useFzState()
    setDob('1990-05-15')
    setTheme('dark')
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('dark')
  })

  it('effectiveTheme is light when prefs.theme=light even if system prefers dark', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
    const { setDob, setTheme } = useFzState()
    setDob('1990-05-15')
    setTheme('light')
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('light')
  })

  it('effectiveTheme is dark when prefs.theme=auto and system prefers dark', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
    const t = useTheme()
    t.init()
    expect(t.effectiveTheme.value).toBe('dark')
  })

  it('init() is idempotent', () => {
    const addSpy = vi.fn()
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: addSpy,
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia
    const t = useTheme()
    t.init()
    t.init()
    expect(addSpy).toHaveBeenCalledTimes(1)
  })
})
