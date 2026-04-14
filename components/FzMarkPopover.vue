<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { usePalette } from '../composables/usePalette'
import { weekRange } from '../composables/useTime'
import { isSingleGrapheme } from '../utils/grapheme'

interface Props {
  open: boolean
  weekIndex: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state, setMark, setWhisper, clearMark } = useFzState()
const today = ref(new Date())
const palette = usePalette(state, today)

const oneCharInput = ref<HTMLInputElement | null>(null)
const firstPaletteButton = ref<HTMLButtonElement | null>(null)

const pendingMark = ref<string>('')
const pendingWhisper = ref<string>('')

const currentEntry = computed(() => {
  if (props.weekIndex === null || state.value === null) return null
  return state.value.weeks[props.weekIndex] ?? null
})

const dateRangeLabel = computed(() => {
  if (props.weekIndex === null || state.value === null) return ''
  const dob = new Date(state.value.dob)
  const range = weekRange(dob, props.weekIndex)
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
  return `${range.start.toLocaleDateString(undefined, opts)} — ${range.end.toLocaleDateString(undefined, opts)}`
})

watch(
  () => [props.open, props.weekIndex] as const,
  ([isOpen]) => {
    if (isOpen) {
      pendingMark.value = currentEntry.value?.mark ?? ''
      pendingWhisper.value = currentEntry.value?.whisper ?? ''
      void nextTick(() => {
        if (palette.value.length > 0) {
          firstPaletteButton.value?.focus()
        } else {
          oneCharInput.value?.focus()
        }
      })
    }
  },
  { immediate: true },
)

function applyMark(mark: string): void {
  if (props.weekIndex === null) return
  if (!isSingleGrapheme(mark)) return
  setMark(props.weekIndex, mark)
  pendingMark.value = mark
}

function onOneCharEnter(): void {
  if (pendingMark.value !== '' && isSingleGrapheme(pendingMark.value)) {
    applyMark(pendingMark.value)
  }
}

function onWhisperBlur(): void {
  if (props.weekIndex === null) return
  if (state.value === null) return
  const entry = state.value.weeks[props.weekIndex]
  if (entry === undefined) return
  if (pendingWhisper.value !== (entry.whisper ?? '')) {
    setWhisper(props.weekIndex, pendingWhisper.value)
  }
}

function onClear(): void {
  if (props.weekIndex === null) return
  clearMark(props.weekIndex)
  emit('close')
}

function onClose(): void {
  // Flush any pending whisper edit before closing.
  if (
    props.weekIndex !== null
    && state.value !== null
    && state.value.weeks[props.weekIndex] !== undefined
    && pendingWhisper.value !== (state.value.weeks[props.weekIndex]?.whisper ?? '')
  ) {
    setWhisper(props.weekIndex, pendingWhisper.value)
  }
  emit('close')
}

function onBackdropClick(): void {
  onClose()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    onClose()
  }
}

function setFirstPaletteRef(el: unknown, i: number): void {
  if (i === 0) {
    firstPaletteButton.value = el as HTMLButtonElement
  }
}
</script>

<template>
  <div
    v-if="props.open && props.weekIndex !== null"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Mark this week"
    @click="onBackdropClick"
    @keydown="onKey"
  >
    <div class="modal-content" @click.stop>
      <div class="pop-head">
        <span class="pop-label">{{ dateRangeLabel }}</span>
        <button class="pop-close" aria-label="close" @click="onClose">×</button>
      </div>

      <div v-if="palette.length > 0" class="pop-section">
        <div class="pop-section-label">palette</div>
        <div class="pop-palette">
          <button
            v-for="(glyph, i) in palette"
            :key="glyph"
            :ref="(el) => setFirstPaletteRef(el, i)"
            class="pop-glyph"
            :aria-label="`apply mark ${glyph}`"
            @click="applyMark(glyph)"
          >{{ glyph }}</button>
        </div>
      </div>

      <div class="pop-section">
        <div class="pop-section-label">your mark</div>
        <input
          ref="oneCharInput"
          v-model="pendingMark"
          class="pop-one-char"
          type="text"
          maxlength="4"
          placeholder="·"
          @keyup.enter="onOneCharEnter"
          @blur="onOneCharEnter"
        >
      </div>

      <div class="pop-section">
        <div class="pop-section-label">whisper</div>
        <textarea
          v-model="pendingWhisper"
          class="pop-whisper"
          rows="3"
          placeholder="one sentence (optional)"
          @blur="onWhisperBlur"
        />
        <div class="pop-counter" :class="{ 'pop-counter-warn': pendingWhisper.length > 200 }">
          {{ pendingWhisper.length }}
        </div>
      </div>

      <div class="pop-foot">
        <button
          v-if="currentEntry !== null"
          class="pop-clear"
          @click="onClear"
        >clear</button>
        <span v-else />
        <button class="btn-76" @click="onClose">4⬢⏣⬡</button>
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
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 1.75rem;
  width: 360px;
  max-width: calc(100vw - 2rem);
  text-align: center;
  z-index: 1001;
  box-shadow: 6px 6px 0 0 #F7B808;
  border: 2px solid #0847F7;
}

.pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed #cccccc;
}

.pop-label {
  font-size: 0.7rem;
  color: #0847F7;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 800;
}

.pop-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #0847F7;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
}

.pop-section {
  padding: 0.9rem 0;
  border-bottom: 1px dashed #cccccc;
}

.pop-section:last-of-type {
  border-bottom: none;
}

.pop-section-label {
  font-size: 0.6rem;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.5rem;
}

.pop-palette {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}

.pop-glyph {
  width: 36px;
  height: 36px;
  background: white;
  color: #F7B808;
  border: 1.5px solid #0847F7;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.1s;
}

.pop-glyph:hover,
.pop-glyph:focus-visible {
  background: #fffbe6;
  outline: none;
}

.pop-one-char {
  width: 60px;
  height: 40px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 900;
  color: #F7B808;
  border: 1.5px solid #0847F7;
  background: white;
  padding: 0;
  margin: 0 auto;
  display: block;
}

.pop-one-char:focus-visible {
  background: #fffbe6;
  outline: 2px solid #F7B808;
  outline-offset: 2px;
}

.pop-whisper {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-family: 'Roboto', sans-serif;
  color: #333;
  border: 1.5px solid #0847F7;
  background: white;
  font-style: italic;
}

.pop-whisper:focus-visible {
  background: #fffbe6;
  outline: none;
}

.pop-counter {
  font-size: 0.6rem;
  color: #888888;
  text-align: right;
  margin-top: 0.25rem;
}

.pop-counter-warn {
  color: #ff3b30;
}

.pop-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.9rem;
  border-top: 1px dashed #cccccc;
}

.pop-clear {
  background: none;
  border: none;
  color: #ff3b30;
  font-size: 0.75rem;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.btn-76 {
  -webkit-tap-highlight-color: transparent;
  background-color: #F7B808;
  color: #fff;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif;
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
  --neon: #0847F7;
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
