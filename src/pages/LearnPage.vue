<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useGuestFeed } from '@/composables/useGuestFeed'
import { GUEST_FEED_TOPICS } from '@/data/guest-feed'
import TopicDiscoveryGrid from '@/components/guest-feed/TopicDiscoveryGrid.vue'
import GuestFeedList from '@/components/guest-feed/GuestFeedList.vue'
import GuestFeedWikiCards from '@/components/guest-feed/GuestFeedWikiCards.vue'
import GuestFeedConnections from '@/components/guest-feed/GuestFeedConnections.vue'
import DeferredGuestFeedNetwork from '@/components/guest-feed/DeferredGuestFeedNetwork.vue'
import NetworkBusyNotice from '@/components/NetworkBusyNotice.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const feed = useGuestFeed()

onMounted(() => {
  void feed.load()
})

const items = computed(() => feed.filteredItems())

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
  <div class="learn-page">
    <div class="learn-inner">
      <header class="learn-header" data-kb-section aria-label="Learn overview">
        <RouterLink to="/" class="learn-back muted">← Home</RouterLink>
        <h1 class="learn-title">Learn on pckt.wiki</h1>
        <p class="learn-lead">
          Live wiki updates from communities across the AT Protocol network. Pick a topic, browse
          wikis on different PDS hosts, and follow cross-wiki connections.
        </p>
      </header>

      <div data-kb-section aria-label="Topics">
        <TopicDiscoveryGrid
          :topics="GUEST_FEED_TOPICS"
          :active-topic="feed.activeTopic.value"
          :wiki-counts="wikiCounts"
          :total-wiki-count="totalWikiCount"
          @select="feed.setTopic"
        />
      </div>

      <div v-if="feed.loading.value" class="learn-state muted card learn-state-card">
        Loading wiki updates…
      </div>
      <NetworkBusyNotice
        v-else-if="feed.error.value"
        class="learn-state-card"
        :message="feed.error.value"
        show-retry
        :suggest-sign-in="!auth.isAuthenticated && feed.rateLimited.value"
        sign-in-href="/#get-started"
        @retry="feed.load(true)"
      />

      <div
        v-else-if="feed.snapshot.value"
        class="learn-dashboard"
        data-kb-section
        aria-label="Wiki feed dashboard"
      >
        <NetworkBusyNotice
          v-if="feed.networkWarning.value"
          :message="feed.networkWarning.value"
          show-retry
          :suggest-sign-in="!auth.isAuthenticated && feed.rateLimited.value"
          sign-in-href="/#get-started"
          @retry="feed.load(true)"
        />
        <aside class="learn-panel card">
          <h2 class="learn-panel-title">Explore wikis</h2>
          <GuestFeedWikiCards :wikis="feed.filteredWikis()" />
        </aside>

        <section class="learn-panel card" aria-labelledby="learn-feed-title">
          <div class="learn-feed-header">
            <h2 id="learn-feed-title" class="learn-panel-title">Recent updates</h2>
            <p class="muted learn-feed-updated">
              Updated {{ new Date(feed.snapshot.value.fetchedAt).toLocaleString() }}
            </p>
          </div>
          <GuestFeedList v-if="items.length" grid :items="items" />
          <p v-else class="learn-state muted">No recent updates in this topic yet.</p>
          <div class="learn-feed-foot">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :disabled="feed.loading.value"
              @click="feed.load(true)"
            >
              Refresh feed
            </button>
            <RouterLink :to="{ path: '/', hash: '#get-started' }" class="btn btn-landing btn-sm">
              Start your wiki
            </RouterLink>
          </div>
        </section>

        <DeferredGuestFeedNetwork>
          <template #default="{ loading: networkLoading }">
            <aside class="learn-panel card">
              <h2 class="learn-panel-title">Related across PDS</h2>
              <p class="learn-panel-lead muted">
                <RouterLink to="/faq">What do the badges mean?</RouterLink>
              </p>
              <GuestFeedConnections :edges="feed.filteredEdges()" />
              <p v-if="networkLoading" class="learn-state muted">Loading network links…</p>
            </aside>
          </template>
        </DeferredGuestFeedNetwork>
      </div>

      <section class="learn-curate card" data-kb-section aria-label="Curate feed">
        <h2>Curate this feed</h2>
        <p class="muted">
          Guest-feed wikis and cross-wiki relationships are configured in
          <code>src/data/guest-feed.ts</code>.
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.learn-page {
  background: var(--pckt-bg);
  padding: 2rem clamp(1rem, 3vw, 2.5rem) 5rem;
  min-height: calc(100dvh - 3rem);
}

.learn-inner {
  max-width: 88rem;
  margin: 0 auto;
}

.learn-back {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-decoration: none;
}

.learn-back:hover {
  text-decoration: underline;
}

.learn-title {
  margin: 0 0 0.75rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(2rem, 4.5vw, 2.75rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.learn-lead {
  margin: 0 0 1.5rem;
  max-width: 44rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.0625rem;
  line-height: 1.55;
  color: var(--pckt-text-muted);
}

.learn-dashboard {
  display: grid;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

@media (min-width: 900px) {
  .learn-dashboard {
    grid-template-columns: minmax(14rem, 0.95fr) minmax(0, 1.5fr) minmax(14rem, 0.95fr);
    gap: 1.125rem;
  }
}

@media (min-width: 1200px) {
  .learn-dashboard {
    grid-template-columns: minmax(16rem, 1fr) minmax(0, 1.75fr) minmax(16rem, 1fr);
    gap: 1.25rem;
  }
}

.learn-panel {
  padding: 1.125rem 1.25rem;
  min-width: 0;
}

.learn-panel-title {
  margin: 0 0 0.875rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 900;
}

.learn-panel-lead {
  margin: -0.5rem 0 0.75rem;
  font-size: 0.8125rem;
}

.learn-panel-lead a {
  color: var(--pckt-blue);
  font-weight: 600;
  text-decoration: none;
}

.learn-panel-lead a:hover {
  text-decoration: underline;
}

.learn-feed-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.875rem;
}

.learn-feed-header .learn-panel-title {
  margin-bottom: 0;
}

.learn-feed-updated {
  margin: 0;
  font-size: 0.75rem;
}

.learn-state-card {
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.learn-state {
  margin: 0;
  font-size: 0.9375rem;
}

.learn-feed-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pckt-border);
}

.learn-curate {
  padding: 1.25rem 1.375rem;
}

.learn-curate h2 {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 1rem;
  font-weight: 900;
}

.learn-curate p {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.learn-curate code {
  font-family: var(--pckt-font-mono);
  font-size: 0.8125em;
}
</style>
