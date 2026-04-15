<script setup lang="ts">
import { ref } from 'vue'
import { useFzState } from '../composables/useFzState'
import { downloadPoster } from '../utils/poster'
import { downloadBackup, parseBackup } from '../utils/backup'

const { state, replaceState } = useFzState()
const fileInput = ref<HTMLInputElement | null>(null)
const restoreStatus = ref<'idle' | 'failed'>('idle')
let statusTimer: ReturnType<typeof setTimeout> | null = null

function flashFailed(): void {
  restoreStatus.value = 'failed'
  if (statusTimer !== null) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    restoreStatus.value = 'idle'
    statusTimer = null
  }, 3000)
}

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
    if (text === null) {
      flashFailed()
      return
    }
    const parsed = parseBackup(text)
    if (parsed === null) {
      // The file wasn't a valid fz.ax backup (wrong shape, malformed
      // JSON, unreasonable DOB, etc). Flash a brief visible failure
      // state so the user knows the restore was a no-op instead of
      // silently believing it succeeded.
      flashFailed()
      return
    }
    try {
      replaceState(parsed)
    } catch {
      // replaceState only throws if writeState fails (quota exceeded).
      // The in-memory state is unchanged in that case. Flash the same
      // failure so the user can try again or free up storage.
      flashFailed()
    }
  }
  reader.onerror = () => {
    flashFailed()
  }
  reader.readAsText(file)
  target.value = ''
}
</script>

<template>
  <div class="toolbar">
    <FzThemeToggle />
    <FzPushButton />
    <FzInstallButton />
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
      :class="{ 'tool-failed': restoreStatus === 'failed' }"
      :aria-label="restoreStatus === 'failed' ? 'restore failed — not a valid fz.ax backup' : 'restore backup'"
      :title="restoreStatus === 'failed' ? 'not a valid fz.ax backup' : 'restore'"
      @click="onRestoreClick"
    >{{ restoreStatus === 'failed' ? '✕' : '⌗' }}</button>
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

.tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-failed {
  color: var(--fz-red);
  border-color: var(--fz-red);
  background: var(--fz-red-soft);
}

.toolbar-file {
  display: none;
}
</style>
