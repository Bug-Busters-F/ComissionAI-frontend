import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, defineStore } from 'pinia'
import { markRaw } from 'vue'
import { useAccountStore, clearAccountCaches } from './accountStore'
import { authSession } from '@/services/authSession'
const user = (role = 'ADMINISTRADOR', id = 'one') => ({ id, name: 'Ana', email: 'ana@empresa.com', role, permissions: ['ACESSO_COMPLETO'], active: true })
const expiry = () => new Date(Date.now() + 60000).toISOString()
const makeStorage = () => { const data = new Map(); return { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k), get length() { return data.size }, key: i => [...data.keys()][i] } }
beforeEach(() => { setActivePinia(createPinia()); vi.stubGlobal('window', { sessionStorage: makeStorage(), location: { pathname: '/login' } }); authSession.clear() })
afterEach(() => { authSession.onExpired(null); authSession.clear(); vi.unstubAllGlobals() })
function setup(provider = {}) { const account = useAccountStore(); account.provider = markRaw(provider); return account }
describe('server-backed accounts', () => {
  it('restores identity from me, not a local name/role snapshot', async () => {
    authSession.set('token', expiry()); const me = vi.fn().mockResolvedValue(user('AUDITOR'))
    const account = setup({ me }); await account.restore()
    expect(me).toHaveBeenCalledOnce(); expect(account.user.role).toBe('AUDITOR')
  })
  it('clears other users caches and in-memory stores on login', async () => {
    const business = defineStore('private-test-data', { state: () => ({ rows: [] }) })(); business.rows = ['private']
    window.sessionStorage.setItem('comissionai.calculation.2025-07', 'private'); window.sessionStorage.setItem('theme', 'dark')
    const account = setup({ login: vi.fn().mockResolvedValue({ user: user(), token: 'token', expiresAt: expiry() }) })
    await account.login('ana@empresa.com', 'password')
    expect(account.user.name).toBe('Ana'); expect(business.rows).toEqual([])
    expect(window.sessionStorage.getItem('comissionai.calculation.2025-07')).toBeUndefined(); expect(window.sessionStorage.getItem('theme')).toBe('dark')
  })
  it('does not authorize from old identity when the server is unavailable', async () => {
    authSession.set('token', expiry()); const account = setup({ me: vi.fn().mockRejectedValue(Error('network')) }); account.user = user()
    expect(await account.restore({ force: true })).toMatchObject({ user: null, reason: 'connection' }); expect(authSession.token).toBe('token')
  })
  it('keeps the real partial edit visible and reports failed role changes without success', async () => {
    const original = user(), saved = { ...original, name: 'Novo' }
    const account = setup({ update: vi.fn().mockResolvedValue(saved), profile: vi.fn().mockRejectedValue(Error('Perfil rejeitado')) })
    account.user = user('ADMINISTRADOR', 'admin'); account.users = [original]
    await expect(account.saveUser({ name: 'Novo', email: original.email, role: 'AUDITOR' }, original.id)).rejects.toThrow('Nome e e-mail foram salvos')
    expect(account.users[0]).toMatchObject({ name: 'Novo', role: 'ADMINISTRADOR' })
  })
  it('keeps fields unchanged after mutation rejection and clears session after real password change', async () => {
    const account = setup({ setActive: vi.fn().mockRejectedValue(Error('Rejected')), password: vi.fn().mockResolvedValue(null) }); account.user = user(); account.users = [user()]
    await expect(account.setActive('one', false)).rejects.toThrow(); expect(account.users[0].active).toBe(true)
    authSession.set('token', expiry()); await account.changePassword({ current: 'old', next: 'new' }); expect(authSession.token).toBeNull(); expect(account.user).toBeNull()
  })
  it('discards a completed mutation if the account changed while waiting', async () => {
    let resolve
    const account = setup({ setActive: vi.fn(() => new Promise(done => { resolve = done })) })
    account.user = user(); account.users = [user()]
    const request = account.setActive('one', false)
    authSession.set('different-user-token', expiry()); resolve({ ...user(), active: false })
    await expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(account.users[0].active).toBe(true)
  })
  it('removes obsolete demonstration data as well as calculation records', () => {
    window.sessionStorage.setItem('comissionai.accounts.preview.users.v1', 'old'); window.sessionStorage.setItem('comissionai.workflow.preview.v1', 'old')
    clearAccountCaches(window.sessionStorage); expect(window.sessionStorage.length).toBe(0)
  })
})
