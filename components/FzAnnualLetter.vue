<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useToday } from '../composables/useToday'
import { birthdayWeeksOfLife } from '../utils/birthday'
import { currentGridIndex, weekRange } from '../composables/useTime'
import { localDateString } from '../utils/date'

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

interface LetterEntry {
  text: string
  sealedAt: string
  unsealAt: string
  read: boolean
}

type LetterMode =
  | { kind: 'idle' }
  | { kind: 'unseal'; current: LetterEntry; queueIdx: number; queue: LetterEntry[] }
  | { kind: 'write' }

const { state, writeAnnualLetter, markLetterRead } = useFzState()
const { today } = useToday()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const localText = ref('')
const errorMsg = ref('')
const modeOverride = ref<LetterMode | null>(null)

const dobDate = computed(() => {
  if (state.value === null) return null
  return new Date(state.value.dob)
})

const currentWeek = computed(() => {
  if (dobDate.value === null) return null
  return currentGridIndex(dobDate.value, today.value)
})

const birthdaySet = computed(() => {
  if (dobDate.value === null) return new Set<number>()
  return birthdayWeeksOfLife(dobDate.value)
})

const isInBirthdayWeek = computed(() => {
  if (currentWeek.value === null) return false
  return birthdaySet.value.has(currentWeek.value)
})

const todayStr = computed(() => localDateString(today.value))

const unsealQueue = computed<LetterEntry[]>(() => {
  if (state.value === null) return []
  return state.value.letters
    .filter((l) => l.unsealAt <= todayStr.value && !l.read)
    .slice()
    .sort((a, b) => (a.sealedAt < b.sealedAt ? -1 : 1))
})

const alreadyWroteThisBirthdayWeek = computed(() => {
  if (state.value === null || dobDate.value === null || currentWeek.value === null) return false
  const { start, end } = weekRange(dobDate.value, currentWeek.value)
  const startMs = start.getTime()
  const endMs = end.getTime() + (24 * 60 * 60 * 1000 - 1)
  return state.value.letters.some((l) => {
    const t = new Date(l.sealedAt).getTime()
    return t >= startMs && t <= endMs
  })
})

const mode = computed<LetterMode>(() => {
  if (modeOverride.value !== null) return modeOverride.value
  if (state.value === null) return { kind: 'idle' }
  if (unsealQueue.value.length > 0) {
    const first = unsealQueue.value[0]
    if (first === undefined) return { kind: 'idle' }
    return {
      kind: 'unseal',
      queueIdx: 0,
      queue: unsealQueue.value,
      current: first,
    }
  }
  if (isInBirthdayWeek.value && !alreadyWroteThisBirthdayWeek.value) {
    return { kind: 'write' }
  }
  return { kind: 'idle' }
})

const visible = computed(() => mode.value.kind !== 'idle')

const unsealYear = computed(() => {
  if (mode.value.kind !== 'unseal') return ''
  return String(new Date(mode.value.current.sealedAt).getFullYear())
})

function dismissUnseal(): void {
  if (mode.value.kind !== 'unseal') return
  // Mark the current letter as read when the user actively
  // dismisses. If the user closes the browser tab without
  // dismissing, the letter stays unread and will show again on
  // the next visit — which is desired (the point of an unread
  // letter is that the user has not seen it yet). An earlier
  // version marked read on mode-enter via a watch, but that
  // caused a cascade: marking letter N updated state, which
  // recomputed unsealQueue, which changed mode, which re-fired
  // the watch on letter N+1 and marked IT before the user saw it.
  try {
    markLetterRead(mode.value.current.sealedAt)
  }
  catch {
    // best-effort — if storage is disabled, the letter will
    // keep showing on subsequent loads
  }
  const currentQueue = mode.value.queue
  const nextIdx = mode.value.queueIdx + 1
  if (nextIdx < currentQueue.length) {
    const nextLetter = currentQueue[nextIdx]
    if (nextLetter === undefined) {
      modeOverride.value = { kind: 'idle' }
      return
    }
    modeOverride.value = {
      kind: 'unseal',
      queueIdx: nextIdx,
      queue: currentQueue,
      current: nextLetter,
    }
  }
  else if (isInBirthdayWeek.value && !alreadyWroteThisBirthdayWeek.value) {
    modeOverride.value = { kind: 'write' }
  }
  else {
    modeOverride.value = { kind: 'idle' }
  }
}

function dismissWrite(): void {
  modeOverride.value = { kind: 'idle' }
}

function save(): void {
  errorMsg.value = ''
  if (mode.value.kind !== 'write') return
  if (dobDate.value === null || currentWeek.value === null) return
  // Compute next year's birthday week start date as the unsealAt
  const thisBirthdayIdx = currentWeek.value
  const sorted = Array.from(birthdaySet.value).sort((a, b) => a - b)
  const nextBirthdayIdx = sorted.find((idx) => idx > thisBirthdayIdx)
  if (nextBirthdayIdx === undefined) {
    errorMsg.value = 'no next birthday week in your life grid'
    return
  }
  const { start: nextBirthdayStart } = weekRange(dobDate.value, nextBirthdayIdx)
  const unsealAt = localDateString(nextBirthdayStart)
  try {
    writeAnnualLetter(localText.value, unsealAt)
    localText.value = ''
    dismissWrite()
  }
  catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'couldn\'t save'
  }
}

// On mode change: emit visibility update to FzPage (so it can
// add modal-open to the container) and focus textarea when
// entering write mode. markLetterRead is NOT called here —
// it moved to dismissUnseal to avoid the cascade bug where
// marking letter N would update state, recompute unsealQueue,
// re-fire this watch, and auto-mark letter N+1 before the user
// saw it.
watch(
  () => mode.value,
  (m) => {
    emit('update:visible', m.kind !== 'idle')
    if (m.kind === 'write') {
      void nextTick(() => {
        textareaRef.value?.focus()
      })
    }
  },
  { immediate: true },
)
</script>

<template>
  <transition name="letter-fade">
    <div
      v-if="visible"
      class="letter-overlay"
      @click="mode.kind === 'unseal' ? dismissUnseal() : dismissWrite()"
    >
      <div class="letter-content" @click.stop>
        <template v-if="mode.kind === 'unseal'">
          <div class="letter-header">⌑ a letter from one year ago today</div>
          <div class="letter-year">{{ unsealYear }}</div>
          <div class="letter-body">{{ mode.current.text }}</div>
          <div class="letter-actions">
            <button class="letter-button" @click="dismissUnseal">i read this</button>
          </div>
        </template>

        <template v-else-if="mode.kind === 'write'">
          <div class="letter-header">a letter to yourself, one year from now</div>
          <textarea
            ref="textareaRef"
            v-model="localText"
            class="letter-textarea"
            rows="8"
            maxlength="2000"
            placeholder="remember where you are right now"
          />
          <p v-if="errorMsg !== ''" class="letter-error">{{ errorMsg }}</p>
          <div class="letter-actions">
            <button class="letter-button letter-button-save" :disabled="localText.trim() === ''" @click="save">⌁ seal for one year</button>
          </div>
        </template>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.letter-overlay {
  position: fixed;
  inset: 0;
  background: var(--fz-shadow-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: 1rem;
}

.letter-content {
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-yellow);
  padding: 2rem 2.25rem;
  max-width: 540px;
  width: 100%;
  z-index: 1501;
}

.letter-header {
  font-size: 0.75rem;
  color: var(--fz-yellow);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.5rem;
}

.letter-year {
  font-size: 0.65rem;
  color: var(--fz-text-quiet);
  font-style: italic;
  margin-bottom: 1.25rem;
}

.letter-body {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--fz-text);
  font-style: italic;
  margin-bottom: 1.5rem;
  white-space: pre-wrap;
  animation: letter-reveal 0.4s ease-in;
}

.letter-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
  color: var(--fz-text);
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-blue);
  font-style: italic;
  resize: vertical;
  line-height: 1.5;
}

.letter-textarea::placeholder {
  color: var(--fz-text-faint);
  font-style: italic;
}

.letter-error {
  margin: 0.5rem 0 0;
  color: var(--fz-red);
  font-size: 0.75rem;
}

.letter-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.letter-button {
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-blue);
  color: var(--fz-yellow);
  font-weight: 800;
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.letter-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.letter-button:hover:not(:disabled),
.letter-button:focus-visible:not(:disabled) {
  background: var(--fz-yellow-soft);
  outline: none;
}

.letter-button-save {
  background: var(--fz-yellow);
  color: var(--fz-bg);
}

.letter-button-save:hover:not(:disabled) {
  background: var(--fz-yellow-hover);
}

.letter-fade-enter-active,
.letter-fade-leave-active {
  transition: opacity 0.5s ease-in-out;
}
.letter-fade-enter-from,
.letter-fade-leave-to {
  opacity: 0;
}

@keyframes letter-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .letter-fade-enter-active,
  .letter-fade-leave-active {
    transition: none;
  }
  .letter-body {
    animation: none;
  }
}
</style>
