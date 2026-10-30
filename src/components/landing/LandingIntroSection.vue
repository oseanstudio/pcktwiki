<script setup lang="ts">
import { RouterLink } from 'vue-router'
import PcktBrand from '@/components/PcktBrand.vue'
import GlobalWikiSearch from '@/components/GlobalWikiSearch.vue'
import WikiPortalColumns from '@/components/WikiPortalColumns.vue'
</script>

<template>
  <section class="intro" aria-labelledby="intro-title">
    <div class="intro-inner">
      <header class="intro-header landing-stack landing-stack-header">
        <PcktBrand size="lg" suffix=".wiki" animated class="intro-brand" />

        <h1 id="intro-title" class="intro-headline">
          Your wiki in your Pocket
        </h1>

        <GlobalWikiSearch class="intro-search" input-id="landing-wiki-search" />

        <ul class="intro-highlights" aria-label="Key ideas">
          <li>
            <span class="intro-dot intro-dot-red" aria-hidden="true" />
            Write wiki articles
          </li>
          <li>
            <span class="intro-dot intro-dot-green" aria-hidden="true" />
            Link articles together
          </li>
          <li>
            <span class="intro-dot intro-dot-blue" aria-hidden="true" />
            Explore public wikis
          </li>
        </ul>

        <div class="intro-actions">
          <RouterLink to="/wikis" class="btn btn-landing-green-tint btn-lg">
            Browse wikis
          </RouterLink>
          <a href="#guest-feed" class="intro-scroll-link">See live updates ↓</a>
        </div>
      </header>

      <div id="wiki-portal" class="intro-portal" aria-labelledby="wiki-portal-title">
        <header class="intro-portal-header">
          <h2 id="wiki-portal-title" class="intro-portal-title">Public wikis</h2>
          <p class="intro-portal-lead muted">
            Featured reads and community wikis stored on their authors' PDS hosts.
          </p>
          <RouterLink to="/wikis" class="intro-portal-link">Browse all wikis →</RouterLink>
        </header>

        <WikiPortalColumns />
      </div>
    </div>
  </section>
</template>

<style scoped>
.intro {
  padding: clamp(1rem, 3dvh, 1.5rem) clamp(1rem, 4vw, 1.5rem) clamp(2rem, 5dvh, 3rem);
  background: var(--pckt-bg);
}

.intro-inner {
  display: flex;
  flex-direction: column;
  gap: clamp(1.25rem, 3dvh, 1.75rem);
}

.intro-brand {
  display: inline-flex;
  margin-bottom: clamp(0.75rem, 2dvh, 1rem);
  color: inherit;
}

.intro-headline {
  margin: 0 0 0.5rem;
  max-width: 22ch;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.375rem, 4.5vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.12;
  text-wrap: balance;
}

.intro-search {
  margin-bottom: 1rem;
}

.intro-highlights {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.875rem;
  justify-content: center;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--pckt-text);
}

.intro-highlights li {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
}

.intro-dot {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.intro-dot-red {
  background: var(--pckt-red);
}

.intro-dot-green {
  background: var(--pckt-green);
}

.intro-dot-blue {
  background: var(--pckt-blue);
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
}

.intro-scroll-link {
  flex-basis: 100%;
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--pckt-text-muted);
  text-decoration: none;
}

.intro-scroll-link:hover {
  color: var(--pckt-text);
  text-decoration: underline;
}

.intro-portal {
  width: min(88rem, 100%);
  max-width: 100%;
  margin-inline: auto;
}

.intro-portal-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 1rem;
  margin-bottom: 1.25rem;
}

.intro-portal-title {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.25rem, 4vw, 1.5rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.intro-portal-lead {
  flex: 1 1 16rem;
  margin: 0;
  font-size: clamp(0.875rem, 2.8vw, 0.9375rem);
  line-height: 1.45;
}

.intro-portal-link {
  margin-left: auto;
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--pckt-blue);
  text-decoration: none;
  white-space: nowrap;
}

.intro-portal-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
