<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp.vue'
import { useDynamicFavicon } from '@/composables/useDynamicFavicon'
import { useGuestFeed } from '@/composables/useGuestFeed'
import { provideKeyboardNav } from '@/composables/useKeyboardNavProvider'
import { useKeyboardBrowse } from '@/composables/useKeyboardBrowse'
import { useAuthStore } from '@/stores/auth'
import { useLichenStore } from '@/stores/lichen'

const auth = useAuthStore()
const lichen = useLichenStore()
const guestFeed = useGuestFeed()
const appShellRef = ref<HTMLElement | null>(null)

useDynamicFavicon()
const keyboardNav = provideKeyboardNav()

onMounted(() => {
  if (!auth.isAuthenticated) {
    void guestFeed.load()
  }

  window.addEventListener('online', () => {
    if (auth.agent) void lichen.processOfflineQueue(auth.agent)
  })
})

useKeyboardBrowse({
  id: 'app',
  label: 'Page',
  containerRef: appShellRef,
  nav: keyboardNav,
  priority: 0,
})
</script>

<template>
  <div ref="appShellRef" class="app-shell">
    <AppHeader />
    <main class="app-main">
      <RouterView />
    </main>
    <KeyboardShortcutsHelp />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  font-family: var(--pckt-font-serif);
  letter-spacing: var(--pckt-tracking-wide);
}

.app-main {
  flex: 1;
  font-family: var(--pckt-font-ui);
  letter-spacing: normal;
}
</style>
