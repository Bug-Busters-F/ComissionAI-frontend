import { describe, it, expect, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignApprovalGovernanceCard from '@/components/campaigns/CampaignApprovalGovernanceCard.vue'
import CampaignVersionComparison from '@/components/campaigns/CampaignVersionComparison.vue'
import { campaignFixture, savedResponse } from '@/services/campaignLifecycleTestFixtures'
import { createCampaignProposalLifecycle } from '@/services/campaignProposalLifecycle'

const baseScenario = {
  totalVendas: '1000',
  totalComissaoBase: '20',
  totalComissaoProposta: '40',
  deltaComissao: '20',
  deltaPercentual: '100',
  comissaoProjetada: '40',
  deltaProjetado: '20',
  qtdVendasComMudancaFaixa: 0
}

function simulationRaw(id = 'sim-1', cenario100Overrides = {}) {
  return {
    id,
    protocolo: 'proto-1',
    campanhaId: 42,
    competencia: '2026-09',
    totalVendasRecortadas: 1,
    fatorProjecao: '1',
    diasInclusivos: 30,
    cenario100: { ...baseScenario, ...cenario100Overrides },
    cenario80: baseScenario,
    cenario120: baseScenario,
    cenario150: baseScenario,
    vendas: [],
    avisosGerais: []
  }
}

async function setupAndAccept(campaign, apiOverrides = {}, cenario100Overrides = {}) {
  const api = {
    load: vi.fn(async () => savedResponse(campaign)),
    save: vi.fn(async () => savedResponse(campaign)),
    competences: vi.fn(async () => [{ competencia: '2026-09', totalVendas: 1 }]),
    cut: vi.fn(async () => ({ competencia: '2026-09', totalVendasRecortadas: 1, totalVendasComImpedimento: 0, impedimentosGerais: [] })),
    simulate: vi.fn(async () => simulationRaw('sim-1', cenario100Overrides)),
    sales: vi.fn(async () => ({ totalPaginas: 1, paginaAtual: 0, totalElementos: 0, vendas: [] })),
    readiness: vi.fn(async () => ({ aptaParaAtivacao: true, simulacaoId: 'sim-1', aceitoPor: 'Pessoa teste' })),
    accept: vi.fn(async () => ({ statusAceite: 'ACEITA', simulacaoId: 'sim-1', campanhaId: 42 })),
    simulation: vi.fn(async () => simulationRaw('sim-1', cenario100Overrides)),
    forwardToManager: vi.fn(async () => ({})),
    ...apiOverrides
  }

  const lifecycle = createCampaignProposalLifecycle({ campaign, api })
  expect(await lifecycle.save()).toBe(true)
  await lifecycle.selectCompetence('2026-09')
  expect(await lifecycle.runSimulation()).toBe(true)
  lifecycle.simulation.aceitoPor = 'Pessoa teste'
  expect(await lifecycle.accept()).toBe(true)

  return { lifecycle, api }
}

describe('Campaign Creation Stage 4 (Conferência e Governança) — [FRONT-9]', () => {
  describe('Cenários e Bloqueio por Orçamento', () => {
    it('detecta estouro de teto no cenário 100% e bloqueia ativação e encaminhamento', async () => {
      const campaign = campaignFixture()
      campaign.propostas[2].campos.taxaPercentual = '4'
      campaign.propostas[2].pendenciasRemotas = []
      campaign.propostas[2].metadadosRecebidos.validacaoPendente = false

      const { lifecycle, api } = await setupAndAccept(campaign, {}, {
        dentroDoOrcamento: false,
        statusEnquadramento: 'ACIMA_DO_TETO',
        excedenteOrcamento: '12500.00',
        orcamentoTeto: '50000.00',
        custoTotalProjetado: '62500.00'
      })

      expect(lifecycle.isBudgetWithinLimit.value).toBe(false)
      expect(lifecycle.canActivate.value).toBe(false)

      const forwarded = await lifecycle.forwardToManager()
      expect(forwarded).toBe(false)
      expect(lifecycle.state.error).toContain('12500.00')
      expect(api.forwardToManager).not.toHaveBeenCalled()
    })

    it('libera encaminhamento ao gerente quando o cenário 100% está enquadrado no orçamento', async () => {
      const campaign = campaignFixture()
      campaign.propostas[2].campos.taxaPercentual = '4'
      campaign.propostas[2].pendenciasRemotas = []
      campaign.propostas[2].metadadosRecebidos.validacaoPendente = false

      const { lifecycle, api } = await setupAndAccept(campaign, {}, {
        dentroDoOrcamento: true,
        statusEnquadramento: 'ENQUADRADO',
        excedenteOrcamento: '0.00',
        orcamentoTeto: '50000.00',
        custoTotalProjetado: '42000.00'
      })

      expect(lifecycle.isBudgetWithinLimit.value).toBe(true)
      const forwarded = await lifecycle.forwardToManager()
      expect(forwarded).toBe(true)
      expect(api.forwardToManager).toHaveBeenCalledWith(42, expect.any(Object))
    })
  })

  describe('Bloqueio por Aprovação de Código Inválida', () => {
    it('bloqueia ativação se a aprovação de código for rejeitada ou invalidada', async () => {
      const campaign = campaignFixture()
      campaign.propostas[2].campos.taxaPercentual = '4'
      campaign.propostas[2].pendenciasRemotas = []
      campaign.propostas[2].metadadosRecebidos.validacaoPendente = false

      const { lifecycle } = await setupAndAccept(campaign, {}, {
        dentroDoOrcamento: true,
        statusEnquadramento: 'ENQUADRADO'
      })

      // Aprovação rejeitada
      lifecycle.state.codeApproval = {
        statusAprovacaoCodigo: 'REJEITADO',
        regras: [{ regraId: 1, statusAprovacaoCodigo: 'REJEITADO' }]
      }
      expect(lifecycle.isCodeApproved.value).toBe(false)
      expect(lifecycle.canActivate.value).toBe(false)

      // Regra invalidada após alteração
      lifecycle.state.codeApproval = {
        statusAprovacaoCodigo: 'APROVADO',
        regras: [{ regraId: 1, statusAprovacaoCodigo: 'INVALIDADO' }]
      }
      expect(lifecycle.isCodeApproved.value).toBe(false)
      expect(lifecycle.canActivate.value).toBe(false)

      // Aprovado e limpo
      lifecycle.state.codeApproval = {
        statusAprovacaoCodigo: 'APROVADO',
        regras: [{ regraId: 1, statusAprovacaoCodigo: 'APROVADO' }]
      }
      expect(lifecycle.isCodeApproved.value).toBe(true)
      expect(lifecycle.canActivate.value).toBe(true)
    })
  })

  describe('Comparação de Versões e Diagnóstico de Não Comparável', () => {
    it('exibe alerta de projeção não comparável quando as bases divergem', async () => {
      const campaign = campaignFixture()
      const raw = savedResponse(campaign)
      const published = { ...raw, numero: 1 }

      const app = createSSRApp(CampaignVersionComparison, {
        published,
        campaign,
        proposedNumber: 2,
        baseCompetence: '2026-06',
        proposedCompetence: '2026-07'
      })

      const html = await renderToString(app)
      expect(html).toContain('Projeção financeira não comparável')
      expect(html).toContain('2026-06 vs 2026-07')
    })
  })

  describe('Devolução pelo Gerente e Efeito Cascata', () => {
    it('executa devolução formal para a Etapa 1 e bloqueia ativação se forçado retorno', async () => {
      const campaign = campaignFixture()
      campaign.propostas[2].campos.taxaPercentual = '4'
      campaign.propostas[2].pendenciasRemotas = []
      campaign.propostas[2].metadadosRecebidos.validacaoPendente = false

      const apiReturnMock = vi.fn(async (id, payload) => ({
        ...savedResponse(campaign),
        id,
        ultimaEtapa: payload.etapaDestino,
        estadoEsteira: 'DEVOLVIDA',
        encaminhadaGerente: false,
        revisaoControle: 99
      }))

      const { lifecycle, api } = await setupAndAccept(campaign, {
        returnProposal: apiReturnMock
      }, {
        dentroDoOrcamento: true,
        statusEnquadramento: 'ENQUADRADO'
      })

      lifecycle.state.codeApproval = {
        statusAprovacaoCodigo: 'APROVADO',
        regras: [{ regraId: 1, statusAprovacaoCodigo: 'APROVADO' }]
      }
      expect(lifecycle.canActivate.value).toBe(true)

      // Devolve para Etapa 1
      const devolvido = await lifecycle.returnProposal({
        etapaDestino: 1,
        motivo: 'Ajustar regras antes de prosseguir'
      })
      expect(devolvido).toBe(true)
      expect(apiReturnMock).toHaveBeenCalledWith(42, {
        etapaDestino: 1,
        motivo: 'Ajustar regras antes de prosseguir'
      })

      expect(lifecycle.state.ultimaEtapa).toBe(1)
      expect(lifecycle.state.encaminhadaGerente).toBe(false)
      expect(lifecycle.state.revisaoControle).toBe(99)

      // Cascata simulada vinda do backend: se o backend invalidou o código na devolução
      lifecycle.state.codeApproval = {
        statusAprovacaoCodigo: 'INVALIDADO',
        regras: [{ regraId: 1, statusAprovacaoCodigo: 'INVALIDADO' }]
      }
      expect(lifecycle.canActivate.value).toBe(false)
    })
  })
})
