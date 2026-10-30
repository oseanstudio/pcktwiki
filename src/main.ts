import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './pinia'
import { useAuthStore } from './stores/auth'
import { setupInternalLinkNavigation } from './lib/internal-link-navigation'
import { loadLocalTheme, applyWikiTheme, initSystemThemeListener } from './lib/theme'
import './styles/theme.css'
import './styles/wiki-visual-editor.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

applyWikiTheme(loadLocalTheme())
initSystemThemeListener()

const auth = useAuthStore(pinia)

Promise.all([auth.initialize(), router.isReady()])
  .catch((err) => {
    console.error('Failed to initialize app', err)
  })
  .finally(() => {
    app.mount('#app')
    setupInternalLinkNavigation(router)
  })

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(() => {
    // PWA registration is optional
  })
}
