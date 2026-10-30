import { watch } from 'vue'
import { suffixColor } from '@/lib/pckt-brand-color'
import { setFaviconSparkColor } from '@/lib/dynamic-favicon'

export function useDynamicFavicon(): void {
  watch(suffixColor, (color) => setFaviconSparkColor(color), { immediate: true })
}
