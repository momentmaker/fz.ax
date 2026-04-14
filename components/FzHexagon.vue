<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Week index from 0 to totalWeeks-1 */
  index: number
  /** Visual state: past, current, or future */
  state: 'past' | 'current' | 'future'
  /** Hover tooltip text — usually the date range */
  hoverText: string
  /** Whether the modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modalOpen: false,
})

const symbol = computed(() => {
  if (props.state === 'past') return '⬢'
  if (props.state === 'current') return '⏣'
  return '⬡'
})

const isCurrent = computed(() => props.state === 'current')
</script>

<template>
  <div
    class="hexagon"
    :class="{ 'current-week': isCurrent }"
    :data-current="isCurrent ? 'true' : null"
  >
    {{ symbol }}
    <span
      class="hover-text"
      :class="{ 'hide-hover-text': modalOpen }"
    >{{ hoverText }}</span>
  </div>
</template>

<style scoped>
.hexagon {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
  color: #0847F7;
}

.hover-text {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px;
  border-radius: 5px;
  font-size: 0.75rem;
  visibility: hidden;
  white-space: nowrap;
  z-index: 10;
}

.hexagon:hover .hover-text {
  visibility: visible;
}

.hide-hover-text {
  display: none;
}

.current-week {
  color: #F7B808;
}
</style>
