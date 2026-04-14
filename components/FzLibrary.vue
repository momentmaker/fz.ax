<script setup lang="ts">
import { ref } from 'vue'
import { useFzState } from '../composables/useFzState'
import { useLibraryQuote } from '../composables/useQuotes'

const { state } = useFzState()
const today = ref(new Date())
const quote = useLibraryQuote(state, today)
</script>

<template>
  <section v-if="quote !== null" class="library">
    <blockquote class="library-quote">
      {{ quote.text }}
    </blockquote>
    <cite class="library-attribution">{{ quote.attribution }}</cite>
  </section>
</template>

<style scoped>
.library {
  text-align: center;
  padding: 1.25rem 1rem;
  margin: 1.5rem auto 0;
  max-width: 640px;
  border-top: 1px dashed #cccccc;
  border-bottom: 1px dashed #cccccc;
}

.library-quote {
  margin: 0;
  font-style: italic;
  color: #888;
  font-size: 0.85rem;
  line-height: 1.45;
}

.library-attribution {
  display: block;
  font-style: normal;
  font-size: 0.6rem;
  color: #0847F7;
  margin-top: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
</style>
