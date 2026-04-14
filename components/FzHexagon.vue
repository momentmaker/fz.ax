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
  /** Whether this hexagon is in the active highlight set (constellation/search) */
  lit?: boolean
  /** Whether a highlight is active overall (so non-lit weeks dim) */
  dim?: boolean
  /** Whether this week is anchored as a life landmark */
  anchored?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mark: undefined,
  whisper: undefined,
  modalOpen: false,
  lit: false,
  dim: false,
  anchored: false,
})

const emit = defineEmits<{
  click: []
  anchorToggle: []
}>()

const displayGlyph = computed(() => {
  if (props.mark !== undefined) return props.mark
  if (props.state === 'past') return '⬢'
  if (props.state === 'current') return '⏣'
  return '⬡'
})

const isCurrent = computed(() => props.state === 'current')
const isMarked = computed(() => props.mark !== undefined)

let touchStartTime = 0
let touchMoved = false
// Set to true by whichever path (contextmenu or touchend) emits the
// anchor toggle for the current touch. Prevents Android double-fire:
// on Android Chrome a long-press fires `contextmenu` BEFORE `touchend`,
// so without this guard both onContextMenu and onTouchEnd would emit
// anchorToggle for the same gesture, producing a net no-op (add then
// immediately remove). Reset on touchstart for the next gesture.
let anchorEmittedThisTouch = false

function onClick(): void {
  emit('click')
}

function onContextMenu(event: MouseEvent): void {
  // Right-click anchors. Prevent the browser's context menu so
  // the user gets the toggle without the dropdown.
  event.preventDefault()
  emit('anchorToggle')
  anchorEmittedThisTouch = true
}

function onTouchStart(_event: TouchEvent): void {
  touchStartTime = Date.now()
  touchMoved = false
  anchorEmittedThisTouch = false
}

function onTouchMove(_event: TouchEvent): void {
  // Any movement during the touch invalidates the long-press
  // (the user is scrolling or dragging, not anchoring).
  touchMoved = true
}

function onTouchEnd(_event: TouchEvent): void {
  if (touchMoved) return
  if (anchorEmittedThisTouch) return
  if (Date.now() - touchStartTime >= 500) {
    emit('anchorToggle')
  }
}
</script>

<template>
  <div
    class="hexagon"
    :class="{
      'current-week': isCurrent,
      'marked': isMarked,
      'lit': lit,
      'dim': dim && !lit,
      'anchored': anchored,
    }"
    @click="onClick"
    @contextmenu="onContextMenu"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
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
  /*
   * Suppress iOS Safari's native long-press callout ("Copy / Look Up
   * / Share") on hexagons. Without this, a long-press on iPhone shows
   * the callout BEFORE our 500ms touchend fires, then iOS's contextmenu
   * fires AFTER the user dismisses the callout — which would
   * double-emit anchorToggle (touchend then contextmenu) and net to no
   * change. With the callout suppressed, contextmenu doesn't fire from
   * touch on iOS, and the existing anchorEmittedThisTouch guard handles
   * Android's contextmenu-before-touchend ordering correctly.
   * Hexagons aren't text content, so disabling the selection callout
   * loses nothing.
   */
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
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

.hexagon.lit {
  outline: 1.5px solid #F7B808;
  transform: scale(1.05);
  transition: transform 0.4s ease-in-out, outline 0.4s ease-in-out;
}

.hexagon.dim {
  opacity: 0.3;
  transition: opacity 0.4s ease-in-out;
}

.hexagon.anchored {
  outline: 3px solid #ff3b30;
  outline-offset: 1px;
}

.hexagon.anchored.lit {
  outline: 3px solid #ff3b30;
  box-shadow: 0 0 0 1.5px #F7B808;
}

.hexagon.anchored:hover {
  box-shadow: 0 0 6px #ff3b30;
}

@media (prefers-reduced-motion: reduce) {
  .hexagon.lit,
  .hexagon.dim {
    transition: none;
  }
  .hexagon.lit {
    transform: none;
  }
}
</style>
