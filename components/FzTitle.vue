<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFzState } from '../composables/useFzState'
import { pastCount, futureCount } from '../composables/useTime'

const emit = defineEmits<{
  openModal: []
  scrollToCurrent: []
}>()

const { state } = useFzState()
const today = ref(new Date())

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
</script>

<template>
  <h1 class="title" @click="emit('openModal')">four-thousand weekz</h1>
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
  color: #F7B808;
  display: inline-block;
  transition: all 0.7s ease;
  margin-bottom: 0px;
}

.title:hover {
  animation: pulsate 0.6s infinite;
}

.subtitle {
  color: #F7B808;
  font-size: 1.2rem;
}

.ngmi,
.wagmi {
  font-size: 0.7rem;
  vertical-align: middle;
  color: #0847F7;
}

.beherenow {
  cursor: progress;
  font-size: 1.5rem;
}

@keyframes pulsate {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
</style>
