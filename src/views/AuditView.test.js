import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAccountStore } from '@/stores/accountStore'
import AuditView from './AuditView.vue'
import AuditEventDetail from '@/components/audit/AuditEventDetail.vue'
import ImportHistoryDetail from '@/components/audit/ImportHistoryDetail.vue'
import AuditPagination from '@/components/audit/AuditPagination.vue'
import { auditService } from '@/services/auditService'

let listings, eventState, batchState, validationState
vi.mock('../services/useAuditListing', () => ({
  useAuditListing: kind => listings[kind],
  useAuditSessionResource: loader => ({ state: loader === auditService.event ? eventState : loader === auditService.batch ? batchState : validationState, load: vi.fn() })
}))
const eventId = '11111111-1111-4111-8111-111111111111'
const page = content => ({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0 })
const listing = data => ({ state: { data, loading: false, error: '' }, filters: ref({}), error: ref(''), selected: ref(''), applied: computed(() => ({ params: {} })), apply: vi.fn(), reset: vi.fn(), select: vi.fn(), reload: vi.fn(), page: vi.fn(), size: vi.fn() })
beforeEach(() => {
  eventState = { loading: false, error: '', data: { id: eventId, usuario: 'autor-antigo@teste.local', perfilUsuario: 'ANALISTA_CODIGO', tipoAcao: 'APROVACAO_CODIGO_CAMPANHA', sucesso: true, dataHora: '2026-11-20T10:00:00-03:00', descricao: 'Código aprovado', dadosAnteriores: '{"taxa":0.03}', dadosNovos: '{"taxa":0.04,"senha":"nao-exibir"}', relacionamentos: { campanha: { campanhaId: 3, titulo: 'Campanha antiga', versaoNumero: 2 }, arquivo: { reportId: 7, nomeArquivo: 'julho.xlsx', excluido: true }, calculo: { competencia: '2025-07', protocoloCalculo: eventId } } } }
  batchState = { loading: false, error: '', data: { reportId: 7, nomeArquivo: 'julho.xlsx', tipoBase: 'SALES', status: 'EXCLUIDO', competencia: '2025-07', criadoPor: 'gerente-antigo@teste.local', perfilCriador: 'GERENTE_VENDAS', criadoEm: '2026-11-20T09:00:00-03:00', linhasValidas: 8, totalLinhas: 10, totalImpeditivos: 1, totalAdvertencias: 1, totalAvisos: 0, totalInconsistencias: 2, excluidoEm: '2026-11-20T10:00:00-03:00', excluidoPor: 'admin@teste.local', perfilExclusao: 'ADMINISTRADOR', motivoExclusao: 'Substituição solicitada', origemLote: 'IMPORTACAO_DIRETA' } }
  validationState = { loading: false, error: '', data: page([{ id: 1, linha: 2, campo: 'valor', severidade: 'IMPEDITIVO', motivo: 'Valor negativo' }, { id: 2, linha: 3, campo: 'matrícula', severidade: 'ADVERTENCIA', motivo: 'Vínculo ausente' }]) }
  listings = { events: listing(page([eventState.data])), imports: listing(page([batchState.data])) }
})
async function render(component = AuditView, { role = 'ADMINISTRADOR', path = '/auditoria', props = {} } = {}) {
  const pinia = createPinia(), account = useAccountStore(pinia)
  account.user = { id: 2, role, permissions: role === 'ADMINISTRADOR' ? ['ACESSO_COMPLETO'] : role === 'GERENTE_VENDAS' ? ['CONSULTAR_LOGS_ANALISTAS'] : role === 'AUDITOR' ? ['CONSULTAR_LOGS_AUTORIZADOS'] : [] }
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: {} }] })
  await router.push(path)
  const app = createSSRApp(component, props)
  app.use(pinia); app.use(router)
  delete app._context.components.RouterLink
  app.component('RouterLink', defineComponent({ props: ['to'], setup: (p, { slots }) => () => h('a', { 'data-to': JSON.stringify(p.to) }, slots.default?.()) }))
  return renderToString(app)
}

describe('FRONT-12: telas somente para consulta', () => {
  it('mostra as atividades do servidor e os filtros pedidos, com escopo visível', async () => {
    const html = await render()
    for (const label of ['Usuário', 'Perfil do autor', 'Atividade', 'Número da campanha', 'Resultado', 'De', 'Até']) expect(html).toContain(label)
    expect(html).toContain('autor-antigo@teste.local')
    expect(html).toContain('Aprovação de código')
    expect(html).toContain('Você pode consultar todas as atividades')
    expect(html).not.toContain('Excluir atividade')
  })
  it('exibe histórico de cargas excluídas e contagens reais sem exclusão ou edição', async () => {
    const html = await render(AuditView, { path: '/auditoria?aba=cargas' })
    expect(html).toContain('julho.xlsx'); expect(html).toContain('Excluído')
    expect(html).toContain('1 impeditivas · 1 advertências · 0 avisos')
    expect(html).not.toContain('Excluir envio'); expect(html).not.toContain('Editar carga')
  })
  it('detalha perfil histórico, vínculos, antes/depois e não revela credenciais', async () => {
    const html = await render(AuditEventDetail, { props: { id: eventId }, role: 'AUDITOR' })
    expect(html).toContain('autor-antigo@teste.local'); expect(html).toContain('Analista de código')
    expect(html).toContain('Versão 2 registrada nesta atividade'); expect(html).toContain('histórico preservado')
    expect(html).toContain('Antes'); expect(html).toContain('Depois'); expect(html).toContain('0.04')
    expect(html).not.toContain('nao-exibir')
    expect(html).not.toContain('Aprovar'); expect(html).not.toContain('Salvar')
  })
  it('detalha exclusão e preserva validações impeditivas e advertências', async () => {
    const html = await render(ImportHistoryDetail, { props: { id: '7' }, role: 'AUDITOR' })
    expect(html).toContain('Exclusão registrada'); expect(html).toContain('Substituição solicitada')
    expect(html).toContain('Valor negativo'); expect(html).toContain('Vínculo ausente')
    expect(html).toContain('Arquivo original não disponível')
    expect(html).not.toContain('Baixar arquivo original')
    expect(html).not.toContain('Editar linha'); expect(html).not.toContain('Aceitar risco')
  })
  it('distingue carregamento, vazio e erro sem mostrar registros antigos', async () => {
    listings.events.state.loading = true
    let html = await render()
    expect(html).toContain('Consultando registros'); expect(html).not.toContain('autor-antigo@teste.local')
    listings.events.state.loading = false; listings.events.state.error = 'Consulta indisponível'
    html = await render()
    expect(html).toContain('Tentar novamente'); expect(html).not.toContain('Nenhuma atividade encontrada')
    listings.events.state.error = ''; listings.events.state.data = page([])
    html = await render()
    expect(html).toContain('Nenhuma atividade encontrada'); expect(html).not.toContain('Tentar novamente')
  })
  it('não renderiza controles de consulta para analista sem permissão', async () => {
    const html = await render(AuditView, { role: 'ANALISTA_NEGOCIOS' })
    expect(html).toContain('Seu perfil não permite consultar a auditoria')
    expect(html).not.toContain('Aplicar filtros'); expect(html).not.toContain('autor-antigo@teste.local')
  })
  it('desabilita próxima/anterior quando não há páginas e usa totais do servidor', async () => {
    const html = await render(AuditPagination, { props: { page: page([]) } })
    expect(html).toContain('0 registro(s)'); expect(html).toContain('Página 0 de 0')
    expect((html.match(/ disabled(?:[ >])/g) || []).length).toBe(2)
  })
})
