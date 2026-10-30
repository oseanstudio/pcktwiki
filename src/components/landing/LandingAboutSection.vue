<script setup lang="ts">
import { assetUrl } from '@/lib/base-url'

const wordmarkSrc = assetUrl('brand-assets/pckt-color.svg')
</script>

<template>
  <section class="about-section">
    <div class="about-inner">
      <div class="about-intro">
        <h2 class="about-title">
          What is
          <img
            class="about-wordmark"
            :src="wordmarkSrc"
            alt="pckt"
            width="120"
            height="51"
          />?
        </h2>
        <p class="about-tagline">
          Your personal wiki on the open social web. A cozy place to collect knowledge and link it
          together — powered by Lichen records in your PDS.
        </p>
      </div>

      <div class="about-features">
        <article class="about-feature">
          <div class="about-feature-visual about-feature-visual-red" aria-hidden="true">
            <span class="about-feature-glyph">[[ ]]</span>
          </div>
          <div class="about-feature-copy">
            <h3>Just start writing</h3>
            <p>
              <strong>Without setup headaches or lock-in.</strong>
              Create articles, link them with wikilinks, and build a wiki that lives in your AT Protocol
              account — readable on pckt.wiki or lichen.wiki.
            </p>
          </div>
        </article>

        <article class="about-feature about-feature-reverse">
          <div class="about-feature-visual about-feature-visual-yellow" aria-hidden="true">
            <span class="about-feature-glyph">✎</span>
          </div>
          <div class="about-feature-copy">
            <h3>Make it yours</h3>
            <p>
              Public or private wikis, role-based access, and themes.
              <strong>Your wiki feels like you</strong>, and your data stays portable across apps.
            </p>
          </div>
        </article>

        <article class="about-feature">
          <div class="about-feature-visual about-feature-visual-green" aria-hidden="true">
            <span class="about-feature-glyph">↺</span>
          </div>
          <div class="about-feature-copy">
            <h3>Every edit is yours</h3>
            <p>
              Revision history stored as diffs in your PDS.
              <strong>Full history, always available</strong> — interoperable with the Lichen ecosystem.
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-section {
  background: #fbf4e3;
  padding: 5rem 1.5rem;
}

[data-theme='dark'] .about-section {
  background: #1d1a15;
}

.about-inner {
  max-width: 64rem;
  margin: 0 auto;
}

.about-intro {
  text-align: center;
  margin-bottom: 5rem;
}

.about-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 0.75rem;
  margin: 0 0 1.25rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(2.25rem, 5vw, 3.75rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.about-wordmark {
  height: clamp(2.5rem, 6vw, 4rem);
  width: auto;
}

.about-tagline {
  margin: 0 auto;
  max-width: 42rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.25rem;
  font-style: italic;
  line-height: 1.45;
  color: #4b5563;
  text-wrap: balance;
}

@media (min-width: 768px) {
  .about-tagline {
    font-size: 1.875rem;
  }
}

[data-theme='dark'] .about-tagline {
  color: #d1d5db;
}

.about-features {
  display: grid;
  gap: 4rem;
}

.about-feature {
  display: grid;
  gap: 2rem;
  align-items: center;
}

@media (min-width: 768px) {
  .about-feature {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .about-feature-reverse .about-feature-visual {
    order: 2;
  }

  .about-feature-reverse .about-feature-copy {
    order: 1;
  }
}

.about-feature-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 12rem;
  border-radius: var(--pckt-radius-btn);
  border: 1px solid #dccaa4;
}

[data-theme='dark'] .about-feature-visual {
  border-color: #3a3025;
}

.about-feature-visual-red {
  background: color-mix(in srgb, var(--pckt-red) 12%, #fff);
}

.about-feature-visual-yellow {
  background: color-mix(in srgb, var(--pckt-yellow) 18%, #fff);
}

.about-feature-visual-green {
  background: color-mix(in srgb, var(--pckt-green) 14%, #fff);
}

.about-feature-glyph {
  font-family: var(--pckt-font-ui);
  font-size: 3rem;
  font-weight: 900;
  color: var(--pckt-text);
  opacity: 0.85;
}

.about-feature-copy h3 {
  margin: 0 0 1rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.about-feature:nth-child(1) .about-feature-copy h3 {
  color: var(--pckt-red);
}

.about-feature:nth-child(2) .about-feature-copy h3 {
  color: var(--pckt-blue);
}

.about-feature:nth-child(3) .about-feature-copy h3 {
  color: var(--pckt-green);
}

.about-feature-copy p {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 1.25rem;
  line-height: 1.5;
  color: #4b5563;
  text-wrap: pretty;
}

@media (min-width: 768px) {
  .about-feature-copy p {
    font-size: 1.5rem;
  }
}

[data-theme='dark'] .about-feature-copy p {
  color: #d1d5db;
}

.about-feature-copy strong {
  font-weight: 900;
  color: #374151;
}

[data-theme='dark'] .about-feature-copy strong {
  color: #f3f4f6;
}
</style>
