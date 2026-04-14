<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

interface Props {
  weeks: number | null
}

const props = defineProps<Props>()

const visible = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

const text = computed(() => {
  if (props.weeks === null) return ''
  if (props.weeks === 1) return 'a week passed.'
  return `${props.weeks} weeks passed.`
})

function dismiss(): void {
  visible.value = false
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

watch(
  () => props.weeks,
  (next) => {
    if (next !== null && next > 0) {
      visible.value = true
      if (dismissTimer !== null) clearTimeout(dismissTimer)
      dismissTimer = setTimeout(dismiss, 6000)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (dismissTimer !== null) clearTimeout(dismissTimer)
})
</script>

<template>
  <transition name="monday-fade">
    <div
      v-if="visible && props.weeks !== null && props.weeks > 0"
      class="monday-notice"
      role="status"
      aria-live="polite"
      @click="dismiss"
    >
      ⌁ {{ text }}
    </div>
  </transition>
</template>

<style scoped>
.monday-notice {
  max-width: 360px;
  margin: 0.75rem auto 0;
  padding: 0.5rem 1rem;
  background: #fffbe6;
  border-left: 3px solid #F7B808;
  cursor: pointer;
  text-align: center;
  font-size: 0.85rem;
  font-style: italic;
  color: #555;
}

.monday-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.monday-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.monday-fade-enter-from,
.monday-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .monday-fade-enter-active,
  .monday-fade-leave-active {
    transition: none;
  }
}
</style>
