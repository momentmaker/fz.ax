<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state, setVow, clearVow } = useFzState()
const localText = ref('')
const errorMsg = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localText.value = state.value?.vow?.text ?? ''
      errorMsg.value = ''
      void nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  },
  { immediate: true },
)

function save(): void {
  errorMsg.value = ''
  try {
    setVow(localText.value)
    emit('close')
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'could not save'
  }
}

function clear(): void {
  errorMsg.value = ''
  try {
    clearVow()
    emit('close')
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'could not clear'
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    // Mirror the save button's disabled rule so pressing Enter on a
    // whitespace-only input doesn't trigger a setVow throw + caught
    // error message — the input simply does nothing instead.
    if (localText.value.trim() === '') return
    save()
  }
}

function onBackdropClick(): void {
  emit('close')
}
</script>

<template>
  <div v-if="props.open" class="vow-overlay" @click="onBackdropClick">
    <div class="vow-content" @click.stop>
      <p class="vow-prompt">what do you want this year to mean?</p>
      <input
        ref="inputRef"
        v-model="localText"
        class="vow-input"
        type="text"
        maxlength="240"
        placeholder="be present"
        @keydown="onKeydown"
      >
      <p v-if="errorMsg !== ''" class="vow-error">{{ errorMsg }}</p>
      <div class="vow-actions">
        <button class="vow-btn vow-save" :disabled="localText.trim() === ''" @click="save">4⬢⏣⏣</button>
        <button v-if="state?.vow !== null && state?.vow !== undefined" class="vow-btn vow-clear" @click="clear">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vow-overlay {
  position: fixed;
  inset: 0;
  background: var(--fz-shadow-overlay-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.vow-content {
  background: white;
  border: 1.5px solid var(--fz-blue);
  padding: 1.5rem 1.75rem;
  max-width: 380px;
  width: 100%;
  z-index: 1001;
}

.vow-prompt {
  margin: 0 0 0.75rem;
  color: var(--fz-blue);
  font-size: 0.85rem;
  font-style: italic;
}

.vow-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--fz-blue);
  background: transparent;
  color: var(--fz-blue);
  font-size: 1rem;
  font-style: italic;
  padding: 0.4rem 0;
  outline: none;
}

.vow-input::placeholder {
  color: var(--fz-text-faint);
  font-style: italic;
}

.vow-error {
  margin: 0.5rem 0 0;
  color: var(--fz-red);
  font-size: 0.75rem;
}

.vow-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.vow-btn {
  background: white;
  border: 1.5px solid var(--fz-blue);
  color: var(--fz-yellow);
  font-weight: 800;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}

.vow-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vow-btn:hover:not(:disabled),
.vow-btn:focus-visible:not(:disabled) {
  background: var(--fz-yellow-soft);
  outline: none;
}

.vow-clear {
  color: var(--fz-red);
  border-color: var(--fz-red);
}
</style>
