<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const handleInput = ref('')
const signingIn = ref(false)

async function onSignIn() {
  if (!handleInput.value.trim()) return
  signingIn.value = true
  try {
    await auth.signIn(handleInput.value)
  } catch {
    signingIn.value = false
  }
}

if (auth.isAuthenticated) {
  router.replace((route.query.redirect as string) || '/dashboard')
}
</script>

<template>
  <div class="landing">
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">Sister app to pckt.blog</p>
        <h1>Your personal wiki on the open social web</h1>
        <p class="lead">
          Build a wiki from what you already have on AT Protocol — your profile,
          your pckt.blog posts — plus pages you write and style right here.
        </p>

        <div class="sign-in card">
          <h2>Sign in with AT Protocol</h2>
          <p class="muted">
            Use your Bluesky, pckt.cafe, or self-hosted handle. Your wiki lives in your PDS.
          </p>
          <form class="sign-in-form" @submit.prevent="onSignIn">
            <label class="sr-only" for="handle">Handle</label>
            <input
              id="handle"
              v-model="handleInput"
              class="input"
              type="text"
              placeholder="@you.bsky.social"
              autocomplete="username"
            />
            <button type="submit" class="btn btn-primary" :disabled="signingIn || auth.loading">
              {{ signingIn ? 'Redirecting…' : 'Continue' }}
            </button>
          </form>
          <p v-if="auth.error" class="error-text">{{ auth.error }}</p>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="feature card">
        <h3>Own your wiki</h3>
        <p>Pages are stored as records in your AT Protocol account — portable and under your control.</p>
      </div>
      <div class="feature card">
        <h3>Embed pckt.blog</h3>
        <p>Pull in your blog posts automatically and embed them alongside your wiki pages.</p>
      </div>
      <div class="feature card">
        <h3>Style it yours</h3>
        <p>Choose colors, fonts, and layout. Share your wiki at <code>/\@your-handle</code>.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

.hero {
  margin-bottom: 3rem;
}

.eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pckt-accent);
}

h1 {
  margin: 0 0 1rem;
  font-family: var(--pckt-font-content);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.15;
  max-width: 16ch;
}

.lead {
  margin: 0 0 2rem;
  font-size: 1.125rem;
  color: var(--pckt-text-muted);
  max-width: 52ch;
}

.sign-in {
  padding: 1.5rem;
  max-width: 420px;
}

.sign-in h2 {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
}

.sign-in-form {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.feature {
  padding: 1.25rem;
}

.feature h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.feature p {
  margin: 0;
  color: var(--pckt-text-muted);
  font-size: 0.9375rem;
}

code {
  font-family: 'Space Mono', monospace;
  font-size: 0.875em;
}
</style>
