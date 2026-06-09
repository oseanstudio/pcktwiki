<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWikiStore } from '@/stores/wiki'
import ThemeEditor from '@/components/ThemeEditor.vue'
import { applyWikiTheme } from '@/lib/theme'
import type { WikiSpace, WikiTheme } from '@/types/wiki'
import { DEFAULT_THEME } from '@/types/wiki'

const auth = useAuthStore()
const wiki = useWikiStore()
const router = useRouter()

const form = ref({
  title: '',
  description: '',
  homeSlug: 'home',
})
const theme = ref<WikiTheme>({ ...DEFAULT_THEME })
const saved = ref(false)

onMounted(async () => {
  if (!auth.agent) return
  if (!wiki.space) {
    await wiki.loadOwnWiki(auth.agent)
    await wiki.ensureInitialized(auth.agent, auth.handle ?? undefined)
  }

  if (wiki.space) {
    form.value = {
      title: wiki.space.title,
      description: wiki.space.description ?? '',
      homeSlug: wiki.space.homeSlug ?? 'home',
    }
    theme.value = { ...DEFAULT_THEME, ...wiki.space.theme }
    applyWikiTheme(theme.value)
  }
})

watch(theme, (value) => {
  applyWikiTheme(value)
}, { deep: true })

async function save() {
  if (!auth.agent || !wiki.space) return
  const nextSpace: WikiSpace = {
    ...wiki.space,
    title: form.value.title,
    description: form.value.description,
    homeSlug: form.value.homeSlug,
    theme: { ...theme.value },
  }
  await wiki.saveSpace(auth.agent, nextSpace)
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-inner">
      <header>
        <h1>Wiki settings</h1>
        <p class="muted">Customize your wiki title, description, and theme.</p>
      </header>

      <form class="settings-form" @submit.prevent="save">
        <section class="card section">
          <h2>General</h2>
          <div class="field">
            <label class="label" for="wiki-title">Wiki title</label>
            <input id="wiki-title" v-model="form.title" class="input" type="text" required />
          </div>
          <div class="field">
            <label class="label" for="wiki-description">Description</label>
            <textarea id="wiki-description" v-model="form.description" class="textarea" rows="3" />
          </div>
          <div class="field">
            <label class="label" for="home-slug">Home page slug</label>
            <select id="home-slug" v-model="form.homeSlug" class="select">
              <option v-for="page in wiki.pages" :key="page.slug" :value="page.slug">
                {{ page.title }} ({{ page.slug }})
              </option>
            </select>
          </div>
        </section>

        <ThemeEditor v-model="theme" />

        <div class="actions">
          <button type="button" class="btn btn-secondary" @click="router.push('/dashboard')">
            Back
          </button>
          <button type="submit" class="btn btn-primary" :disabled="wiki.saving">
            {{ wiki.saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings' }}
          </button>
        </div>
      </form>

      <p v-if="wiki.error" class="error-text">{{ wiki.error }}</p>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 2rem 1.25rem 4rem;
}

.settings-inner {
  max-width: 640px;
  margin: 0 auto;
}

header h1 {
  margin: 0 0 0.25rem;
  font-family: var(--pckt-font-content);
}

.settings-form {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
}

.section {
  padding: 1.25rem;
}

.section h2 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
