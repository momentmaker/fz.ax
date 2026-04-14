import type { FzState } from '../types/state'
import { isValidFzState } from './storage'

/**
 * Export the entire state as a JSON string wrapped in a small envelope
 * so parseBackup can recognize it and reject unrelated JSON files.
 */
export function exportBackup(state: FzState, exportedAt: Date = new Date()): string {
  const wrapper = {
    fzAxBackup: true as const,
    exportedAt: exportedAt.toISOString(),
    state,
  }
  return JSON.stringify(wrapper, null, 2)
}

/**
 * Parse a backup JSON string and return the validated inner FzState, or
 * null on any failure (malformed JSON, missing wrapper, invalid inner
 * state). Null-return instead of throw — the UI calls this from a file-
 * picker handler and needs a quiet "nope" on invalid input.
 */
export function parseBackup(json: string): FzState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }
  const wrapper = parsed as Record<string, unknown>
  if (wrapper.fzAxBackup !== true) return null
  if (!isValidFzState(wrapper.state)) return null
  return wrapper.state
}

/**
 * Trigger a browser download of the backup JSON file. Uses Blob + object
 * URL + synthetic anchor click. No dependencies. Caller should pass the
 * current `today` for the filename date segment.
 */
export function downloadBackup(state: FzState, today: Date = new Date()): void {
  const json = exportBackup(state, today)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const dateStr = formatLocalDate(today)
  const a = document.createElement('a')
  a.href = url
  a.download = `fz-ax-backup-${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
