<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { usePwa } from '../composables/usePwa'
import { shouldPromptToday } from '../composables/useSunday'

const { state } = useFzState()
const { register: registerPwa } = usePwa()
const showModal = ref(false)
const gridRef = ref<{ scrollToCurrent: () => void } | null>(null)

const markPopoverOpen = ref(false)
const markPopoverWeek = ref<number | null>(null)

const sundayModalOpen = ref(false)

const containerClasses = computed(() => ({
  // Any modal disables grid pointer-events so the user can't click a
  // second hexagon while another modal is open.
  'modal-open': showModal.value || markPopoverOpen.value || sundayModalOpen.value,
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
  if (state.value === null) {
    showModal.value = true
  }
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
})
</script>

<template>
  <div :class="['container', containerClasses]">
    <FzTitle
      @open-modal="openModal"
      @scroll-to-current="scrollToCurrent"
    />
    <FzDobModal
      :open="showModal"
      @close="closeModal"
      @saved="onSaved"
    />
    <FzGrid
      ref="gridRef"
      :modal-open="showModal || markPopoverOpen || sundayModalOpen"
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
    <FzEcho />
    <FzLibrary />
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
</style>
