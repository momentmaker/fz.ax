import { describe, it, expect } from 'vitest'
import { isSingleGrapheme, graphemeCount } from '../utils/grapheme'

describe('isSingleGrapheme', () => {
  it('rejects the empty string', () => {
    // #given an empty input
    // #then it is not a single grapheme
    expect(isSingleGrapheme('')).toBe(false)
  })

  it('accepts a simple ASCII character', () => {
    // #given one letter
    // #then it is one grapheme
    expect(isSingleGrapheme('a')).toBe(true)
  })

  it('rejects two ASCII characters', () => {
    // #given two letters
    // #then it is not a single grapheme
    expect(isSingleGrapheme('ab')).toBe(false)
  })

  it('accepts a single emoji', () => {
    // #given a BMP emoji
    // #then it is one grapheme
    expect(isSingleGrapheme('❤')).toBe(true)
  })

  it('accepts a family emoji (ZWJ sequence of 4 code points)', () => {
    // #given a multi-person emoji that is 8 UTF-16 code units but 1 user-perceived char
    // #then it is still one grapheme
    expect(isSingleGrapheme('👨‍👩‍👧')).toBe(true)
  })

  it('rejects two emoji', () => {
    // #given two hearts
    // #then it is not a single grapheme
    expect(isSingleGrapheme('❤❤')).toBe(false)
  })

  it('accepts a CJK character', () => {
    // #given a kanji
    // #then it is one grapheme
    expect(isSingleGrapheme('喜')).toBe(true)
  })

  it('accepts a combining character sequence', () => {
    // #given "a" + combining diaeresis → "ä" (2 code units, 1 grapheme)
    // #then it is still one grapheme
    expect(isSingleGrapheme('a\u0308')).toBe(true)
  })
})

describe('graphemeCount', () => {
  it('returns 0 for empty string', () => {
    expect(graphemeCount('')).toBe(0)
  })

  it('returns 1 for a simple char', () => {
    expect(graphemeCount('a')).toBe(1)
  })

  it('returns the correct count for a mix', () => {
    expect(graphemeCount('a❤喜')).toBe(3)
  })

  it('counts a ZWJ sequence as one', () => {
    expect(graphemeCount('👨‍👩‍👧')).toBe(1)
  })
})
