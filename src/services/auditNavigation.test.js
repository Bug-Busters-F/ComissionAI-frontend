import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, defineComponent, h, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAccountStore } from '@/stores/accountStore'
import { useAuditListing, useAuditSessionResource } from './useAuditListing'
import { auditService } from './auditService'

const result = { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 }
const pending = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const renderer = createRenderer({
  createElement: tag => ({ tag, children: [] }), insert: (child, parent) => parent.children.push(child), remove: () => {},
  createText: text => ({ text }), createComment: text => ({ text }), setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.text = text }, parentNode: () => null, nextSibling: () => null, patchProp: () => {}
})
const settle = async () => { await nextTick(); await Promise.resolve(); await nextTick() }
let app
async function mount(query = '', setup = () => useAuditListing('events', 'a_')) {
  const pinia = createPinia(), account = useAccountStore(pinia)
  account.user = { id: 1, role: 'GERENTE_VENDAS', permissions: ['CONSULTAR_LOGS_ANALISTAS'] }
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/auditoria', component: { render: () => null } }] })
  await router.push('/auditoria' + query)
  let listing
  app = renderer.createApp(defineComponent({ setup() { listing = setup(); return () => h('div') } }))
  app.use(pinia); app.use(router); app.mount({ children: [] })
  await settle()
  return { listing, router, account }
}
afterEach(() => { app?.unmount(); vi.restoreAllMocks() })

describe('FRONT-12: navegação real e identidade', () => {
  it('restaura filtros da URL, pagina no servidor, zera a página ao filtrar e retoma ao voltar', async () => {
    const load = vi.spyOn(auditService, 'events').mockResolvedValue(result)
    const { listing, router } = await mount('?a_usuario=antigo%40teste.local&a_page=2&a_size=50')
    expect(load.mock.calls[0][0]).toMatchObject({ usuario: 'antigo@teste.local', page: 2, size: 50 })
    listing.filters.value.usuario = 'novo@teste.local'
    await listing.apply(); await settle()
    expect(router.currentRoute.value.query.a_page).toBeUndefined()
    expect(load.mock.calls.at(-1)[0]).toMatchObject({ usuario: 'novo@teste.local', page: 0, size: 50 })
    await listing.page(1); await settle()
    expect(load.mock.calls.at(-1)[0].page).toBe(1)
    const calls = load.mock.calls.length
    await listing.select('11111111-1111-4111-8111-111111111111'); await settle()
    expect(listing.selected.value).toBe('11111111-1111-4111-8111-111111111111')
    expect(load).toHaveBeenCalledTimes(calls)
    router.back(); await vi.waitFor(() => expect(router.currentRoute.value.query.a_detalhe).toBeUndefined())
    expect(listing.applied.value.params.page).toBe(1)
  })
  it('não consulta filtros inválidos e permite limpar sem perder parâmetros de outra área', async () => {
    const load = vi.spyOn(auditService, 'events').mockResolvedValue(result)
    const { listing, router } = await mount('?a_page=-1&aba=atividades&extra=ok')
    expect(load).not.toHaveBeenCalled(); expect(listing.error.value).not.toBe('')
    await listing.reset(); await settle()
    expect(router.currentRoute.value.query).toEqual({ aba: 'atividades', extra: 'ok' })
    expect(load).toHaveBeenCalledOnce()
  })
  it('cancela e limpa registros quando as permissões são revogadas durante o pedido', async () => {
    const first = pending(), load = vi.spyOn(auditService, 'events').mockReturnValue(first.promise)
    const { listing, account } = await mount()
    expect(listing.state.loading).toBe(true)
    account.user.permissions = []; await settle()
    expect(load.mock.calls[0][1].signal.aborted).toBe(true)
    first.resolve(result); await settle()
    expect(listing.state.data).toBeNull(); expect(listing.state.loading).toBe(false)
    expect(load).toHaveBeenCalledOnce()
  })
  it('refaz consulta com outra conta e não permite que a resposta da anterior reapareça', async () => {
    const first = pending(), second = pending(), load = vi.spyOn(auditService, 'events').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { listing, account } = await mount()
    account.user = { id: 2, role: 'AUDITOR', permissions: ['CONSULTAR_LOGS_AUTORIZADOS'] }; await settle()
    expect(load).toHaveBeenCalledTimes(2)
    second.resolve(result); await settle()
    first.resolve({ ...result, content: [{ usuario: 'antigo' }] }); await settle()
    expect(listing.state.data.content).toEqual([])
  })
  it('desmontar o detalhe cancela a requisição e ignora a resposta posterior', async () => {
    const request = pending(), load = vi.fn().mockReturnValue(request.promise)
    const { listing: detail } = await mount('', () => useAuditSessionResource(load, () => ({ id: 'registro' }), 'viewAudit', true))
    app.unmount(); app = null
    expect(load.mock.calls[0][1].signal.aborted).toBe(true)
    request.resolve({ usuario: 'antigo' }); await settle()
    expect(detail.state.data).toBeNull()
  })
})
