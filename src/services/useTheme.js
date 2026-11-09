import { computed, ref } from 'vue'

// Mantenha a chave e a lógica de resolução sincronizadas com o script inline do index.html,
// que aplica o tema antes do Vue montar para evitar o "flash" do tema claro.
export const THEME_STORAGE_KEY = 'comissionai:theme'
export const THEME_PREFERENCES = ['system', 'light', 'dark']

const THEME_COLORS = { light: '#e8ebe6', dark: '#111310' }
const DARK_QUERY = '(prefers-color-scheme: dark)'

export function normalizePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : 'system'
}

export function resolveTheme(preference, systemPrefersDark) {
  const normalized = normalizePreference(preference)
  if (normalized === 'system') return systemPrefersDark ? 'dark' : 'light'
  return normalized
}

export function readPreference(storage) {
  try {
    return normalizePreference(storage?.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

export function writePreference(storage, preference) {
  try {
    if (preference === 'system') storage?.removeItem(THEME_STORAGE_KEY)
    else storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Armazenamento indisponível (modo privado, bloqueado): a escolha vale só para a sessão.
  }
}

export function createThemeController({ storage, matchMedia, root } = {}) {
  const preference = ref(readPreference(storage))
  const query = typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null
  const systemPrefersDark = ref(Boolean(query?.matches))
  const theme = computed(() => resolveTheme(preference.value, systemPrefersDark.value))

  function apply() {
    if (!root) return
    root.dataset.theme = theme.value
    const meta = root.ownerDocument?.querySelector?.('meta[name="theme-color"]')
    meta?.setAttribute('content', THEME_COLORS[theme.value])
  }

  function setPreference(value) {
    preference.value = normalizePreference(value)
    writePreference(storage, preference.value)
    apply()
  }

  function handleSystemChange(event) {
    systemPrefersDark.value = Boolean(event.matches)
    apply()
  }

  if (query?.addEventListener) query.addEventListener('change', handleSystemChange)
  else query?.addListener?.(handleSystemChange)

  apply()

  return { preference, theme, setPreference }
}

function safeLocalStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

let controller = null

export function useTheme() {
  if (!controller) {
    controller = typeof window === 'undefined'
      ? createThemeController()
      : createThemeController({
          storage: safeLocalStorage(),
          matchMedia: window.matchMedia?.bind(window),
          root: document.documentElement
        })
  }
  return controller
}
