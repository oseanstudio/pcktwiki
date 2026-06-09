<script setup lang="ts">
import type { ActorProfile, WikiSpace } from '@/types/wiki'

defineProps<{
  space: WikiSpace | null
  profile: ActorProfile | null
  handle: string
}>()
</script>

<template>
  <header class="wiki-hero">
    <div class="wiki-hero-inner">
      <img
        v-if="profile?.avatar"
        :src="profile.avatar"
        :alt="profile.displayName ?? handle"
        class="avatar"
        width="72"
        height="72"
      />
      <div>
        <p class="handle">@{{ handle }}</p>
        <h1>{{ space?.title ?? profile?.displayName ?? 'Wiki' }}</h1>
        <p v-if="space?.description || profile?.description" class="description">
          {{ space?.description ?? profile?.description }}
        </p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.wiki-hero {
  margin-bottom: 2rem;
}

.wiki-hero-inner {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.avatar {
  border-radius: 50%;
  border: 2px solid var(--pckt-border);
  flex-shrink: 0;
}

.handle {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  color: var(--pckt-text-subtle);
}

h1 {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-content);
  font-size: 2rem;
  line-height: 1.2;
}

.description {
  margin: 0;
  color: var(--pckt-text-muted);
  max-width: 52ch;
}
</style>
