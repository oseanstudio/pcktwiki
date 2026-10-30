<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useMenuDismissGroup } from '@/composables/useMenuDismissGroup'
import { useOverlayDismiss } from '@/composables/useOverlayDismiss'
import { isDonationsConfigured } from '@/lib/donations'

const props = withDefaults(
  defineProps<{
    isHome?: boolean
    /** Panel alignment relative to the trigger. */
    align?: 'start' | 'end'
  }>(),
  {
    align: 'end',
  },
)

const route = useRoute()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

type DotColor = 'red' | 'blue' | 'green' | 'yellow'

const links = computed(() => {
  const items: Array<{
    id: string
    label: string
    to: string
    routeName: string
    dot: DotColor
  }> = [
    { id: 'home', label: 'Home', to: '/', routeName: 'home', dot: 'yellow' },
    { id: 'learn', label: 'Learn', to: '/learn', routeName: 'learn', dot: 'red' },
    { id: 'faq', label: 'FAQ', to: '/faq', routeName: 'faq', dot: 'blue' },
  ]
  if (!props.isHome) {
    items.splice(2, 0, {
      id: 'wikis',
      label: 'Browse wikis',
      to: '/wikis',
      routeName: 'browse-wikis',
      dot: 'green',
    })
  }
  // The donate page only ships when the donations worker is configured.
  if (isDonationsConfigured() || import.meta.env.DEV) {
    items.push({ id: 'donate', label: 'Donate', to: '/donate', routeName: 'donate', dot: 'red' })
  }
  return items
})

function close() {
  open.value = false
}

const { closeOtherMenus } = useMenuDismissGroup(open, close)

useOverlayDismiss(rootRef, open, close)

function toggle(event: Event) {
  event.stopPropagation()
  if (!open.value) closeOtherMenus()
  open.value = !open.value
}

watch(
  () => route.fullPath,
  () => close(),
)
</script>

<template>
  <div
    ref="rootRef"
    class="site-nav-menu"
    :class="{ open, 'site-nav-menu-align-start': props.align === 'start' }"
  >
    <slot name="trigger" :toggle="toggle" :open="open" :close="close">
      <button
        type="button"
        class="site-nav-menu-trigger"
        :aria-expanded="open"
        aria-haspopup="menu"
        aria-label="Site menu"
        @click="toggle"
      >
        <svg class="site-nav-menu-icon" viewBox="0 0 22 22" aria-hidden="true">
          <rect class="site-nav-menu-icon-outline" x="1" y="1.25" width="20" height="5.75" rx="2.875" />
          <rect class="site-nav-menu-icon-bar" x="1.75" y="2" width="17.375" height="3.125" rx="1.25" />
          <rect class="site-nav-menu-icon-outline" x="4.75" y="8.125" width="12.5" height="5.75" rx="2.875" />
          <rect class="site-nav-menu-icon-bar" x="5.375" y="8.75" width="10.125" height="3.375" rx="1.35" />
          <rect class="site-nav-menu-icon-outline" x="0.875" y="14.75" width="20.375" height="6.125" rx="2.875" />
          <rect class="site-nav-menu-icon-bar" x="1.375" y="15.25" width="17.875" height="3.625" rx="1.5" />
        </svg>
      </button>
    </slot>

    <div v-if="open" class="site-nav-menu-panel" role="menu">
      <div class="site-nav-menu-strip" aria-hidden="true">
        <span class="site-nav-menu-strip-seg site-nav-menu-strip-red" />
        <span class="site-nav-menu-strip-seg site-nav-menu-strip-blue" />
        <span class="site-nav-menu-strip-seg site-nav-menu-strip-yellow" />
        <span class="site-nav-menu-strip-seg site-nav-menu-strip-green" />
      </div>

      <ul class="site-nav-menu-list">
        <li v-for="link in links" :key="link.id">
          <RouterLink
            :to="link.to"
            class="site-nav-menu-link"
            :class="{ 'router-link-active': route.name === link.routeName }"
            role="menuitem"
            @click="close"
          >
            <span
              class="site-nav-menu-dot"
              :class="`site-nav-menu-dot-${link.dot}`"
              aria-hidden="true"
            />
            <span>{{ link.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.site-nav-menu {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.site-nav-menu-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: inherit;
  line-height: 1;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.site-nav-menu-trigger::before {
  content: '';
  position: absolute;
  inset: 0;
}

.site-nav-menu-trigger:hover .site-nav-menu-icon,
.site-nav-menu.open .site-nav-menu-trigger .site-nav-menu-icon {
  transform: scale(1.04);
}

.site-nav-menu-icon {
  display: block;
  width: 1.375rem;
  height: 1.375rem;
  pointer-events: none;
  user-select: none;
  transition: transform 0.15s ease;
}

.site-nav-menu-icon-outline {
  fill: #000;
}

.site-nav-menu-icon-bar {
  fill: var(--pckt-blue);
}

:global([data-theme='dark']) .site-nav-menu-icon-outline {
  fill: var(--pckt-text);
}

.site-nav-menu.open {
  z-index: 60;
}

.site-nav-menu-align-start .site-nav-menu-panel {
  left: 0;
  right: auto;
}

.site-nav-menu-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 60;
  width: min(14rem, calc(100vw - 2rem));
  overflow: hidden;
  border: 1px solid var(--pckt-border);
  border-radius: var(--pckt-radius);
  background: var(--pckt-bg-elevated);
  box-shadow: var(--pckt-shadow-md);
  text-align: left;
}

.site-nav-menu-strip {
  display: flex;
  gap: 3px;
  height: 5px;
  padding: 0 0.25rem;
  background: var(--pckt-bg-elevated);
}

.site-nav-menu-strip-seg {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 1px;
}

.site-nav-menu-strip-red {
  background: var(--pckt-red);
}

.site-nav-menu-strip-blue {
  background: var(--pckt-blue);
}

.site-nav-menu-strip-yellow {
  background: var(--pckt-yellow);
}

.site-nav-menu-strip-green {
  background: var(--pckt-green);
}

.site-nav-menu-list {
  list-style: none;
  margin: 0;
  padding: 0.375rem;
}

.site-nav-menu-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: var(--pckt-radius-sm);
  color: var(--pckt-text);
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.site-nav-menu-link:hover,
.site-nav-menu-link.router-link-active {
  background: var(--pckt-bg-muted);
  color: var(--pckt-text);
  text-decoration: none;
}

.site-nav-menu-dot {
  flex-shrink: 0;
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
}

.site-nav-menu-dot-red {
  background: var(--pckt-red);
}

.site-nav-menu-dot-blue {
  background: var(--pckt-blue);
}

.site-nav-menu-dot-green {
  background: var(--pckt-green);
}

.site-nav-menu-dot-yellow {
  background: var(--pckt-yellow);
}

</style>
