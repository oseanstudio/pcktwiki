<script setup lang="ts">
import { computed } from 'vue'
import { useKeyboardNav } from '@/composables/useKeyboardNavProvider'

const nav = useKeyboardNav()
const open = computed({
  get: () => nav.helpOpen.value,
  set: (value) => {
    nav.helpOpen.value = value
  },
})

function close() {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="kb-help-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-help-title"
      @click.self="close"
      @keydown.escape="close"
    >
      <div class="kb-help-card card">
        <h2 id="kb-help-title" class="kb-help-title">Keyboard shortcuts</h2>

        <h3 class="kb-help-subtitle">Browse</h3>
        <dl class="kb-help-list">
          <dt><kbd>W</kbd> / <kbd>I</kbd> / <kbd>↑</kbd></dt>
          <dd>Move up to the nearest section or link</dd>
          <dt><kbd>A</kbd> / <kbd>J</kbd> / <kbd>←</kbd></dt>
          <dd>Move left</dd>
          <dt><kbd>S</kbd> / <kbd>K</kbd> / <kbd>↓</kbd></dt>
          <dd>Move down</dd>
          <dt><kbd>D</kbd> / <kbd>L</kbd> / <kbd>→</kbd></dt>
          <dd>Move right</dd>
          <dt><kbd>E</kbd> / <kbd>O</kbd> / <kbd>Enter</kbd></dt>
          <dd>Enter a highlighted section, or open the focused link</dd>
          <dt><kbd>Esc</kbd> / <kbd>Q</kbd></dt>
          <dd>Leave the current section (or go back)</dd>
        </dl>

        <h3 class="kb-help-subtitle">Wiki article actions</h3>
        <dl class="kb-help-list">
          <dt><kbd>R</kbd></dt>
          <dd>Discussion</dd>
          <dt><kbd>C</kbd></dt>
          <dd>Watch wiki</dd>
          <dt><kbd>F</kbd></dt>
          <dd>Follow author on Bluesky</dd>
          <dt><kbd>Space</kbd></dt>
          <dd>Watch wiki (toggle)</dd>
          <dt><kbd>M</kbd> / <kbd>`</kbd></dt>
          <dd>Focus page toolbar</dd>
        </dl>

        <h3 class="kb-help-subtitle">Global</h3>
        <dl class="kb-help-list">
          <dt><kbd>/</kbd></dt>
          <dd>Focus search</dd>
          <dt><kbd>U</kbd> / <kbd>Backspace</kbd></dt>
          <dd>Browser back (when not inside a section)</dd>
        </dl>

        <button type="button" class="btn btn-secondary btn-sm kb-help-close" @click="close">
          Close
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.kb-help-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(17, 24, 39, 0.45);
  backdrop-filter: blur(2px);
}

.kb-help-card {
  width: min(30rem, 100%);
  max-height: min(90dvh, 40rem);
  overflow-y: auto;
  padding: 1.25rem 1.5rem 1.5rem;
}

.kb-help-title {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.25rem;
  font-weight: 800;
}

.kb-help-subtitle {
  margin: 1rem 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pckt-text-muted);
}

.kb-help-subtitle:first-of-type {
  margin-top: 0;
}

.kb-help-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
}

.kb-help-list dt {
  font-family: var(--pckt-font-mono);
  font-weight: 600;
  color: var(--pckt-text);
}

.kb-help-list dd {
  margin: 0;
  color: var(--pckt-text-muted);
}

.kb-help-close {
  width: 100%;
  margin-top: 1.25rem;
}

kbd {
  display: inline-block;
  min-width: 1.25rem;
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--pckt-border-strong);
  border-radius: 0.35rem;
  background: var(--pckt-bg-muted);
  font-family: var(--pckt-font-mono);
  font-size: 0.75rem;
  line-height: 1.3;
  text-align: center;
}
</style>
