/**
 * Single root key in localStorage: 'fz.ax.state'
 *
 * The shape lifted from the spec at:
 * docs/superpowers/specs/2026-04-13-fz-ax-living-practice-design.md
 *
 * version is intentionally a numeric literal so future migrations
 * can use exhaustive switching to evolve the schema.
 */
export interface FzState {
  version: 1
  dob: string                               // ISO date YYYY-MM-DD
  weeks: Record<number, WeekEntry>          // sparse: only marked weeks present
  vow: VowEntry | null
  letters: LetterEntry[]
  anchors: number[]                         // sorted week indices
  prefs: Preferences
  meta: Meta
}

export interface WeekEntry {
  mark: string                              // single Unicode codepoint (one grapheme cluster)
  whisper?: string                          // free text, soft-capped at ~240 chars
  markedAt: string                          // ISO timestamp of last edit
}

export interface VowEntry {
  text: string
  writtenAt: string                         // ISO timestamp
}

export interface LetterEntry {
  text: string
  sealedAt: string                          // ISO timestamp when written
  unsealAt: string                          // ISO date YYYY-MM-DD when readable
  read: boolean
}

export interface Preferences {
  theme: 'auto' | 'light' | 'dark'
  pushOptIn: boolean
  reducedMotion: boolean | 'auto'
  weekStart: 'mon' | 'sun'
}

export interface Meta {
  createdAt: string                         // first-run timestamp
  lastSundayPrompt?: string                 // ISO date of last Sunday modal
  lastEcho?: string                         // ISO date of last shown Echo (max one per day)
  lastVisitedWeek?: number                  // last week index seen — drives "a week passed" notice
  installedPwa?: boolean
}

/**
 * Default preferences for a brand-new state.
 */
export const DEFAULT_PREFS: Preferences = {
  theme: 'auto',
  pushOptIn: false,
  reducedMotion: 'auto',
  weekStart: 'mon',
}

/**
 * The localStorage root key. All state lives here.
 */
export const STORAGE_KEY = 'fz.ax.state'

/**
 * The legacy v0 storage key. Used by the migration helper only.
 */
export const LEGACY_DOB_KEY = 'dob'
