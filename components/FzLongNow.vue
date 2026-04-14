<script setup lang="ts">
import { computed } from 'vue'
import { useToday } from '../composables/useToday'

// Read the year from the shared today ref so the footer ticks over
// to the new year when the tab is open across midnight Dec 31 →
// Jan 1. Without this, computed(() => new Date().getFullYear()) has
// no reactive dep, computes once, and stays stale forever.
const { today } = useToday()
const year = computed(() => today.value.getFullYear())
</script>

<template>
  <div class="long-now-footer">
    <span class="long-now-zero">0</span>{{ year }} · the long now
  </div>
</template>

<style scoped>
.long-now-footer {
  margin: 1.5rem auto 0.75rem;
  text-align: center;
  font-size: 0.7rem;
  font-style: italic;
  color: #888;
  letter-spacing: 0.05em;
}

.long-now-zero {
  color: #F7B808;
  font-weight: 700;
}
</style>
