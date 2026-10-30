<script setup lang="ts">
import LandingWikiDemo from '@/components/landing/LandingWikiDemo.vue'
</script>

<template>
  <section id="wiki-demo" class="landing-wiki-demo" aria-label="Interactive wiki demo">
    <div class="landing-wiki-demo-inner">
      <LandingWikiDemo />
    </div>
  </section>
</template>

<style scoped>
.landing-wiki-demo {
  padding: 2rem clamp(1rem, 3vw, 2.5rem);
  background: var(--pckt-bg);
  border-bottom: 1px solid var(--pckt-border);
}

.landing-wiki-demo-inner {
  max-width: 88rem;
  margin: 0 auto;
}
</style>
