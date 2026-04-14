<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useTodaysBanner } from '../composables/useTodaysBanner'
import { weekRange } from '../composables/useTime'
import { localDateString } from '../utils/date'

const { state, setLastEcho } = useFzState()
const today = ref(new Date())
const banner = useTodaysBanner(state, today)

const visible = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const todayDateStr = computed(() => localDateString(today.value))

const echoDateRangeLabel = computed(() => {
  if (banner.value === null || banner.value.type !== 'echo' || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, banner.value.entry.weekIndex)
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
  if (banner.value === null) return
  if (state.value === null) return
  if (state.value.meta.lastEcho === todayDateStr.value) return
  visible.value = true
  try {
    setLastEcho(todayDateStr.value)
  }
  catch {
    // Storage failure — show banner in-session anyway.
  }
  // Anniversary gets 12 seconds (longer reflection); echo keeps 8.
  const dismissAfter = banner.value.type === 'anniversary' ? 12000 : 8000
  dismissTimer = setTimeout(dismiss, dismissAfter)
}

onMounted(() => {
  showIfAppropriate()
})

watch(banner, (next, prev) => {
  if (prev === null && next !== null && !visible.value) {
    showIfAppropriate()
  }
})

onBeforeUnmount(() => {
  if (dismissTimer !== null) clearTimeout(dismissTimer)
})
</script>

<template>
  <transition name="banner-fade">
    <div
      v-if="visible && banner !== null"
      class="banner"
      :class="banner.type === 'anniversary' ? 'banner-anniversary' : 'banner-echo'"
      role="status"
      aria-live="polite"
      @click="dismiss"
    >
      <template v-if="banner.type === 'anniversary'">
        <div class="banner-label">⌁ anniversary</div>
        <div v-for="entry in banner.entries" :key="entry.weekIndex" class="banner-row">
          this week, {{ entry.yearsAgo }} year{{ entry.yearsAgo === 1 ? '' : 's' }} ago:
          <em>'{{ entry.whisper }}'</em>
          <span class="banner-meta"> · {{ entry.mark }}</span>
        </div>
      </template>
      <template v-else-if="banner.type === 'echo'">
        <div class="banner-label">⌁ echo</div>
        <div class="banner-body">
          <em class="banner-whisper">{{ banner.entry.whisper }}</em>
          <span class="banner-meta">· {{ echoDateRangeLabel }} · {{ banner.entry.mark }}</span>
        </div>
      </template>
    </div>
  </transition>
</template>

<style scoped>
.banner {
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

.banner-label {
  color: #ff3b30;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.15rem;
}

.banner-row {
  margin: 0.15rem 0;
  font-style: normal;
  color: #444;
}

.banner-row em {
  color: #333;
  font-style: italic;
}

.banner-whisper {
  color: #333;
  font-style: italic;
}

.banner-meta {
  color: #888;
  font-size: 0.75rem;
}

.banner-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.banner-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .banner-fade-enter-active,
  .banner-fade-leave-active {
    transition: none;
  }
}
</style>
