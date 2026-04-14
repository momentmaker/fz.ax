<script setup lang="ts">
import { computed } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useTheme } from '../composables/useTheme'

const { state } = useFzState()
const { setTheme, effectiveTheme } = useTheme()

const currentPref = computed(() => state.value?.prefs.theme ?? 'auto')

const label = computed(() => {
  const pref = currentPref.value
  if (pref === 'auto') return `theme: auto (${effectiveTheme.value})`
  return `theme: ${pref}`
})

function onClick(): void {
  const current = currentPref.value
  if (current === 'auto') setTheme('light')
  else if (current === 'light') setTheme('dark')
  else setTheme('auto')
}
</script>

<template>
  <button
    class="tool"
    :aria-label="label"
    :title="label"
    @click="onClick"
  >◐</button>
</template>

<style scoped>
.tool {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fz-bg);
  color: var(--fz-yellow);
  border: 1.5px solid var(--fz-blue);
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.tool:hover,
.tool:focus-visible {
  background: var(--fz-yellow-soft);
  outline: none;
}
</style>
