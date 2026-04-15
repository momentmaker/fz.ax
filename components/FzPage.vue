<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useFzState } from '../composables/useFzState'
import { usePwa } from '../composables/usePwa'
import { useKeyboard } from '../composables/useKeyboard'
import { useHighlight } from '../composables/useHighlight'
import { useToday } from '../composables/useToday'
import { useTheme } from '../composables/useTheme'
import { shouldPromptToday } from '../composables/useSunday'
import { weekIndex, totalWeeks } from '../composables/useTime'
import { currentSolsticeOrEquinox, getSolsticeLabel, type SolsticeKind } from '../utils/solstice'

const { state, setLastVisitedWeek } = useFzState()
const { register: registerPwa } = usePwa()
const keyboard = useKeyboard()
const highlight = useHighlight()
const { today } = useToday()
const theme = useTheme()
const showModal = ref(false)
const gridRef = ref<{ scrollToCurrent: () => void } | null>(null)

const markPopoverOpen = ref(false)
const markPopoverWeek = ref<number | null>(null)

const sundayModalOpen = ref(false)
const vowModalOpen = ref(false)
const searchOpen = ref(false)
const quietMode = ref(false)
const weeksPassedGap = ref<number | null>(null)
const keyboardHelpOpen = ref(false)
const cursorIndex = ref(0)
const cursorVisible = ref(false)
const GRID_COLS = 21

const solsticeKind = computed<SolsticeKind | null>(() => currentSolsticeOrEquinox(today.value))
const solsticeLabel = computed(() => {
  if (solsticeKind.value === null) return ''
  return getSolsticeLabel(solsticeKind.value, today.value.getFullYear())
})

let mondayTimer: ReturnType<typeof setTimeout> | null = null

const containerClasses = computed(() => ({
  // Any modal disables grid pointer-events so the user can't click a
  // second hexagon while another modal is open.
  'modal-open': showModal.value || markPopoverOpen.value || sundayModalOpen.value || vowModalOpen.value,
  'fz-quiet': quietMode.value,
}))

function openModal(): void {
  showModal.value = true
}

function closeModal(): void {
  showModal.value = false
}

function scrollToCurrent(): void {
  void gridRef.value?.scrollToCurrent()
}

function onSaved(): void {
  scrollToCurrent()
}

function openMarkPopover(week: number): void {
  // First-run escape: if the user dismissed FzDobModal without saving and
  // then clicked a hexagon, there's no state to mutate. Re-open the dob
  // modal instead of trying to open the mark popover — setMark would
  // throw "no state loaded" and freeze the UI silently.
  if (state.value === null) {
    showModal.value = true
    return
  }
  // Stage 6: cursor follows clicks (even if cursorVisible is false,
  // update position so the next arrow press starts from here).
  cursorIndex.value = week
  markPopoverWeek.value = week
  markPopoverOpen.value = true
}

function closeMarkPopover(): void {
  markPopoverOpen.value = false
  // Leave week set briefly so the closing transition can still render; null out next tick.
  void nextTick(() => {
    markPopoverWeek.value = null
  })
}

function closeSundayModal(): void {
  sundayModalOpen.value = false
}

function openVowModal(): void {
  vowModalOpen.value = true
}

function closeVowModal(): void {
  vowModalOpen.value = false
}

function openSearch(): void {
  // Opening search clears any active constellation
  highlight.clear()
  searchOpen.value = true
}

function closeSearch(): void {
  searchOpen.value = false
  highlight.clear()
}

function toggleQuietMode(): void {
  quietMode.value = !quietMode.value
}

function openKeyboardHelp(): void {
  keyboardHelpOpen.value = true
}

function closeKeyboardHelp(): void {
  keyboardHelpOpen.value = false
}

function ensureCursorVisible(): void {
  if (!cursorVisible.value) {
    cursorVisible.value = true
    if (state.value !== null) {
      const dob = new Date(state.value.dob)
      cursorIndex.value = weekIndex(dob, today.value)
    }
  }
}

function moveCursor(delta: number): void {
  ensureCursorVisible()
  const next = Math.max(0, Math.min(totalWeeks - 1, cursorIndex.value + delta))
  cursorIndex.value = next
}

function onArrowUp(): void { moveCursor(-GRID_COLS) }
function onArrowDown(): void { moveCursor(GRID_COLS) }
function onArrowLeft(): void { moveCursor(-1) }
function onArrowRight(): void { moveCursor(1) }

function onEnter(): void {
  if (state.value === null) return
  if (!cursorVisible.value) return
  openMarkPopover(cursorIndex.value)
}

function onQuestion(): void {
  if (keyboardHelpOpen.value) {
    closeKeyboardHelp()
  }
  else {
    openKeyboardHelp()
  }
}

function onEscape(): void {
  // Cascade: close the highest-priority overlay first.
  if (keyboardHelpOpen.value) {
    closeKeyboardHelp()
    return
  }
  if (searchOpen.value) {
    closeSearch()
    return
  }
  if (showModal.value) {
    closeModal()
    return
  }
  if (vowModalOpen.value) {
    closeVowModal()
    return
  }
  if (markPopoverOpen.value) {
    closeMarkPopover()
    return
  }
  if (highlight.isActive.value) {
    highlight.clear()
    return
  }
  if (cursorVisible.value) {
    cursorVisible.value = false
    return
  }
  if (quietMode.value) {
    quietMode.value = false
  }
}

function msUntilNextMonday(from: Date): number {
  // 0 = Sunday, 1 = Monday, ...
  const day = from.getDay()
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7
  const target = new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysUntilMonday, 0, 0, 0, 0)
  return target.getTime() - from.getTime()
}

function scheduleNextMondayTransition(): void {
  if (mondayTimer !== null) clearTimeout(mondayTimer)
  const wait = msUntilNextMonday(new Date())
  mondayTimer = setTimeout(() => {
    // Defensive: when the timer fires, refresh today regardless and
    // re-schedule. If the timer fires "early" for any reason (DST
    // edge, system clock adjustment, suspended timer fired late),
    // the next scheduleNextMondayTransition call recomputes the wait
    // from the current real time, so we self-correct on the next loop.
    today.value = new Date()
    scheduleNextMondayTransition()
  }, wait)
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    today.value = new Date()
    scheduleNextMondayTransition()
  }
}

function onBodyClick(event: MouseEvent): void {
  // Click outside any hexagon clears the highlight when active.
  if (!highlight.isActive.value) return
  const target = event.target as HTMLElement | null
  if (target === null) return
  if (target.closest('.hexagon')) return
  if (target.closest('.vow-overlay')) return
  if (target.closest('.search-bar')) return
  if (target.closest('.modal-content')) return
  highlight.clear()
}

// Extracted from the inline arrow so we can pass the same reference
// to keyboard.off() in onBeforeUnmount. Prevents handler accumulation
// across HMR / component remounts (the useKeyboard singleton survives
// across Vue component lifecycles).
function onSlashKey(event: KeyboardEvent): void {
  event.preventDefault()
  openSearch()
}

const ASCII_HEXAGON = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣶⣤⡀⠀⠀⠀⠀⣀⣤⣶⣿⣿⣿⣷⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⢿⣿⣿⣿⣿⣿⣿⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢿⣿⠿⠛⠉⠀⠀⣀⣀⠀⠀⠉⠛⠿⣿⡿⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣀⣴⣤⡀⠀⠀⠀⠀⠀⠀⢀⣠⣴⡾⠟⠻⢷⣦⣄⠀⠀⠀⠀⠀⠀⠀⢀⣤⣦⣀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⣠⣶⣿⣿⣿⣿⣿⣷⣦⡄⠀⠀⣶⡿⠛⠉⠀⠀⠀⠀⠉⠛⢿⣶⠀⠀⢠⣴⣾⣿⣿⣿⣿⣿⣶⣄⠀⠀⠀
⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀
⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀
⠀⠀⠀⠻⢿⣿⣿⣿⣿⣿⣿⠿⠃⠀⠀⢿⣧⣄⡀⠀⠀⠀⠀⢀⣠⣼⡿⠀⠀⠘⠿⣿⣿⣿⣿⣿⣿⡿⠟⠀⠀⠀
⠀⠀⠀⠀⠀⠈⠛⠿⠟⠋⠀⠀⠀⠀⠀⠀⠉⠛⠿⣶⣤⣤⣶⠿⠛⠉⠀⠀⠀⠀⠀⠀⠙⠻⠿⠋⠁⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣶⣷⣦⣄⠀⠀⠈⠙⠋⠁⠀⢀⣠⣴⣾⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣾⣿⣿⣿⣿⣿⣿⣿⣶⠀⠀⠀⠀⣶⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠿⣿⣿⣿⣿⡿⠟⠋⠀⠀⠀⠀⠙⠻⢿⣿⣿⣿⣿⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
`

onMounted(() => {
  // Stage 6: FzFirstRun replaces the auto-open of FzDobModal
  // for brand-new users (state.value === null). FzDobModal is
  // still rendered when the user explicitly opens it (e.g., by
  // clicking the title to edit DOB later).
  // Idempotent append — a window flag prevents HMR duplicates in dev.
  const w = window as Window & { __fzEggAdded?: boolean }
  if (w.__fzEggAdded !== true) {
    document.body.appendChild(document.createComment(ASCII_HEXAGON))
    w.__fzEggAdded = true
  }
  // Stage 3 F1.1: open the Sunday Whisper modal if today is Sunday
  // evening and we haven't already prompted for today.
  if (shouldPromptToday(state.value, new Date())) {
    sundayModalOpen.value = true
  }
  // Stage 4 F1.6: register the service worker so future visits are
  // installable and offline-capable. This also handles push
  // re-scheduling if the user previously opted in (usePwa's register
  // reads prefs.pushOptIn and calls scheduleSundayPush on success).
  void registerPwa()

  // Stage 5: mount keyboard listener and bind shortcuts
  keyboard.init()
  keyboard.on('v', openVowModal)
  keyboard.on('q', toggleQuietMode)
  keyboard.on('/', onSlashKey)
  keyboard.on('escape', onEscape)
  keyboard.on('enter', onEnter)
  keyboard.on('arrowup', onArrowUp)
  keyboard.on('arrowdown', onArrowDown)
  keyboard.on('arrowleft', onArrowLeft)
  keyboard.on('arrowright', onArrowRight)
  keyboard.on('?', onQuestion)

  // Stage 6 F3.4: mount theme watcher (applies data-theme to <html>)
  theme.init()

  // Stage 5 F2.2: monday ceremony — after-the-fact notice
  if (state.value !== null) {
    const dob = new Date(state.value.dob)
    const currentWeek = weekIndex(dob, today.value)
    try {
      weeksPassedGap.value = setLastVisitedWeek(currentWeek)
    }
    catch {
      // throw-and-close
    }
  }

  // Stage 5 F2.2: monday ceremony — live transition (timer + visibilitychange)
  scheduleNextMondayTransition()
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.addEventListener('click', onBodyClick)
})

onBeforeUnmount(() => {
  if (mondayTimer !== null) clearTimeout(mondayTimer)
  // Detach keyboard handlers so they don't accumulate across HMR or
  // component remounts. The useKeyboard singleton outlives Vue
  // component lifecycles, so a stale handler from a previous mount
  // would otherwise keep firing on a closed-over old `searchOpen` ref.
  keyboard.off('v', openVowModal)
  keyboard.off('q', toggleQuietMode)
  keyboard.off('/', onSlashKey)
  keyboard.off('escape', onEscape)
  keyboard.off('enter', onEnter)
  keyboard.off('arrowup', onArrowUp)
  keyboard.off('arrowdown', onArrowDown)
  keyboard.off('arrowleft', onArrowLeft)
  keyboard.off('arrowright', onArrowRight)
  keyboard.off('?', onQuestion)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    document.removeEventListener('click', onBodyClick)
    if (solsticeKind.value !== null) {
      document.body.classList.remove(`solstice-${solsticeKind.value}`)
    }
  }
})

watch(solsticeKind, (next, prev) => {
  if (typeof document === 'undefined') return
  if (prev !== null && prev !== undefined) {
    document.body.classList.remove(`solstice-${prev}`)
  }
  if (next !== null) {
    document.body.classList.add(`solstice-${next}`)
  }
}, { immediate: true })
</script>

<template>
  <div :class="['container', containerClasses]">
    <div v-if="solsticeKind !== null" class="solstice-label">{{ solsticeLabel }}</div>
    <FzTitle
      @open-modal="openModal"
      @scroll-to-current="scrollToCurrent"
      @open-vow="openVowModal"
    />
    <FzMondayNotice :weeks="weeksPassedGap" />
    <FzBanner />
    <FzSearch :open="searchOpen" @close="closeSearch" />
    <FzFirstRun v-if="state === null" @done="onSaved" />
    <FzDobModal
      :open="showModal"
      @close="closeModal"
      @saved="onSaved"
    />
    <FzVowModal
      :open="vowModalOpen"
      @close="closeVowModal"
    />
    <FzAnnualLetter />
    <FzKeyboardHelp
      :open="keyboardHelpOpen"
      @close="closeKeyboardHelp"
    />
    <FzGrid
      ref="gridRef"
      :modal-open="showModal || markPopoverOpen || sundayModalOpen || vowModalOpen || keyboardHelpOpen"
      :cursor-index="cursorIndex"
      :cursor-visible="cursorVisible"
      @hex-click="openMarkPopover"
    />
    <FzMarkPopover
      :open="markPopoverOpen"
      :week-index="markPopoverWeek"
      @close="closeMarkPopover"
    />
    <FzSundayModal
      :open="sundayModalOpen"
      @close="closeSundayModal"
    />
    <FzLibrary />
    <FzLongNow />
  </div>
  <FzScrollHex />
  <FzToolbar />
  <FzEasterEgg />
</template>

<style scoped>
.container {
  text-align: center;
  padding: 2rem;
}

.modal-open :deep(.hexagon-grid) {
  pointer-events: none;
}

.solstice-label {
  text-align: center;
  font-variant: small-caps;
  letter-spacing: 0.3em;
  color: var(--fz-yellow);
  font-size: 0.7rem;
  margin-bottom: 0.5rem;
}

.fz-quiet :deep(.title),
.fz-quiet :deep(.subtitle),
.fz-quiet :deep(.vow-line),
.fz-quiet :deep(.toolbar),
.fz-quiet :deep(.library),
.fz-quiet :deep(.long-now-footer),
.fz-quiet > .solstice-label {
  display: none;
}

.fz-quiet :deep(.hexagon-grid) {
  max-width: 100vw;
}
</style>
