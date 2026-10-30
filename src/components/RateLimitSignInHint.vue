<script setup lang="ts">
import { SIGN_IN_RATE_LIMIT_HINT } from '@/lib/http-retry'

withDefaults(
  defineProps<{
    signInHref?: string
  }>(),
  {
    signInHref: '#atproto_handle_header',
  },
)
</script>

<template>
  <p class="rate-limit-signin-hint">
    {{ SIGN_IN_RATE_LIMIT_HINT }}
    <a :href="signInHref" class="rate-limit-signin-link">Sign in</a>
  </p>
</template>

<style scoped>
.rate-limit-signin-hint {
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--pckt-text-muted, var(--pckt-muted));
}

.rate-limit-signin-link {
  font-weight: 700;
  color: var(--pckt-red);
  text-decoration: none;
}

.rate-limit-signin-link:hover {
  text-decoration: underline;
}
</style>
