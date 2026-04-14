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
