<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useEcho } from '../composables/useEcho'
import { useToday } from '../composables/useToday'
import { weekRange } from '../composables/useTime'
import { localDateString } from '../utils/date'

const { state, setLastEcho } = useFzState()
const { today } = useToday()
const echo = useEcho(state, today)

const visible = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const todayDateStr = computed(() => localDateString(today.value))

const dateRangeLabel = computed(() => {
  if (echo.value === null || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, echo.value.weekIndex)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  return range.start.toLocaleDateString(undefined, opts)
})

function dismiss(): void {
  visible.value = false
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function showIfAppropriate(): void {
  if (echo.value === null) return
  if (state.value === null) return
  if (state.value.meta.lastEcho === todayDateStr.value) return
  visible.value = true
  try {
    setLastEcho(todayDateStr.value)
  } catch {
    // Storage failure — we still show the banner in-session.
  }
  dismissTimer = setTimeout(dismiss, 8000)
}

onMounted(() => {
  showIfAppropriate()
})

watch(echo, (next, prev) => {
  if (prev === null && next !== null && !visible.value) {
    showIfAppropriate()
  }
})

onBeforeUnmount(() => {
  if (dismissTimer !== null) clearTimeout(dismissTimer)
})
</script>

<template>
  <transition name="echo-fade">
    <div
      v-if="visible && echo !== null"
      class="echo-banner"
      role="status"
      aria-live="polite"
      @click="dismiss"
    >
      <div class="echo-label">⌁ echo</div>
      <div class="echo-body">
        <em class="echo-whisper">{{ echo.whisper }}</em>
        <span class="echo-meta">· {{ dateRangeLabel }} · {{ echo.mark }}</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.echo-banner {
  max-width: 560px;
  margin: 0.75rem auto 0;
  padding: 0.75rem 1rem;
  background: #fffbe6;
  border-left: 3px solid #ff3b30;
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  color: #444;
}

.echo-label {
  color: #ff3b30;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.15rem;
}

.echo-whisper {
  color: #333;
  font-style: italic;
}

.echo-meta {
  color: #888;
  font-size: 0.75rem;
}

.echo-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.echo-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.echo-fade-enter-from,
.echo-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .echo-fade-enter-active,
  .echo-fade-leave-active {
    transition: none;
  }
}
</style>
