<script setup lang="ts">
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { markMotionEnterPlayed } from '@/composables/useMotionEnter'
import { usePageRestoreKey } from '@/composables/usePageRestoreKey'
import ColorStrip from '@/components/ColorStrip.vue'
import LandingIntroSection from '@/components/landing/LandingIntroSection.vue'
import LandingWikiDemoSection from '@/components/landing/LandingWikiDemoSection.vue'
import LandingGuestFeedSection from '@/components/landing/LandingGuestFeedSection.vue'
import LandingHowItWorksSection from '@/components/landing/LandingHowItWorksSection.vue'
import LandingFeaturesSection from '@/components/landing/LandingFeaturesSection.vue'
import LandingAboutSection from '@/components/landing/LandingAboutSection.vue'
import LandingCommunitySection from '@/components/landing/LandingCommunitySection.vue'
import LandingExploreSection from '@/components/landing/LandingExploreSection.vue'
import LandingFooterSection from '@/components/landing/LandingFooterSection.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const restoreKey = usePageRestoreKey()

onBeforeRouteLeave(() => {
  markMotionEnterPlayed()
})

// Only follow same-origin in-app paths — a crafted `?redirect=` must never
// steer the post-sign-in navigation.
const rawRedirect = route.query.redirect
const redirect =
  typeof rawRedirect === 'string' && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : undefined
if (auth.isAuthenticated && redirect) {
  router.replace(redirect)
}
</script>

<template>
  <div class="landing">
    <div data-kb-section aria-label="Introduction">
      <LandingIntroSection :key="restoreKey" />
    </div>
    <ColorStrip />
    <div data-kb-section aria-label="Guest feed">
      <LandingGuestFeedSection :featured="true" :compact-header="true" />
    </div>
    <div data-kb-section aria-label="Wiki demo">
      <LandingWikiDemoSection />
    </div>
    <div data-kb-section aria-label="How it works">
      <LandingHowItWorksSection />
    </div>
    <div data-kb-section aria-label="Features">
      <LandingFeaturesSection />
    </div>
    <div data-kb-section aria-label="About">
      <LandingAboutSection />
    </div>
    <div data-kb-section aria-label="Community">
      <LandingCommunitySection />
    </div>
    <div data-kb-section aria-label="Explore">
      <LandingExploreSection />
    </div>
    <div data-kb-section aria-label="Footer">
      <LandingFooterSection />
    </div>
  </div>
</template>

<style scoped>
.landing {
  width: 100%;
}
</style>
