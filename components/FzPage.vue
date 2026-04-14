<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'

const { state } = useFzState()
const showModal = ref(false)
const gridRef = ref<{ scrollToCurrent: () => void } | null>(null)

const markPopoverOpen = ref(false)
const markPopoverWeek = ref<number | null>(null)

const containerClasses = computed(() => ({
  // Either modal disables grid pointer-events so the user can't click a
  // second hexagon while the mark popover is open and silently lose any
  // unsaved whisper typing in the popover.
  'modal-open': showModal.value || markPopoverOpen.value,
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
      :modal-open="showModal || markPopoverOpen"
      @hex-click="openMarkPopover"
    />
    <FzMarkPopover
      :open="markPopoverOpen"
      :week-index="markPopoverWeek"
      @close="closeMarkPopover"
    />
  </div>
  <FzScrollHex />
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
