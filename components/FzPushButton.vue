<script setup lang="ts">
import { computed } from 'vue'
import { usePwa } from '../composables/usePwa'

const { supportsPush, pushEnabled, pushPermission, enablePush, disablePush } = usePwa()

const isDenied = computed(() => pushPermission.value === 'denied')
const tooltipTitle = computed(() => {
  if (isDenied.value) return 'sunday push blocked — enable in browser settings'
  if (pushEnabled.value) return 'sunday push on — tap to disable'
  return 'sunday push'
})

const ariaLabel = computed(() => {
  if (isDenied.value) return 'sunday push blocked in browser settings'
  if (pushEnabled.value) return 'disable sunday whisper notification'
  return 'enable sunday whisper notification'
})

function onClick(): void {
  if (isDenied.value) return
  if (pushEnabled.value) {
    void disablePush()
  }
  else {
    void enablePush()
  }
}
</script>

<template>
  <button
    v-if="supportsPush"
    class="tool"
    :class="{ 'tool-on': pushEnabled, 'tool-denied': isDenied }"
    :disabled="isDenied"
    :aria-label="ariaLabel"
    :title="tooltipTitle"
    @click="onClick"
  >⏣</button>
</template>

<style scoped>
.tool {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: var(--fz-yellow);
  border: 1.5px solid var(--fz-blue);
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.tool:hover:not(:disabled),
.tool:focus-visible:not(:disabled) {
  background: var(--fz-yellow-soft);
  outline: none;
}

.tool-on {
  background: var(--fz-yellow);
  color: white;
}

.tool-on:hover,
.tool-on:focus-visible {
  background: var(--fz-yellow-hover);
}

.tool-denied {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
