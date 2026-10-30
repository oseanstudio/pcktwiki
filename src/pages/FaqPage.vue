<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="faq-page">
    <div class="faq-inner">
      <header class="faq-header">
        <RouterLink to="/" class="faq-back muted">← Home</RouterLink>
        <h1 class="faq-title">FAQ</h1>
        <p class="faq-lead muted">Short answers about how pckt.wiki works.</p>
      </header>

      <div class="faq-sections">
        <section class="faq-section card" data-kb-section>
          <h2>Connection badges</h2>
          <p class="faq-intro muted">
            On the home page and <RouterLink to="/learn">Learn</RouterLink> feed, wiki pairs can show a
            small label explaining how they connect.
          </p>

          <dl class="faq-list">
            <div class="faq-item">
              <dt>
                <span class="faq-badge badge-suggested">Suggested</span>
              </dt>
              <dd>
                A reading path we picked by hand — like “start here, then try this wiki next.”
              </dd>
            </div>
            <div class="faq-item">
              <dt>
                <span class="faq-badge badge-wikilink">Wikilink</span>
              </dt>
              <dd>
                A real link inside a wiki page, found automatically when the feed loads.
              </dd>
            </div>
            <div class="faq-item">
              <dt>
                <span class="faq-badge badge-linked">Linked</span>
              </dt>
              <dd>
                Someone bookmarked one wiki from another — found via Constellation (see above).
              </dd>
            </div>
          </dl>
        </section>

        <section class="faq-section card" data-kb-section>
          <h2>Constellation (by Microcosm)</h2>
          <p class="faq-intro muted">
            Some features on pckt.wiki use
            <a href="https://constellation.microcosm.blue/" target="_blank" rel="noopener noreferrer">
              Constellation
            </a>
            — a free public service from
            <a href="https://microcosm.blue/" target="_blank" rel="noopener noreferrer">Microcosm</a>.
          </p>
          <dl class="faq-list">
            <div class="faq-item">
              <dt>What does it do?</dt>
              <dd>
                It watches the AT Protocol network and keeps track of who links to what — bookmarks,
                posts, wiki records, and more.
              </dd>
            </div>
            <div class="faq-item">
              <dt>Why does pckt.wiki use it?</dt>
              <dd>
                Wikis live on many different servers. Constellation lets us ask “who else on the
                network points here?” without copying everyone’s data.
              </dd>
            </div>
            <div class="faq-item">
              <dt>Where do I see it?</dt>
              <dd>
                <strong>Referenced across the network</strong> on wiki pages, and
                <span class="faq-badge badge-linked">Linked</span> badges in the feed.
              </dd>
            </div>
          </dl>
        </section>

        <section class="faq-section card" data-kb-section>
          <h2>Links on a wiki page</h2>
          <dl class="faq-list">
            <div class="faq-item">
              <dt>Backlinks</dt>
              <dd>Other pages in the <em>same</em> wiki that link to the page you’re reading.</dd>
            </div>
            <div class="faq-item">
              <dt>Referenced across the network</dt>
              <dd>
                Bookmarks or Bluesky posts elsewhere on AT Protocol that point at this page or wiki.
                Powered by Constellation. Nothing appears here automatically — a wiki admin reviews
                what links in and ticks the ones that show on the page.
              </dd>
            </div>
            <div class="faq-item">
              <dt>Wikilinks</dt>
              <dd>
                Links between pages written as <code>[[page]]</code> or
                <code>[[@handle/wiki-slug/page]]</code> in the article text.
              </dd>
            </div>
          </dl>
        </section>

        <section class="faq-section card" data-kb-section>
          <h2>The basics</h2>
          <dl class="faq-list">
            <div class="faq-item">
              <dt>What is pckt.wiki?</dt>
              <dd>
                A place to read and write wikis on the open social web. Your articles live on your
                account, not on our servers.
              </dd>
            </div>
            <div class="faq-item">
              <dt>What is a PDS?</dt>
              <dd>
                Your personal data server — where your wiki records are stored. Different wikis can
                live on different hosts and still link to each other.
              </dd>
            </div>
            <div class="faq-item">
              <dt>What is the Learn feed?</dt>
              <dd>
                A sample of public wikis and recent edits, grouped by topic. It’s a starting point
                for discovery, not a full catalog — see
                <RouterLink to="/wikis">Browse wikis</RouterLink> or
                <RouterLink to="/search">Search</RouterLink> for more.
              </dd>
            </div>
            <div class="faq-item">
              <dt>Do I need an account to read?</dt>
              <dd>No. Public wikis are open to everyone. Sign in only to create or edit your own.</dd>
            </div>
            <div class="faq-item">
              <dt>What is Lichen?</dt>
              <dd>
                The wiki format pckt.wiki uses on AT Protocol.
                <a href="https://lichen.wiki" target="_blank" rel="noopener noreferrer">lichen.wiki</a>
                has the full spec.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-page {
  background: var(--pckt-bg);
  padding: 2rem clamp(1rem, 3vw, 2.5rem) 5rem;
  min-height: calc(100dvh - 3rem);
}

.faq-inner {
  max-width: 40rem;
  margin: 0 auto;
}

.faq-back {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-decoration: none;
}

.faq-back:hover {
  text-decoration: underline;
}

.faq-title {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(2rem, 4.5vw, 2.75rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.faq-lead {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  line-height: 1.5;
}

.faq-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.faq-section {
  padding: 1.25rem 1.375rem;
}

.faq-section h2 {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.0625rem;
  font-weight: 900;
}

.faq-intro {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.faq-intro a {
  color: inherit;
  font-weight: 600;
}

.faq-list {
  margin: 0;
}

.faq-item {
  padding: 0.875rem 0;
  border-top: 1px solid var(--pckt-border);
}

.faq-item:first-child {
  padding-top: 0;
  border-top: none;
}

.faq-item dt {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 800;
}

.faq-item dd {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.faq-item dd em,
.faq-item dd strong {
  font-style: normal;
  font-weight: 600;
  color: var(--pckt-text);
}

.faq-item dd .faq-badge {
  vertical-align: 0.05em;
}

.faq-item code {
  font-family: var(--pckt-font-mono);
  font-size: 0.8125em;
}

.faq-item a {
  color: var(--pckt-blue);
  font-weight: 600;
}

.faq-badge {
  display: inline-block;
  font-family: var(--pckt-font-ui);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.125rem 0.375rem;
  border-radius: var(--pckt-radius-pill);
}

.badge-suggested {
  background: color-mix(in srgb, var(--pckt-blue) 12%, transparent);
  color: var(--pckt-blue);
}

.badge-wikilink {
  background: color-mix(in srgb, var(--pckt-green) 12%, transparent);
  color: var(--pckt-green-active);
}

.badge-linked {
  background: color-mix(in srgb, var(--pckt-red) 12%, transparent);
  color: var(--pckt-red);
}
</style>
