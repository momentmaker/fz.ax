import { ref, type Ref } from 'vue'

/**
 * Single source of truth for the current Date across components.
 *
 * Stage 5 introduced FzBanner and FzLongNow alongside FzPage, all of
 * which need to know "what time is it." If each component held its
 * own `ref(new Date())` at setup time, they would diverge: FzPage's
 * Monday-rollover timer would update FzPage's local ref, but
 * FzBanner's and FzLongNow's stay frozen at mount time. A user who
 * keeps the tab focused across midnight would see the year tick over
 * in FzPage's logic but not in the footer, and the banner would
 * never re-evaluate against a fresh date.
 *
 * The fix: lift `today` to a module-level singleton. FzPage's
 * existing Monday timer + visibilitychange handlers update the
 * singleton's value, and every consumer reads the same ref.
 *
 * No init() and no internal timer — the update sources live in
 * FzPage (the lifecycle owner), so this composable stays trivial.
 */
let _today: Ref<Date> | null = null

interface UseTodayReturn {
  today: Ref<Date>
}

export function useToday(): UseTodayReturn {
  if (_today === null) {
    _today = ref(new Date())
  }
  return { today: _today }
}

/**
 * Test-only reset of the module singleton.
 */
export function __resetUseTodayForTests(): void {
  _today = null
}
