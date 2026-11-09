import { describe, expect, it } from 'vitest'
import {
  THEME_STORAGE_KEY,
  createThemeController,
  normalizePreference,
  readPreference,
  resolveTheme,
  writePreference
} from './useTheme'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value) },
    removeItem: (key) => { delete data[key] }
  }
}

function throwingStorage() {
  const fail = () => { throw new Error('blocked') }
  return { getItem: fail, setItem: fail, removeItem: fail }
}

function fakeMatchMedia(matches) {
  const listeners = []
  const query = {
    matches,
    addEventListener: (_type, fn) => listeners.push(fn),
    emit(value) {
      query.matches = value
      listeners.forEach((fn) => fn({ matches: value }))
    }
  }
  return { query, matchMedia: () => query }
}

function fakeRoot() {
  const meta = { content: '', setAttribute(_name, value) { this.content = value } }
  return {
    meta,
    dataset: {},
    ownerDocument: { querySelector: () => meta }
  }
}

describe('useTheme', () => {
  it('normalizes unknown preferences to system', () => {
    expect(normalizePreference('dark')).toBe('dark')
    expect(normalizePreference('sepia')).toBe('system')
    expect(normalizePreference(null)).toBe('system')
  })

  it('resolves system preference using the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('reads and writes the stored preference, removing it for system', () => {
    const storage = memoryStorage()
    writePreference(storage, 'dark')
    expect(storage.data[THEME_STORAGE_KEY]).toBe('dark')
    expect(readPreference(storage)).toBe('dark')
    writePreference(storage, 'system')
    expect(THEME_STORAGE_KEY in storage.data).toBe(false)
  })

  it('falls back to system when storage is unavailable', () => {
    expect(readPreference(throwingStorage())).toBe('system')
    expect(() => writePreference(throwingStorage(), 'dark')).not.toThrow()
  })

  it('applies the resolved theme to the root and theme-color meta', () => {
    const root = fakeRoot()
    const { matchMedia } = fakeMatchMedia(true)
    const controller = createThemeController({ storage: memoryStorage(), matchMedia, root })

    expect(controller.preference.value).toBe('system')
    expect(controller.theme.value).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(root.meta.content).toBe('#111310')
  })

  it('follows OS changes only while the preference is system', () => {
    const root = fakeRoot()
    const { query, matchMedia } = fakeMatchMedia(false)
    const storage = memoryStorage()
    const controller = createThemeController({ storage, matchMedia, root })

    query.emit(true)
    expect(root.dataset.theme).toBe('dark')

    controller.setPreference('light')
    expect(storage.data[THEME_STORAGE_KEY]).toBe('light')
    query.emit(true)
    expect(root.dataset.theme).toBe('light')
  })

  it('restores a stored preference on start', () => {
    const root = fakeRoot()
    const { matchMedia } = fakeMatchMedia(false)
    createThemeController({ storage: memoryStorage({ [THEME_STORAGE_KEY]: 'dark' }), matchMedia, root })
    expect(root.dataset.theme).toBe('dark')
  })
})
