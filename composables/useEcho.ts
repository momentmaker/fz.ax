import { computed, type ComputedRef, type Ref } from 'vue'
import type { FzState } from '../types/state'
import { hashString } from '../utils/hash'
import { localDateString } from '../utils/date'
import { weekIndex } from './useTime'

export interface EchoEntry {
  weekIndex: number
  mark: string
  whisper: string
  markedAt: string
}

/**
 * The Echo — picks one past marked-and-whispered week deterministically
 * per day. Same day = same Echo. Different day = possibly different.
 *
 * Filter: week must be marked AND have a whisper AND be in the past
 * (strictly < current week index).
 *
 * Returns null when state is null OR no eligible entries exist.
 */
export function useEcho(
  state: Ref<FzState | null>,
  today: Ref<Date>,
): ComputedRef<EchoEntry | null> {
  return computed(() => {
    const s = state.value
    if (s === null) return null

    const dob = new Date(s.dob)
    if (Number.isNaN(dob.getTime())) return null
    const currentWeek = weekIndex(dob, today.value)

    const eligible: EchoEntry[] = []
    for (const [keyStr, entry] of Object.entries(s.weeks)) {
      const idx = Number(keyStr)
      if (!Number.isInteger(idx)) continue
      if (idx >= currentWeek) continue
      if (entry.whisper === undefined || entry.whisper === '') continue
      eligible.push({
        weekIndex: idx,
        mark: entry.mark,
        whisper: entry.whisper,
        markedAt: entry.markedAt,
      })
    }

    if (eligible.length === 0) return null

    // Deterministic pick seeded by today's local-date string.
    const todayKey = localDateString(today.value)
    const seed = hashString(todayKey)
    const pick = eligible[seed % eligible.length]
    return pick ?? null
  })
}
