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
