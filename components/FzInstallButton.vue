<script setup lang="ts">
import { usePwa } from '../composables/usePwa'

const { canInstall, isInstalled, promptInstall } = usePwa()

function onClick(): void {
  void promptInstall()
}
</script>

<template>
  <button
    v-if="canInstall && !isInstalled"
    class="tool"
    aria-label="install fz.ax as an app"
    title="install"
    @click="onClick"
  >⬇</button>
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

.tool:hover,
.tool:focus-visible {
  background: var(--fz-yellow-soft);
  outline: none;
}
</style>
