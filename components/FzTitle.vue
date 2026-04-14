<script setup lang="ts">
import { computed } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useToday } from '../composables/useToday'
import { pastCount, futureCount } from '../composables/useTime'

const emit = defineEmits<{
  openModal: []
  scrollToCurrent: []
  openVow: []
}>()

const { state } = useFzState()
const { today } = useToday()

const dobDate = computed(() => {
  if (state.value === null) return null
  return new Date(state.value.dob)
})

const past = computed(() => {
  if (dobDate.value === null) return 0
  return pastCount(dobDate.value, today.value)
})

const future = computed(() => {
  if (dobDate.value === null) return 0
  return futureCount(dobDate.value, today.value)
})

const vowText = computed<string | null>(() => state.value?.vow?.text ?? null)
</script>

<template>
  <h1 class="title" @click="emit('openModal')">four-thousand weekz</h1>
  <p class="vow-line" @click="emit('openVow')">
    <em v-if="vowText !== null">{{ vowText }}</em>
    <em v-else class="vow-empty">press v to set your vow</em>
  </p>
  <h3 class="subtitle">
    <span class="ngmi">{{ past }}</span>-⬢
    <span class="beherenow" @click="emit('scrollToCurrent')">⏣</span>
    ⬡-<span class="wagmi">{{ future }}</span>
  </h3>
</template>

<style scoped>
.title {
  font-size: 2.1rem;
  cursor: pointer;
  color: var(--fz-yellow);
  display: inline-block;
  transition: all 0.7s ease;
  margin-bottom: 0px;
}

.title:hover {
  animation: pulsate 0.6s infinite;
}

.subtitle {
  color: var(--fz-yellow);
  font-size: 1.2rem;
}

.ngmi,
.wagmi {
  font-size: 0.7rem;
  vertical-align: middle;
  color: var(--fz-blue);
}

.beherenow {
  cursor: progress;
  font-size: 1.5rem;
}

.vow-line {
  margin: 0.25rem 0 0.5rem;
  font-size: 0.65rem;
  font-weight: 300;
  color: var(--fz-blue);
  letter-spacing: 0.05em;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
  cursor: text;
  font-style: italic;
}

.vow-line:hover em {
  border-bottom: 1px solid var(--fz-blue);
}

.vow-empty {
  color: var(--fz-text-faint);
}

@keyframes pulsate {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
</style>
