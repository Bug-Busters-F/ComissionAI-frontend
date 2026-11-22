import { describe, it, expect, vi } from 'vitest'
import { createThemeController, resolveTheme, THEME_STORAGE_KEY } from './theme'

function setup(preference, matches = false, storageOverride) {
  const root = { dataset: {} }
  const storage = storageOverride || { getItem: () => preference, setItem: vi.fn() }
  const media = { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const onChange = vi.fn()
  return { root, storage, media, onChange, controller: createThemeController({ root, storage, media, onChange }) }
}

describe('theme preference', () => {
  it('honors explicit preferences before the system setting', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme('unknown', false)).toBe('light')
  })
  it('applies, toggles and saves the selected theme', () => {
    const { root, controller, storage, onChange } = setup(null, true)
    expect(root.dataset.theme).toBe('dark')
    controller.toggle()
    expect(root.dataset.theme).toBe('light')
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light')
    expect(onChange).toHaveBeenLastCalledWith('light', 'light')
  })
  it('follows system changes only until an explicit choice', () => {
    const { media, root, controller } = setup(null)
    const changed = media.addEventListener.mock.calls[0][1]
    media.matches = true
    changed()
    expect(root.dataset.theme).toBe('dark')
    controller.toggle()
    changed()
    expect(root.dataset.theme).toBe('light')
    controller.dispose()
    expect(media.removeEventListener).toHaveBeenCalledWith('change', changed)
  })
  it('returns to system mode after an explicit selection and follows system changes', () => {
    const { root, controller, storage, media, onChange } = setup('dark', false)
    controller.setPreference('system')
    expect(root.dataset.theme).toBe('light')
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'system')
    expect(onChange).toHaveBeenLastCalledWith('light', 'system')
    media.matches = true
    media.addEventListener.mock.calls[0][1]()
    expect(root.dataset.theme).toBe('dark')
    expect(onChange).toHaveBeenLastCalledWith('dark', 'system')
    controller.setPreference('light')
    media.addEventListener.mock.calls[0][1]()
    expect(root.dataset.theme).toBe('light')
  })
  it('works if storage is denied' , () => {
    const denied = { getItem: () => { throw Error('denied') }, setItem: () => { throw Error('denied') } }
    const { root, controller } = setup(null, false, denied)
    expect(() => controller.toggle()).not.toThrow()
    expect(root.dataset.theme).toBe('dark')
  })
  it('syncs saved changes from other tabs and returns to system when cleared', () => {
    const { root, controller } = setup('light', true)
    controller.sync({ key: 'other', newValue: 'dark' })
    expect(root.dataset.theme).toBe('light')
    controller.sync({ key: THEME_STORAGE_KEY, newValue: 'dark' })
    expect(root.dataset.theme).toBe('dark')
    controller.sync({ key: null, newValue: null })
    expect(root.dataset.theme).toBe('dark')
  })
})
