import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { createCampaignProposal } from './campaignProposalModel'
import { useCampaignProposalFlow } from './useCampaignProposalFlow'
import { proposalToBackend } from './campaignProposalMappers'
import { campaignFixture, savedResponse } from './campaignLifecycleTestFixtures'

const bindings = vi.hoisted(() => ({ route: null, router: null, client: null, lifecycle: null }))
vi.mock('vue-router', () => ({ useRoute: () => bindings.route, useRouter: () => bindings.router }))
vi.mock('vue', async (original) => ({ ...await original(), onBeforeUnmount: vi.fn() }))
vi.mock('./campaignLifecycleApi', () => ({ createCampaignLifecycleApi: () => bindings.lifecycle }))
vi.mock('./campaignProposalApiClient', () => ({ createCampaignProposalApiClient: () => bindings.client }))

async function setup({ saved = null, lifecycleApi = {} } = {}) {
  bindings.route = reactive({ ...(saved ? { params: { id: 42 } } : {}), fullPath: '/campanhas/nova?etapa=propostas', query: saved ? {} : { etapa: 'propostas' } })
  const change = async ({ query }) => { bindings.route.query = query; bindings.route.fullPath = '/campanhas/nova?etapa=' + query.etapa; await nextTick() }
  bindings.router = { push: vi.fn(change), replace: vi.fn(change) }
  bindings.client = {
    interpretCampaign: vi.fn(), reinterpretRule: vi.fn(),
    updateArtifacts: vi.fn(async ({ proposal }) => ({ blocoId: proposal.clientId, taxaCalculada: '0.05', explicacao: 'Atual', completa: true, pendencias: [] })),
    validateCampaign: vi.fn(async () => ({ valida: true, erros: [], avisos: [], referenciasValidadas: [] }))
  }
  bindings.lifecycle = {
    save: vi.fn(async (id, payload) => ({ ...payload, id: id || 41, estado: 'DRAFT', versaoProposta: 1, regras: payload.regras.map((r, index) => ({ ...r, id: index + 101, pendencias: r.pendencias.join('; '), dataInicio: payload.dataInicio, dataFim: payload.dataFim })) })),
    load: vi.fn(async () => saved),
    progress: vi.fn(async (id, payload) => ({ ...payload })),
    competences: vi.fn(async () => []),
    ...lifecycleApi
  }
  const scope = effectScope()
  const flow = scope.run(useCampaignProposalFlow)
  if (!saved) Object.assign(flow.campaign, { titulo: 'T', textoOriginal: 'D', dataInicio: '2026-10-01', dataFim: '2026-10-31', propostas: [createCampaignProposal({ campos: { codLoja: '1', taxaPercentual: '5' }, metadadosRecebidos: { validacaoPendente: true } })] })
  for (let i = 0; i < 15; i++) await nextTick()
  return { flow, scope }
}

beforeEach(() => vi.stubEnv('VITE_CAMPAIGN_PROPOSALS_MODE', 'api'))

function extractionResponse(flow) {
  const proposal = proposalToBackend(flow.campaign.propostas[0], flow.campaign)
  return { propostas: [{ ...proposal, blocoId: 'nova-regra', taxaFinal: '0.07',
    operacaoBase: { tipoOperacao: 'DEFINIR_TAXA', valorAjuste: '0.07', referenciaBase: null },
    explicacao: 'Nova regra', completa: true, pendencias: [] }], pendenciasGerais: [] }
}

describe('campaign flow integration navigation', () => {
  it.each([1, 2, 3])('resumes a draft in its highest reached stage %i after returning to the first stage', async (stage) => {
    const c = campaignFixture(); c.propostas = c.propostas.slice(0, 1)
    const saved = { ...savedResponse(c), versaoProposta: 1, ultimaEtapa: 1, etapaMaisAvancada: stage }
    const { flow, scope } = await setup({ saved })
    expect(flow.activeStep.value).toBe(flow.steps[stage - 1].key)
    expect(flow.reachedStep.value).toBe(stage)
    expect(bindings.lifecycle.save).not.toHaveBeenCalled()
    expect(flow.isDirty.value).toBe(false)
    scope.stop()
  })
  it('reopens review after leaving from the first stage when the accepted simulation is still valid', async () => {
    const c = campaignFixture(); c.propostas = c.propostas.slice(0, 1)
    const scenario = { totalVendas: '1000', totalComissaoBase: '20', totalComissaoProposta: '35', deltaComissao: '15', deltaPercentual: '75', comissaoProjetada: '35', deltaProjetado: '15', qtdVendasComMudancaFaixa: 0 }
    const saved = { ...savedResponse(c), ultimaEtapa: 1, etapaMaisAvancada: 4, simulacaoAceitaId: 'sim-id', statusAceite: 'ACEITA' }
    const { flow, scope } = await setup({ saved, lifecycleApi: {
      simulation: vi.fn(async () => ({ id: 'sim-id', protocolo: 'protocol', campanhaId: 42, competencia: '2026-10', totalVendasRecortadas: 1, fatorProjecao: '1', diasInclusivos: 31, cenario100: scenario, cenario80: scenario, cenario120: scenario, cenario150: scenario, vendas: [], avisosGerais: [] })),
      readiness: vi.fn(async () => ({ aptaParaAtivacao: true, simulacaoId: 'sim-id' })),
      sales: vi.fn(async () => ({ simulacaoId: 'sim-id', paginaAtual: 0, totalElementos: 1, totalPaginas: 1, vendas: [] }))
    } })
    expect(flow.activeStep.value).toBe('conferencia')
    expect(flow.reachedStep.value).toBe(4)
    expect(flow.lifecycle.canReview.value).toBe(true)
    expect(bindings.lifecycle.save).not.toHaveBeenCalled()
    expect(flow.isDirty.value).toBe(false)
    scope.stop()
  })
  it('falls back to simulation when a saved review no longer has a valid accepted result', async () => {
    const c = campaignFixture(); c.propostas = c.propostas.slice(0, 1)
    const { flow, scope } = await setup({ saved: { ...savedResponse(c), versaoProposta: 1, ultimaEtapa: 1, etapaMaisAvancada: 4 } })
    expect(flow.activeStep.value).toBe('simulacao')
    expect(flow.lifecycle.canReview.value).toBe(false)
    scope.stop()
  })
  it('records backward navigation separately from saving business fields and retains the reached history', async () => {
    const c = campaignFixture(); c.propostas = c.propostas.slice(0, 1)
    const { flow, scope } = await setup({ saved: { ...savedResponse(c), versaoProposta: 1, ultimaEtapa: 3, etapaMaisAvancada: 3 } })
    expect(await flow.navigateTo('dados')).toBe(true)
    await flow.lifecycle.recordProgress(1)
    expect(bindings.lifecycle.progress).toHaveBeenLastCalledWith(42, { ultimaEtapa: 1, etapaMaisAvancada: 3, versaoProposta: 1 })
    expect(bindings.lifecycle.save).not.toHaveBeenCalled()
    scope.stop()
  })
  it('allows retrying the concurrency check after an old campaign is removed without ignoring the blocker', async () => {
    const { flow, scope } = await setup()
    const p = flow.campaign.propostas[0]
    p.metadadosRecebidos.validacaoPendente = false
    p.pendenciasRemotas = [{ id: 'competition', codigo: 'CONFLITO_REGRA', mensagem: 'Regra 12', severidade: 'IMPEDITIVO' }]
    expect(flow.canAdvanceLocally.value).toBe(true)
    bindings.client.validateCampaign.mockResolvedValue({ valida: true, erros: [], avisos: [], referenciasValidadas: [], analiseConcorrencia: { totalConcorrentes: 0, temEmpate: false, temIdentica: false, regrasConcorrentes: [] } })
    expect(await flow.navigateTo('simulacao')).toBe(true)
    expect(flow.activeStep.value).toBe('simulacao')
    expect(bindings.client.validateCampaign).toHaveBeenCalledOnce()
    scope.stop()
  })
  it('asks before replacing the campaign and cancellation sends no request or changes', async () => {
    const { flow, scope } = await setup(); const original = JSON.stringify(flow.campaign)
    expect(await flow.interpretDescription()).toBe(false)
    expect(flow.campaignReinterpretationOpen.value).toBe(true)
    expect(bindings.client.interpretCampaign).not.toHaveBeenCalled()
    expect(flow.canAdvanceLocally.value).toBe(false)
    expect(await flow.navigateTo('conferencia')).toBe(false)
    flow.cancelCampaignReinterpretation()
    expect(flow.campaignReinterpretationOpen.value).toBe(false)
    expect(JSON.stringify(flow.campaign)).toBe(original)
    scope.stop()
  })
  it('replaces the collection after pre-confirmation without a post-interpretation comparison', async () => {
    const { flow, scope } = await setup()
    bindings.client.interpretCampaign.mockResolvedValue(extractionResponse(flow))
    const oldId = flow.campaign.propostas[0].clientId
    await flow.interpretDescription()
    expect(await flow.confirmCampaignReinterpretation()).toBe(true)
    expect(bindings.client.interpretCampaign).toHaveBeenCalledOnce()
    expect(flow.campaignReinterpretationOpen.value).toBe(false)
    expect(flow.integrationState.review).toBeNull()
    expect(flow.campaign.propostas[0].clientId).not.toBe(oldId)
    expect(flow.campaign.propostas[0].campos.taxaPercentual).toBe('7')
    expect(flow.campaign.titulo).toBe('T'); expect(flow.campaign.textoOriginal).toBe('D')
    scope.stop()
  })
  it('requires a new confirmation after campaign changes and preserves the collection on HTTP failure', async () => {
    const { flow, scope } = await setup()
    await flow.interpretDescription(); flow.updateCampaign('titulo', 'Título alterado')
    expect(await flow.confirmCampaignReinterpretation()).toBe(false)
    expect(bindings.client.interpretCampaign).not.toHaveBeenCalled()
    expect(flow.message.value).toContain('Os dados mudaram')
    const original = JSON.stringify(flow.campaign)
    bindings.client.interpretCampaign.mockRejectedValue(new Error('IA indisponível'))
    await flow.interpretDescription()
    expect(await flow.confirmCampaignReinterpretation()).toBe(false)
    expect(JSON.stringify(flow.campaign)).toBe(original)
    expect(flow.integrationState.error).toBe('IA indisponível')
    scope.stop()
  })
  it('does not ask for replacement on the initial interpretation', async () => {
    const { flow, scope } = await setup(); const received = extractionResponse(flow)
    flow.campaign.propostas = []
    bindings.client.interpretCampaign.mockResolvedValue(received)
    expect(await flow.interpretDescription()).toBe(true)
    expect(flow.campaignReinterpretationOpen.value).toBe(false)
    expect(flow.campaign.propostas).toHaveLength(1)
    scope.stop()
  })
  it('validates changed rules before advancing and keeps all four existing steps', async () => {
    const { flow, scope } = await setup()
    expect(await flow.navigateTo('simulacao')).toBe(true)
    expect(flow.activeStep.value).toBe('simulacao')
    expect(bindings.client.updateArtifacts).toHaveBeenCalledOnce()
    expect(bindings.client.validateCampaign).toHaveBeenCalledOnce()
    expect(flow.steps.map((s) => s.key)).toEqual(['dados', 'propostas', 'simulacao', 'conferencia'])
    scope.stop()
  })
  it('blocks a direct URL to review while a request is processing', async () => {
    const { flow, scope } = await setup()
    flow.integrationState.busy = true
    bindings.route.query = { etapa: 'conferencia' }
    await nextTick(); await nextTick()
    expect(flow.activeStep.value).toBe('propostas')
    expect(bindings.route.query.etapa).toBe('propostas')
    expect(bindings.client.updateArtifacts).not.toHaveBeenCalled()
    scope.stop()
  })
  it('does not allow a direct URL to bypass a required verification that failed', async () => {
    const { flow, scope } = await setup()
    bindings.client.updateArtifacts.mockRejectedValue(new Error('Serviço indisponível'))
    bindings.route.query = { etapa: 'conferencia' }
    for (let i = 0; i < 8; i++) await nextTick()
    expect(flow.activeStep.value).toBe('propostas')
    expect(flow.campaign.propostas[0].metadadosRecebidos.validacaoPendente).toBe(true)
    scope.stop()
  })
  it('does not override a newer navigation after the previous verification completes', async () => {
    const { flow, scope } = await setup()
    let resolve
    bindings.client.updateArtifacts.mockImplementation(({ proposal }) => new Promise((done) => { resolve = () => done({ blocoId: proposal.clientId, taxaCalculada: '0.05', explicacao: 'Atual', completa: true, pendencias: [] }) }))
    const previous = flow.navigateTo('conferencia')
    await flow.navigateTo('dados')
    resolve()
    expect(await previous).toBe(false)
    expect(flow.activeStep.value).toBe('dados')
    expect(bindings.route.query.etapa).toBe('dados')
    scope.stop()
  })
  it('marks dependent evidence stale after manual edits without clearing pending issues', async () => {
    const { flow, scope } = await setup(); const p = flow.campaign.propostas[0]
    p.pendenciasRemotas.push({ id: 'semantic', codigo: 'DESCONHECIDO', severidade: 'IMPEDITIVO', mensagem: 'Condição original' })
    flow.updateProposal(p.clientId, 'codLoja', '2')
    expect(p.artefatosDesatualizados).toBe(true)
    expect(p.metadadosRecebidos.origensDesatualizadas).toBe(true)
    expect(p.camposManuais).toContain('codLoja')
    expect(p.pendenciasRemotas).toHaveLength(1)
    expect(flow.canAdvanceLocally.value).toBe(false)
    scope.stop()
  })
  it('retries validation through navigation after a cadastral correction without bypassing rejection', async () => {
    const { flow, scope } = await setup()
    const id = flow.campaign.propostas[0].clientId
    bindings.client.validateCampaign.mockResolvedValue({ valida: false, erros: ['Loja não encontrada'], avisos: [], referenciasValidadas: [] })
    expect(await flow.navigateTo('simulacao')).toBe(false)
    expect(flow.canAdvanceLocally.value).toBe(false)
    flow.updateProposal(id, 'codLoja', '2')
    expect(flow.canAdvanceLocally.value).toBe(true)
    expect(flow.validation.value.blockers).toHaveLength(1)
    expect(await flow.navigateTo('simulacao')).toBe(false)
    expect(flow.activeStep.value).toBe('propostas')
    flow.updateProposal(id, 'codLoja', '3')
    bindings.client.validateCampaign.mockResolvedValue({ valida: true, erros: [], avisos: [], referenciasValidadas: [] })
    expect(await flow.navigateTo('simulacao')).toBe(true)
    expect(flow.validation.value.blockers).toHaveLength(0)
    expect(bindings.client.validateCampaign).toHaveBeenCalledTimes(3)
    scope.stop()
  })
  it('verifies manually corrected extraction issues through navigation and still blocks invalid local fields', async () => {
    const { flow, scope } = await setup()
    const p = flow.campaign.propostas[0]
    p.pendenciasRemotas.push({ id: 'ia:loja', codigo: 'LOJA_NAO_ENCONTRADA', campo: 'codLoja', severidade: 'IMPEDITIVO', mensagem: 'Loja inválida' })
    expect(flow.canAdvanceLocally.value).toBe(false)
    flow.updateProposal(p.clientId, 'codLoja', '-1')
    expect(flow.canAdvanceLocally.value).toBe(false)
    flow.updateProposal(p.clientId, 'codLoja', '2')
    expect(flow.canAdvanceLocally.value).toBe(true)
    expect(await flow.navigateTo('simulacao')).toBe(true)
    expect(flow.validation.value.blockers).toHaveLength(0)
    scope.stop()
  })
})

describe('persisted campaign navigation', () => {
  it('saves all rules before simulation and points the URL at the saved draft', async () => {
    const { flow, scope } = await setup()
    expect(await flow.navigateTo('simulacao')).toBe(true)
    expect(bindings.lifecycle.save).toHaveBeenCalledOnce()
    expect(bindings.router.push).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'campanha-editar', params: { id: 41 }, query: { etapa: 'simulacao' } }))
    expect(flow.isDirty.value).toBe(false); scope.stop()
  })
  it('rejects direct review navigation without formal acceptance by the backend', async () => {
    const { flow, scope } = await setup(); await flow.navigateTo('simulacao')
    expect(await flow.navigateTo('conferencia')).toBe(false)
    expect(flow.activeStep.value).toBe('simulacao')
    bindings.route.query = { etapa: 'conferencia' }; await nextTick(); await nextTick()
    expect(flow.activeStep.value).not.toBe('conferencia'); scope.stop()
  })
  it('does not silently associate changed campaign text with retained rules on save', async () => {
    const { flow, scope } = await setup(); flow.updateCampaign('textoOriginal', 'Novo texto que ainda não foi confirmado')
    expect(await flow.saveDraft()).toBe(false); expect(bindings.lifecycle.save).not.toHaveBeenCalled()
    expect(flow.descriptionNeedsConfirmation.value).toBe(true); scope.stop()
  })
})
