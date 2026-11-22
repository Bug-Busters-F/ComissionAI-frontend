import { describe, expect, it } from 'vitest'
import { createAccountPreview, PREVIEW_PASSWORD, SESSION_KEY, USER_ROLES, validatePassword, validateUser } from './accountPreview'
import { clearAccountCaches } from '../stores/accountStore'
function storage() {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), get length() { return data.size }, key: i => [...data.keys()][i] }
}
function admin(store = storage()) {
  const api = createAccountPreview({ storage: store })
  api.login('admin@comissionai.exemplo', PREVIEW_PASSWORD)
  return { api, store }
}
describe('account UI preview', () => {
  it('uses exactly the five planned profiles', () => {
    expect(USER_ROLES.map(r => r.value)).toEqual(['ADMINISTRADOR', 'ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO', 'GERENTE_VENDAS', 'AUDITOR'])
    expect(validateUser({ name: 'Teste', email: 'teste@exemplo.com', role: 'HEAD' }).role).toBeTruthy()
  })
  it('rejects invalid credentials and disabled users', () => {
    const api = createAccountPreview()
    expect(() => api.login('admin@comissionai.exemplo', 'wrong')).toThrow('incorretos')
    expect(() => api.login('inativo@comissionai.exemplo', PREVIEW_PASSWORD)).toThrow('desativado')
    expect(api.status().user).toBeNull()
  })
  it('restores identity by id without storing credentials and ends the session', () => {
    const { api, store } = admin()
    expect(store.getItem(SESSION_KEY)).not.toContain(PREVIEW_PASSWORD)
    expect(createAccountPreview({ storage: store }).status().user.name).toBe('Marina Costa')
    api.logout()
    expect(store.getItem(SESSION_KEY)).toBeNull()
  })
  it('expires a session and handles denied or corrupt storage', () => {
    let now = 0
    const api = createAccountPreview({ now: () => now })
    api.login('admin@comissionai.exemplo', PREVIEW_PASSWORD)
    now = 8 * 60 * 60 * 1000
    expect(api.status()).toEqual({ user: null, reason: 'expired' })
    expect(() => createAccountPreview({ storage: { getItem: () => { throw Error() } } })).not.toThrow()
    const store = storage(); store.setItem(SESSION_KEY, '{bad')
    expect(createAccountPreview({ storage: store }).status().user).toBeNull()
  })
  it('denies all user mutations to non-admins', () => {
    const api = createAccountPreview()
    api.login('auditor@comissionai.exemplo', PREVIEW_PASSWORD)
    expect(() => api.list()).toThrow('administradores')
    expect(() => api.save({})).toThrow('administradores')
    expect(() => api.setActive('u2', false)).toThrow('administradores')
  })
  it('preserves the user id on edit, rejects duplicates and soft-deactivates', () => {
    const { api } = admin()
    const user = api.list().find(u => u.id === 'u2')
    expect(api.save({ ...user, name: 'Nome corrigido' }, user.id).id).toBe(user.id)
    expect(() => api.save({ ...user, email: 'ADMIN@comissionai.exemplo' }, user.id)).toThrow('Revise')
    api.setActive(user.id, false)
    expect(api.list().find(u => u.id === user.id)).toMatchObject({ id: user.id, active: false, name: 'Nome corrigido' })
    api.setActive(user.id, true)
    expect(api.list().find(u => u.id === user.id).active).toBe(true)
  })
  it('preserves identity on edits and prevents self-lockout', () => {
    const { api } = admin()
    const self = api.status().user
    api.save({ ...self, name: 'Nome atualizado' }, self.id)
    expect(api.status().user.name).toBe('Nome atualizado')
    expect(() => api.setActive(self.id, false)).toThrow('próprio')
    expect(() => api.save({ ...self, role: 'AUDITOR' }, self.id)).toThrow('próprio')
  })
  it('adds users and persists the sample list across reloads', () => {
    const { api, store } = admin()
    const created = api.save({ name: 'Pessoa teste', email: 'pessoa@exemplo.com', role: 'GERENTE_VENDAS' })
    expect(created.active).toBe(true)
    expect(createAccountPreview({ storage: store }).list()).toContainEqual(created)
  })
  it('validates password confirmation without persisting the new password', () => {
    const { api, store } = admin()
    expect(validatePassword({ current: 'atual', next: 'curta', confirmation: 'outra' })).toHaveProperty('confirmation')
    expect(() => api.checkPassword({ current: 'incorreta', next: 'Outra@2026', confirmation: 'Outra@2026' })).toThrow('não confere')
    api.checkPassword({ current: PREVIEW_PASSWORD, next: 'Outra@2026', confirmation: 'Outra@2026' })
    for (let i = 0; i < store.length; i++) expect(store.getItem(store.key(i))).not.toContain('Outra@2026')
  })
  it('clears account-sensitive calculation caches without deleting appearance or unrelated data', () => {
    const store = storage()
    for (const key of ['comissai:async-exec:v1:a', 'comissionai.calculation.2025-07', 'comissionai-theme', 'unrelated']) store.setItem(key, 'value')
    clearAccountCaches(store)
    expect(store.length).toBe(2)
    expect(store.getItem('comissionai-theme')).toBe('value')
    expect(store.getItem('unrelated')).toBe('value')
  })
})
