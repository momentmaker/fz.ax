/**
 * A date of birth is "reasonable" when:
 *   - it is a non-empty string parseable by the Date constructor,
 *   - it represents a past instant (not in the future), and
 *   - its year is at least 1900.
 *
 * This is the guard at the user-input boundary. Anything that fails here
 * would poison the week math downstream (NaN, negative weeks, or a grid
 * position outside the visible 4000-week window).
 */
export function isReasonableDob(value: string): boolean {
  if (value === '') return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  if (d.getTime() > Date.now()) return false
  if (d.getUTCFullYear() < 1900) return false
  return true
}
