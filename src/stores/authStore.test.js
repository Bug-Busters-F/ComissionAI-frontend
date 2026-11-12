import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore, ROLES, safeStorage } from './authStore'

describe('authStore — RBAC & Sessão ([FRONT-4])', () => {
  beforeEach(() => {
    safeStorage.clear()
    setActivePinia(createPinia())
  })

  it('inicia com perfil padrão de Gerente de Vendas e permissão para upload de bases', () => {
    const store = useAuthStore()
    expect(store.currentUser.papel).toBe(ROLES.GERENTE_VENDAS)
    expect(store.canUploadBases).toBe(true)
    expect(store.canModifyBases).toBe(true)
    expect(store.isGerenteOuAdmin).toBe(true)
  })

  it('permite upload e alteração para perfil ADMINISTRADOR', () => {
    const store = useAuthStore()
    store.setRole(ROLES.ADMINISTRADOR)
    expect(store.currentUser.papel).toBe(ROLES.ADMINISTRADOR)
    expect(store.canUploadBases).toBe(true)
    expect(store.canModifyBases).toBe(true)
    expect(store.isGerenteOuAdmin).toBe(true)
  })

  it('bloqueia upload e alteração para ANALISTA_NEGOCIOS, ANALISTA_CODIGO e AUDITOR', () => {
    const store = useAuthStore()

    store.setRole(ROLES.ANALISTA_NEGOCIOS)
    expect(store.canUploadBases).toBe(false)
    expect(store.canModifyBases).toBe(false)
    expect(store.isGerenteOuAdmin).toBe(false)

    store.setRole(ROLES.ANALISTA_CODIGO)
    expect(store.canUploadBases).toBe(false)
    expect(store.canModifyBases).toBe(false)

    store.setRole(ROLES.AUDITOR)
    expect(store.canUploadBases).toBe(false)
    expect(store.canModifyBases).toBe(false)
  })

  it('persiste e recupera perfil alterado no storage', () => {
    const store = useAuthStore()
    store.setRole(ROLES.ADMINISTRADOR)

    const storedUser = JSON.parse(safeStorage.getItem('comissionai_auth_user'))
    expect(storedUser.papel).toBe(ROLES.ADMINISTRADOR)
  })

  it('realiza logout limpando sessão e token', () => {
    const store = useAuthStore()
    store.logout()
    expect(store.currentUser).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
