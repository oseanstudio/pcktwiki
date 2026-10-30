<template>
  <section class="features-section" aria-labelledby="features-title">
    <div class="features-inner">
      <header class="features-header">
        <h2 id="features-title" class="features-title">Built for real wikis</h2>
        <p class="features-lead">
          Everything you'd expect from a wiki reader — plus pckt-specific extras for bloggers and the open web.
        </p>
      </header>

      <div class="features-grid">
        <article class="features-item">
          <h3>Wikilinks &amp; backlinks</h3>
          <p>
            Connect articles with <code>[[wikilinks]]</code>, cross-wiki links, categories, redirects, and
            auto-generated tables of contents.
          </p>
        </article>

        <article class="features-item">
          <h3>Full revision history</h3>
          <p>
            Every save writes a diff to your PDS. Browse history, compare changes, and add edit
            summaries like Wikipedia.
          </p>
        </article>

        <article class="features-item">
          <h3>pckt.blog sync</h3>
          <p>
            Link blog posts to wiki stubs with frontmatter. Articles and blog posts reference each other
            across the pckt ecosystem.
          </p>
        </article>

        <article class="features-item">
          <h3>Public or private</h3>
          <p>
            Share wikis with the world or keep them invite-only. Role-based membership controls who
            can read and edit.
          </p>
        </article>

        <article class="features-item">
          <h3>Offline &amp; installable</h3>
          <p>
            pckt.wiki is a PWA — install it, edit offline, and changes sync to your PDS when you're
            back online.
          </p>
        </article>

        <article class="features-item">
          <h3>Live updates</h3>
          <p>
            While viewing a wiki, Jetstream keeps pages in sync when collaborators save — no manual
            refresh needed.
          </p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features-section {
  padding: 4rem 1.5rem;
  background: var(--pckt-bg);
}

.features-inner {
  max-width: 64rem;
  margin: 0 auto;
}

.features-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.features-title {
  margin: 0 0 0.75rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.features-lead {
  margin: 0 auto;
  max-width: 36rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.features-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 640px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }
}

.features-item {
  padding: 1.25rem 1.375rem;
  border-radius: var(--pckt-radius);
  border: 1px solid var(--pckt-border);
  background: var(--pckt-bg-elevated);
}

.features-item h3 {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 1rem;
  font-weight: 900;
  color: var(--pckt-red);
}

.features-item p {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.features-item code {
  font-family: var(--pckt-font-mono);
  font-size: 0.875em;
}
</style>
