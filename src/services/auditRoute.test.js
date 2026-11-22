import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { useAccountStore } from '@/stores/accountStore'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import router from '@/router'

vi.mock('vue-router', async original => {
  const module = await original()
  return { ...module, createWebHistory: module.createMemoryHistory }
})
vi.mock('../components/accounts/AccountMenu.vue', () => ({ default: { render: () => null } }))
let pinia, account
beforeEach(() => {
  pinia = createPinia(); setActivePinia(pinia); account = useAccountStore(pinia)
  account.restore = vi.fn(async () => ({ user: account.user }))
})

describe('FRONT-12: menu e acesso direto', () => {
  it.each([
    ['ADMINISTRADOR', 'ACESSO_COMPLETO', true], ['GERENTE_VENDAS', 'CONSULTAR_LOGS_ANALISTAS', true], ['AUDITOR', 'CONSULTAR_LOGS_AUTORIZADOS', true], ['ANALISTA_NEGOCIOS', 'EDITAR_CAMPANHAS', false], ['ANALISTA_CODIGO', 'REVISAR_CODIGO', false]
  ])('aplica permissão em navegação e URL direta para %s', async (role, permission, allowed) => {
    account.user = { id: 1, role, permissions: [permission], name: 'Conta de teste' }
    await router.push('/home')
    await router.push('/auditoria?aba=cargas')
    expect(router.currentRoute.value.name).toBe(allowed ? 'auditoria' : 'acesso-restrito')
    const app = createSSRApp(SidebarNav); app.use(pinia); app.use(router)
    const html = await renderToString(app)
    expect(html.includes('href="/auditoria"')).toBe(allowed)
  })
  it('redireciona sessão ausente para login e respeita permissão revogada no mesmo perfil', async () => {
    account.user = null
    await router.push('/auditoria')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.retorno).toBe('/auditoria')
    account.user = { id: 1, role: 'AUDITOR', permissions: [] }
    await router.push('/auditoria')
    expect(router.currentRoute.value.name).toBe('acesso-restrito')
  })
})
