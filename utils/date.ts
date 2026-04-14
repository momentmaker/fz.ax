/**
 * Local-timezone date helpers.
 *
 * Stage 3 introduced the need to key state by "what day is it for this user
 * right now" — meta.lastSundayPrompt, meta.lastEcho, and filenames all want
 * the YYYY-MM-DD for the user's local day. This helper is the single source
 * of truth so every consumer produces the same string for the same instant.
 */

/**
 * Return the local-time YYYY-MM-DD string for a date.
 */
export function localDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Return the next Sunday at 21:00 local time, strictly in the future
 * relative to `from`. If `from` is already a Sunday BEFORE 21:00, the
 * same-day 21:00 counts. If `from` is Sunday at 21:00 exactly or later,
 * the result rolls to the following Sunday.
 *
 * Used by usePwa to schedule the weekly Sunday Whisper notification.
 */
export function nextSundayAt21(from: Date): Date {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 21, 0, 0, 0)
  const day = result.getDay() // 0 = Sunday
  if (day !== 0) {
    // Advance to this week's Sunday (could be 1-6 days forward).
    result.setDate(result.getDate() + (7 - day))
  }
  else if (from.getTime() >= result.getTime()) {
    // Today is Sunday but we're already at or past 21:00 — roll to next Sunday.
    result.setDate(result.getDate() + 7)
  }
  return result
}
