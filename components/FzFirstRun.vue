<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFzState } from '../composables/useFzState'
import { totalWeeks } from '../composables/useTime'
import { isReasonableDob } from '../utils/dob'

const emit = defineEmits<{
  done: []
}>()

const { setDob } = useFzState()
const screen = ref<1 | 2 | 3>(1)
const clickArmed = ref(false)
const localDob = ref<string>('')
const errorMsg = ref<string>('')
const dobInput = ref<HTMLInputElement | null>(null)

function armClicks(): void {
  clickArmed.value = false
  setTimeout(() => {
    clickArmed.value = true
  }, 1500)
}

function advance(): void {
  if (!clickArmed.value) return
  if (screen.value === 1) {
    screen.value = 2
    armClicks()
  }
  else if (screen.value === 2) {
    screen.value = 3
    armClicks()
    void nextTick(() => {
      dobInput.value?.focus()
    })
  }
  // Screen 3 doesn't advance via click — the save button handles it
}

function defaultFourThousandWeeksAgo(): string {
  const ms = totalWeeks * 7 * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms).toISOString().slice(0, 10)
}

function save(): void {
  errorMsg.value = ''
  if (!isReasonableDob(localDob.value)) {
    errorMsg.value = 'that date doesn\'t look right'
    return
  }
  try {
    setDob(localDob.value)
    emit('done')
  }
  catch {
    errorMsg.value = 'couldn\'t save — try disabling private browsing'
  }
}

onMounted(() => {
  localDob.value = defaultFourThousandWeeksAgo()
  armClicks()
})

const screenText = computed(() => {
  if (screen.value === 1) return 'the average human life is four-thousand weeks.'
  if (screen.value === 2) return 'this page is a quiet place to notice them.'
  return 'when did you arrive?'
})
</script>

<template>
  <div class="first-run" @click="advance">
    <transition name="ceremony" mode="out-in">
      <div :key="screen" class="ceremony-screen">
        <p class="ceremony-text">{{ screenText }}</p>

        <div v-if="screen === 3" class="ceremony-input" @click.stop>
          <input
            ref="dobInput"
            v-model="localDob"
            type="date"
            class="dob-input"
            @keyup.enter="save"
          >
          <button class="ceremony-button" @click="save">4⬢⏣⬡</button>
          <p v-if="errorMsg !== ''" class="ceremony-error">{{ errorMsg }}</p>
        </div>

        <p v-if="clickArmed && screen !== 3" class="ceremony-hint">(click to continue)</p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.first-run {
  position: fixed;
  inset: 0;
  background: var(--fz-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: pointer;
  padding: 2rem;
}

.ceremony-screen {
  text-align: center;
  max-width: 520px;
}

.ceremony-text {
  font-size: 1.1rem;
  font-weight: 400;
  font-style: italic;
  color: var(--fz-text);
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

.ceremony-hint {
  font-size: 0.6rem;
  color: var(--fz-text-faint);
  font-style: italic;
  margin: 2rem 0 0;
}

.ceremony-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  cursor: default;
}

.dob-input {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1.5px solid var(--fz-blue);
  background: var(--fz-bg);
  color: var(--fz-text);
}

.ceremony-button {
  background: var(--fz-yellow);
  color: white;
  font-weight: 900;
  font-size: 1rem;
  border: 0;
  outline: 4px solid var(--fz-bg);
  outline-offset: -4px;
  padding: 0.7rem 1rem;
  cursor: pointer;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
}

.ceremony-button:hover {
  background: var(--fz-blue);
  color: white;
}

.ceremony-error {
  margin: 0.25rem 0 0;
  color: var(--fz-red);
  font-size: 0.75rem;
}

.ceremony-enter-active,
.ceremony-leave-active {
  transition: opacity 0.4s ease-in-out;
}
.ceremony-enter-from,
.ceremony-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ceremony-enter-active,
  .ceremony-leave-active {
    transition: none;
  }
}
</style>
