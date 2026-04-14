import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useKeyboard, __resetUseKeyboardForTests } from '../composables/useKeyboard'

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function pressKeyWith(key: string, modifiers: { ctrl?: boolean; meta?: boolean; alt?: boolean }): void {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    ctrlKey: modifiers.ctrl ?? false,
    metaKey: modifiers.meta ?? false,
    altKey: modifiers.alt ?? false,
  }))
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

  it('does NOT fire v handler on Ctrl+V (paste)', () => {
    // #given a registered v handler
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    // #when the user presses Ctrl+V to paste
    pressKeyWith('v', { ctrl: true })
    // #then the vow handler does NOT fire — paste is a paste
    expect(fn).not.toHaveBeenCalled()
  })

  it('does NOT fire v handler on Cmd+V (Mac paste)', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('v', fn)
    pressKeyWith('v', { meta: true })
    expect(fn).not.toHaveBeenCalled()
  })

  it('does NOT fire q handler on Ctrl+Q', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('q', fn)
    pressKeyWith('q', { ctrl: true })
    expect(fn).not.toHaveBeenCalled()
  })

  it('does NOT fire / handler on Ctrl+/ (browser find)', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('/', fn)
    pressKeyWith('/', { ctrl: true })
    expect(fn).not.toHaveBeenCalled()
  })

  it('fires enter handler when not in an input', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('enter', fn)
    pressKey('Enter')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fires arrowup handler when not in an input', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('arrowup', fn)
    pressKey('ArrowUp')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fires arrowdown, arrowleft, arrowright handlers', () => {
    const d = vi.fn(), l = vi.fn(), r = vi.fn()
    useKeyboard().init()
    useKeyboard().on('arrowdown', d)
    useKeyboard().on('arrowleft', l)
    useKeyboard().on('arrowright', r)
    pressKey('ArrowDown')
    pressKey('ArrowLeft')
    pressKey('ArrowRight')
    expect(d).toHaveBeenCalledOnce()
    expect(l).toHaveBeenCalledOnce()
    expect(r).toHaveBeenCalledOnce()
  })

  it('fires ? handler when not in an input', () => {
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('?', fn)
    pressKey('?')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('does NOT fire arrow handlers when an input has focus', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('arrowup', fn)
    pressKey('ArrowUp')
    expect(fn).not.toHaveBeenCalled()
  })

  it('does NOT fire enter handler when a textarea has focus', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    const fn = vi.fn()
    useKeyboard().init()
    useKeyboard().on('enter', fn)
    pressKey('Enter')
    expect(fn).not.toHaveBeenCalled()
  })
})
