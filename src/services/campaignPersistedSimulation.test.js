import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignPersistedSimulationStep from '@/components/campaigns/CampaignPersistedSimulationStep.vue'
import { persistedSimulationPagination, simulationViewModel } from './campaignPersistedSimulation'

function simulation() {
  return {
    competences: [{ competencia: '2025-07', label: 'Julho', totalVendas: 30 }], selectedCompetencia: '2025-07',
    referenceValidation: { totalVendasCompetencia: 30, totalVendasRecortadas: 30, canExecute: true, impediments: [] },
    isRunning: false, status: 'CONCLUIDA', progress: 100, invalidationReasons: [],
    page: 2, pageSize: 10, totalItems: 30, totalPages: 3,
    result: {
      id: 'saved', competencia: '2025-07', diasInclusivos: 31, fatorProjecao: '1.033333',
      rows: [{ saleId: 'sale-page-2', matricula: '001234', loja: 75, marca: 'PRETO', cargo: 'VENDEDOR', valorVenda: 1000, comissaoBase: 25, taxaBasePct: 2.5, comissaoProposta: 35, taxaPropostaPct: 3.5, diferenca: 10, memoriaCalculo: 'Memória recebida do backend.' }],
      totals: { totalVendasConsideradas: 30, duracaoCampanhaDias: 31, fatorDuracaoTexto: '1.033333', historico: { totalVendas: 30000, comissaoBase: 750, comissaoProposta: 1050, diferenca: 300, impactoPct: 40 }, projetado: { totalVendas: 31000, comissaoBase: 775, comissaoProposta: 1085, diferenca: 310, impactoPct: 40 } },
      scenarios: []
    }
  }
}

describe('simulação multirregras adaptada à tela da dev', () => {
  it('não pagina novamente uma página recebida do backend', () => {
    const data = simulation()
    expect(persistedSimulationPagination(data)).toMatchObject({ page: 2, totalPages: 3, startIndex: 11, endIndex: 11, hasPrev: true, hasNext: true, items: data.result.rows })
  })

  it('renderiza a página do backend com o novo visual da dev e os totais consolidados', async () => {
    const app = createSSRApp(CampaignPersistedSimulationStep, { form: { dataInicio: '2026-10-01', dataFim: '2026-10-31' }, simulation: simulation() })
    app.component('RouterLink', { template: '<a><slot /></a>' })
    const html = await renderToString(app)
    expect(html).toContain('001234')
    expect(html).toContain('11–11 de')
    expect(html).toContain('30 vendas')
    expect(html).toContain('Simulação da Campanha')
  })

  it('reutiliza o bloqueio de cobertura da dev a partir dos impedimentos reais', async () => {
    const data = simulation()
    data.referenceValidation = { canExecute: false, impediments: [{ code: 'MISSING_BASE_COVERAGE', message: 'Falta taxa para PRETO e VENDEDOR.' }], missingBases: [{ marca: 'PRETO', cargo: 'VENDEDOR' }] }
    const app = createSSRApp(CampaignPersistedSimulationStep, { form: {}, simulation: data })
    app.component('RouterLink', { template: '<a><slot /></a>' })
    const html = await renderToString(app)
    expect(html).toContain('Simulação Bloqueada: Base Contratual Ausente')
    expect(html).toContain('Falta taxa para PRETO e VENDEDOR.')
    expect(html).not.toContain('001234')
  })
})


it('alimenta os cartões projetados da dev com valores projetados, sem confundir com os históricos', () => {
  const scenario = { totalVendas: '80', totalComissaoBase: '2', totalComissaoProposta: '4', deltaComissao: '2', deltaPercentual: '100', comissaoProjetada: '4.13', deltaProjetado: '2.06' }
  const view = simulationViewModel({ fatorProjecao: String(31 / 30), diasInclusivos: 31, totalVendasRecortadas: 1, vendas: [], cenario100: scenario, cenario80: scenario, cenario120: scenario, cenario150: scenario })
  expect(view.scenarios[0]).toMatchObject({ sales: 82.67, withoutProposal: 2.07, withProposal: '4.13', impact: '2.06' })
  expect(view.totals.historico.totalVendas).toBe('80')
})
