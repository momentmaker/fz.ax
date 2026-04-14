<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const showScrollButton = ref(false)

function handleScroll(): void {
  showScrollButton.value = window.scrollY > 100
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div
    class="hexagon-scroll"
    :class="{ toggled: showScrollButton }"
    @click="scrollToTop"
  >
    <div class="icon">⬢</div>
  </div>
</template>

<style scoped>
/*
 * The shape comes from assets/main.css's .hexagon-scroll rules.
 * This component owns the show/hide behavior; the visual lives in
 * the global stylesheet so it can co-locate the ::before/::after
 * pseudo-elements that draw the hex shape.
 */
</style>
