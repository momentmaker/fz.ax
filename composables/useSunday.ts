import type { FzState } from '../types/state'

/**
 * Returns the local YYYY-MM-DD string for a date. Used to key the
 * Sunday-prompt-already-shown-today check in meta.lastSundayPrompt.
 */
export function sundayDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Should the Sunday Whisper modal open on this page mount?
 *
 * Yes when:
 *   1. state is not null
 *   2. today is Sunday (local time)
 *   3. local clock is 18:00 or later
 *   4. meta.lastSundayPrompt is not equal to today's local-date string
 *
 * No mid-session polling: this decision runs once on mount. If the user
 * loads the page at 17:59 and waits until 18:00, nothing auto-opens — they
 * see it on their next page load.
 */
export function shouldPromptToday(state: FzState | null, today: Date): boolean {
  if (state === null) return false
  if (today.getDay() !== 0) return false
  if (today.getHours() < 18) return false
  const todayStr = sundayDateString(today)
  if (state.meta.lastSundayPrompt === todayStr) return false
  return true
}
