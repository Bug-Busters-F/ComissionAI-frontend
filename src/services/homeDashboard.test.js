import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { dashboardActions, homeDashboardService, normalizeIndicators } from './homeDashboard'
import { createHomeDashboardState } from './homeDashboardState'
import { canAccess } from './accessPolicy'
import { indicatorsFixture } from './homeDashboardTestFixtures'

vi.mock('./api', () => ({ default: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

describe('Home: contrato e navegação', () => {
  it('consulta os totais reais sem dados de demonstração e propaga cancelamento', async () => {
    const raw = indicatorsFixture(), controller = new AbortController()
    api.get.mockResolvedValue({ data: raw })
    expect(await homeDashboardService.indicators({ signal: controller.signal })).toEqual(raw)
    expect(api.get).toHaveBeenCalledWith('/indicadores', { signal: controller.signal, timeout: 30000 })
  })
  it('preserva zeros legítimos e rejeita totais ausentes, negativos e respostas inválidas', () => {
    const raw = indicatorsFixture()
    raw.pendencias.total = 0
    expect(normalizeIndicators(raw).pendencias.total).toBe(0)
    for (const value of [null, undefined, -1, '3', NaN]) {
      expect(() => normalizeIndicators({ ...raw, competencias: { ...raw.competencias, total: value } })).toThrow()
    }
    for (const overrides of [{ perfil: 'INVENTADO' }, { atualizadoEm: null }, { aguardandoAcao: null }]) {
      expect(() => normalizeIndicators({ ...raw, ...overrides })).toThrow()
    }
  })
  it('usa somente as três campanhas mais recentes da listagem e aceita lista vazia', async () => {
    api.get.mockResolvedValueOnce({ data: [9, 8, 7, 6].map(id => ({ id, titulo: `Campanha ${id}` })) }).mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: {} })
    expect((await homeDashboardService.campaigns()).map(c => c.id)).toEqual([9, 8, 7])
    expect(await homeDashboardService.campaigns()).toEqual([])
    await expect(homeDashboardService.campaigns()).rejects.toThrow()
  })
  it.each([
    ['ADMINISTRADOR', 6], ['ANALISTA_NEGOCIOS', 1], ['ANALISTA_CODIGO', 1], ['GERENTE_VENDAS', 4], ['AUDITOR', 0]
  ])('mostra somente ações permitidas para %s', (role, count) => {
    const actions = dashboardActions(indicatorsFixture().aguardandoAcao, action => canAccess(role, action))
    expect(actions).toHaveLength(count)
    expect(actions.every(action => action.to.name && !('href' in action))).toBe(true)
  })
  it('não inventa ações ausentes no resumo e respeita permissões revogadas', () => {
    expect(dashboardActions([], () => true)).toEqual([])
    expect(dashboardActions(indicatorsFixture().aguardandoAcao, action => canAccess('ADMINISTRADOR', action, []))).toEqual([])
  })
  it('converte ações em rotas locais sem executar operações nem confiar em URLs recebidas', () => {
    const [budget, code, approval, lot, closing] = dashboardActions(indicatorsFixture().aguardandoAcao, () => true)
    expect(budget.to).toEqual({ name: 'campanha-editar', params: { id: 8 }, query: { etapa: 'dados' } })
    expect(code.to.query.etapa).toBe('propostas')
    expect(approval.to.query.etapa).toBe('conferencia')
    expect(lot.to.name).toBe('campanha-detalhes')
    expect(closing.to).toEqual({ name: 'dados-calculo', params: { competencia: '2025-07' } })
    expect(dashboardActions([{ tipo: 'DESCONHECIDA', href: 'https://example.com' }, { tipo: 'CALCULO_FALHOU', competencia: '2025-13' }, { tipo: 'ORCAMENTO_PENDENTE', campanhaId: '../usuarios' }], () => true)).toEqual([])
    expect(api.get).not.toHaveBeenCalled()
  })
})

describe('Home: carregamento e preservação da sessão', () => {
  it('mantém consultas independentes e permite repetir só a que falhou', async () => {
    const service = { indicators: vi.fn().mockRejectedValueOnce(Error('JDBC dados internos')).mockResolvedValue(indicatorsFixture()), campaigns: vi.fn().mockResolvedValue([{ id: 1 }]) }
    const state = createHomeDashboardState(service)
    await state.refresh()
    expect(state.indicators.value).toBeNull()
    expect(state.indicatorsError.value).toContain('Não foi possível carregar')
    expect(state.indicatorsError.value).not.toContain('JDBC')
    expect(state.campaigns.value).toEqual([{ id: 1 }])
    await state.loadIndicators()
    expect(state.indicators.value.campanhas.total).toBe(12)
    expect(state.indicatorsError.value).toBe('')
    expect(service.campaigns).toHaveBeenCalledTimes(1)
    state.dispose()
  })
  it('não transforma erro em zero ou lista vazia de sucesso', async () => {
    const service = { indicators: vi.fn().mockResolvedValueOnce(indicatorsFixture()).mockRejectedValueOnce({ response: { status: 403 } }), campaigns: vi.fn().mockRejectedValue({ response: { status: 500 } }) }
    const state = createHomeDashboardState(service)
    await state.refresh()
    expect(state.campaignsError.value).not.toBe('')
    await state.loadIndicators()
    expect(state.indicators.value).toBeNull()
    expect(state.indicatorsError.value).toContain('Seu acesso')
    state.dispose()
  })
  it('descarta respostas antigas ao atualizar novamente', async () => {
    const first = pending(), second = pending()
    const service = { indicators: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise) }
    const state = createHomeDashboardState(service)
    const old = state.loadIndicators(), current = state.loadIndicators()
    expect(service.indicators.mock.calls[0][0].signal.aborted).toBe(true)
    second.resolve(indicatorsFixture()); await current
    first.resolve({ perfil: 'OUTRO_USUARIO' }); await old
    expect(state.indicators.value.perfil).toBe('ADMINISTRADOR')
    state.dispose()
  })
  it('limpa dados e cancela respostas ao sair ou trocar de usuário', async () => {
    const request = pending()
    const service = { indicators: vi.fn().mockReturnValue(request.promise) }
    const state = createHomeDashboardState(service)
    state.campaigns.value = [{ id: 1 }]
    const running = state.loadIndicators()
    state.reset()
    expect(service.indicators.mock.calls[0][0].signal.aborted).toBe(true)
    request.resolve(indicatorsFixture()); await running
    expect(state.indicators.value).toBeNull()
    expect(state.campaigns.value).toEqual([])
    expect(state.indicatorsLoading.value).toBe(false)
    state.dispose()
  })
  it('explica sessão expirada e ignora respostas depois de desmontar a página', async () => {
    const request = pending(), state = createHomeDashboardState({ indicators: () => request.promise })
    const running = state.loadIndicators()
    state.dispose(); request.resolve(indicatorsFixture()); await running
    expect(state.indicators.value).toBeNull()
    const expired = createHomeDashboardState({ indicators: () => Promise.reject({ response: { status: 401 } }) })
    await expired.loadIndicators()
    expect(expired.indicatorsError.value).toContain('Sua sessão expirou')
    expired.dispose()
  })
})
