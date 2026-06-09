import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { applyWikiTheme } from './lib/theme'
import './styles/theme.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

applyWikiTheme()

const auth = useAuthStore(pinia)
auth.initialize().finally(() => {
  app.mount('#app')
})

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(() => {
    // PWA registration is optional in dev
  })
}
