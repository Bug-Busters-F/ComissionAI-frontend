import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { authSession } from '@/services/authSession'
import { useAccountStore } from './accountStore'
import { createAccountService } from '@/services/accountService'
import { useAuthStore } from './authStore'
vi.mock('@/services/accountService', () => ({ createAccountService: vi.fn() }))
vi.mock('@/services/api', () => ({ onAccessDenied: vi.fn(), default: {} }))
beforeEach(() => { setActivePinia(createPinia()); authSession.clear(); vi.clearAllMocks(); createAccountService.mockReturnValue({ me: vi.fn() }) })
describe('bases share the existing login and permissions', () => {
  it('starts without identity or permissions and never logs in automatically', async () => {
    const adapter = useAuthStore()
    await adapter.refreshSession()
    expect(adapter.currentUser).toBeNull()
    expect(adapter.canModifyBases).toBe(false)
    expect(adapter.setRole).toBeUndefined()
  })
  it.each(['ADMINISTRADOR', 'GERENTE_VENDAS', 'AUDITOR', 'ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO'])('uses the server-confirmed %s identity', async role => {
    authSession.set('test-token', new Date(Date.now() + 60000).toISOString())
    const account = useAccountStore()
    const me = vi.fn().mockResolvedValue({ id: 'user-1', active: true, role, name: 'Pessoa', email: 'pessoa@example.test', permissions: ['ACESSO_COMPLETO', 'IMPORTAR_BASES'] })
    createAccountService.mockReturnValue({ me, logout: vi.fn().mockResolvedValue() })
    const adapter = useAuthStore()
    await adapter.refreshSession()
    expect(me).toHaveBeenCalledOnce()
    expect(adapter.currentUser.email).toBe(account.user.email)
    expect(adapter.canModifyBases).toBe(['ADMINISTRADOR', 'GERENTE_VENDAS'].includes(role))
    await account.logout()
    expect(adapter.canModifyBases).toBe(false)
    expect(adapter.currentUser).toBeNull()
  })
  it('removes editing access immediately when the shared account changes roles', () => {
    const account = useAccountStore(), adapter = useAuthStore()
    account.user = { active: true, role: 'GERENTE_VENDAS', permissions: ['IMPORTAR_BASES'] }
    expect(adapter.canModifyBases).toBe(true)
    account.user = { active: true, role: 'AUDITOR', permissions: [] }
    expect(adapter.canModifyBases).toBe(false)
  })
  it('does not retain privileges when server confirmation fails', async () => {
    authSession.set('test-token', new Date(Date.now() + 60000).toISOString())
    createAccountService.mockReturnValue({ me: vi.fn().mockRejectedValue(new Error('offline')) })
    const adapter = useAuthStore()
    await expect(adapter.refreshSession()).rejects.toThrow('Não foi possível confirmar')
    expect(adapter.canModifyBases).toBe(false)
  })
})
