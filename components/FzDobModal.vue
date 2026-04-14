<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFzState } from '../composables/useFzState'
import { totalWeeks } from '../composables/useTime'
import { isReasonableDob } from '../utils/dob'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const { state, setDob } = useFzState()
const localDob = ref<string>('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localDob.value = state.value?.dob ?? defaultFourThousandWeeksAgo()
    }
  },
  { immediate: true },
)

function defaultFourThousandWeeksAgo(): string {
  const ms = totalWeeks * 7 * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms).toISOString().slice(0, 10)
}

function save(): void {
  if (!isReasonableDob(localDob.value)) return
  setDob(localDob.value)
  emit('saved')
  emit('close')
}

function onBackdropClick(): void {
  emit('close')
}
</script>

<template>
  <div v-if="props.open" class="modal-overlay" @click="onBackdropClick">
    <div class="modal-content" @click.stop>
      <h2 class="modal-header">d⬡b</h2>
      <input
        v-model="localDob"
        type="date"
        @keyup.enter="save"
      >
      <button class="btn-76" @click="save">4⬢⏣⬡</button>
      <div class="modal-subtitle">will be saved to your local browser storage</div>
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
  padding: 2rem;
  border-radius: 5px;
  text-align: center;
  z-index: 1001;
}

.modal-header {
  font-size: 2.1rem;
  color: var(--fz-yellow);
}

.modal-subtitle {
  font-size: 0.7rem;
}

input[type="date"] {
  padding: 0.5rem;
  margin: 0.5rem;
}

.btn-76,
.btn-76 *,
.btn-76 :after,
.btn-76 :before,
.btn-76:after,
.btn-76:before {
  border: 0 solid;
  box-sizing: border-box;
}

.btn-76 {
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: button;
  background-color: var(--fz-yellow);
  background-image: none;
  color: #fff;
  cursor: pointer;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif,
    Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji;
  font-size: 100%;
  line-height: 1.5;
  margin: 0;
  -webkit-mask-image: -webkit-radial-gradient(#000, #fff);
  padding: 0;
  --neon: var(--fz-blue);
  box-sizing: border-box;
  font-weight: 900;
  -webkit-mask-image: none;
  outline: 4px solid #fff;
  outline-offset: -4px;
  overflow: hidden;
  padding: 0.7rem 1rem;
  position: relative;
  text-transform: uppercase;
  transition: 0.2s linear 0.1s;
}

.btn-76:hover {
  background: var(--neon);
  box-shadow: 0 0 5px var(--neon), 0 0 25px var(--neon), 0 0 50px var(--neon),
    0 0 100px var(--neon);
  color: #fff;
  outline-color: transparent;
  transition: 0.2s linear 0.6s;
}
</style>
