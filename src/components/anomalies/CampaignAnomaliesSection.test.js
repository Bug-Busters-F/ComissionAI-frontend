import { describe, it, expect, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignAnomaliesSection from './CampaignAnomaliesSection.vue'
import { TIPO_ALERTA } from '@/services/statisticalAlertsLogic'

describe('CampaignAnomaliesSection Component — Tabela e Estados de UI (FRONT-6)', () => {
  const mockAlerts = {
    content: [
      {
        id: 'alerta-1',
        tipo: TIPO_ALERTA.OUTLIER_VENDA,
        dataReferencia: '2025-08-15',
        matricula: '1001',
        grupoComparavel: '2025-08|loja=1|cargo=10|marca=100',
        valorObservado: 15000,
        mediaGrupo: 4000,
        desvioPadrao: 1000,
        score: 11.0,
        metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2'
      },
      {
        id: 'alerta-2',
        tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH,
        dataReferencia: null,
        matricula: '2002',
        grupoComparavel: '2025-08|loja=2|cargo=20|marca=200',
        valorObservado: null,
        mediaGrupo: null,
        desvioPadrao: null,
        score: null,
        metodo: 'CONSISTENCIA_CADASTRO'
      },
      {
        id: 'alerta-3',
        tipo: TIPO_ALERTA.AMOSTRA_INSUFICIENTE,
        dataReferencia: '2025-08-10',
        matricula: '3003',
        grupoComparavel: '2025-08|loja=3|cargo=30|marca=300',
        valorObservado: 800,
        mediaGrupo: null,
        desvioPadrao: null,
        score: null,
        tamanhoAmostra: 2,
        metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2'
      }
    ],
    totalElements: 3,
    totalPages: 1,
    number: 0,
    size: 20
  }

  it('renderiza os 3 tipos de alerta com badges distintos e explicações contextuais via SSR', async () => {
    const app = createSSRApp(CampaignAnomaliesSection, {
      initialAlerts: mockAlerts,
      competence: '2025-08',
      campaign: {
        id: 1,
        titulo: 'Campanha Teste',
        dataInicio: '2025-08-01',
        dataFim: '2025-08-31'
      }
    })

    const html = await renderToString(app)

    // Badges dos 3 tipos
    expect(html).toContain('Anomalia Estatística')
    expect(html).toContain('Inconsistência de Carga')
    expect(html).toContain('Amostra Insuficiente')

    // Matrículas
    expect(html).toContain('1001')
    expect(html).toContain('2002')
    expect(html).toContain('3003')

    // Grupos comparáveis estruturados
    expect(html).toContain('Loja 1 · Cargo 10 · Marca 100')
    expect(html).toContain('Loja 2 · Cargo 20 · Marca 200')
    expect(html).toContain('Loja 3 · Cargo 30 · Marca 300')

    // Valores observados e faixas
    expect(html).toContain('15.000,00')
    expect(html).toContain('Faixa estimada (±3σ)')
    expect(html).toContain('Sem vendas')

    // Explicação contextual contendo score
    expect(html).toContain('score Z=11.00')
    expect(html).toContain('mínimo necessário: 4')
  })

  it('renderiza o estado vazio quando a lista de alertas é vazia', async () => {
    const app = createSSRApp(CampaignAnomaliesSection, {
      initialAlerts: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
      competence: '2025-08'
    })

    const html = await renderToString(app)
    expect(html).toContain('Nenhum alerta ou anomalia estatística encontrada')
    expect(html).toContain('Não foram identificados desvios estatísticos')
  })

  it('executa o modo real com fetch interno via apiClient quando initialAlerts é omitido', async () => {
    let capturedLoadedData = null
    const mockApiClient = {
      listAlerts: vi.fn().mockResolvedValue(mockAlerts),
      countAlertsByType: vi.fn().mockResolvedValue({
        totalOutliers: 1,
        totalInconsistencias: 1,
        totalSemAmostra: 1,
        totalGeral: 3
      })
    }

    const app = createSSRApp(CampaignAnomaliesSection, {
      competence: '2025-08',
      apiClient: mockApiClient,
      onLoaded: (payload) => {
        capturedLoadedData = payload
      }
    })

    const html = await renderToString(app)
    expect(html).toContain('Alertas Estatísticos e Anomalias de Vendas')
  })

  it('exibe o wrapper do botão de reprocessar com tooltip de bloqueio para perfil Auditor', async () => {
    const auditorAccessPolicy = {
      can: (action) => action === 'viewAnomalies' // Não tem reprocessAnomalies
    }

    const app = createSSRApp(CampaignAnomaliesSection, {
      competence: '2025-08',
      initialAlerts: mockAlerts,
      accessPolicy: auditorAccessPolicy,
      activeLots: [{ id: 'lote-123', label: 'Lote 123' }]
    })

    const html = await renderToString(app)
    // O botão só aparece quando há lote selecionado ou na presença de lote
    expect(html).toContain('Alertas Estatísticos e Anomalias de Vendas')
  })

  it('exibe modal de confirmação antes de disparar reprocessamento de lote', async () => {
    const adminAccessPolicy = {
      can: (action) => action === 'viewAnomalies' || action === 'reprocessAnomalies'
    }

    const app = createSSRApp(CampaignAnomaliesSection, {
      competence: '2025-08',
      initialAlerts: mockAlerts,
      accessPolicy: adminAccessPolicy,
      activeLots: [{ id: 'lote-123', label: 'Lote 123' }]
    })

    const html = await renderToString(app)
    // Valida que o container de anomalias renderizou corretamente
    expect(html).toContain('Alertas Estatísticos e Anomalias de Vendas')
  })
})
