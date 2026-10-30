<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { assetUrl } from '@/lib/base-url'
import { refreshSuffixColor, suffixColor } from '@/lib/pckt-brand-color'
import PcktSparkLogomark from '@/components/PcktSparkLogomark.vue'
import PcktAnimatedWordmark from '@/components/PcktAnimatedWordmark.vue'

const wordmarkSrc = assetUrl('brand-assets/pckt-color.svg')

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    showMark?: boolean
    /** Show only the transparent spark logomark (no wordmark or suffix). */
    markOnly?: boolean
    suffix?: string
    animated?: boolean
    /** Header-only: navigate home while cycling the shared .wiki color. */
    homeLink?: boolean
  }>(),
  {
    size: 'md',
    showMark: false,
    markOnly: false,
    suffix: '',
    animated: false,
    homeLink: false,
  },
)

const isInteractive = computed(() => Boolean(props.suffix) && !props.markOnly)
const showLogomark = computed(() => props.markOnly || props.showMark)
const hasShell = computed(() => props.markOnly || isInteractive.value)

const shellTag = computed(() => (props.homeLink ? RouterLink : 'button'))

const shellBind = computed(() =>
  props.homeLink
    ? { to: '/', 'aria-label': 'pckt.wiki home' }
    : { type: 'button', 'aria-label': 'Change pckt.wiki accent color' },
)

const shellClass = computed(() => ({
  'pckt-brand-shell-button': !props.homeLink,
  'pckt-brand-shell-link': props.homeLink,
}))

function onBrandActivate(): void {
  refreshSuffixColor()
}
</script>

<template>
  <component
    v-if="hasShell"
    :is="shellTag"
    v-bind="shellBind"
    class="pckt-brand-shell"
    :class="shellClass"
    @click="onBrandActivate"
  >
    <span class="pckt-brand pckt-brand-interactive" :class="`pckt-brand-${size}`">
      <PcktSparkLogomark v-if="showLogomark" class="pckt-brand-mark" />
      <span v-if="!markOnly" class="pckt-brand-wordmark-wrap">
        <PcktAnimatedWordmark
          v-if="animated"
          class="pckt-brand-wordmark"
        />
        <img
          v-else
          class="pckt-brand-wordmark"
          :src="wordmarkSrc"
          alt="pckt"
          width="249"
          height="106"
        />
        <span
          class="pckt-brand-suffix"
          :style="{ color: suffixColor }"
        >{{ suffix }}</span>
      </span>
    </span>
  </component>
  <span v-else class="pckt-brand" :class="`pckt-brand-${size}`">
    <PcktSparkLogomark v-if="showLogomark" class="pckt-brand-mark" />
    <span v-if="!markOnly" class="pckt-brand-wordmark-wrap">
      <PcktAnimatedWordmark
        v-if="animated"
        class="pckt-brand-wordmark"
      />
      <img
        v-else
        class="pckt-brand-wordmark"
        :src="wordmarkSrc"
        alt="pckt"
        width="249"
        height="106"
      />
    </span>
  </span>
</template>

<style scoped>
.pckt-brand-shell {
  display: inline-flex;
  line-height: 1;
}

.pckt-brand-shell-button,
.pckt-brand-shell-link {
  position: relative;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font: inherit;
  cursor: pointer;
  color: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.pckt-brand-shell-button::before,
.pckt-brand-shell-link::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: max(100%, 2.75rem);
  min-height: max(100%, 2.75rem);
}

.pckt-brand-shell-link {
  text-decoration: none;
}

.pckt-brand-shell-link:hover {
  text-decoration: none;
}

.pckt-brand-interactive,
.pckt-brand-interactive * {
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.pckt-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  line-height: 1;
}

.pckt-brand-wordmark-wrap {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.05em;
}

.pckt-brand-wordmark {
  display: block;
  width: auto;
  height: auto;
}

.pckt-brand-mark {
  flex-shrink: 0;
  display: block;
  align-self: center;
}

.pckt-brand-suffix {
  font-family: var(--pckt-font-ui);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
}

.pckt-brand-sm :deep(.pckt-brand-wordmark) {
  height: 1.375rem;
}

.pckt-brand-sm .pckt-brand-mark {
  width: 1.375rem;
  height: auto;
}

.pckt-brand-sm .pckt-brand-suffix {
  font-size: 1.0625rem;
  margin-bottom: 0.14em;
}

.pckt-brand-md :deep(.pckt-brand-wordmark) {
  height: 1.75rem;
}

.pckt-brand-md .pckt-brand-mark {
  width: 1.75rem;
  height: auto;
}

.pckt-brand-md .pckt-brand-suffix {
  font-size: 1.3125rem;
  margin-bottom: 0.14em;
}

.pckt-brand-lg :deep(.pckt-brand-wordmark) {
  height: clamp(5rem, 14vw, 7rem);
}

.pckt-brand-lg .pckt-brand-mark {
  width: clamp(2.75rem, 8vw, 3.25rem);
  height: auto;
}

.pckt-brand-lg .pckt-brand-suffix {
  font-size: clamp(2.25rem, 6vw, 3.25rem);
  margin-bottom: 0.12em;
}
</style>
