import { ref, onBeforeUnmount, type Ref } from 'vue'
import { EASTER_QUOTES } from '../data/easter-quotes'

interface UseEasterEggReturn {
  active: Ref<boolean>
  quote: Ref<string | null>
}

/**
 * Listens for the "fz" key sequence globally. When detected, picks a
 * random hidden quote and exposes it via the reactive `active`/`quote`
 * refs for FzEasterEgg to render. The quote stays active for 4 seconds
 * then clears.
 *
 * Guards: the listener ignores keydowns while the active element is an
 * input or textarea (so typing `fz` in a whisper doesn't trigger it).
 * Cleans up on unmount.
 */
export function useEasterEgg(): UseEasterEggReturn {
  const active = ref(false)
  const quote = ref<string | null>(null)

  let lastKey = ''
  let lastKeyAt = 0
  let clearTimer: ReturnType<typeof setTimeout> | null = null

  function handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (target !== null) {
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
        // Reset the pending sequence so typing in an input interrupts a
        // half-formed `f`→`z` from firing after the user blurs the field.
        lastKey = ''
        lastKeyAt = 0
        return
      }
    }

    const key = event.key.toLowerCase()
    const now = Date.now()

    if (lastKey === 'f' && key === 'z' && now - lastKeyAt <= 500) {
      const pick = EASTER_QUOTES[Math.floor(Math.random() * EASTER_QUOTES.length)] ?? null
      quote.value = pick
      active.value = true
      if (clearTimer !== null) clearTimeout(clearTimer)
      clearTimer = setTimeout(() => {
        active.value = false
        quote.value = null
      }, 4000)
      lastKey = ''
      lastKeyAt = 0
      return
    }

    lastKey = key
    lastKeyAt = now
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown)
    }
    if (clearTimer !== null) {
      clearTimeout(clearTimer)
    }
  })

  return { active, quote }
}
