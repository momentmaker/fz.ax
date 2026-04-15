import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useFzState } from './useFzState'

/**
 * F3.4 Dark Mode singleton. Reads prefs.theme from useFzState
 * and listens to prefers-color-scheme. Computes effectiveTheme
 * and applies data-theme attribute on <html>.
 *
 * Solstice mode is orthogonal: solstice CSS in main.css uses
 * its own hardcoded palette (#1a1a2e bg, #f7f7f0 text) with
 * higher specificity than [data-theme="dark"], so solstice
 * naturally wins whenever body.solstice-* is active. We also
 * remove the data-theme attribute entirely when solstice is
 * active, as a belt-and-suspenders measure.
 */

interface UseThemeReturn {
  effectiveTheme: ComputedRef<'light' | 'dark'>
  setTheme: (theme: 'auto' | 'light' | 'dark') => void
  init: () => void
}

let _module: UseThemeReturn | null = null
let _systemPrefersDark: Ref<boolean> | null = null
let _mediaQuery: MediaQueryList | null = null
let _mediaListener: ((e: MediaQueryListEvent) => void) | null = null
let _watcherInstalled = false

function onSystemPreferenceChange(event: MediaQueryListEvent): void {
  if (_systemPrefersDark !== null) {
    _systemPrefersDark.value = event.matches
  }
}

export function useTheme(): UseThemeReturn {
  if (_module !== null) return _module

  if (_systemPrefersDark === null) {
    _systemPrefersDark = ref(false)
  }

  const fzState = useFzState()

  const effectiveTheme = computed<'light' | 'dark'>(() => {
    const pref = fzState.state.value?.prefs.theme ?? 'auto'
    if (pref === 'dark') return 'dark'
    if (pref === 'light') return 'light'
    return _systemPrefersDark!.value ? 'dark' : 'light'
  })

  function setTheme(theme: 'auto' | 'light' | 'dark'): void {
    try {
      fzState.setTheme(theme)
    }
    catch {
      // throw-and-close: writeState failure is recoverable on next try
    }
  }

  function init(): void {
    if (typeof window === 'undefined') return
    if (_mediaQuery === null) {
      _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (_systemPrefersDark !== null) {
        _systemPrefersDark.value = _mediaQuery.matches
      }
      _mediaListener = onSystemPreferenceChange
      _mediaQuery.addEventListener('change', _mediaListener)
    }
    if (!_watcherInstalled) {
      watch(
        effectiveTheme,
        (next) => {
          if (typeof document === 'undefined') return
          // Always set data-theme. Solstice mode has its own CSS
          // palette in main.css (body.solstice-* selectors) which
          // wins on the properties it overrides via specificity.
          // An earlier version removed data-theme during solstice
          // as belt-and-suspenders, but that introduced a bug: if
          // solstice ends mid-session, the solstice watcher removes
          // the body class but useTheme's watcher doesn't re-fire
          // (no reactive dep changed), so data-theme would stay
          // removed and the user's dark preference would be lost.
          // Always setting data-theme is the correct invariant.
          document.documentElement.setAttribute('data-theme', next)
        },
        { immediate: true },
      )
      _watcherInstalled = true
    }
  }

  _module = { effectiveTheme, setTheme, init }
  return _module
}

/**
 * Test-only reset of the module singleton. Detaches the
 * matchMedia listener and rebuilds the module on the next call.
 */
export function __resetUseThemeForTests(): void {
  if (_mediaQuery !== null && _mediaListener !== null) {
    _mediaQuery.removeEventListener('change', _mediaListener)
  }
  _mediaQuery = null
  _mediaListener = null
  _systemPrefersDark = null
  _watcherInstalled = false
  _module = null
}
