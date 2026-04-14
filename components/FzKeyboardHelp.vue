<script setup lang="ts">
interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

function onBackdropClick(): void {
  emit('close')
}
</script>

<template>
  <div v-if="props.open" class="help-overlay" @click="onBackdropClick">
    <div class="help-content" @click.stop>
      <div class="help-header">keyboard shortcuts</div>
      <div class="help-grid">
        <div class="help-row">
          <div class="help-keys">
            <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
          </div>
          <div class="help-desc">move cursor</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>Enter</kbd></div>
          <div class="help-desc">mark this week</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>V</kbd></div>
          <div class="help-desc">edit your vow</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>Q</kbd></div>
          <div class="help-desc">quiet mode</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>/</kbd></div>
          <div class="help-desc">search whispers</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>?</kbd></div>
          <div class="help-desc">this help</div>
        </div>
        <div class="help-row">
          <div class="help-keys"><kbd>Esc</kbd></div>
          <div class="help-desc">close modals</div>
        </div>
      </div>
      <div class="help-footer">no mouse required · all navigation with arrow keys</div>
    </div>
  </div>
</template>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: var(--fz-shadow-overlay-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.help-content {
  background: var(--fz-bg);
  border: 1.5px solid var(--fz-blue);
  padding: 1.75rem 2rem;
  max-width: 480px;
  width: 100%;
  z-index: 1001;
}

.help-header {
  font-size: 0.75rem;
  color: var(--fz-yellow);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 1.25rem;
}

.help-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 1.5rem;
  align-items: center;
}

.help-row {
  display: contents;
}

.help-keys {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.help-desc {
  color: var(--fz-text);
  font-size: 0.85rem;
  font-style: italic;
}

kbd {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.75rem;
  color: var(--fz-blue);
  background: var(--fz-yellow-soft);
  border: 1px solid var(--fz-blue);
  border-radius: 2px;
  min-width: 1.25rem;
  text-align: center;
}

.help-footer {
  margin-top: 1.5rem;
  padding-top: 0.9rem;
  border-top: 1px dashed var(--fz-border);
  color: var(--fz-text-quiet);
  font-size: 0.7rem;
  font-style: italic;
  text-align: center;
}
</style>
