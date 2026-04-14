<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { weekIndex, weekRange, totalWeeks } from '../composables/useTime'

interface Props {
  /** Whether the modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
})

const { state } = useFzState()
const today = ref(new Date())

const indices: number[] = Array.from({ length: totalWeeks }, (_, i) => i)

const dobDate = computed(() => {
  if (state.value === null) return null
  return new Date(state.value.dob)
})

const currentIndex = computed(() => {
  if (dobDate.value === null) return 0
  return weekIndex(dobDate.value, today.value)
})

function getState(index: number): 'past' | 'current' | 'future' {
  if (index < currentIndex.value) return 'past'
  if (index === currentIndex.value) return 'current'
  return 'future'
}

function getHoverText(index: number): string {
  if (dobDate.value === null) return ''
  const range = weekRange(dobDate.value, index)
  return `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}`
}

function scrollToCurrent(): void {
  void nextTick(() => {
    const el = document.getElementById('current-week')
    if (el !== null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

onMounted(() => {
  scrollToCurrent()
})

defineExpose({ scrollToCurrent })
</script>

<template>
  <div class="hexagon-grid">
    <FzHexagon
      v-for="i in indices"
      :id="i === currentIndex ? 'current-week' : undefined"
      :key="i"
      :index="i"
      :state="getState(i)"
      :hover-text="getHoverText(i)"
      :modal-open="props.modalOpen"
    />
  </div>
</template>

<style scoped>
.hexagon-grid {
  display: grid;
  grid-template-columns: repeat(21, 1fr);
  grid-gap: 5px;
}

@media (max-width: 1024px) {
  .hexagon-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}

@media (max-width: 768px) {
  .hexagon-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}
</style>
