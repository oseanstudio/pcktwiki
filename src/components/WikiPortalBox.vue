<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    accent?: 'blue' | 'red' | 'green' | 'yellow'
  }>(),
  { accent: 'blue' },
)
</script>

<template>
  <section class="portal-box">
    <h2 class="portal-box-header" :class="`portal-box-header--${accent}`">{{ title }}</h2>
    <div class="portal-box-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.portal-box {
  border: 1px solid #dccaa4;
  border-radius: var(--pckt-radius-btn);
  background: #fff;
  overflow: hidden;
}

[data-theme='dark'] .portal-box {
  border-color: #3a3025;
  background: rgba(31, 41, 55, 0.55);
}

.portal-box-header {
  margin: 0;
  padding: 0.5625rem 0.875rem;
  font-family: var(--pckt-font-ui);
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.3;
  border-bottom: 1px solid #dccaa4;
}

[data-theme='dark'] .portal-box-header {
  border-bottom-color: #3a3025;
}

.portal-box-header--blue {
  background: color-mix(in srgb, var(--pckt-blue) 14%, #fff);
  color: color-mix(in srgb, var(--pckt-blue-active) 85%, #111827);
}

.portal-box-header--red {
  background: color-mix(in srgb, var(--pckt-red) 12%, #fff);
  color: color-mix(in srgb, var(--pckt-red-active) 85%, #111827);
}

.portal-box-header--green {
  background: color-mix(in srgb, var(--pckt-green) 12%, #fff);
  color: color-mix(in srgb, var(--pckt-green-active) 85%, #111827);
}

.portal-box-header--yellow {
  background: color-mix(in srgb, var(--pckt-yellow) 22%, #fff);
  color: #854d0e;
}

[data-theme='dark'] .portal-box-header--blue {
  background: color-mix(in srgb, var(--pckt-blue) 18%, #1f2937);
  color: #bfdbfe;
}

[data-theme='dark'] .portal-box-header--red {
  background: color-mix(in srgb, var(--pckt-red) 16%, #1f2937);
  color: #fecaca;
}

[data-theme='dark'] .portal-box-header--green {
  background: color-mix(in srgb, var(--pckt-green) 14%, #1f2937);
  color: #bbf7d0;
}

[data-theme='dark'] .portal-box-header--yellow {
  background: color-mix(in srgb, var(--pckt-yellow) 16%, #1f2937);
  color: #fde68a;
}

.portal-box-body {
  padding: 0.75rem 0.8125rem 0.875rem;
  font-family: var(--pckt-font-content);
  font-size: 0.875rem;
  line-height: 1.55;
}
</style>
