/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Absolute URL this build is served from, injected by vite.config.ts. Ends with '/'. */
declare const __SITE_URL__: string

interface ImportMetaEnv {
  /**
   * Base URL of the donations companion API (see `worker/README.md`).
   * Leave unset to ship without the donate page.
   */
  readonly VITE_DONATIONS_API_URL?: string
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean }): void
}
