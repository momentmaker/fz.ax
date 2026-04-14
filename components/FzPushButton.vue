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
  color: #F7B808;
  border: 1.5px solid #0847F7;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.tool:hover:not(:disabled),
.tool:focus-visible:not(:disabled) {
  background: #fffbe6;
  outline: none;
}

.tool-on {
  background: #F7B808;
  color: white;
}

.tool-on:hover,
.tool-on:focus-visible {
  background: #d99f00;
}

.tool-denied {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
