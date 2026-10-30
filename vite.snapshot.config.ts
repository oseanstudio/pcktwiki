import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

/** Minimal Vite config for SSR-loading guest feed modules at build time. */
export default defineConfig({
  // Matches the main build's injected constant so SSR-loaded app modules that
  // read the deployment URL don't hit an undefined global.
  define: {
    __SITE_URL__: JSON.stringify(process.env.VITE_SITE_URL || 'https://pckt.wiki/'),
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
