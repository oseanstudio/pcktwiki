<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { ActorProfile, LichenWikiRecord } from '@/types/lichen'
import { visibilityLabel } from '@/lib/lichen/collections'
import ForkAttribution from '@/components/ForkAttribution.vue'

withDefaults(
  defineProps<{
    wiki: LichenWikiRecord | null
    profile: ActorProfile | null
    handle: string
    /** Compact breadcrumb for error/fallback states in main content */
    compact?: boolean
    /** Identity card for the right tools rail */
    sidebar?: boolean
  }>(),
  { compact: false, sidebar: false },
)
</script>

<template>
  <aside v-if="sidebar" class="wiki-identity" aria-label="Wiki identity">
    <RouterLink
      v-if="wiki"
      :to="`/@${handle}/${wiki.slug}`"
      class="wiki-identity-link"
    >
      <img
        v-if="profile?.avatar"
        :src="profile.avatar"
        :alt="profile.displayName ?? handle"
        class="wiki-identity-avatar"
        width="40"
        height="40"
      />
      <div class="wiki-identity-copy">
        <p class="wiki-identity-name">{{ wiki.name ?? profile?.displayName ?? 'Wiki' }}</p>
        <p class="wiki-identity-handle">@{{ handle }}</p>
      </div>
    </RouterLink>
    <p v-if="wiki?.description || profile?.description" class="wiki-identity-description">
      {{ wiki?.description ?? profile?.description }}
    </p>
    <p v-if="wiki" class="wiki-identity-badges">
      <span class="badge">{{ visibilityLabel(wiki.visibility) }}</span>
      <span class="badge badge-muted">{{ wiki.language }}</span>
      <ForkAttribution v-if="wiki.forkedFrom" :forked-from="wiki.forkedFrom" />
    </p>
  </aside>

  <nav v-else-if="compact" class="wiki-breadcrumb" aria-label="Wiki">
    <RouterLink
      v-if="wiki"
      :to="`/@${handle}/${wiki.slug}`"
      class="wiki-breadcrumb-link"
    >
      <img
        v-if="profile?.avatar"
        :src="profile.avatar"
        :alt="profile.displayName ?? handle"
        class="crumb-avatar"
        width="24"
        height="24"
      />
      <span class="crumb-name">{{ wiki.name ?? profile?.displayName ?? 'Wiki' }}</span>
      <span class="crumb-handle">@{{ handle }}</span>
    </RouterLink>
  </nav>

  <header v-else class="wiki-hero">
    <div class="wiki-hero-inner">
      <img
        v-if="profile?.avatar"
        :src="profile.avatar"
        :alt="profile.displayName ?? handle"
        class="avatar"
        width="72"
        height="72"
      />
      <div class="wiki-hero-copy">
        <p class="handle">@{{ handle }} / {{ wiki?.slug }}</p>
        <h1>{{ wiki?.name ?? profile?.displayName ?? 'Wiki' }}</h1>
        <p v-if="wiki?.description || profile?.description" class="description">
          {{ wiki?.description ?? profile?.description }}
        </p>
        <p v-if="wiki" class="badge-row">
          <span class="badge">{{ visibilityLabel(wiki.visibility) }}</span>
          <span class="badge badge-muted">{{ wiki.language }}</span>
          <ForkAttribution v-if="wiki.forkedFrom" :forked-from="wiki.forkedFrom" />
        </p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.wiki-identity {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  align-items: center;
  min-width: 0;
  padding: 0.125rem 0.125rem 0.25rem;
  text-align: center;
}

.wiki-identity-link {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  align-items: center;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  text-align: center;
}

.wiki-identity-link:hover {
  text-decoration: none;
}

.wiki-identity-avatar {
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--pckt-blue) 30%, var(--pckt-border));
}

.wiki-identity-copy {
  min-width: 0;
  width: 100%;
}

.wiki-identity-handle {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--pckt-blue);
  word-break: break-word;
}

.wiki-identity-name {
  margin: 0 0 0.2rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--pckt-text);
}

.wiki-identity-link:hover .wiki-identity-name {
  color: var(--pckt-blue);
}

.wiki-identity-description {
  margin: 0;
  font-family: var(--pckt-font-content);
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--pckt-text-muted);
}

.wiki-identity-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.375rem;
  margin: 0;
}

.wiki-breadcrumb {
  margin-bottom: 1rem;
}

.wiki-breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: var(--pckt-radius-btn);
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  color: var(--pckt-text-muted);
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.wiki-breadcrumb-link:hover {
  background: color-mix(in srgb, var(--pckt-blue) 10%, transparent);
  color: var(--pckt-blue);
}

.crumb-avatar {
  border-radius: 50%;
  flex-shrink: 0;
}

.crumb-name {
  font-weight: 600;
  color: var(--pckt-text);
}

.wiki-breadcrumb-link:hover .crumb-name {
  color: var(--pckt-blue);
}

.crumb-handle {
  color: var(--pckt-text-muted);
}

.wiki-hero {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border-radius: var(--pckt-radius-btn);
  border: 1px solid var(--pckt-border);
  background: var(--pckt-bg-elevated);
}

.wiki-hero-inner {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.avatar {
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--pckt-blue) 35%, #fff);
  flex-shrink: 0;
}

.handle {
  margin: 0 0 0.375rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--pckt-blue);
}

h1 {
  margin: 0 0 0.625rem;
  font-family: var(--pckt-font-content);
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.description {
  margin: 0 0 0.875rem;
  font-family: var(--pckt-font-content);
  font-size: 1.0625rem;
  line-height: 1.55;
  color: var(--pckt-text-muted);
  max-width: 52ch;
}

.badge-row {
  display: flex;
  gap: 0.5rem;
  margin: 0;
}
</style>
