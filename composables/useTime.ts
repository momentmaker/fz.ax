/**
 * Pure, Vue-independent time math for fz.ax.
 *
 * The grid uses elapsed-days/7 indexing — same as the original app.vue —
 * so existing users see no visual change after migration. Stage 5+ adds
 * ISO 8601 week-of-year math separately for the anniversary and library
 * features; that math lives here too.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24
const MS_PER_WEEK = MS_PER_DAY * 7

/**
 * The total number of weeks fz.ax visualizes — the namesake.
 */
export const totalWeeks = 4000

/**
 * The raw elapsed-week count between `dob` and `today`. Clamped at 0 if
 * today is before dob (defensive against future-DOB inputs). NOT clamped
 * at an upper bound — a caller that needs a grid-displayable index should
 * use `currentGridIndex` instead.
 */
export function weekIndex(dob: Date, today: Date): number {
  const diff = today.getTime() - dob.getTime()
  if (diff < 0) return 0
  return Math.floor(diff / MS_PER_WEEK)
}

/**
 * The week index to use for grid display. Identical to `weekIndex` for
 * users inside the 4000-week window; clamped at `totalWeeks - 1` for any
 * user whose raw elapsed count has overflowed the grid (>77 years old).
 * This is what FzGrid scrolls to and what pastCount reports.
 */
export function currentGridIndex(dob: Date, today: Date): number {
  return Math.min(weekIndex(dob, today), totalWeeks - 1)
}

/**
 * The start (inclusive) and end (inclusive) dates of week `index` relative
 * to `dob`. End is 6 days after start.
 */
export function weekRange(dob: Date, index: number): { start: Date; end: Date } {
  const start = new Date(dob.getTime() + index * MS_PER_WEEK)
  const end = new Date(start.getTime() + 6 * MS_PER_DAY)
  return { start, end }
}

/**
 * True if the given index is the same as the current week index for today.
 */
export function isCurrentWeek(dob: Date, today: Date, index: number): boolean {
  return weekIndex(dob, today) === index
}

/**
 * Number of weeks before the current one, as shown in the grid. Clamped at
 * `totalWeeks - 1` so a user whose raw elapsed count exceeds the grid
 * still sees a count consistent with what the grid can render.
 */
export function pastCount(dob: Date, today: Date): number {
  return currentGridIndex(dob, today)
}

/**
 * Number of weeks after the current one. Always non-negative, always
 * consistent with `pastCount` (past + 1 + future = totalWeeks).
 */
export function futureCount(dob: Date, today: Date): number {
  const idx = currentGridIndex(dob, today)
  return Math.max(0, totalWeeks - 1 - idx)
}

/**
 * ISO 8601 week-of-year (1-53). Weeks start on Monday. Week 1 is the week
 * containing the first Thursday of the year (equivalently, the week that
 * includes January 4). Used by useQuotes to rotate the Library quote
 * weekly and deterministically.
 *
 * Reference: https://en.wikipedia.org/wiki/ISO_week_date
 */
export function weekOfYear(date: Date): number {
  // Copy the date to avoid mutating the caller's.
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Thursday in current week decides the year.
  const dayNum = (target.getUTCDay() + 6) % 7 // Mon = 0, Sun = 6
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const diff = (target.getTime() - firstThursday.getTime()) / (1000 * 60 * 60 * 24)
  return 1 + Math.round(diff / 7)
}
