/**
 * Tiny bridge so content-edit mode and theme mode can dismiss each other
 * without a circular import between their composables.
 */

type Exiter = () => void

let exitEdit: Exiter | null = null
let exitTheme: Exiter | null = null

export function registerEditModeExiter(fn: Exiter) {
  exitEdit = fn
}

export function registerThemeModeExiter(fn: Exiter) {
  exitTheme = fn
}

export function exitWikiEditMode() {
  exitEdit?.()
}

export function exitWikiThemeMode() {
  exitTheme?.()
}
