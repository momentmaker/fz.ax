<script setup lang="ts">
import { useEasterEgg } from '../composables/useEasterEgg'

const { active, quote } = useEasterEgg()
</script>

<template>
  <transition name="egg-fade">
    <div v-if="active && quote !== null" class="egg-overlay">
      <div class="egg-inner">
        <div class="egg-deco">⬢ ⏣ ⬡</div>
        <div class="egg-quote">{{ quote }}</div>
        <div class="egg-deco">⬡ ⏣ ⬢</div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.egg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.92);
}

.egg-inner {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
}

.egg-deco {
  color: #0847F7;
  font-size: 1.5rem;
  letter-spacing: 0.5em;
}

.egg-quote {
  color: #F7B808;
  font-size: 1.6rem;
  font-style: italic;
  font-weight: 700;
  margin: 1.5rem 0;
  line-height: 1.4;
}

.egg-fade-enter-active {
  transition: opacity 0.4s ease-in;
}
.egg-fade-leave-active {
  transition: opacity 0.6s ease-out;
}
.egg-fade-enter-from,
.egg-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .egg-fade-enter-active,
  .egg-fade-leave-active {
    transition: none;
  }
}
</style>
