<script setup lang="ts">
import { RouterLink } from 'vue-router'
import WikiPortalBox from '@/components/WikiPortalBox.vue'
import WikiAvatar from '@/components/WikiAvatar.vue'
import { useFeaturedWikis } from '@/composables/useFeaturedWikis'
import { notePath, wikiPath } from '@/data/featured-wikis'

const { portalSelection, loading } = useFeaturedWikis()

function didYouKnowLink(item: { wiki: { handle: string; slug: string }; noteSlug?: string }) {
  return item.noteSlug
    ? notePath(item.wiki.handle, item.wiki.slug, item.noteSlug)
    : wikiPath(item.wiki.handle, item.wiki.slug)
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatDate(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}
</script>

<template>
  <div class="wiki-portal-columns">
    <p v-if="loading && !portalSelection" class="portal-loading muted">Loading featured wikis…</p>

    <p v-else-if="!portalSelection" class="portal-loading muted">
      Featured wikis are unavailable right now.
    </p>

    <template v-else>
      <div class="wiki-portal-column wiki-portal-column-main">
        <WikiPortalBox title="Featured wiki" accent="blue">
          <article class="featured-wiki">
            <RouterLink
              :to="wikiPath(portalSelection.featuredWiki.handle, portalSelection.featuredWiki.slug)"
              class="featured-wiki-link"
            >
              <WikiAvatar
                :handle="portalSelection.featuredWiki.handle"
                :name="portalSelection.featuredWiki.name"
                :seed="portalSelection.featuredWiki.slug"
                :accent-color="portalSelection.featuredWiki.accentColor"
                :size="72"
              />
              <div class="featured-wiki-copy">
                <h3 class="featured-wiki-name">{{ portalSelection.featuredWiki.name }}</h3>
                <p class="featured-wiki-description">{{ portalSelection.featuredWiki.description }}</p>
                <p class="featured-wiki-meta">
                  @{{ portalSelection.featuredWiki.handle }} · {{ portalSelection.featuredWiki.noteCount }} articles
                </p>
              </div>
            </RouterLink>

            <p v-if="portalSelection.featuredDetail.intro" class="featured-wiki-intro">
              {{ portalSelection.featuredDetail.intro }}
            </p>

            <dl class="featured-wiki-facts">
              <div class="featured-wiki-fact">
                <dt>Articles</dt>
                <dd>{{ portalSelection.featuredWiki.noteCount }}</dd>
              </div>
              <div class="featured-wiki-fact">
                <dt>Language</dt>
                <dd>{{ portalSelection.featuredWiki.language }}</dd>
              </div>
              <div v-if="formatDate(portalSelection.featuredWiki.createdAt)" class="featured-wiki-fact">
                <dt>Started</dt>
                <dd>{{ formatDate(portalSelection.featuredWiki.createdAt) }}</dd>
              </div>
              <div v-if="formatDate(portalSelection.featuredWiki.updatedAt)" class="featured-wiki-fact">
                <dt>Last edit</dt>
                <dd>{{ formatDate(portalSelection.featuredWiki.updatedAt) }}</dd>
              </div>
            </dl>

            <div v-if="portalSelection.featuredDetail.highlights.length" class="featured-wiki-highlights">
              <h4 class="featured-wiki-subhead">Start reading</h4>
              <ul class="featured-wiki-highlight-list">
                <li
                  v-for="highlight in portalSelection.featuredDetail.highlights"
                  :key="highlight.slug"
                >
                  <RouterLink
                    :to="notePath(
                      portalSelection.featuredWiki.handle,
                      portalSelection.featuredWiki.slug,
                      highlight.slug,
                    )"
                    class="featured-wiki-highlight"
                  >
                    <strong>{{ highlight.title }}</strong>
                    <span v-if="highlight.excerpt" class="featured-wiki-highlight-excerpt">
                      {{ highlight.excerpt }}
                    </span>
                  </RouterLink>
                </li>
              </ul>
            </div>

            <p v-if="portalSelection.featuredDetail.moreTitles.length" class="featured-wiki-more muted">
              Also covers {{ portalSelection.featuredDetail.moreTitles.join(', ') }}.
            </p>

            <p class="featured-wiki-foot">
              <RouterLink
                :to="wikiPath(portalSelection.featuredWiki.handle, portalSelection.featuredWiki.slug)"
              >
                Open wiki
              </RouterLink>
              ·
              <span class="muted">@{{ portalSelection.featuredWiki.handle }}</span>
            </p>
          </article>
        </WikiPortalBox>

        <WikiPortalBox title="Did you know…" accent="yellow">
          <ul class="portal-list portal-list-dyk">
            <li
              v-for="item in portalSelection.didYouKnowItems"
              :key="`${item.wiki.handle}-${item.wiki.slug}-${item.noteSlug ?? 'wiki'}`"
            >
              {{ item.before }}<RouterLink :to="didYouKnowLink(item)">
                <strong>{{ item.highlight }}</strong> </RouterLink>{{ item.after }}
            </li>
          </ul>
        </WikiPortalBox>
      </div>

      <div class="wiki-portal-column wiki-portal-column-side">
        <WikiPortalBox title="In the community" accent="green">
          <ul class="portal-list portal-list-news">
            <li
              v-for="wiki in portalSelection.spotlightWikis"
              :key="`${wiki.handle}-${wiki.slug}`"
            >
              <RouterLink :to="wikiPath(wiki.handle, wiki.slug)" class="community-wiki-link">
                <WikiAvatar
                  :handle="wiki.handle"
                  :name="wiki.name"
                  :seed="wiki.slug"
                  :accent-color="wiki.accentColor"
                  :size="32"
                />
                <span>
                  <strong>{{ wiki.name }}</strong>
                  <span class="community-wiki-blurb">{{ wiki.description }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>
        </WikiPortalBox>

        <WikiPortalBox title="Growing wikis" accent="red">
          <ul class="portal-list">
            <li
              v-for="wiki in portalSelection.growingWikis"
              :key="`${wiki.handle}-${wiki.slug}`"
            >
              <RouterLink :to="wikiPath(wiki.handle, wiki.slug)">
                {{ wiki.name }}
              </RouterLink>
              <span class="muted"> — {{ wiki.noteCount }} articles</span>
            </li>
          </ul>
        </WikiPortalBox>
      </div>
    </template>
  </div>
</template>

<style scoped>
.wiki-portal-columns {
  display: grid;
  gap: 1rem;
}

.portal-loading {
  margin: 0;
  padding: 1rem 0;
}

@media (min-width: 900px) {
  .wiki-portal-columns {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    align-items: start;
  }
}

.wiki-portal-column {
  display: grid;
  gap: 1rem;
}

.featured-wiki-link {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  color: inherit;
  text-decoration: none;
}

.featured-wiki-link:hover {
  text-decoration: none;
}

.featured-wiki-copy {
  min-width: 0;
}

.featured-wiki-name {
  margin: 0 0 0.375rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1.25;
}

.featured-wiki-description {
  margin: 0 0 0.5rem;
  color: var(--pckt-text-muted);
}

.featured-wiki-meta {
  margin: 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.8125rem;
  color: var(--pckt-blue);
  font-weight: 600;
}

.featured-wiki-intro {
  margin: 0.875rem 0 0;
  font-family: var(--pckt-font-content);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.featured-wiki-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin: 0.875rem 0 0;
}

.featured-wiki-fact dt {
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pckt-text-muted);
}

.featured-wiki-fact dd {
  margin: 0.125rem 0 0;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 800;
}

.featured-wiki-highlights {
  margin-top: 1rem;
}

.featured-wiki-subhead {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pckt-text-muted);
}

.featured-wiki-highlight-list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.featured-wiki-highlight {
  display: block;
  padding: 0.5rem 0.625rem;
  border: 1px solid #eadfce;
  border-radius: var(--pckt-radius-sm);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

[data-theme='dark'] .featured-wiki-highlight {
  border-color: #3a3025;
}

.featured-wiki-highlight:hover {
  background: color-mix(in srgb, var(--pckt-blue) 6%, transparent);
  border-color: color-mix(in srgb, var(--pckt-blue) 25%, #dccaa4);
  text-decoration: none;
}

.featured-wiki-highlight strong {
  display: block;
  font-family: var(--pckt-font-ui);
  font-size: 0.875rem;
  line-height: 1.3;
}

.featured-wiki-highlight-excerpt {
  display: block;
  margin-top: 0.125rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--pckt-text-muted);
}

.featured-wiki-more {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.featured-wiki-foot {
  margin: 0.875rem 0 0;
  padding-top: 0.75rem;
  border-top: 1px solid #eadfce;
  font-size: 0.875rem;
}

[data-theme='dark'] .featured-wiki-foot {
  border-top-color: #3a3025;
}

.portal-list {
  margin: 0;
  padding-left: 1.125rem;
}

.portal-list li + li {
  margin-top: 0.625rem;
}

.portal-list-dyk li {
  list-style: disc;
}

.portal-list-news {
  list-style: none;
  padding-left: 0;
}

.portal-list-news li + li {
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid #eadfce;
}

[data-theme='dark'] .portal-list-news li + li {
  border-top-color: #3a3025;
}

.community-wiki-link {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  color: inherit;
  text-decoration: none;
}

.community-wiki-link:hover {
  text-decoration: none;
}

.community-wiki-link strong {
  display: block;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  line-height: 1.3;
}

.community-wiki-blurb {
  display: block;
  margin-top: 0.125rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--pckt-text-muted);
}
</style>
