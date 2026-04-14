<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useToday } from '../composables/useToday'
import { currentGridIndex, weekRange } from '../composables/useTime'
import { isSingleGrapheme } from '../utils/grapheme'
import { sundayDateString } from '../composables/useSunday'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state, setMark, setWhisper, setLastSundayPrompt } = useFzState()
const { today } = useToday()

const oneCharInput = ref<HTMLInputElement | null>(null)

const pendingMark = ref<string>('')
const pendingWhisper = ref<string>('')

const currentWeek = computed(() => {
  if (state.value === null) return null
  const dob = new Date(state.value.dob)
  return currentGridIndex(dob, today.value)
})

const currentEntry = computed(() => {
  if (currentWeek.value === null || state.value === null) return null
  return state.value.weeks[currentWeek.value] ?? null
})

const dateRangeLabel = computed(() => {
  if (currentWeek.value === null || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, currentWeek.value)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  return `${range.start.toLocaleDateString(undefined, opts)} — ${range.end.toLocaleDateString(undefined, opts)}`
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      pendingMark.value = currentEntry.value?.mark ?? ''
      pendingWhisper.value = currentEntry.value?.whisper ?? ''
      void nextTick(() => {
        oneCharInput.value?.focus()
      })
    }
  },
  { immediate: true },
)

function applyMark(mark: string): void {
  if (currentWeek.value === null) return
  if (!isSingleGrapheme(mark)) return
  try {
    setMark(currentWeek.value, mark)
    pendingMark.value = mark
  } catch {
    // Storage failure — nothing we can do from here without a toast system.
  }
}

function onOneCharEnter(): void {
  if (pendingMark.value !== '' && isSingleGrapheme(pendingMark.value)) {
    applyMark(pendingMark.value)
  }
}

function flushAndClose(): void {
  // Flush a pending mark first. Escape-key closures don't trigger the
  // input's @blur handler, so a mark typed but not yet committed would
  // otherwise be lost while lastSundayPrompt gets consumed for the week.
  // Backdrop and save-button closures pass through here too — they already
  // triggered the blur flush, so applyMark is an idempotent no-op there.
  if (
    currentWeek.value !== null
    && pendingMark.value !== ''
    && pendingMark.value !== (currentEntry.value?.mark ?? '')
    && isSingleGrapheme(pendingMark.value)
  ) {
    applyMark(pendingMark.value)
  }
  if (
    currentWeek.value !== null
    && state.value !== null
    && state.value.weeks[currentWeek.value] !== undefined
    && pendingWhisper.value !== (state.value.weeks[currentWeek.value]?.whisper ?? '')
  ) {
    try {
      setWhisper(currentWeek.value, pendingWhisper.value)
    } catch {
      // ignore — still close
    }
  }
  try {
    setLastSundayPrompt(sundayDateString(today.value))
  } catch {
    // ignore — still close
  }
  emit('close')
}

function onBackdropClick(): void {
  flushAndClose()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    flushAndClose()
  }
}
</script>

<template>
  <div
    v-if="props.open"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Sunday whisper"
    @click="onBackdropClick"
    @keydown="onKey"
  >
    <div class="modal-content" @click.stop>
      <div class="sunday-head">
        <div class="sunday-label">this week is closing</div>
        <div class="sunday-range">{{ dateRangeLabel }}</div>
      </div>

      <p class="sunday-prompt">what do you want to remember about it?</p>

      <div class="sunday-section">
        <div class="sunday-section-label">your mark</div>
        <input
          ref="oneCharInput"
          v-model="pendingMark"
          class="sunday-one-char"
          type="text"
          maxlength="16"
          placeholder="·"
          @keyup.enter="onOneCharEnter"
          @blur="onOneCharEnter"
        >
      </div>

      <div class="sunday-section">
        <div class="sunday-section-label">whisper</div>
        <textarea
          v-model="pendingWhisper"
          class="sunday-whisper"
          :class="{ 'sunday-whisper-locked': currentEntry === null }"
          rows="3"
          :placeholder="currentEntry === null ? 'set a mark first' : 'one sentence (optional)'"
          :disabled="currentEntry === null"
        />
      </div>

      <div class="sunday-foot">
        <button class="btn-76" @click="flushAndClose">4⬢⏣⬡</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--fz-shadow-overlay);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem 1.75rem;
  width: 380px;
  max-width: calc(100vw - 2rem);
  text-align: center;
  z-index: 1001;
  box-shadow: 6px 6px 0 0 var(--fz-yellow);
  border: 2px solid var(--fz-blue);
}

.sunday-head {
  padding-bottom: 1rem;
  border-bottom: 1px dashed var(--fz-border);
}

.sunday-label {
  color: var(--fz-blue);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 800;
}

.sunday-range {
  color: var(--fz-text-quiet);
  font-size: 0.7rem;
  margin-top: 0.25rem;
}

.sunday-prompt {
  color: var(--fz-text);
  font-style: italic;
  margin: 1rem 0;
  font-size: 0.95rem;
}

.sunday-section {
  padding: 0.75rem 0;
}

.sunday-section-label {
  font-size: 0.6rem;
  color: var(--fz-text-quiet);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.4rem;
}

.sunday-one-char {
  width: 60px;
  height: 40px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--fz-yellow);
  border: 1.5px solid var(--fz-blue);
  background: white;
  padding: 0;
  margin: 0 auto;
  display: block;
}

.sunday-one-char:focus-visible {
  background: var(--fz-yellow-soft);
  outline: 2px solid var(--fz-yellow);
  outline-offset: 2px;
}

.sunday-whisper {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-family: 'Roboto', sans-serif;
  color: var(--fz-text);
  border: 1.5px solid var(--fz-blue);
  background: white;
  font-style: italic;
  resize: vertical;
}

.sunday-whisper:focus-visible {
  background: var(--fz-yellow-soft);
  outline: none;
}

.sunday-whisper-locked {
  background: #f5f5f5;
  color: #aaa;
  border-color: var(--fz-border);
  cursor: not-allowed;
  font-style: normal;
}

.sunday-foot {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--fz-border);
  display: flex;
  justify-content: center;
}

.btn-76 {
  -webkit-tap-highlight-color: transparent;
  background-color: var(--fz-yellow);
  color: #fff;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 100%;
  font-weight: 900;
  border: 0 solid;
  outline: 4px solid #fff;
  outline-offset: -4px;
  overflow: hidden;
  padding: 0.55rem 0.9rem;
  position: relative;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
  --neon: var(--fz-blue);
}

.btn-76:hover,
.btn-76:focus-visible {
  background: var(--neon);
  box-shadow: 0 0 5px var(--neon), 0 0 25px var(--neon), 0 0 50px var(--neon);
  color: #fff;
  outline-color: transparent;
  outline: none;
  transition: 0.2s linear 0.3s;
}
</style>
