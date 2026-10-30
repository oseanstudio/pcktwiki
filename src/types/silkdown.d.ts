// The silkdown build supports `urlPolicy` at runtime but its shipped types
// don't declare the option — bridge the gap so the app's AT Proto blob
// URL policy typechecks.
import type { UrlPolicy } from '@silkdown/core'

declare module '@silkdown/core' {
  interface SilkdownOptions {
    urlPolicy?: UrlPolicy
  }
}
