import { totalWeeks } from '../composables/useTime'

const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7

/**
 * F3.2 Birthday Hexagon: compute the set of week indices that
 * contain each year's birthday, for years 0 through 76. Returns
 * a Set for O(1) lookup during grid render.
 *
 * Feb 29 handling: JS Date auto-rolls Feb 29 to Mar 1 in non-leap
 * years. We use new Date(year, month, day) which performs this
 * rollover automatically.
 *
 * Week indices outside [0, totalWeeks) are filtered out — for
 * users with very old DOBs, later birthday weeks may exceed the
 * grid window.
 */
export function birthdayWeeksOfLife(dob: Date): Set<number> {
  const result = new Set<number>()
  for (let year = 0; year <= 76; year++) {
    const birthday = new Date(
      dob.getFullYear() + year,
      dob.getMonth(),
      dob.getDate(),
    )
    const ms = birthday.getTime() - dob.getTime()
    if (ms < 0) continue
    const weekIndex = Math.floor(ms / MS_PER_WEEK)
    if (weekIndex >= 0 && weekIndex < totalWeeks) {
      result.add(weekIndex)
    }
  }
  return result
}
