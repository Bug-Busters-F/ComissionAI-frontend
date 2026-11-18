import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import HomeView from './HomeView.vue'
import defaultStatisticalAlertsApi from '@/services/statisticalAlertsApi'

vi.mock('@/services/useAccessPolicy', () => ({
  useAccessPolicy: () => ({
    can: (action) => action === 'viewAnomalies' || action === 'viewData' || action === 'createCampaign'
  })
}))

vi.mock('@/services/campaignService', () => ({
  campaignService: {
    list: vi.fn().mockResolvedValue([
      { id: 1, titulo: 'Campanha de Verão', dataInicio: '2025-08-01', dataFim: '2025-08-31', estado: 'ATIVA' }
    ])
  },
  normalizeCampaignError: (e) => e
}))

vi.mock('@/services/statisticalAlertsApi', () => ({
  default: {
    listAlerts: vi.fn().mockResolvedValue({ content: [] }),
    checkNewCases48h: vi.fn().mockResolvedValue({ hasNewCases48h: true }),
    countAlertsByType: vi.fn().mockResolvedValue({
      totalOutliers: 3,
      totalInconsistencias: 1,
      totalSemAmostra: 0,
      totalGeral: 4
    })
  }
}))

describe('HomeView Component — Sinalização de Alertas Estatísticos e Novos Casos (FRONT-6)', () => {
  it('renderiza o card de alertas estatísticos com link para campanhas e sinalizador de 48h', async () => {
    const app = createSSRApp(HomeView, {
      initialAnomalySummary: {
        competencia: '2025-08',
        hasNewCases48h: true,
        totalOutliers: 3,
        totalInconsistencias: 1,
        totalGeral: 4,
        loading: false,
        error: ''
      }
    })
    app.component('RouterLink', {
      props: ['to'],
      template: '<a :href="to"><slot /></a>'
    })
    const html = await renderToString(app)

    expect(html).toContain('Alertas Estatísticos e Anomalias de Vendas')
    expect(html).toContain('Conferir anomalias nas campanhas →')
    expect(html).toContain('href="/campanhas"')
    expect(html).toContain('3') // totalOutliers
    expect(html).toContain('1') // totalInconsistencias
    expect(html).toContain('Novos casos nas últimas 48h')
  })

  it('renderiza card de erro com ação de tentar novamente quando a busca de alertas falha', async () => {
    const app = createSSRApp(HomeView, {
      initialAnomalySummary: {
        competencia: '2025-08',
        loading: false,
        error: 'Erro de conexão com o servidor'
      }
    })
    app.component('RouterLink', {
      props: ['to'],
      template: '<a :href="to"><slot /></a>'
    })
    const html = await renderToString(app)

    expect(html).toContain('Não foi possível carregar os alertas')
    expect(html).toContain('Erro de conexão com o servidor')
    expect(html).toContain('Tentar novamente')
    // Não deve exibir como 0 anomalias nem renderizar contadores normais em caso de erro
    expect(html).not.toContain('anomalia(s) estatística(s) (&gt;3σ)')
  })
})
