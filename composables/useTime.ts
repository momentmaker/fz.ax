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
 * The week index of `today` relative to `dob`. Clamped at 0 if today is
 * before dob (defensive against future-DOB inputs).
 */
export function weekIndex(dob: Date, today: Date): number {
  const diff = today.getTime() - dob.getTime()
  if (diff < 0) return 0
  return Math.floor(diff / MS_PER_WEEK)
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
 * Number of weeks before the current one. Equal to the current week index.
 */
export function pastCount(dob: Date, today: Date): number {
  return weekIndex(dob, today)
}

/**
 * Number of weeks after the current one. Always non-negative.
 */
export function futureCount(dob: Date, today: Date): number {
  const idx = weekIndex(dob, today)
  return Math.max(0, totalWeeks - 1 - idx)
}
