import { computed, inject, onMounted, onUnmounted, provide, ref, type InjectionKey, type Ref } from 'vue'
import { useReducedMotion } from 'motion-v'
import {
  WIKI_VERB_CYCLE_MS,
  wikiVerbAt,
  wikiVerbColorAt,
} from '@/lib/wiki-verb-cycle'

export type WikiVerbCycleContext = {
  step: Ref<number>
  verb: Ref<string>
  color: Ref<string>
  reducedMotion: Ref<boolean>
}

export const wikiVerbCycleKey: InjectionKey<WikiVerbCycleContext> = Symbol('wikiVerbCycle')

export function provideWikiVerbCycle(): WikiVerbCycleContext {
  const reducedMotion = useReducedMotion()
  const step = ref(0)
  const verb = computed(() => wikiVerbAt(step.value))
  const color = computed(() => wikiVerbColorAt(step.value))

  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    if (reducedMotion.value) return
    timer = setInterval(() => {
      step.value += 1
    }, WIKI_VERB_CYCLE_MS)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  const context: WikiVerbCycleContext = { step, verb, color, reducedMotion }
  provide(wikiVerbCycleKey, context)
  return context
}

export function useWikiVerbCycle(): WikiVerbCycleContext {
  const context = inject(wikiVerbCycleKey)
  if (!context) {
    throw new Error('useWikiVerbCycle() must be used inside a provideWikiVerbCycle() provider')
  }
  return context
}
