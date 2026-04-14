<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useHighlight } from '../composables/useHighlight'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const { state } = useFzState()
const highlight = useHighlight()
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      query.value = ''
      void nextTick(() => {
        inputRef.value?.focus()
      })
    }
    else {
      highlight.clear()
    }
  },
  { immediate: true },
)

watch(query, (next) => {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    highlight.setSearch(state.value, next)
  }, 150)
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

onBeforeUnmount(() => {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
})
</script>

<template>
  <div v-if="props.open" class="search-bar">
    <input
      ref="inputRef"
      v-model="query"
      class="search-input"
      type="text"
      placeholder="search whispers"
      @keydown="onKeydown"
    >
    <span v-if="highlight.lit.value.size > 0" class="search-count">
      {{ highlight.lit.value.size }} {{ highlight.lit.value.size === 1 ? 'whisper' : 'whispers' }}
    </span>
  </div>
</template>

<style scoped>
.search-bar {
  max-width: 380px;
  margin: 0.75rem auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.search-input {
  width: 100%;
  border: 1px solid var(--fz-blue);
  background: white;
  color: var(--fz-blue);
  font-size: 0.9rem;
  font-style: italic;
  padding: 0.4rem 0.6rem;
  outline: none;
}

.search-input::placeholder {
  color: var(--fz-text-faint);
  font-style: italic;
}

.search-count {
  font-size: 0.7rem;
  color: var(--fz-text-quiet);
}
</style>
