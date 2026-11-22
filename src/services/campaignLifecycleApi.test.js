import { describe, expect, it, vi } from 'vitest'
import { createCampaignLifecycleApi } from './campaignLifecycleApi'

describe('real campaign lifecycle HTTP client', () => {
  it('uses collection persistence, saved simulation, server paging, explicit acceptance and dedicated activation', async () => {
    const http = { get: vi.fn(async () => ({ data: {} })), post: vi.fn(async () => ({ data: {} })), put: vi.fn(async () => ({ data: {} })) }, api = createCampaignLifecycleApi(http)
    const payload = { regras: [{ blocoId: 'a' }, { blocoId: 'b' }], estado: 'DRAFT' }
    await api.save(null, payload); await api.save(7, payload); await api.load(7); await api.competences(); await api.cut(7, '2026-09'); await api.simulate(7, '2026-09'); await api.sales('sim', 2, 10); await api.accept('sim', { campanhaId: 7, aceitoPor: 'Pessoa' }); await api.readiness(7); await api.activate(7)
    expect(http.post).toHaveBeenCalledWith('/campanhas', payload, expect.any(Object)); expect(http.put).toHaveBeenCalledWith('/campanhas/7', payload, expect.any(Object))
    expect(http.post).toHaveBeenCalledWith('/simulacoes', { campanhaId: 7, competencia: '2026-09', limite: 10, pagina: 0 }, expect.any(Object))
    expect(http.get).toHaveBeenCalledWith('/simulacoes/sim/vendas', expect.objectContaining({ params: { page: 1, size: 10, sort: 'id,asc' } }))
    expect(http.post).toHaveBeenCalledWith('/simulacoes/sim/aceite', { campanhaId: 7, aceitoPor: 'Pessoa' }, expect.any(Object))
    expect(http.post).toHaveBeenCalledWith('/campanhas/7/ativar', {}, expect.any(Object))
  })
})

it('carries edit revisions and reads immutable published versions', async () => {
  const http = { get: vi.fn(async () => ({ data: [] })), post: vi.fn(async () => ({ data: {} })), put: vi.fn(async () => ({ data: {} })), delete: vi.fn(async () => ({})) }
  const api = createCampaignLifecycleApi(http)
  await api.startProposal(7, 10); await api.save(7, { titulo: 'Proposta' }, 11)
  await api.activate(7, 2, 12); await api.cancelProposal(7, 13); await api.history(7); await api.version(7, 2)
  expect(http.post).toHaveBeenCalledWith('/campanhas/7/proposta', {}, expect.objectContaining({ headers: { 'X-Campanha-Revisao': 10 } }))
  expect(http.put).toHaveBeenCalledWith('/campanhas/7', { titulo: 'Proposta' }, expect.objectContaining({ headers: { 'X-Campanha-Revisao': 11 } }))
  expect(http.post).toHaveBeenCalledWith('/campanhas/7/ativar', { versaoEsperada: 2 }, expect.objectContaining({ headers: { 'X-Campanha-Revisao': 12 } }))
  expect(http.delete).toHaveBeenCalledWith('/campanhas/7/proposta', expect.objectContaining({ headers: { 'X-Campanha-Revisao': 13 } }))
  expect(http.get).toHaveBeenCalledWith('/campanhas/7/versoes/2', expect.any(Object))
})

it('integrates code approval, manager forwarding, budget and version comparison', async () => {
  const http = {
    get: vi.fn(async () => ({ data: {} })),
    post: vi.fn(async () => ({ data: {} })),
    patch: vi.fn(async () => ({ data: {} }))
  }
  const api = createCampaignLifecycleApi(http)

  await api.approveCode(7, { aprovado: true, aprovadoPor: 'dev@empresa.com' })
  await api.getCodeApproval(7)
  await api.forwardToManager(7, { versaoEsperada: 1 })
  await api.compareVersions(7, 1, 2)
  await api.updateBudget(7, { orcamento: 50000, confirmar: true })
  await api.returnProposal(7, { etapaDestino: 1, motivo: 'Regra incorreta' })

  expect(http.post).toHaveBeenCalledWith('/campanhas/7/aprovacao-codigo', { aprovado: true, aprovadoPor: 'dev@empresa.com' }, expect.any(Object))
  expect(http.get).toHaveBeenCalledWith('/campanhas/7/aprovacao-codigo', expect.any(Object))
  expect(http.post).toHaveBeenCalledWith('/campanhas/7/encaminhar-gerente', { versaoEsperada: 1 }, expect.any(Object))
  expect(http.get).toHaveBeenCalledWith('/campanhas/7/versoes/comparacao', expect.objectContaining({ params: { versaoBase: 1, versaoComparada: 2 } }))
  expect(http.patch).toHaveBeenCalledWith('/campanhas/7/orcamento', { orcamento: 50000, confirmar: true }, expect.any(Object))
  expect(http.post).toHaveBeenCalledWith('/campanhas/7/devolver', { etapaDestino: 1, motivo: 'Regra incorreta' }, expect.any(Object))
})

it('consulta a aprovação do programa da versão exibida sem usar o controle antigo por regra', async () => {
  const approved = { campanhaId: 7, versaoCampanhaNumero: 1, statusAprovacao: 'APROVADO', validoParaExecucao: true }
  const http = { get: vi.fn(async () => ({ data: approved })) }
  const api = createCampaignLifecycleApi(http)
  expect(await api.program(7, 1)).toEqual(approved)
  expect(http.get).toHaveBeenLastCalledWith('/campanhas/7/versoes/1/programa-python', expect.any(Object))
  await api.program(7)
  expect(http.get).toHaveBeenLastCalledWith('/campanhas/7/programa-python', expect.any(Object))
  expect(http.get.mock.calls.every(([url]) => !url.includes('aprovacao-codigo'))).toBe(true)
})
