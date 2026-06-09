<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { handleToWikiPath } from '@/lib/config'

const auth = useAuthStore()
const route = useRoute()

const wikiPath = computed(() => {
  if (!auth.handle) return null
  return handleToWikiPath(auth.handle)
})

const isWikiView = computed(() => route.name === 'wiki' || route.name === 'wiki-page')
</script>

<template>
  <header class="header" :class="{ 'header-minimal': isWikiView }">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <img src="/favicon-32x32.png" alt="" width="24" height="24" />
        <span class="brand-text">
          <strong>pckt</strong><span class="brand-dot">.</span>wiki
        </span>
      </RouterLink>

      <nav class="nav">
        <a href="https://pckt.blog" target="_blank" rel="noopener noreferrer" class="nav-link">
          pckt.blog
        </a>

        <template v-if="auth.isAuthenticated">
          <RouterLink to="/dashboard" class="nav-link">Dashboard</RouterLink>
          <RouterLink v-if="wikiPath" :to="wikiPath" class="nav-link">My wiki</RouterLink>
          <button type="button" class="btn btn-ghost" @click="auth.signOut()">Sign out</button>
        </template>
        <template v-else-if="!auth.loading">
          <RouterLink to="/" class="btn btn-primary">Sign in</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  border-bottom: 1px solid var(--pckt-border);
  background: var(--pckt-bg-elevated);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-minimal {
  background: color-mix(in srgb, var(--pckt-bg-elevated) 92%, transparent);
  backdrop-filter: blur(8px);
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--pckt-text);
  text-decoration: none;
  font-size: 1.125rem;
}

.brand:hover {
  text-decoration: none;
}

.brand-text strong {
  font-weight: 700;
}

.brand-dot {
  color: var(--pckt-accent);
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.nav-link {
  color: var(--pckt-text-muted);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--pckt-text);
  text-decoration: none;
}
</style>
