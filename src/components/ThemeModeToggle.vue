<script setup lang="ts">
import { useThemeMode, type ThemeMode } from '@/composables/useThemeMode'

const { mode, label, nextLabel, cycleMode } = useThemeMode()

const titles: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  auto: 'Auto (system)',
}
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost btn-sm theme-mode-toggle"
    :title="`${titles[mode]} — click for ${nextLabel.toLowerCase()}`"
    :aria-label="`Color mode: ${label}. Switch to ${nextLabel.toLowerCase()}`"
    @click="cycleMode"
  >
    <!-- Sun: circle + 8 rays -->
    <svg
      v-if="mode === 'light'"
      class="theme-mode-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>

    <!-- Crescent moon -->
    <svg
      v-else-if="mode === 'dark'"
      class="theme-mode-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Auto: circle split light / dark -->
    <svg
      v-else
      class="theme-mode-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M12 3a9 9 0 0 0 0 18V3z" fill="currentColor" />
    </svg>
  </button>
</template>

<style scoped>
.theme-mode-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.25rem 0.5rem;
  line-height: 0;
}

.theme-mode-icon {
  display: block;
  flex-shrink: 0;
}
</style>
