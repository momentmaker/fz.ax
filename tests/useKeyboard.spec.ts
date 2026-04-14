import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useKeyboard, __resetUseKeyboardForTests } from '../composables/useKeyboard'

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useKeyboard', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetUseKeyboardForTests()
  })

  afterEach(() => {
    // Clean up any input-active state
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      document.activeElement.blur()
    }
    // Remove any input we may have appended
    document.querySelectorAll('input,textarea').forEach((el) => el.remove())
  })

  it('fires v handler when not in an input', () => {
    // #given a registered v handler
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    // #when v is pressed
    pressKey('v')
    // #then it fires
    expect(fn).toHaveBeenCalledOnce()
  })

  it('does NOT fire v handler when an input has focus', () => {
    // #given an active input
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    // #when v is pressed
    pressKey('v')
    // #then nothing fires (the input gets the v naturally)
    expect(fn).not.toHaveBeenCalled()
  })

  it('does NOT fire q handler when a textarea has focus', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('q', fn)
    pressKey('q')
    expect(fn).not.toHaveBeenCalled()
  })

  it('Escape ALWAYS fires, even from inside an input', () => {
    // #given an active input AND a registered escape handler
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('escape', fn)
    // #when Escape is pressed
    pressKey('Escape')
    // #then it fires — escape is the universal close key
    expect(fn).toHaveBeenCalledOnce()
  })

  it('case-insensitive on letter keys', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    pressKey('V') // uppercase
    expect(fn).toHaveBeenCalledOnce()
  })

  it('init() is idempotent (calling twice does not double-bind)', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    pressKey('v')
    expect(fn).toHaveBeenCalledOnce()
  })
})
