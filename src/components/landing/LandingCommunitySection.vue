<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useFeaturedWikisList } from '@/composables/useFeaturedWikis'
import {
  chipScrollOffset,
  layoutFloatingWikis,
  type FloatingWikiLayoutItem,
} from '@/lib/featured-wikis-layout'
import { useScrollProgress } from '@/composables/useScrollProgress'
import { wikiPath } from '@/data/featured-wikis'
import WikiAvatar from '@/components/WikiAvatar.vue'
import PcktSparkLogomark from '@/components/PcktSparkLogomark.vue'
import { refreshSuffixColor } from '@/lib/pckt-brand-color'

const { wikis } = useFeaturedWikisList()
const sectionRef = ref<HTMLElement | null>(null)
const scrollProgress = useScrollProgress(sectionRef)
const layout = computed(() => layoutFloatingWikis(wikis.value))

function chipStyle(item: FloatingWikiLayoutItem, side: 'left' | 'right') {
  const offset = chipScrollOffset(item, scrollProgress.value)
  const horizontal = side === 'left' ? 'translate(-50%, -50%)' : 'translate(50%, -50%)'

  return {
    top: `${item.top}%`,
    [side]: `${item[side] ?? 0}%`,
    opacity: String(item.opacity),
    transform: `${horizontal} translateY(${offset}px)`,
  }
}

function mobileOffset(index: number, slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i)
    hash |= 0
  }
  const offset = index === 0 ? 0 : (Math.abs(hash) % 7) - 3
  return `translateY(${offset * 3}px)`
}
</script>

<template>
  <section ref="sectionRef" class="community-section">
    <div class="floating-layer" aria-hidden="true">
      <RouterLink
        v-for="item in layout.left"
        :key="item.wiki.slug"
        :to="wikiPath(item.wiki.handle, item.wiki.slug)"
        class="floating-chip floating-chip-left"
        :style="chipStyle(item, 'left')"
        :title="item.wiki.name"
        :aria-label="item.wiki.name"
      >
        <WikiAvatar
          :handle="item.wiki.handle"
          :name="item.wiki.name"
          :seed="item.wiki.slug"
          :accent-color="item.wiki.accentColor"
          :size="item.size"
        />
      </RouterLink>

      <RouterLink
        v-for="item in layout.right"
        :key="`${item.wiki.slug}-right`"
        :to="wikiPath(item.wiki.handle, item.wiki.slug)"
        class="floating-chip floating-chip-right"
        :style="chipStyle(item, 'right')"
        :title="item.wiki.name"
        :aria-label="item.wiki.name"
      >
        <WikiAvatar
          :handle="item.wiki.handle"
          :name="item.wiki.name"
          :seed="item.wiki.slug"
          :accent-color="item.wiki.accentColor"
          :size="item.size"
        />
      </RouterLink>
    </div>

    <div class="community-content">
      <button
        type="button"
        class="community-mark-button"
        aria-label="Change pckt.wiki accent color"
        @click="refreshSuffixColor()"
      >
        <PcktSparkLogomark class="community-mark" />
      </button>
      <h2 class="community-title">Come explore.</h2>
      <p class="community-lead">
        Wikis already live on Lichen — read them here on
        <span class="community-accent">pckt.wiki</span>
        with a cozy UI built to match pckt.blog.
      </p>

      <div class="community-mobile-scroll">
        <RouterLink
          v-for="(wiki, index) in wikis"
          :key="`${wiki.slug}-mobile`"
          :to="wikiPath(wiki.handle, wiki.slug)"
          class="community-mobile-chip"
          :style="{ transform: mobileOffset(index, wiki.slug) }"
          :title="wiki.name"
          :aria-label="wiki.name"
        >
          <WikiAvatar
            :handle="wiki.handle"
            :name="wiki.name"
            :seed="wiki.slug"
            :accent-color="wiki.accentColor"
            :size="64"
          />
        </RouterLink>
      </div>

      <div class="community-actions">
        <RouterLink to="/wikis" class="btn btn-landing-green-tint btn-landing-pill">
          browse wikis
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.community-section {
  position: relative;
  overflow: hidden;
  padding: 5rem 1.5rem 6rem;
  background: #fbf4e3;
}

[data-theme='dark'] .community-section {
  background: #1d1a15;
}

.floating-layer {
  display: none;
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

@media (min-width: 768px) {
  .floating-layer {
    display: block;
  }
}

.floating-chip {
  position: absolute;
  pointer-events: auto;
  transition: opacity 0.2s ease, transform 0.2s ease;
  text-decoration: none;
}

.floating-chip:hover {
  opacity: 1 !important;
  z-index: 2;
}

.floating-chip:hover :deep(.wiki-avatar) {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

.community-content {
  position: relative;
  z-index: 2;
  max-width: 42rem;
  margin: 0 auto;
  text-align: center;
}

.community-mark-button {
  display: block;
  margin: -1rem auto 1rem;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.community-mark-button .community-mark {
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.community-mark {
  height: 3.5rem;
  width: auto;
}

.community-title {
  margin: 0 0 1rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(2.25rem, 5vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.community-lead {
  margin: 0 auto 2rem;
  max-width: 28rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.25rem;
  font-style: italic;
  line-height: 1.5;
  color: #4b5563;
}

@media (min-width: 768px) {
  .community-lead {
    font-size: 1.5rem;
  }
}

[data-theme='dark'] .community-lead {
  color: #d1d5db;
}

.community-accent {
  color: var(--pckt-blue);
  font-weight: 900;
  font-style: normal;
}

.community-mobile-scroll {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 0.5rem 0 1.5rem;
  margin: 0 -1.5rem;
  padding-inline: 1.5rem;
  scrollbar-width: none;
}

.community-mobile-scroll::-webkit-scrollbar {
  display: none;
}

@media (min-width: 768px) {
  .community-mobile-scroll {
    display: none;
  }
}

.community-mobile-chip {
  flex-shrink: 0;
  text-decoration: none;
}

.community-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

@media (min-width: 640px) {
  .community-actions {
    flex-direction: row;
    justify-content: center;
  }
}
</style>
