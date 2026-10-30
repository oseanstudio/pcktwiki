<script setup lang="ts">
import { SIGN_IN_RATE_LIMIT_HINT } from '@/lib/http-retry'

defineProps<{
  message: string
  showRetry?: boolean
  suggestSignIn?: boolean
  signInHref?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="network-busy-notice card" role="status">
    <div class="network-busy-main">
      <span>{{ message }}</span>
      <button
        v-if="showRetry"
        type="button"
        class="network-busy-retry"
        @click="$emit('retry')"
      >
        Try again
      </button>
    </div>
    <p v-if="suggestSignIn" class="network-busy-signin">
      {{ SIGN_IN_RATE_LIMIT_HINT }}
      <a v-if="signInHref" :href="signInHref" class="network-busy-signin-link">Sign in</a>
    </p>
  </div>
</template>

<style scoped>
.network-busy-notice {
  display: grid;
  gap: 0.625rem;
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  background: color-mix(in srgb, var(--pckt-yellow) 18%, var(--pckt-bg-elevated));
  border: 1px solid color-mix(in srgb, var(--pckt-yellow) 45%, transparent);
}

.network-busy-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}

.network-busy-signin {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--pckt-text-muted, var(--pckt-muted));
}

.network-busy-signin-link {
  font-weight: 700;
  color: var(--pckt-red);
  text-decoration: none;
}

.network-busy-signin-link:hover {
  text-decoration: underline;
}

.network-busy-retry {
  margin-left: auto;
  padding: 0.35rem 0.75rem;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--pckt-text);
  background: var(--pckt-bg);
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-sm);
  cursor: pointer;
}

.network-busy-retry:hover {
  border-color: var(--pckt-accent);
}
</style>
