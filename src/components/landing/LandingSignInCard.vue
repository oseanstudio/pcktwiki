<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import HandleTypeahead from '@/components/HandleTypeahead.vue'
import { useMenuDismissGroup } from '@/composables/useMenuDismissGroup'
import { useOverlayDismiss } from '@/composables/useOverlayDismiss'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    header?: boolean
    anchorId?: string
    inputId?: string
  }>(),
  {
    compact: false,
    header: false,
    anchorId: undefined,
    inputId: undefined,
  },
)

const resolvedAnchorId = computed(() => {
  if (props.anchorId !== undefined) return props.anchorId || undefined
  if (props.header) return undefined
  return 'get-started'
})

const resolvedInputId = computed(() => {
  if (props.inputId) return props.inputId
  if (props.header) return 'atproto_handle_header'
  if (props.compact) return 'atproto_handle'
  return 'handle'
})

const auth = useAuthStore()

const handleInput = ref('')
const signingIn = ref(false)
const open = ref(false)
const isMobileHeader = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const typeaheadRef = ref<InstanceType<typeof HandleTypeahead> | null>(null)

let mobileMq: MediaQueryList | undefined
let syncMobileHeader: (() => void) | undefined

onMounted(() => {
  if (!props.header) return

  mobileMq = window.matchMedia('(max-width: 720px)')
  syncMobileHeader = () => {
    isMobileHeader.value = mobileMq!.matches
    if (!mobileMq!.matches) open.value = false
  }
  syncMobileHeader()
  mobileMq.addEventListener('change', syncMobileHeader)
})

onUnmounted(() => {
  if (mobileMq && syncMobileHeader) {
    mobileMq.removeEventListener('change', syncMobileHeader)
  }
})

function close() {
  open.value = false
}

const { closeOtherMenus } = useMenuDismissGroup(open, close)
useOverlayDismiss(rootRef, open, close)

async function toggleMobile(event: Event) {
  event.stopPropagation()
  if (!isMobileHeader.value) return

  if (!open.value) {
    closeOtherMenus()
    open.value = true
    await nextTick()
    typeaheadRef.value?.focus()
  } else {
    close()
  }
}

async function onSignIn() {
  if (!handleInput.value.trim()) return
  signingIn.value = true
  try {
    await auth.signIn(handleInput.value)
  } catch (err) {
    signingIn.value = false
    auth.error = err instanceof Error ? err.message : 'Sign in failed'
  }
}
</script>

<template>
  <div
    ref="rootRef"
    :id="resolvedAnchorId"
    class="sign-in-card card"
    :class="{ compact, header, open: header && open }"
  >
    <template v-if="!compact && !header">
      <h2 class="sign-in-title">Start writing</h2>
      <p class="sign-in-lead muted">
        Sign in with your AT Protocol handle. Works with any PDS — Bluesky, self-hosted, or custom domain.
      </p>
    </template>

    <form
      v-if="!header"
      class="sign-in-form sign-in-join"
      @submit.prevent="onSignIn"
    >
      <HandleTypeahead
        v-model="handleInput"
        :disabled="signingIn || auth.loading"
        input-class="input input-landing"
        :class="{ 'handle-typeahead-prefixed': compact }"
        :placeholder="compact ? 'you.pckt.cafe' : '@you.bsky.social or your.domain'"
        :id="resolvedInputId"
        @select="onSignIn"
      />
      <button
        type="submit"
        class="btn btn-landing"
        :class="compact ? 'btn-sm sign-in-submit-compact' : 'btn-lg btn-wide'"
        :disabled="signingIn || auth.loading"
      >
        {{ signingIn ? 'Redirecting…' : compact ? 'Sign in' : 'Sign in & create wiki' }}
      </button>
    </form>

    <template v-else-if="header">
      <form class="sign-in-form sign-in-form-inline sign-in-join" @submit.prevent="onSignIn">
        <HandleTypeahead
          v-model="handleInput"
          :disabled="signingIn || auth.loading"
          input-class="input input-landing"
          class="handle-typeahead-prefixed"
          placeholder="you.pckt.cafe"
          :id="resolvedInputId"
          @select="onSignIn"
        />
        <button
          type="submit"
          class="btn btn-landing btn-sm sign-in-submit-header"
          :disabled="signingIn || auth.loading"
        >
          {{ signingIn ? 'Redirecting…' : 'Sign in' }}
        </button>
      </form>

      <button
        type="button"
        class="btn btn-landing btn-sm sign-in-mobile-trigger"
        :aria-expanded="open"
        aria-haspopup="dialog"
        :disabled="signingIn || auth.loading"
        @click="toggleMobile"
      >
        Sign in
      </button>

      <div v-if="open" class="sign-in-panel" role="dialog" aria-label="Sign in">
        <div class="sign-in-panel-strip" aria-hidden="true">
          <span class="sign-in-panel-strip-seg sign-in-panel-strip-red" />
          <span class="sign-in-panel-strip-seg sign-in-panel-strip-blue" />
          <span class="sign-in-panel-strip-seg sign-in-panel-strip-yellow" />
          <span class="sign-in-panel-strip-seg sign-in-panel-strip-green" />
        </div>

        <form class="sign-in-panel-form" @submit.prevent="onSignIn">
          <HandleTypeahead
            ref="typeaheadRef"
            v-model="handleInput"
            :disabled="signingIn || auth.loading"
            gradient-border
            input-class="input input-landing"
            class="handle-typeahead-prefixed"
            placeholder="you.pckt.cafe"
            :id="`${resolvedInputId}_mobile`"
            @select="onSignIn"
          />
        </form>

        <p v-if="auth.error" class="error-text error-text-panel">{{ auth.error }}</p>
      </div>
    </template>

    <p
      v-if="auth.error && !(header && open)"
      class="error-text"
      :class="{ 'error-text-header': header }"
    >
      {{ auth.error }}
    </p>

    <p v-if="!compact && !header" class="sign-in-foot muted">
      No account?
      <a href="https://bsky.app" target="_blank" rel="noopener noreferrer">Join Bluesky</a>
      or
      <a href="https://pckt.blog" target="_blank" rel="noopener noreferrer">learn about pckt</a>
    </p>
  </div>
</template>

<style scoped>
.sign-in-card {
  padding: 1.5rem;
  text-align: left;
  scroll-margin-top: 5rem;
}

.sign-in-card.compact,
.sign-in-card.header {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.sign-in-card.compact {
  scroll-margin-top: 4rem;
}

.sign-in-card.header {
  position: relative;
  flex-shrink: 0;
  scroll-margin-top: 1rem;
}

.sign-in-card.header.open {
  z-index: 60;
}

.sign-in-title {
  margin: 0 0 0.5rem;
  font-family: var(--pckt-font-ui);
  font-size: 1.375rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.sign-in-lead {
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.45;
}

.sign-in-form {
  display: grid;
  gap: 0;
}

/*
 * Shared border frame. The input and button live inside one bordered
 * container, so the rainbow border shown on focus wraps the whole control as
 * a single continuous gradient rather than bordering each half separately.
 */
.sign-in-join {
  --sign-in-join-radius: var(--pckt-radius);
  --sign-in-join-border: var(--handle-shell-border-width, 2px);
  --sign-in-join-inner-radius: calc(
    var(--sign-in-join-radius) - var(--sign-in-join-border)
  );
  position: relative;
  padding: var(--sign-in-join-border);
  border-radius: var(--sign-in-join-radius);
  background: var(--pckt-border-strong);
  transition: background 0.15s ease;
}

.sign-in-join:focus-within {
  background: linear-gradient(
    to right,
    var(--pckt-red),
    var(--pckt-blue),
    var(--pckt-green),
    var(--pckt-yellow)
  );
}

/* The frame is the only border; the inner controls drop their own. */
.sign-in-join :deep(.input-landing),
.sign-in-join .btn-landing {
  border: none;
  box-shadow: none;
}

.sign-in-join :deep(.input-landing:hover:not(:disabled):not(:focus)),
.sign-in-join :deep(.input-landing:focus) {
  border: none;
  box-shadow: none;
}

/* Hero (stacked): input on top, button below. */
.sign-in-card:not(.compact):not(.header) .sign-in-join :deep(.input-landing) {
  border-radius: var(--sign-in-join-inner-radius) var(--sign-in-join-inner-radius) 0 0;
}

.sign-in-card:not(.compact):not(.header) .sign-in-join .btn-landing {
  border-radius: 0 0 var(--sign-in-join-inner-radius) var(--sign-in-join-inner-radius);
}

/* Inline (compact + header): input on the left, button on the right. */
.compact .sign-in-form,
.header .sign-in-form-inline {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 0;
}

.compact .sign-in-join :deep(.input-landing),
.header .sign-in-form-inline :deep(.input-landing) {
  border-radius: var(--sign-in-join-inner-radius) 0 0 var(--sign-in-join-inner-radius);
}

.compact .sign-in-join .btn-landing,
.header .sign-in-form-inline .btn-landing {
  border-radius: 0 var(--sign-in-join-inner-radius) var(--sign-in-join-inner-radius) 0;
}

/*
 * Inline layouts: let account suggestions size to the whole join frame
 * (field + button). The typeahead root is not a positioning context, so the
 * absolutely positioned list anchors to `.sign-in-join` instead.
 */
.compact .sign-in-join :deep(.handle-typeahead),
.header .sign-in-form-inline :deep(.handle-typeahead) {
  position: static;
}

.compact .sign-in-form {
  --sign-in-control-height: 58px;
}

.header .sign-in-form-inline {
  --sign-in-join-radius: var(--pckt-radius-sm);
  --sign-in-control-height: 2.5rem;
  min-width: 0;
  max-width: min(16rem, calc(50vw - 5rem));
}

.sign-in-mobile-trigger {
  display: none;
  flex-shrink: 0;
  min-height: 2.5rem;
  padding-inline: 0.875rem;
}

.sign-in-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 60;
  width: min(18rem, calc(100vw - 2rem));
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md);
  overflow: visible;
}

.sign-in-panel-strip {
  display: flex;
  gap: 3px;
  height: 5px;
  padding: 0 0.25rem;
  background: var(--pckt-bg-elevated);
  border-radius: var(--pckt-radius) var(--pckt-radius) 0 0;
  overflow: hidden;
}

.sign-in-panel-strip-seg {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 1px;
}

.sign-in-panel-strip-red {
  background: var(--pckt-red);
}

.sign-in-panel-strip-blue {
  background: var(--pckt-blue);
}

.sign-in-panel-strip-yellow {
  background: var(--pckt-yellow);
}

.sign-in-panel-strip-green {
  background: var(--pckt-green);
}

.sign-in-panel-form {
  padding: 0.625rem;
  --sign-in-control-height: 2.75rem;
}

.error-text-panel {
  margin: 0;
  padding: 0 0.625rem 0.625rem;
  font-size: 0.8125rem;
}

@media (max-width: 720px) {
  .sign-in-card.header .sign-in-mobile-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sign-in-card.header .sign-in-form-inline {
    display: none;
  }
}

.compact .sign-in-submit-compact,
.header .sign-in-submit-header {
  flex-shrink: 0;
  /* Fill the frame's inner height so the two halves are the same size. */
  align-self: stretch;
  min-height: var(--sign-in-control-height);
  height: auto;
  padding-block: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:deep(.handle-typeahead-prefixed .input-landing) {
  padding-left: 2.5rem;
}

:deep(.handle-typeahead-prefixed .handle-typeahead-field)::before {
  content: '@';
  position: absolute;
  left: calc(var(--handle-shell-border-width, 2px) + 0.75rem);
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
  color: var(--pckt-text-subtle);
  font-size: 1.125rem;
  pointer-events: none;
}

.compact :deep(.input-landing),
.header :deep(.input-landing) {
  min-height: var(--sign-in-control-height);
}

.header :deep(.input-landing) {
  padding: 0 0.75rem;
  font-size: 0.875rem;
}

.header :deep(.handle-input-shell) {
  --handle-shell-radius: var(--pckt-radius-sm);
}

.header :deep(.handle-typeahead-prefixed .input-landing) {
  padding-left: 2rem;
}

.header :deep(.handle-typeahead-prefixed .handle-typeahead-field)::before {
  left: calc(var(--handle-shell-border-width, 2px) + 0.5rem);
  font-size: 0.9375rem;
}

.error-text-header {
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  left: auto;
  max-width: 18rem;
  margin: 0;
  font-size: 0.75rem;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.input-landing) {
  min-height: 58px;
  padding: 0 1rem;
  font-size: 1.125rem;
  border-radius: var(--pckt-radius);
  border-color: var(--pckt-border-strong);
  box-shadow: var(--pckt-shadow-xs);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

:deep(.handle-input-shell .input-landing) {
  border-color: transparent;
  box-shadow: none;
}

:deep(.input-landing:hover:not(:disabled):not(:focus)) {
  box-shadow:
    var(--pckt-shadow-xs),
    0 0 0 1px color-mix(in srgb, var(--pckt-border-strong) 70%, transparent);
}

:deep(.handle-input-shell .input-landing:hover),
:deep(.handle-input-shell .input-landing:focus) {
  box-shadow: none;
}

:deep(.input-landing::placeholder) {
  color: var(--pckt-text-subtle);
}

.sign-in-foot {
  margin: 1rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.sign-in-foot a {
  color: var(--pckt-text-muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sign-in-foot a:hover {
  color: var(--pckt-text);
}
</style>
