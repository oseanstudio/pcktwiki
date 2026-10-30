<script setup lang="ts">
import WikiBrowseGrid from '@/components/WikiBrowseGrid.vue'
</script>

<template>
  <section id="explore-wikis" class="explore-section">
    <div class="explore-inner">
      <div class="explore-header">
        <div>
          <h2 class="explore-title">See what's live:</h2>
          <p class="explore-subtitle">
            <span class="explore-subtitle-mobile">Public wikis from the Lichen community.</span>
            <span class="explore-subtitle-desktop">Public wikis from the Lichen community — open in pckt.wiki.</span>
          </p>
        </div>
      </div>

      <WikiBrowseGrid />
    </div>
  </section>
</template>

<style scoped>
.explore-section {
  background: #fbf4e3;
  padding: 3rem 1.5rem 5rem;
}

[data-theme='dark'] .explore-section {
  background: #1d1a15;
}

.explore-inner {
  max-width: 64rem;
  margin: 0 auto;
}

.explore-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.explore-title {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.explore-subtitle {
  margin: 0.25rem 0 0;
  font-family: var(--pckt-font-ui);
  font-size: 1.125rem;
  font-style: italic;
  color: rgba(17, 24, 39, 0.7);
}

@media (min-width: 768px) {
  .explore-subtitle {
    font-size: 1.25rem;
  }
}

[data-theme='dark'] .explore-subtitle {
  color: rgba(249, 250, 251, 0.7);
}

.explore-subtitle-mobile {
  display: inline;
}

.explore-subtitle-desktop {
  display: none;
}

@media (min-width: 640px) {
  .explore-subtitle-mobile {
    display: none;
  }

  .explore-subtitle-desktop {
    display: inline;
  }
}

</style>
