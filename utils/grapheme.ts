/**
 * Grapheme-cluster utilities for Mark validation.
 *
 * A "grapheme cluster" is what a user perceives as one character. It may be
 * composed of multiple Unicode code points (e.g., a family emoji with zero-
 * width joiners) or multiple UTF-16 code units (e.g., a surrogate pair).
 *
 * We need real grapheme counting because The Mark is "exactly one character"
 * per the spec, and JavaScript's `.length` counts UTF-16 code units, which
 * gives the wrong answer for anything outside the BMP or anything combined.
 *
 * `Intl.Segmenter` is available in all modern browsers (Chrome 87+,
 * Firefox 125+, Safari 14.1+, Node 16+). A pre-computed Segmenter is reused
 * across calls for performance.
 */

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * True if `value` is a non-empty string containing exactly one grapheme cluster.
 */
export function isSingleGrapheme(value: string): boolean {
  if (value === '') return false
  return graphemeCount(value) === 1
}

/**
 * Count the grapheme clusters in `value`. Returns 0 for the empty string.
 */
export function graphemeCount(value: string): number {
  if (value === '') return 0
  let count = 0
  for (const _ of segmenter.segment(value)) {
    count++
  }
  return count
}
