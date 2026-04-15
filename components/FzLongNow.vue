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
    <span class="long-now-zero">0</span>{{ year }} · the long now ·
    <a
      class="long-now-source"
      href="https://github.com/momentmaker/fz.ax"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="view source on github"
    >⎇ source</a>
  </div>
</template>

<style scoped>
.long-now-footer {
  margin: 1.5rem auto 0.75rem;
  text-align: center;
  font-size: 0.7rem;
  font-style: italic;
  color: var(--fz-text-quiet);
  letter-spacing: 0.05em;
}

.long-now-zero {
  color: var(--fz-yellow);
  font-weight: 700;
}

.long-now-source {
  color: var(--fz-text-quiet);
  text-decoration: none;
  border-bottom: 1px dotted var(--fz-text-quiet);
  padding-bottom: 1px;
  transition: color 0.15s, border-color 0.15s;
}

.long-now-source:hover,
.long-now-source:focus-visible {
  color: var(--fz-yellow);
  border-bottom-color: var(--fz-yellow);
  outline: none;
}
</style>
