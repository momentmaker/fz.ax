<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFzState } from '../composables/useFzState'

const { state } = useFzState()
const showModal = ref(false)
const gridRef = ref<{ scrollToCurrent: () => void } | null>(null)

const containerClasses = computed(() => ({
  'modal-open': showModal.value,
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
    <FzGrid ref="gridRef" :modal-open="showModal" />
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
