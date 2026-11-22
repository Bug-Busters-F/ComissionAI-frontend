import { describe, it, expect, vi } from 'vitest'
import { createStatisticalAlertsApi, fetchEffectivePreparationLots } from './statisticalAlertsApi'
import { TIPO_ALERTA } from './statisticalAlertsLogic'

describe('statisticalAlertsApi — Cliente de Alertas Estatísticos (FRONT-6)', () => {
  it('chama GET /alertas-estatisticos com parâmetros corretos', async () => {
    const mockHttp = {
      get: vi.fn().mockResolvedValue({
        data: {
          content: [{ id: 1, tipo: TIPO_ALERTA.OUTLIER_VENDA }],
          totalElements: 1,
          totalPages: 1
        }
      })
    }

    const api = createStatisticalAlertsApi(mockHttp)
    const result = await api.listAlerts({ competencia: '2025-08', size: 20 })

    expect(mockHttp.get).toHaveBeenCalledWith('/alertas-estatisticos', {
      params: { competencia: '2025-08', size: 20 }
    })
    expect(result.totalElements).toBe(1)
  })

  it('countAlertsByType executa 4 chamadas com size=1 e agrega contadores mantendo filtros ativos', async () => {
    const mockHttp = {
      get: vi.fn().mockImplementation((url, config) => {
        const tipo = config?.params?.tipo
        if (tipo === TIPO_ALERTA.OUTLIER_VENDA) {
          return Promise.resolve({ data: { totalElements: 5 } })
        }
        if (tipo === TIPO_ALERTA.SEM_VENDAS_PARA_RH) {
          return Promise.resolve({ data: { totalElements: 2 } })
        }
        if (tipo === TIPO_ALERTA.AMOSTRA_INSUFICIENTE) {
          return Promise.resolve({ data: { totalElements: 10 } })
        }
        return Promise.resolve({ data: { totalElements: 17 } })
      })
    }

    const api = createStatisticalAlertsApi(mockHttp)
    const counts = await api.countAlertsByType({ competencia: '2025-08', matricula: '99' })

    expect(mockHttp.get).toHaveBeenCalledTimes(4)
    expect(counts).toEqual({
      totalOutliers: 5,
      totalInconsistencias: 2,
      totalSemAmostra: 10,
      totalGeral: 17
    })
  })

  it('checkNewCases48h avalia se o alerta mais recente foi gerado em 48h', async () => {
    const now = Date.now()
    const mockHttp = {
      get: vi.fn().mockResolvedValue({
        data: {
          content: [
            { id: 1, geradoEm: new Date(now - 3600 * 1000).toISOString() } // 1 hora atrás
          ]
        }
      })
    }

    const api = createStatisticalAlertsApi(mockHttp)
    const check = await api.checkNewCases48h('2025-08')

    expect(mockHttp.get).toHaveBeenCalledWith('/alertas-estatisticos', {
      params: { competencia: '2025-08', size: 1, page: 0, sort: 'geradoEm,desc' }
    })
    expect(check.hasNewCases48h).toBe(true)
    expect(check.latestAlert?.id).toBe(1)
  })

  it('reprocessLote dispara POST para /alertas-estatisticos/reprocessar com lotePreparacaoId no body', async () => {
    const mockHttp = {
      post: vi.fn().mockResolvedValue({ data: { success: true } })
    }

    const api = createStatisticalAlertsApi(mockHttp)
    const res = await api.reprocessLote('uuid-lote-123')

    expect(mockHttp.post).toHaveBeenCalledWith('/alertas-estatisticos/reprocessar', {
      lotePreparacaoId: 'uuid-lote-123'
    })
    expect(res.success).toBe(true)
  })

  it('reprocessLote rejeita chamada sem identificador', async () => {
    const api = createStatisticalAlertsApi({})
    await expect(api.reprocessLote('')).rejects.toThrow('Identificador do lote')
  })
})

describe('fetchEffectivePreparationLots — lotes efetivados para filtro e reprocessamento (FRONT-6)', () => {
  const lots = [{ id: 'l1', tipoBase: 'SALES', status: 'EFETIVADO' }]

  it('consulta GET /campanhas/{id}/preparacao-bases por tipoBase (SALES e HR), status EFETIVADO e competência', async () => {
    const hrLot = { id: 'l2', tipoBase: 'HR', status: 'EFETIVADO' }
    const service = { listBatches: vi.fn((_, { tipoBase }) => Promise.resolve(tipoBase === 'HR' ? [hrLot] : lots)) }
    const res = await fetchEffectivePreparationLots(service, { campanhaId: 7, competencia: '2025-08', canViewLots: true })
    // tipoBase sempre informado: o back responde 500 quando ele é omitido (UPPER de parâmetro nulo no PostgreSQL)
    expect(service.listBatches).toHaveBeenCalledTimes(2)
    expect(service.listBatches).toHaveBeenCalledWith(7, { tipoBase: 'SALES', status: 'EFETIVADO', competencia: '2025-08' })
    expect(service.listBatches).toHaveBeenCalledWith(7, { tipoBase: 'HR', status: 'EFETIVADO', competencia: '2025-08' })
    expect(res).toEqual({ lots: [...lots, hrLot], restricted: false, error: null })
  })

  it('não chama o backend quando o perfil não pode listar lotes (ex.: AUDITOR), evitando 403', async () => {
    const service = { listBatches: vi.fn() }
    const res = await fetchEffectivePreparationLots(service, { campanhaId: 7, competencia: '2025-08', canViewLots: false })
    expect(service.listBatches).not.toHaveBeenCalled()
    expect(res).toEqual({ lots: [], restricted: true, error: null })
  })

  it('trata 403 inesperado como lista vazia restrita, sem propagar erro', async () => {
    const err = Object.assign(new Error('Forbidden'), { response: { status: 403 } })
    const service = { listBatches: vi.fn().mockRejectedValue(err) }
    const res = await fetchEffectivePreparationLots(service, { campanhaId: 7, competencia: '2025-08' })
    expect(res).toEqual({ lots: [], restricted: true, error: null })
  })

  it('devolve o erro para log em falhas não relacionadas a permissão', async () => {
    const err = Object.assign(new Error('boom'), { response: { status: 500 } })
    const service = { listBatches: vi.fn().mockRejectedValue(err) }
    const res = await fetchEffectivePreparationLots(service, { campanhaId: 7, competencia: '2025-08' })
    expect(res.lots).toEqual([])
    expect(res.error).toBe(err)
  })

  it('ignora chamadas sem campanha ou competência e respostas não-lista', async () => {
    const service = { listBatches: vi.fn().mockResolvedValue(null) }
    expect((await fetchEffectivePreparationLots(service, { campanhaId: null, competencia: '2025-08' })).lots).toEqual([])
    expect((await fetchEffectivePreparationLots(service, { campanhaId: 7, competencia: '' })).lots).toEqual([])
    expect(service.listBatches).not.toHaveBeenCalled()
    expect((await fetchEffectivePreparationLots(service, { campanhaId: 7, competencia: '2025-08' })).lots).toEqual([])
  })
})
