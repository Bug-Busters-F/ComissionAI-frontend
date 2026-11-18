import { describe, it, expect, vi } from 'vitest'
import { createStatisticalAlertsApi } from './statisticalAlertsApi'
import {
  TIPO_ALERTA,
  getEstimatedRange,
  getAnomalyDirection,
  getAlertExplanation,
  parseComparableGroup,
  extractAlertCompetence
} from './statisticalAlertsLogic'
import { canAccess } from './accessPolicy'

describe('statisticalAlertsIntegration — Testes de Integração de Fluxo e Contratos (FRONT-6)', () => {
  const allowedSortFields = ['geradoEm', 'dataReferencia', 'tipo', 'matricula', 'tamanhoAmostra', 'score']

  it('valida que a ordenação respeita os campos suportados pelo backend (AlertaEstatisticoService.java:35)', async () => {
    const mockHttp = {
      get: vi.fn().mockImplementation((url, config) => {
        const sort = config?.params?.sort
        if (sort) {
          const field = sort.split(',')[0]
          if (!allowedSortFields.includes(field)) {
            const err = new Error(`Campo de ordenação não permitido: ${field}`)
            err.response = { status: 400, data: { message: err.message } }
            return Promise.reject(err)
          }
        }
        return Promise.resolve({ data: { content: [], totalElements: 0, totalPages: 0 } })
      })
    }

    const api = createStatisticalAlertsApi(mockHttp)

    // Campos válidos
    for (const field of allowedSortFields) {
      await expect(api.listAlerts({ sort: `${field},desc` })).resolves.toBeDefined()
    }

    // Campo inválido dispararia erro no backend
    await expect(api.listAlerts({ sort: 'campoInexistente,asc' })).rejects.toThrow('não permitido')
  })

  it('integra fluxo completo de um outlier com valores Leave-One-Out, faixa e explicação', async () => {
    const rawOutlier = {
      id: 'alert-uuid-1',
      tipo: TIPO_ALERTA.OUTLIER_VENDA,
      competencia: '2025-08',
      dataReferencia: '2025-08-20',
      matricula: '10294',
      grupoComparavel: '2025-08|loja=10|cargo=5|marca=50',
      valorObservado: 25000,
      mediaGrupo: 5000,
      desvioPadrao: 1500,
      score: 13.33,
      metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2',
      geradoEm: new Date(Date.now() - 3600 * 1000).toISOString()
    }

    const mockHttp = {
      get: vi.fn().mockResolvedValue({
        data: {
          content: [rawOutlier],
          totalElements: 1,
          totalPages: 1
        }
      })
    }

    const api = createStatisticalAlertsApi(mockHttp)
    const res = await api.listAlerts({ competencia: '2025-08', matricula: '10294' })
    const alerta = res.content[0]

    // 1. Extração de competência
    expect(extractAlertCompetence(alerta)).toBe('2025-08')

    // 2. Parse do grupo comparável
    const grupo = parseComparableGroup(alerta.grupoComparavel)
    expect(grupo.label).toBe('Loja 10 · Cargo 5 · Marca 50')

    // 3. Faixa estimada (sem clamp zero)
    const range = getEstimatedRange(alerta)
    expect(range.min).toBe(500) // 5000 - 3 * 1500
    expect(range.max).toBe(9500) // 5000 + 3 * 1500
    expect(range.label).toContain('500,00')

    // 4. Direção da anomalia
    expect(getAnomalyDirection(alerta)).toBe('ACIMA')

    // 5. Explicação orientativa contextual rica
    const explicacao = getAlertExplanation(alerta)
    expect(explicacao).toContain('R$ 25.000,00')
    expect(explicacao).toContain('está acima da faixa estimada')
    expect(explicacao).toContain('Loja 10 · Cargo 5 · Marca 50')
    expect(explicacao).toContain('score Z=13.33')
  })

  it('integra inconsistência de cadastro SEM_VENDAS_PARA_RH com dataReferencia nula', async () => {
    const rawSemVendas = {
      id: 'alert-uuid-2',
      tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH,
      dataReferencia: null,
      matricula: '8877',
      grupoComparavel: '2025-08|loja=3|cargo=12|marca=1',
      valorObservado: null,
      mediaGrupo: null,
      desvioPadrao: null,
      score: null,
      metodo: 'CONSISTENCIA_CADASTRO'
    }

    // Mesmo com dataReferencia nula, extrai a competência do grupoComparavel
    expect(extractAlertCompetence(rawSemVendas)).toBe('2025-08')
    expect(getEstimatedRange(rawSemVendas)).toBeNull()
    expect(getAnomalyDirection(rawSemVendas)).toBe('INDEFINIDA')

    const exp = getAlertExplanation(rawSemVendas)
    expect(exp).toContain('matrícula 8877')
    expect(exp).toContain('sem nenhuma venda registrada')
  })

  it('garante que o perfil AUDITOR possui acesso de consulta e bloqueio de mutação', () => {
    // Auditor consulta anomalias
    expect(canAccess('AUDITOR', 'viewAnomalies')).toBe(true)
    // Auditor não pode reprocessar anomalias
    expect(canAccess('AUDITOR', 'reprocessAnomalies')).toBe(false)
  })
})
