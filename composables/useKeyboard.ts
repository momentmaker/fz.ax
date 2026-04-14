/**
 * Single dispatch point for global keyboard shortcuts. Stage 5 binds
 * V (vow), Q (quiet), / (search), and Escape. The deterministic
 * input-active rule: shortcuts only fire when the active element is
 * NOT a form input or contenteditable, EXCEPT Escape, which always
 * fires (so the user can always close a modal from anywhere).
 *
 * Centralized to keep the input-active rule from drifting between
 * V, Q, /, and Escape — it lived in three components in an earlier
 * draft and predictably diverged. One file, one rule.
 */

type ShortcutKey =
  | 'v' | 'q' | '/' | 'escape'
  | 'enter' | 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright'
  | '?'
type Handler = (event: KeyboardEvent) => void

interface UseKeyboardReturn {
  init: () => void
  on: (key: ShortcutKey, handler: Handler) => void
  off: (key: ShortcutKey, handler: Handler) => void
  __isInputActive: () => boolean
}

let _module: UseKeyboardReturn | null = null
let _listenerInstalled = false
const _handlers: Record<ShortcutKey, Set<Handler>> = {
  v: new Set(),
  q: new Set(),
  '/': new Set(),
  escape: new Set(),
  enter: new Set(),
  arrowup: new Set(),
  arrowdown: new Set(),
  arrowleft: new Set(),
  arrowright: new Set(),
  '?': new Set(),
}

function isInputActive(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  if (el === null) return false
  if (el instanceof HTMLInputElement) return true
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLElement && el.isContentEditable) return true
  return false
}

function normalizeKey(rawKey: string): ShortcutKey | null {
  const lower = rawKey.toLowerCase()
  if (lower === 'v') return 'v'
  if (lower === 'q') return 'q'
  if (lower === '/') return '/'
  if (lower === 'escape') return 'escape'
  if (lower === 'enter') return 'enter'
  if (lower === 'arrowup') return 'arrowup'
  if (lower === 'arrowdown') return 'arrowdown'
  if (lower === 'arrowleft') return 'arrowleft'
  if (lower === 'arrowright') return 'arrowright'
  if (rawKey === '?') return '?'
  return null
}

function onKeyDown(event: KeyboardEvent): void {
  // Skip any key combo with a modifier — Ctrl+V / Cmd+V is paste,
  // Alt+V is a deadkey on some layouts, Ctrl+/ is the find shortcut
  // on some browsers. Without this guard, a user pasting whispers
  // from the clipboard would have the vow modal open on every paste.
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const key = normalizeKey(event.key)
  if (key === null) return
  // Escape always fires. V/Q// only fire when not in an input.
  if (key !== 'escape' && isInputActive()) return
  const set = _handlers[key]
  for (const handler of set) {
    handler(event)
  }
}

/**
 * The composable. Returns init/on/off plus a test-only inputActive
 * accessor. init() is idempotent — calling it more than once does
 * not double-bind the listener.
 */
export function useKeyboard(): UseKeyboardReturn {
  if (_module !== null) return _module
  _module = {
    init() {
      if (_listenerInstalled) return
      if (typeof window === 'undefined') return
      window.addEventListener('keydown', onKeyDown)
      _listenerInstalled = true
    },
    on(key, handler) {
      _handlers[key].add(handler)
    },
    off(key, handler) {
      _handlers[key].delete(handler)
    },
    __isInputActive: isInputActive,
  }
  return _module
}

/**
 * Test-only reset. Removes the global keydown listener, clears all
 * registered handlers, and rebuilds the singleton on the next call.
 */
export function __resetUseKeyboardForTests(): void {
  if (typeof window !== 'undefined' && _listenerInstalled) {
    window.removeEventListener('keydown', onKeyDown)
  }
  _listenerInstalled = false
  _handlers.v.clear()
  _handlers.q.clear()
  _handlers['/'].clear()
  _handlers.escape.clear()
  _handlers.enter.clear()
  _handlers.arrowup.clear()
  _handlers.arrowdown.clear()
  _handlers.arrowleft.clear()
  _handlers.arrowright.clear()
  _handlers['?'].clear()
  _module = null
}
