import { ref } from 'vue'

/** After the first homepage visit, skip opacity-0 enter animations to avoid motion-v getting stuck on return navigation. */
export const skipMotionEnter = ref(false)

export function markMotionEnterPlayed(): void {
  skipMotionEnter.value = true
}
