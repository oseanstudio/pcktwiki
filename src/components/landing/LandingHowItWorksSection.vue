<template>
  <section class="how-section" aria-labelledby="how-title">
    <div class="how-inner">
      <header class="how-header">
        <h2 id="how-title" class="how-title">How it works</h2>
        <p class="how-lead">
          pckt.wiki stores wikis as Lichen records in your PDS — the same format used by
          <a href="https://lichen.wiki" target="_blank" rel="noopener noreferrer">lichen.wiki</a>.
        </p>
      </header>

      <ol class="how-steps">
        <li class="how-step">
          <span class="how-step-num" aria-hidden="true">1</span>
          <div>
            <h3>Sign in with your handle</h3>
            <p>
              Use any AT Protocol account — Bluesky, a self-hosted PDS, or a custom domain handle.
              OAuth keeps your credentials secure.
            </p>
          </div>
        </li>
        <li class="how-step">
          <span class="how-step-num" aria-hidden="true">2</span>
          <div>
            <h3>Create a wiki</h3>
            <p>
              Give it a name, choose public or private visibility, and invite collaborators with
              admin, contributor, or viewer roles.
            </p>
          </div>
        </li>
        <li class="how-step">
          <span class="how-step-num" aria-hidden="true">3</span>
          <div>
            <h3>Write &amp; link articles</h3>
            <p>
              Use wikilinks like <code>[[article-slug]]</code>, categories, infoboxes, and revision
              history. Every edit is stored as a diff in your repo.
            </p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.how-section {
  padding: 4rem 1.5rem;
  background: var(--pckt-bg-elevated);
  border-top: 1px solid var(--pckt-border);
  border-bottom: 1px solid var(--pckt-border);
}

.how-inner {
  max-width: 52rem;
  margin: 0 auto;
}

.how-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.how-title {
  margin: 0 0 0.75rem;
  font-family: var(--pckt-font-ui);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.how-lead {
  margin: 0 auto;
  max-width: 36rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.how-lead a {
  color: var(--pckt-red);
  font-weight: 600;
}

.how-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .how-steps {
    gap: 2rem;
  }
}

.how-step {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem 1.25rem;
  align-items: start;
  padding: 1.25rem 1.5rem;
  border-radius: var(--pckt-radius);
  background: var(--pckt-bg);
  border: 1px solid var(--pckt-border);
}

.how-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pckt-blue) 12%, var(--pckt-bg));
  color: var(--pckt-blue);
  font-family: var(--pckt-font-ui);
  font-size: 1rem;
  font-weight: 900;
}

.how-step h3 {
  margin: 0 0 0.375rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.125rem;
  font-weight: 900;
}

.how-step p {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--pckt-text-muted);
}

.how-step code {
  font-family: var(--pckt-font-mono);
  font-size: 0.875em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--pckt-bg-muted);
}
</style>
