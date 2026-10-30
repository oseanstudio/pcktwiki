import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { normalizeArticleSlug } from '@/lib/atproto/lichen'
import { exitWikiThemeMode, registerEditModeExiter } from '@/composables/wikiModeBridge'

export type WikiEditTarget =
  | 'note'
  | 'createNote'
  | 'subheaderLinks'
  | 'headerLinks'
  | 'navbarLinks'
  | 'headerImage'

/** Shared across AppHeader (outside router-view) and WikiPage. */
const active = ref(false)
const openTarget = ref<WikiEditTarget | null>(null)
const createSlug = ref<string | null>(null)

/**
 * Resolves false when the commit failed, so the caller can leave edit mode open
 * on whatever error the editor is already showing.
 */
export type EditCommit = () => Promise<boolean>

/**
 * Editors that have unsaved work register here so one control can commit them
 * all. Without this each editor needs its own Save, which is how the UI ended up
 * with several rival save buttons on screen at once.
 */
const committers = ref(new Map<string, EditCommit>())
const saving = ref(false)

function registerCommit(id: string, commit: EditCommit) {
  committers.value.set(id, commit)
}

function unregisterCommit(id: string) {
  committers.value.delete(id)
}

/**
 * Commit every registered editor. Runs them in sequence rather than in parallel
 * because several write to the same note record, and stops at the first failure
 * so a later write cannot land on top of a half-applied earlier one.
 */
async function saveAll(): Promise<boolean> {
  if (saving.value) return false
  saving.value = true
  try {
    for (const commit of [...committers.value.values()]) {
      const ok = await commit()
      if (!ok) return false
    }
    return true
  } finally {
    saving.value = false
  }
}

/**
 * The open inline note editor registers here so header Save can reuse its
 * summary + body-flush path instead of calling saveAll with a stale buffer.
 */
type SessionSaveHandler = () => void
const sessionSaveHandler = ref<SessionSaveHandler | null>(null)

function setSessionSaveHandler(handler: SessionSaveHandler | null) {
  sessionSaveHandler.value = handler
}

/** Commit every registered editor, then leave edit mode on success. */
async function commitAndExit(): Promise<boolean> {
  const ok = await saveAll()
  if (ok) exit()
  return ok
}

/**
 * Single entry for every Save control in edit mode. Prefers the note editor's
 * publish prep when it is mounted; otherwise commits chrome-only editors.
 */
function requestSave() {
  if (sessionSaveHandler.value) {
    sessionSaveHandler.value()
    return
  }
  void commitAndExit()
}

function enter() {
  exitWikiThemeMode()
  active.value = true
}

function exit() {
  openTarget.value = null
  createSlug.value = null
  active.value = false
}

/** Called from theme mode so the two modes never stack. */
export function exitWikiEditMode() {
  if (!active.value) return
  exit()
}

registerEditModeExiter(exitWikiEditMode)

function open(target: WikiEditTarget) {
  if (!active.value) return
  if (target === 'createNote') return
  createSlug.value = null
  openTarget.value = target
}

/** Open the create-page editor without requiring edit mode. */
function openCreate(slug: string) {
  const normalized = normalizeArticleSlug(slug)
  if (!normalized) return
  createSlug.value = normalized
  openTarget.value = 'createNote'
}

function closeModal() {
  openTarget.value = null
  createSlug.value = null
}

function toggle() {
  if (active.value) exit()
  else enter()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (openTarget.value) {
    closeModal()
    return
  }
  if (active.value) exit()
}

let listeners = 0

function useEscapeListener() {
  onMounted(() => {
    if (listeners === 0) {
      document.addEventListener('keydown', onKeyDown)
    }
    listeners += 1
  })
  onUnmounted(() => {
    listeners = Math.max(0, listeners - 1)
    if (listeners === 0) {
      document.removeEventListener('keydown', onKeyDown)
    }
  })
}

export function useWikiEditMode() {
  useEscapeListener()

  const modalOpen = computed(() => openTarget.value !== null)

  const hasUnsaved = computed(() => committers.value.size > 0)

  return {
    active: active as Ref<boolean>,
    openTarget: openTarget as Ref<WikiEditTarget | null>,
    createSlug: createSlug as Ref<string | null>,
    modalOpen,
    enter,
    exit,
    toggle,
    open,
    openCreate,
    closeModal,
    // One control commits every open editor; see registerCommit.
    saving: saving as Ref<boolean>,
    hasUnsaved,
    registerCommit,
    unregisterCommit,
    saveAll,
    commitAndExit,
    requestSave,
    setSessionSaveHandler,
  }
}
