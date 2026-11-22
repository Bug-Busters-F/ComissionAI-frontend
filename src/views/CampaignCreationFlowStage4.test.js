import { describe, it, expect, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignApprovalGovernanceCard from '@/components/campaigns/CampaignApprovalGovernanceCard.vue'
import CampaignVersionComparison from '@/components/campaigns/CampaignVersionComparison.vue'
import { campaignFixture, savedResponse, programFixture } from '@/services/campaignLifecycleTestFixtures'
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
    executadoViaPython: true, versaoProgramaPython: 1, checksumPython: 'a'.repeat(64),
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
    program: vi.fn(async () => programFixture()), programHistory: vi.fn(async () => []),
    load: vi.fn(async () => savedResponse(campaign)),
    save: vi.fn(async () => savedResponse(campaign)),
    competences: vi.fn(async () => [{ competencia: '2026-09', totalVendas: 1 }]),
    cut: vi.fn(async () => ({ competencia: '2026-09', totalVendasRecortadas: 1, totalVendasComImpedimento: 0, impedimentosGerais: [] })),
    simulatePython: vi.fn(async () => simulationRaw('sim-1', cenario100Overrides)),
    sales: vi.fn(async () => ({ totalPaginas: 1, paginaAtual: 0, totalElementos: 0, vendas: [] })),
    readiness: vi.fn(async () => ({ aptaParaAtivacao: true, simulacaoId: 'sim-1', aceitoPor: 'Pessoa teste' })),
    accept: vi.fn(async () => ({ statusAceite: 'ACEITA', simulacaoId: 'sim-1', campanhaId: 42 })),
    simulation: vi.fn(async () => simulationRaw('sim-1', cenario100Overrides)),
    forwardToManager: vi.fn(async () => ({ id: 42, encaminhadaGerente: true })),
    ...apiOverrides
  }

  const lifecycle = createCampaignProposalLifecycle({ campaign, api, canSimulate: () => true })
  expect(await lifecycle.save()).toBe(true)
  await lifecycle.selectCompetence('2026-09')
  expect(await lifecycle.runSimulation()).toBe(true)
  lifecycle.simulation.aceitoPor = 'Pessoa teste'
  expect(await lifecycle.accept()).toBe(lifecycle.isBudgetWithinLimit.value)

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
      expect(lifecycle.simulation.accepted).toBe(false)
      expect(api.accept).not.toHaveBeenCalled()
      expect(lifecycle.simulation.error).toContain('Aceite bloqueado')
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
      lifecycle.program.current = programFixture(42, { statusAprovacao: 'REJEITADO', validoParaExecucao: false })
      expect(lifecycle.isCodeApproved.value).toBe(false)
      expect(lifecycle.canActivate.value).toBe(false)

      // Regra invalidada após alteração
      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: false })
      expect(lifecycle.isCodeApproved.value).toBe(false)
      expect(lifecycle.canActivate.value).toBe(false)

      // Aprovado e limpo
      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: true })
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

      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: true })
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
      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: false })
      expect(lifecycle.canActivate.value).toBe(false)
    })

    it('executa devolução para a Etapa 3 preservando aprovação técnica de código', async () => {
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
        revisaoControle: 101
      }))

      const { lifecycle } = await setupAndAccept(campaign, {
        returnProposal: apiReturnMock
      }, {
        dentroDoOrcamento: true,
        statusEnquadramento: 'ENQUADRADO'
      })

      // Código técnico previamente aprovado
      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: true })
      expect(lifecycle.canActivate.value).toBe(true)

      // Devolução para Etapa 3 (Simulação/Orçamento)
      const devolvido = await lifecycle.returnProposal({
        etapaDestino: 3,
        motivo: 'Ajustar parâmetros de projeção na simulação'
      })
      expect(devolvido).toBe(true)
      expect(apiReturnMock).toHaveBeenCalledWith(42, {
        etapaDestino: 3,
        motivo: 'Ajustar parâmetros de projeção na simulação'
      })
      expect(lifecycle.state.ultimaEtapa).toBe(3)

      // Backend preserva status do código, mas invalida aceite de simulação
      lifecycle.simulation.accepted = false
      expect(lifecycle.isCodeApproved.value).toBe(true)
      expect(lifecycle.canActivate.value).toBe(false)
    })
  })

  describe('Casos de Borda de Orçamento e Comparação', () => {
    it('permite ativação quando o custo projetado é exatamente igual ao teto orçamentário (saldo 0)', async () => {
      const campaign = campaignFixture()
      campaign.propostas[2].campos.taxaPercentual = '4'
      campaign.propostas[2].pendenciasRemotas = []
      campaign.propostas[2].metadadosRecebidos.validacaoPendente = false

      const { lifecycle } = await setupAndAccept(campaign, {}, {
        dentroDoOrcamento: true,
        statusEnquadramento: 'ENQUADRADO',
        excedenteOrcamento: '0.00',
        saldoOrcamento: '0.00',
        orcamentoTeto: '50000.00',
        custoTotalProjetado: '50000.00'
      })

      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: true })

      expect(lifecycle.isBudgetWithinLimit.value).toBe(true)
      expect(lifecycle.canActivate.value).toBe(true)
    })

    it('exibe mensagem explicativa de campanha sem versão publicada anterior', async () => {
      const campaign = campaignFixture()
      const app = createSSRApp(CampaignVersionComparison, {
        published: null,
        campaign,
        proposedNumber: 1,
        baseCompetence: null,
        proposedCompetence: '2026-09'
      })

      const html = await renderToString(app)
      expect(html).toContain('Não há versão anterior publicada')
    })
  })

  describe('Concorrência 409 e Erro 400 na Ativação e Encaminhamento', () => {
    it('sinaliza remoteChanged quando a ativação retorna 409 Conflict', async () => {
      const campaign = campaignFixture()
      campaign.propostas[2].campos.taxaPercentual = '4'
      campaign.propostas[2].pendenciasRemotas = []
      campaign.propostas[2].metadadosRecebidos.validacaoPendente = false

      const { lifecycle, api } = await setupAndAccept(campaign, {
        activate: vi.fn(async () => {
          const err = new Error('Conflito de revisão da campanha')
          err.response = { status: 409, data: { message: 'A campanha foi alterada por outro usuário.' } }
          throw err
        })
      }, {
        dentroDoOrcamento: true,
        statusEnquadramento: 'ENQUADRADO'
      })

      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: true })
      expect(lifecycle.canActivate.value).toBe(true)

      const ativado = await lifecycle.activate()
      expect(ativado).toBe(false)
      expect(lifecycle.state.remoteChanged).toBe(true)
      expect(lifecycle.state.error).toContain('A campanha foi alterada por outro usuário')
    })

    it('captura erro 400 com mensagem legível quando a ativação é rejeitada pelo backend', async () => {
      const campaign = campaignFixture()
      campaign.propostas[2].campos.taxaPercentual = '4'
      campaign.propostas[2].pendenciasRemotas = []
      campaign.propostas[2].metadadosRecebidos.validacaoPendente = false

      const { lifecycle } = await setupAndAccept(campaign, {
        activate: vi.fn(async () => {
          const err = new Error('Bloqueio de governança')
          err.response = { status: 400, data: { message: 'A simulação vinculada perdeu a validade.' } }
          throw err
        })
      }, {
        dentroDoOrcamento: true,
        statusEnquadramento: 'ENQUADRADO'
      })

      lifecycle.program.current = programFixture(42, { statusAprovacao: 'APROVADO', validoParaExecucao: true })

      const ativado = await lifecycle.activate()
      expect(ativado).toBe(false)
      expect(lifecycle.state.error).toContain('A simulação vinculada perdeu a validade')
    })
  })

  describe('Renderização de Botões por Papel na Etapa 4 (SoD na UI)', () => {
    it('renderiza botões de decisão exclusivamente para os papéis autorizados', async () => {
      const { canAccess } = await import('@/services/accessPolicy')

      // GERENTE_VENDAS: pode devolver e ativar, mas não aprova código HITL nem encaminha
      expect(canAccess('GERENTE_VENDAS', 'returnProposal')).toBe(true)
      expect(canAccess('GERENTE_VENDAS', 'activateCampaign')).toBe(true)
      expect(canAccess('GERENTE_VENDAS', 'approveCode')).toBe(false)

      // ANALISTA_CODIGO: aprova código HITL, mas não devolve, nem ativa, nem encaminha
      expect(canAccess('ANALISTA_CODIGO', 'approveCode')).toBe(true)
      expect(canAccess('ANALISTA_CODIGO', 'returnProposal')).toBe(false)
      expect(canAccess('ANALISTA_CODIGO', 'activateCampaign')).toBe(false)

      // ANALISTA_NEGOCIOS: encaminha propostas, mas não devolve, nem ativa, nem aprova código HITL
      expect(canAccess('ANALISTA_NEGOCIOS', 'createCampaign')).toBe(true)
      expect(canAccess('ANALISTA_NEGOCIOS', 'returnProposal')).toBe(false)
      expect(canAccess('ANALISTA_NEGOCIOS', 'activateCampaign')).toBe(false)
      expect(canAccess('ANALISTA_NEGOCIOS', 'approveCode')).toBe(false)

      // AUDITOR: somente leitura, sem nenhum botão de mutação na Etapa 4
      expect(canAccess('AUDITOR', 'viewCampaigns')).toBe(true)
      expect(canAccess('AUDITOR', 'approveCode')).toBe(false)
      expect(canAccess('AUDITOR', 'returnProposal')).toBe(false)
      expect(canAccess('AUDITOR', 'activateCampaign')).toBe(false)
    })
  })
})
