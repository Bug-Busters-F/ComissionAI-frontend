import { ref } from 'vue'

export const THEME_STORAGE_KEY = 'comissionai-theme'
export const theme = ref('light')
export const themePreference = ref('system')
let controller

export function resolveTheme(preference, systemDark) {
  return preference === 'dark' || (preference !== 'light' && systemDark) ? 'dark' : 'light'
}

export function createThemeController({ root, storage, media, onChange = () => {} }) {
  let preference
  try { preference = storage?.getItem(THEME_STORAGE_KEY) } catch { /* Private browsing may disable storage. */ }
  function apply() {
    const value = resolveTheme(preference, Boolean(media?.matches))
    root.dataset.theme = value
    onChange(value, ['light', 'dark'].includes(preference) ? preference : 'system')
    return value
  }
  function setPreference(value) {
    if (!['light', 'dark', 'system'].includes(value)) return
    preference = value
    try { storage?.setItem(THEME_STORAGE_KEY, preference) } catch { /* Keep the in-memory preference usable. */ }
    apply()
  }
  function toggle() { setPreference(root.dataset.theme === 'dark' ? 'light' : 'dark') }
  function sync(event) {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      preference = event.newValue
      apply()
    }
  }
  const systemChanged = () => { if (!['light', 'dark'].includes(preference)) apply() }
  media?.addEventListener?.('change', systemChanged)
  apply()
  return { toggle, setPreference, sync, dispose: () => media?.removeEventListener?.('change', systemChanged) }
}

export function initializeTheme() {
  if (controller || typeof window === 'undefined') return
  let storage
  try { storage = window.localStorage } catch { /* Theme remains available without persistence. */ }
  controller = createThemeController({
    root: document.documentElement,
    storage,
    media: window.matchMedia?.('(prefers-color-scheme: dark)'),
    onChange: (value, preference) => { theme.value = value; themePreference.value = preference }
  })
  window.addEventListener('storage', controller.sync)
}

export function toggleTheme() {
  initializeTheme()
  controller?.toggle()
}

export function setThemePreference(value) {
  initializeTheme()
  controller?.setPreference(value)
}
