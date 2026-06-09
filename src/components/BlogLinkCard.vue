<script setup lang="ts">
import { computed } from 'vue'
import { parsePcktBlogUrl } from '@/lib/config'

const props = defineProps<{
  url: string
  title?: string
}>()

const validUrl = computed(() => parsePcktBlogUrl(props.url))
const hostname = computed(() => {
  try {
    return new URL(props.url).hostname
  } catch {
    return 'pckt.blog'
  }
})
</script>

<template>
  <a
    v-if="validUrl"
    :href="validUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="link-card card"
  >
    <div class="link-card-icon">
      <img src="/favicon-32x32.png" alt="" width="24" height="24" />
    </div>
    <div>
      <p class="link-card-label">pckt.blog</p>
      <p class="link-card-title">{{ title ?? 'View on pckt.blog' }}</p>
      <p class="link-card-url">{{ hostname }}</p>
    </div>
  </a>
  <div v-else class="link-card card invalid">
    <p class="muted">Invalid pckt.blog URL</p>
  </div>
</template>

<style scoped>
.link-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  margin: 1rem 0;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.link-card:hover {
  border-color: var(--pckt-accent);
  box-shadow: var(--pckt-shadow);
  text-decoration: none;
}

.link-card-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--pckt-radius-sm);
  background: var(--pckt-bg-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.link-card-label {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pckt-accent);
  font-weight: 700;
}

.link-card-title {
  margin: 0.125rem 0;
  font-weight: 600;
}

.link-card-url {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--pckt-text-subtle);
}

.invalid {
  padding: 1rem;
}
</style>
