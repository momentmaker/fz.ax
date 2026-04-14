<script setup lang="ts">
import { ref } from 'vue'
import { useFzState } from '../composables/useFzState'
import { downloadPoster } from '../utils/poster'
import { downloadBackup, parseBackup } from '../utils/backup'

const { state, replaceState } = useFzState()
const fileInput = ref<HTMLInputElement | null>(null)

function onPosterClick(): void {
  if (state.value === null) return
  try {
    downloadPoster(state.value, new Date())
  } catch {
    // ignore — browser security policies may block download
  }
}

function onBackupClick(): void {
  if (state.value === null) return
  try {
    downloadBackup(state.value, new Date())
  } catch {
    // ignore
  }
}

function onRestoreClick(): void {
  fileInput.value?.click()
}

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file === undefined) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = typeof reader.result === 'string' ? reader.result : null
    if (text === null) return
    const parsed = parseBackup(text)
    if (parsed === null) return
    try {
      replaceState(parsed)
    } catch {
      // ignore — validation already happened in parseBackup
    }
  }
  reader.readAsText(file)
  target.value = ''
}
</script>

<template>
  <div class="toolbar">
    <button
      class="tool"
      :disabled="state === null"
      aria-label="download poster"
      title="poster"
      @click="onPosterClick"
    >⬢</button>
    <button
      class="tool"
      :disabled="state === null"
      aria-label="download backup"
      title="backup"
      @click="onBackupClick"
    >⬡</button>
    <button
      class="tool"
      aria-label="restore backup"
      title="restore"
      @click="onRestoreClick"
    >⌗</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="toolbar-file"
      @change="onFileChange"
    >
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 900;
  display: flex;
  gap: 6px;
}

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

.tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-file {
  display: none;
}
</style>
