import { onMounted, onUnmounted, type Ref } from 'vue'

interface MenuEntry {
  open: Ref<boolean>
  close: () => void
}

const menuEntries = new Set<MenuEntry>()

export function useMenuDismissGroup(open: Ref<boolean>, close: () => void) {
  const entry: MenuEntry = { open, close }

  onMounted(() => {
    menuEntries.add(entry)
  })

  onUnmounted(() => {
    menuEntries.delete(entry)
  })

  function closeOtherMenus() {
    for (const menu of menuEntries) {
      if (menu !== entry && menu.open.value) {
        menu.close()
      }
    }
  }

  return { closeOtherMenus }
}
