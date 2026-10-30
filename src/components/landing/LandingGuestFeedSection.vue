<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import PcktBrand from '@/components/PcktBrand.vue'
import { useGuestFeed } from '@/composables/useGuestFeed'
import { GUEST_FEED_TOPICS } from '@/data/guest-feed'
import TopicDiscoveryGrid from '@/components/guest-feed/TopicDiscoveryGrid.vue'
import GuestFeedList from '@/components/guest-feed/GuestFeedList.vue'
import GuestFeedWikiCards from '@/components/guest-feed/GuestFeedWikiCards.vue'
import GuestFeedConnections from '@/components/guest-feed/GuestFeedConnections.vue'
import DeferredGuestFeedNetwork from '@/components/guest-feed/DeferredGuestFeedNetwork.vue'
import WikiConstellation from '@/components/guest-feed/WikiConstellation.vue'
import MakeWikiLink from '@/components/MakeWikiLink.vue'
import LandingSignInCard from '@/components/landing/LandingSignInCard.vue'
import NetworkBusyNotice from '@/components/NetworkBusyNotice.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const props = withDefaults(
  defineProps<{
    featured?: boolean
    /** Hide the large brand/title header when the landing intro is shown above the color strip. */
    compactHeader?: boolean
    previewLimit?: number
    wikiPreviewLimit?: number
    connectionPreviewLimit?: number
    showMap?: boolean
  }>(),
  {
    featured: false,
    compactHeader: false,
    previewLimit: 4,
    wikiPreviewLimit: 3,
    connectionPreviewLimit: 3,
    showMap: false,
  },
)

const feed = useGuestFeed()

onMounted(() => {
  void feed.load()
})

const previewItems = computed(() => feed.filteredItems().slice(0, props.previewLimit))

const previewWikis = computed(() => feed.filteredWikis().slice(0, props.wikiPreviewLimit))

const previewEdges = computed(() => feed.filteredEdges().slice(0, props.connectionPreviewLimit))

const wikiCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const topic of GUEST_FEED_TOPICS) {
    counts[topic.id] = (feed.snapshot.value?.wikis ?? []).filter((wiki) =>
      wiki.topics.includes(topic.id),
    ).length
  }
  return counts
})

const totalWikiCount = computed(() => feed.snapshot.value?.wikis.length ?? 0)
</script>

<template>
  <section
    id="guest-feed"
    class="guest-feed-section"
    :class="{ featured }"
    aria-labelledby="guest-feed-title"
  >
    <div class="guest-feed-inner">
      <header
        v-if="featured && compactHeader"
        class="guest-feed-header guest-feed-header-compact landing-stack-header"
      >
        <div class="guest-feed-header-main">
          <h2 id="guest-feed-title" class="guest-feed-title guest-feed-title-compact">
            Live from the network
          </h2>
          <p class="guest-feed-lead guest-feed-lead-compact muted">
            Pick a topic — explore wikis, recent updates, and links across PDS hosts.
          </p>
        </div>
        <LandingSignInCard
          v-if="!auth.isAuthenticated && !auth.loading"
          compact
          anchor-id="get-started"
          class="guest-feed-sign-in"
        />
      </header>

      <header v-else class="guest-feed-header">
        <div class="guest-feed-intro">
          <PcktBrand
            v-if="featured"
            size="md"
            suffix=".wiki"
            animated
            class="guest-feed-brand"
          />

          <h1 v-if="featured" id="guest-feed-title" class="guest-feed-title">
            Learn from wikis across the network
          </h1>
          <h2 v-else id="guest-feed-title" class="guest-feed-title">
            What's new to learn
          </h2>

          <p class="guest-feed-lead">
            Live updates from public wikis on different PDS hosts — pick a topic, browse wikis,
            and follow what communities are writing.
          </p>
        </div>

        <div v-if="featured" class="guest-feed-actions">
          <RouterLink to="/wikis" class="btn btn-landing btn-lg">Browse wikis</RouterLink>
          <MakeWikiLink />
        </div>
        <RouterLink v-else to="/learn" class="btn btn-landing-green-tint btn-landing-pill">
          Open learn feed
        </RouterLink>
      </header>

      <TopicDiscoveryGrid
        v-if="featured && GUEST_FEED_TOPICS.length"
        :topics="GUEST_FEED_TOPICS"
        :active-topic="feed.activeTopic.value"
        :wiki-counts="wikiCounts"
        :total-wiki-count="totalWikiCount"
        @select="feed.setTopic"
      />

      <div v-else-if="GUEST_FEED_TOPICS.length" class="topic-filters" role="tablist" aria-label="Filter by topic">
        <button
          type="button"
          class="topic-filter"
          :class="{ active: !feed.activeTopic.value }"
          role="tab"
          :aria-selected="!feed.activeTopic.value"
          @click="feed.setTopic(null)"
        >
          All topics
        </button>
        <button
          v-for="topic in GUEST_FEED_TOPICS"
          :key="topic.id"
          type="button"
          class="topic-filter"
          :class="{ active: feed.activeTopic.value === topic.id }"
          role="tab"
          :aria-selected="feed.activeTopic.value === topic.id"
          @click="feed.setTopic(topic.id)"
        >
          {{ topic.label }}
        </button>
      </div>

      <div v-if="feed.loading.value" class="guest-feed-state muted card guest-feed-state-card">
        Loading latest wiki updates…
      </div>
      <NetworkBusyNotice
        v-else-if="feed.error.value"
        class="guest-feed-state-card"
        :message="feed.error.value"
        show-retry
        :suggest-sign-in="!auth.isAuthenticated && feed.rateLimited.value"
        sign-in-href="#get-started"
        @retry="feed.load(true)"
      />

      <div v-else-if="feed.snapshot.value && featured" class="guest-feed-dashboard">
        <NetworkBusyNotice
          v-if="feed.networkWarning.value"
          class="guest-feed-network-notice"
          :message="feed.networkWarning.value"
          show-retry
          :suggest-sign-in="!auth.isAuthenticated && feed.rateLimited.value"
          sign-in-href="#get-started"
          @retry="feed.load(true)"
        />
        <aside class="guest-feed-panel guest-feed-panel-wikis card">
          <h2 class="guest-feed-panel-title">Explore wikis</h2>
          <p class="guest-feed-panel-lead muted">
            Public wikis in this topic — each on its author's PDS.
          </p>
          <GuestFeedWikiCards compact likeable :wikis="previewWikis" />
        </aside>

        <section class="guest-feed-panel guest-feed-panel-feed card" aria-labelledby="feed-panel-title">
          <div class="guest-feed-panel-head">
            <h2 id="feed-panel-title" class="guest-feed-panel-title">Recent updates</h2>
            <RouterLink to="/learn" class="guest-feed-panel-link">View all →</RouterLink>
          </div>
          <GuestFeedList
            v-if="previewItems.length"
            compact
            likeable
            :items="previewItems"
          />
          <p v-else class="guest-feed-state muted">No recent updates in this topic yet.</p>
        </section>

        <DeferredGuestFeedNetwork>
          <template #default="{ loading: networkLoading }">
            <aside class="guest-feed-panel guest-feed-panel-links card">
              <h2 class="guest-feed-panel-title">Related across PDS</h2>
              <p class="guest-feed-panel-lead muted">
                How wikis link across hosts.
                <RouterLink to="/faq" class="guest-feed-panel-faq">Badge meanings →</RouterLink>
              </p>
              <GuestFeedConnections compact :edges="previewEdges" />
              <p v-if="networkLoading" class="guest-feed-state muted">Loading network links…</p>
            </aside>
          </template>
        </DeferredGuestFeedNetwork>
      </div>

      <div
        v-else-if="!feed.loading.value && !feed.error.value && !feed.snapshot.value"
        class="guest-feed-state muted card guest-feed-state-card"
      >
        Live feed is unavailable right now. Try refreshing the page.
      </div>

      <div v-else-if="feed.snapshot.value" class="guest-feed-body">
        <NetworkBusyNotice
          v-if="feed.networkWarning.value"
          class="guest-feed-network-notice"
          :message="feed.networkWarning.value"
          show-retry
          :suggest-sign-in="!auth.isAuthenticated && feed.rateLimited.value"
          sign-in-href="#get-started"
          @retry="feed.load(true)"
        />
        <div class="guest-feed-main card">
          <GuestFeedList v-if="previewItems.length" :items="previewItems" />
          <p v-else class="guest-feed-state muted">No recent updates in this topic yet.</p>
          <footer class="guest-feed-panel-foot">
            <RouterLink to="/learn">See all updates on the learn feed →</RouterLink>
          </footer>
        </div>

        <DeferredGuestFeedNetwork v-if="showMap">
          <template #default="{ loading: networkLoading }">
            <aside class="guest-feed-aside">
              <div class="guest-feed-map card">
                <h2 class="guest-feed-panel-title">How wikis connect</h2>
                <p v-if="networkLoading" class="guest-feed-state muted">Loading network links…</p>
                <WikiConstellation
                  :wikis="feed.filteredWikis()"
                  :edges="feed.filteredEdges()"
                />
              </div>
            </aside>
          </template>
        </DeferredGuestFeedNetwork>
      </div>
    </div>
  </section>
</template>

<style scoped>
.guest-feed-section {
  padding: 2rem 1.5rem 3rem;
  background: var(--pckt-bg);
  scroll-margin-top: 4rem;
}

.guest-feed-section.featured {
  padding: 1.25rem clamp(1rem, 3vw, 2.5rem) 2.5rem;
  border-bottom: 1px solid var(--pckt-border);
  background: var(--pckt-bg-elevated);
}

.guest-feed-section.featured:has(.guest-feed-header-compact) {
  padding-top: clamp(1.75rem, 4dvh, 2.5rem);
}

.guest-feed-inner {
  max-width: 48rem;
  margin: 0 auto;
}

.featured .guest-feed-inner:not(.landing-stack) {
  max-width: 88rem;
}

.guest-feed-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.guest-feed-header-compact {
  gap: 1.25rem;
  margin-bottom: 1.5rem;
  align-items: stretch;
  text-align: left;
  width: 100%;
  max-width: none;
}

.guest-feed-header-compact.landing-stack-header {
  align-items: stretch;
}

@media (min-width: 900px) {
  .guest-feed-header-compact {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.5rem;
  }
}

.guest-feed-header-main {
  min-width: min(100%, 20rem);
  flex: 1 1 auto;
}

.guest-feed-sign-in {
  flex-shrink: 0;
  width: min(100%, 28rem);
  margin-inline: auto;
}

@media (min-width: 900px) {
  .guest-feed-sign-in {
    margin-inline: 0 0;
    margin-left: auto;
  }
}

.guest-feed-title-compact {
  font-size: clamp(1.5rem, 4.5vw, 2rem);
  margin-bottom: 0.375rem;
  max-width: none;
  color: var(--pckt-text);
  text-wrap: balance;
}

.guest-feed-lead-compact {
  font-size: clamp(0.9375rem, 2.8vw, 1.0625rem);
  max-width: 42ch;
  line-height: 1.5;
  text-wrap: pretty;
}

@media (min-width: 900px) {
  .featured .guest-feed-header:not(.guest-feed-header-compact) {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2rem;
  }
}

.guest-feed-brand {
  display: inline-flex;
  margin-bottom: 0.875rem;
  color: inherit;
  text-decoration: none;
}

.guest-feed-brand:hover {
  text-decoration: none;
}

.guest-feed-title {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.08;
  text-wrap: balance;
}

.featured .guest-feed-title {
  font-size: clamp(2rem, 3.5vw, 2.75rem);
  max-width: none;
}

.guest-feed-lead {
  margin: 0;
  max-width: 42rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
  text-wrap: pretty;
}

.featured .guest-feed-lead {
  font-size: 1.125rem;
}

.guest-feed-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  flex-shrink: 0;
}

.topic-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.topic-filter {
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius-pill);
  padding: 0.375rem 0.875rem;
  background: var(--pckt-bg-elevated);
  color: var(--pckt-text-muted);
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.topic-filter.active {
  background: color-mix(in srgb, var(--pckt-blue) 12%, var(--pckt-bg-elevated));
  border-color: color-mix(in srgb, var(--pckt-blue) 35%, var(--pckt-border));
  color: var(--pckt-blue);
}

.guest-feed-dashboard {
  display: grid;
  gap: 1rem;
  align-items: start;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 960px) {
  .guest-feed-dashboard {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr) minmax(0, 1fr);
    align-items: stretch;
  }
}

.guest-feed-panel {
  padding: 1.125rem 1.25rem;
  min-width: 0;
  text-align: left;
}

.guest-feed-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.guest-feed-panel-title {
  margin: 0 0 0.375rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.guest-feed-panel-head .guest-feed-panel-title {
  margin-bottom: 0;
}

.guest-feed-panel-lead {
  margin: 0 0 0.875rem;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.guest-feed-panel-faq {
  display: inline-block;
  margin-left: 0.375rem;
  color: var(--pckt-blue);
  font-weight: 600;
  text-decoration: none;
}

.guest-feed-panel-faq:hover {
  text-decoration: underline;
}

.guest-feed-panel-link {
  flex-shrink: 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--pckt-red);
  text-decoration: none;
}

.guest-feed-panel-link:hover {
  text-decoration: underline;
}

.guest-feed-state-card {
  padding: 1.25rem;
}

.guest-feed-state {
  margin: 0;
  font-size: 0.9375rem;
}

.guest-feed-network-notice {
  grid-column: 1 / -1;
}

.guest-feed-body {
  display: grid;
  gap: 1rem;
}

@media (min-width: 960px) {
  .guest-feed-body {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  }
}

.guest-feed-main,
.guest-feed-map {
  padding: 1.25rem 1.375rem;
}

.guest-feed-aside {
  min-width: 0;
}

.guest-feed-panel-foot {
  margin-top: 1rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--pckt-border);
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  font-weight: 700;
}

.guest-feed-panel-foot a {
  color: var(--pckt-red);
  text-decoration: none;
}

.guest-feed-panel-foot a:hover {
  text-decoration: underline;
}
</style>
