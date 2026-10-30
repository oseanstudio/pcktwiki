<script setup lang="ts">
import { RouterLink } from 'vue-router'
import PcktBrand from '@/components/PcktBrand.vue'
import LandingSignInCard from '@/components/landing/LandingSignInCard.vue'
import LandingWikiDemo from '@/components/landing/LandingWikiDemo.vue'
</script>

<template>
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-copy">
        <PcktBrand size="lg" suffix=".wiki" animated class="hero-brand" />

        <h1 class="hero-headline">
          Your personal wiki on the open social web
        </h1>

        <p class="hero-lead">
          Collect knowledge, link articles together, and build wikis that live in your AT Protocol account —
          portable, interoperable, and yours forever.
        </p>

        <ul class="hero-highlights" aria-label="Key benefits">
          <li>
            <span class="hero-highlight-dot hero-highlight-red" aria-hidden="true" />
            Pocket wikis
          </li>
          <li>
            <span class="hero-highlight-dot hero-highlight-green" aria-hidden="true" />
            Data stays yours
          </li>
          <li>
            <span class="hero-highlight-dot hero-highlight-blue" aria-hidden="true" />
            Wikilinks &amp; history
          </li>
        </ul>

        <div class="hero-actions">
          <RouterLink to="/wikis" class="btn btn-landing btn-lg">
            Browse wikis
          </RouterLink>
          <a href="#guest-feed" class="btn btn-landing-green-tint btn-lg">
            See what's live
          </a>
        </div>
      </div>

      <div class="hero-aside">
        <LandingWikiDemo />
        <LandingSignInCard />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 2.5rem 1.5rem 3rem;
  background: var(--pckt-bg);
}

.hero-inner {
  max-width: 72rem;
  margin: 0 auto;
  display: grid;
  gap: 2.5rem;
  align-items: start;
}

@media (min-width: 960px) {
  .hero-inner {
    grid-template-columns: 1.1fr 0.9fr;
    gap: 3rem;
    align-items: center;
  }
}

.hero-copy {
  text-align: center;
}

@media (min-width: 960px) {
  .hero-copy {
    text-align: left;
  }
}

.hero-brand {
  display: inline-flex;
  color: inherit;
  text-decoration: none;
  margin-bottom: 1.25rem;
}

.hero-brand:hover {
  text-decoration: none;
}

.hero-headline {
  margin: 0 0 1rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.08;
  text-wrap: balance;
}

.hero-lead {
  margin: 0 0 1.5rem;
  max-width: 36rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.125rem;
  line-height: 1.55;
  color: var(--pckt-text-muted);
  text-wrap: pretty;
}

@media (min-width: 960px) {
  .hero-lead {
    font-size: 1.25rem;
  }
}

.hero-highlights {
  list-style: none;
  margin: 0 0 2rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--pckt-text);
}

@media (min-width: 960px) {
  .hero-highlights {
    align-items: flex-start;
  }
}

.hero-highlights li {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

@media (max-width: 959px) {
  .hero-highlights li {
    justify-content: center;
  }
}

.hero-highlight-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.hero-highlight-red {
  background: var(--pckt-red);
}

.hero-highlight-green {
  background: var(--pckt-green);
}

.hero-highlight-blue {
  background: var(--pckt-blue);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

@media (min-width: 960px) {
  .hero-actions {
    justify-content: flex-start;
  }
}

.hero-aside {
  display: grid;
  gap: 1rem;
  max-width: 28rem;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 960px) {
  .hero-aside {
    margin: 0;
    max-width: none;
  }
}
</style>
