<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Week index from 0 to totalWeeks-1 */
  index: number
  /** Visual state: past, current, or future */
  state: 'past' | 'current' | 'future'
  /** Hover tooltip text — the date range */
  hoverText: string
  /** The user's Mark for this week, if any */
  mark?: string
  /** The user's Whisper for this week, if any */
  whisper?: string
  /** Whether a modal is open (suppresses hover text) */
  modalOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mark: undefined,
  whisper: undefined,
  modalOpen: false,
})

const displayGlyph = computed(() => {
  if (props.mark !== undefined) return props.mark
  if (props.state === 'past') return '⬢'
  if (props.state === 'current') return '⏣'
  return '⬡'
})

const isCurrent = computed(() => props.state === 'current')
const isMarked = computed(() => props.mark !== undefined)
</script>

<template>
  <div
    class="hexagon"
    :class="{
      'current-week': isCurrent,
      'marked': isMarked,
    }"
  >
    {{ displayGlyph }}
    <span
      class="hover-text"
      :class="{ 'hide-hover-text': modalOpen }"
    >
      {{ hoverText }}
      <span v-if="whisper !== undefined" class="hover-whisper">{{ whisper }}</span>
    </span>
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

.hexagon.marked {
  color: #F7B808;
  font-weight: 700;
}

.hexagon.current-week {
  color: #F7B808;
  animation: current-glow 2.4s ease-in-out infinite;
}

@keyframes current-glow {
  0%, 100% { text-shadow: 0 0 0 transparent; }
  50% { text-shadow: 0 0 6px #F7B808; }
}

@media (prefers-reduced-motion: reduce) {
  .hexagon.current-week {
    animation: none;
    text-shadow: 0 0 4px #F7B808;
  }
}

.hover-text {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 0.75rem;
  visibility: hidden;
  white-space: nowrap;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hover-whisper {
  font-style: italic;
  color: #ddd;
  max-width: 240px;
  white-space: normal;
  text-align: center;
}

.hexagon:hover .hover-text {
  visibility: visible;
}

.hide-hover-text {
  display: none;
}
</style>
