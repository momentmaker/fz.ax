<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { currentGridIndex, weekRange, totalWeeks } from '../composables/useTime'

interface Props {
  /** Whether a modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
})

const emit = defineEmits<{
  hexClick: [week: number]
}>()

const { state } = useFzState()
const today = ref(new Date())

const indices: number[] = Array.from({ length: totalWeeks }, (_, i) => i)

const dobString = computed(() => state.value?.dob ?? null)

const dobDate = computed(() => {
  if (dobString.value === null) return null
  return new Date(dobString.value)
})

const currentIndex = computed(() => {
  if (dobDate.value === null) return 0
  return currentGridIndex(dobDate.value, today.value)
})

function getState(index: number): 'past' | 'current' | 'future' {
  if (index < currentIndex.value) return 'past'
  if (index === currentIndex.value) return 'current'
  return 'future'
}

function getHoverText(index: number): string {
  if (dobDate.value === null) return ''
  const range = weekRange(dobDate.value, index)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }
  return `${range.start.toLocaleDateString(undefined, opts)} - ${range.end.toLocaleDateString(undefined, opts)}`
}

function markFor(index: number): string | undefined {
  return state.value?.weeks[index]?.mark
}

function whisperFor(index: number): string | undefined {
  return state.value?.weeks[index]?.whisper
}

function onHexClick(index: number): void {
  emit('hexClick', index)
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
      v-memo="[i === currentIndex, markFor(i), whisperFor(i), props.modalOpen, dobString]"
      :index="i"
      :state="getState(i)"
      :hover-text="getHoverText(i)"
      :mark="markFor(i)"
      :whisper="whisperFor(i)"
      :modal-open="props.modalOpen"
      @click="onHexClick(i)"
    />
  </div>
</template>

<style scoped>
.hexagon-grid {
  display: grid;
  grid-template-columns: repeat(21, 1fr);
  grid-gap: 5px;
  /*
   * Each FzHexagon has width: 30px, so grid items default to
   * justify-self: start and hug the left of their 1fr column.
   * That produced a consistent empty strip on the right of every
   * cell and made the whole grid look shifted left. justify-items:
   * center puts every hex in the middle of its cell, which restores
   * true horizontal symmetry.
   */
  justify-items: center;
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
