import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { authSession } from '@/services/authSession'
import api from '@/services/api'
import { useAuthStore } from './authStore'
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }))
beforeEach(() => { setActivePinia(createPinia()); authSession.clear(); vi.clearAllMocks() })
describe('bases use the real login session', () => {
  it('starts without identity or permissions and never logs in automatically', async () => {
    const store = useAuthStore()
    await store.refreshSession()
    expect(store.currentUser).toBeNull()
    expect(store.canModifyBases).toBe(false)
    expect(api.get).not.toHaveBeenCalled()
    expect(store.setRole).toBeUndefined()
  })
  it.each(['ADMINISTRADOR', 'GERENTE_VENDAS', 'AUDITOR', 'ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO'])('confirms %s with the server', async papel => {
    authSession.set('test-token', new Date(Date.now() + 60000).toISOString())
    api.get.mockResolvedValue({ data: { id: 'user-1', ativo: true, papel } })
    const store = useAuthStore()
    await store.refreshSession()
    expect(api.get).toHaveBeenCalledWith('/auth/me')
    expect(store.canModifyBases).toBe(['ADMINISTRADOR', 'GERENTE_VENDAS'].includes(papel))
    authSession.clear()
    expect(store.canModifyBases).toBe(false)
    expect(store.currentUser).toBeNull()
  })
  it('does not retain privileges when confirmation fails', async () => {
    authSession.set('test-token', new Date(Date.now() + 60000).toISOString())
    api.get.mockRejectedValue(new Error('offline'))
    const store = useAuthStore()
    await expect(store.refreshSession()).rejects.toThrow('offline')
    expect(store.canModifyBases).toBe(false)
  })
})
