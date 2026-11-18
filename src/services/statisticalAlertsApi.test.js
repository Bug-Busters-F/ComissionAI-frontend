import { describe, it, expect, vi } from 'vitest'
import { createStatisticalAlertsApi } from './statisticalAlertsApi'
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
