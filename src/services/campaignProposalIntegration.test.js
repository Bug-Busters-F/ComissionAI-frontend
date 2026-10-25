import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createCampaignProposalIntegration } from './campaignProposalIntegration'
import { createCampaignProposalApiClient } from './campaignProposalApiClient'
import { normalizeBackendCampaignResponse, proposalToBackend } from './campaignProposalMappers'
import { createCampaignProposalForm } from './campaignProposalModel'
import { getRequiredProposalStep, validateCampaignProposalSet } from './campaignProposalValidation'
import { describeFieldOrigin } from './campaignFieldOrigins'

function block(overrides = {}) {
  return { blocoId: 'bloco-1', trechoOrigem: '3,5% na loja 75',
    filtros: { codMarca: null, descrMarca: null, codCargo: null, descriCargo: null, codLoja: 75, canal: null, matricula: '001234' },
    taxaFinal: '0.0350', condicaoValor: { valorMinimo: '0.00', minInclusivo: true, valorMaximo: '1000.00', maxInclusivo: false },
    operacaoBase: { tipoOperacao: 'DEFINIR_TAXA', valorAjuste: '0.0350', referenciaBase: null },
    pendencias: [], origensPorCampo: { loja: 'TEXTO', taxa: 'TEXTO', dataInicio: 'TEXTO' }, referenciasConsultadas: [],
    explicacao: 'Explicação inicial', completa: true, vigencia: { dataInicio: '2026-10-01', dataFim: '2026-10-31' },
    bonusPercentual: '0.01', bonusValorFixo: '20.00', ...overrides }
}
function response(propostas = [block()], pendenciasGerais = []) { return { propostas, pendenciasGerais, tituloSugerido: 'Sugerido' } }
function setup(propostas = [block()]) {
  const campaign = reactive({ ...createCampaignProposalForm(), ...normalizeBackendCampaignResponse(response(propostas)).campaign, titulo: 'Meu título', textoOriginal: 'Texto completo da campanha' })
  const provider = {
    interpretCampaign: vi.fn(async () => response()), reinterpretRule: vi.fn(async () => response()),
    updateArtifacts: vi.fn(async ({ proposal }) => ({ blocoId: proposal.clientId, taxaCalculada: '0.0350', explicacao: 'Explicação atual', pendencias: [], completa: true })),
    validateCampaign: vi.fn(async () => ({ valida: true, erros: [], avisos: [], referenciasValidadas: [] }))
  }
  return { campaign, provider, integration: createCampaignProposalIntegration({ campaign, provider }) }
}
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r }); return { promise, resolve } }

describe('backend multirule contract', () => {
  it('maps all blocks, fractional rates, zero bounds, flags, matrícula and extra metadata', () => {
    const { campaign } = normalizeBackendCampaignResponse(response([block(), block({ blocoId: 'b2', taxaFinal: null }), block({ blocoId: 'b3' })]))
    expect(campaign.propostas).toHaveLength(3)
    expect(campaign.propostas[0].campos).toMatchObject({ taxaPercentual: '3,5', valorMinimo: '0.00', maximoInclusivo: false, matricula: '001234', publicoTodasVendas: false })
    expect(campaign.propostas[1].campos.taxaPercentual).toBe('')
    expect(campaign.dataInicio).toBe('2026-10-01')
    expect(proposalToBackend(campaign.propostas[0], campaign)).toMatchObject({ taxaFinal: '0.035', bonusPercentual: '0.01', bonusValorFixo: '20.00', condicaoValor: { valorMinimo: '0.00', maxInclusivo: false }, filtros: { matricula: '001234' } })
    expect(new Set(campaign.propostas.map((p) => p.clientId)).size).toBe(3)
    expect(campaign.propostas[0].serverId).toBeNull()
  })
  it('keeps invalid entries visible and missing mandatory properties as blockers', () => {
    const raw = block(); delete raw.filtros.canal
    const { campaign } = normalizeBackendCampaignResponse(response([raw, null]))
    expect(campaign.propostas).toHaveLength(2)
    expect(campaign.propostas.every((p) => p.metadadosRecebidos.contratoInvalido)).toBe(true)
  })
  it('maps field paths, warning severity and preserves unknown/global blockers', () => {
    const { campaign } = normalizeBackendCampaignResponse(response([block({ pendencias: [
      { codigo: 'L', campo: 'filtros.codLoja', mensagem: 'Loja', severidade: 'IMPEDIMENTO' },
      { codigo: 'R', campo: 'condicaoValor.valorMinimo', mensagem: 'Limite', severidade: 'AVISO' },
      { codigo: 'X', campo: 'futuro.x', mensagem: 'Desconhecido', severidade: 'IMPEDIMENTO' }
    ] })], [{ codigo: 'SEMANTICA', campo: 'texto', mensagem: 'Trecho pendente', severidade: 'IMPEDIMENTO' }]))
    expect(campaign.propostas[0].pendenciasRemotas).toMatchObject([{ campo: 'codLoja', severidade: 'IMPEDITIVO' }, { campo: 'valorMinimo', severidade: 'AVISO' }, { campo: null, mensagem: 'Desconhecido' }])
    expect(validateCampaignProposalSet(campaign).blockers.some((p) => p.codigo === 'SEMANTICA')).toBe(true)
  })
  it.each([null, { dataInicio: '2026-10-02', dataFim: '2026-10-31' }])('blocks absent or divergent common dates: %j', (period) => {
    const { campaign } = normalizeBackendCampaignResponse(response([block(), block({ vigencia: period })]))
    expect(campaign.dataInicio).toBe('')
    expect(campaign.pendenciasCampanha[0].codigo).toBe('VIGENCIA_NAO_CONSOLIDADA')
  })
  it('requires explicit confirmation for an unrestricted audience', () => {
    const raw = block(); Object.keys(raw.filtros).forEach((key) => { raw.filtros[key] = null })
    const { campaign } = normalizeBackendCampaignResponse(response([raw])); campaign.titulo = 'T'; campaign.textoOriginal = 'D'
    expect(validateCampaignProposalSet(campaign).blockers.some((p) => p.codigo === 'PUBLICO_AUSENTE')).toBe(true)
  })
  const unmapped = (text, extra = {}) => ({ codigo: 'TRECHO_NAO_MAPEADO', campo: 'texto',
    mensagem: `Trecho do pedido que não virou regra: '${text}'.`, severidade: 'AVISO', ...extra })
  it.each([
    'Quero criar uma campanha válida de 1 a 31 de outubro de 2026',
    'Vigência da campanha: de 01/10/2026 a 31/10/2026',
    'A campanha será válida de 1 de outubro de 2026 até 31 de outubro de 2026',
    'Vigência: 2026-10-01 a 2026-10-31'
  ])('omits only redundant warnings for the recognized common period: %s', (text) => {
    const { campaign } = normalizeBackendCampaignResponse(response([block(), block()], [unmapped(text)]))
    expect(campaign.pendenciasCampanha).toEqual([])
    expect(campaign.dataInicio).toBe('2026-10-01')
    expect(campaign.propostas).toHaveLength(2)
  })
  it.each([
    'Campanha válida de 1 a 31 de outubro de 2026 apenas para vendedores',
    'Campanha válida de 1 a 31 de outubro de 2026 com comissão de 5%',
    'Campanha válida de 1 a 30 de outubro de 2026',
    'A campanha não será válida de 1 a 31 de outubro de 2026',
    'Pagar um bônus para vendas acima da meta'
  ])('retains unparsed conditions and dates not matching the recognized period: %s', (text) => {
    const { campaign } = normalizeBackendCampaignResponse(response([block()], [unmapped(text)]))
    expect(campaign.pendenciasCampanha).toHaveLength(1)
  })
  it.each([null, { dataInicio: '2026-10-02', dataFim: '2026-10-31' }])('retains temporal warnings without a complete common period: %j', (period) => {
    const { campaign } = normalizeBackendCampaignResponse(response([block(), block({ vigencia: period })], [unmapped('Campanha válida de 1 a 31 de outubro de 2026')]))
    expect(campaign.pendenciasCampanha.map((p) => p.codigo)).toEqual(['TRECHO_NAO_MAPEADO', 'VIGENCIA_NAO_CONSOLIDADA'])
  })
  it('never suppresses blockers, other warning codes or individual issues about validity', () => {
    const text = 'Campanha válida de 1 a 31 de outubro de 2026'
    const { campaign } = normalizeBackendCampaignResponse(response([block({ pendencias: [unmapped(text)] })], [
      unmapped(text, { severidade: 'IMPEDIMENTO' }), unmapped(text, { codigo: 'VIGENCIA_CONFLITANTE' })
    ]))
    expect(campaign.pendenciasCampanha).toHaveLength(2)
    expect(campaign.propostas[0].pendenciasRemotas).toHaveLength(1)
  })
})

describe('real HTTP client', () => {
  it('uses the new extractor for complete and individual text with independent contexts and timeouts', async () => {
    const http = { post: vi.fn(async () => ({ data: response() })) }
    const client = createCampaignProposalApiClient(http)
    const controller = new AbortController()
    await client.interpretCampaign({ descricao: 'Todo o texto', dataInicio: '2020-01-01', dataFim: '2020-02-01' }, { signal: controller.signal })
    await client.reinterpretRule({ texto: 'Apenas este bloco', campanha: { dataInicio: '2026-10-01', dataFim: '2026-10-31', textoOriginal: 'Nunca reenviar' } })
    expect(http.post.mock.calls[0]).toMatchObject(['/interpretador/extrair-propostas', { texto: 'Todo o texto', contexto: { dataReferencia: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) } }, { signal: controller.signal, timeout: 75000 }])
    expect(http.post.mock.calls[0][1].contexto.vigenciaCampanha).toBeUndefined()
    expect(http.post.mock.calls[1][1]).toMatchObject({ texto: 'Apenas este bloco', contexto: { vigenciaCampanha: { inicio: '2026-10-01', fim: '2026-10-31' } } })
    expect(JSON.stringify(http.post.mock.calls)).not.toContain('Nunca reenviar')
  })
  it('identifies the campaign during both interpretations to ignore its own active rules', async () => {
    const http = { post: vi.fn(async () => ({ data: response() })) }
    const client = createCampaignProposalApiClient(http)
    await client.interpretCampaign({ descricao: 'Texto completo', campanhaId: 7 })
    await client.reinterpretRule({ texto: 'Bloco individual', campanha: { id: 7, dataInicio: '2026-10-01', dataFim: '2026-10-31' } })
    for (const call of http.post.mock.calls) expect(call[1].contexto).toMatchObject({ campanhaId: '7', origem: 'VERSAO_EXISTENTE' })
    expect(http.post.mock.calls[0][1].contexto.vigenciaCampanha).toBeUndefined()
    expect(http.post.mock.calls[1][1].texto).toBe('Bloco individual')
  })
  it('preserves manual rate intention and never sends save or activation requests', async () => {
    const { campaign } = setup(); const proposal = campaign.propostas[0]
    proposal.camposManuais.push('taxaPercentual'); proposal.campos.taxaPercentual = '4,25'
    proposal.metadadosRecebidos.operacaoBase = { tipoOperacao: 'ACRESCIMO_PONTOS', valorAjuste: '0.01' }
    const http = { post: vi.fn(async () => ({ data: {} })) }; const client = createCampaignProposalApiClient(http)
    await client.updateArtifacts({ proposal, campaign }); await client.validateCampaign({ proposal, campaign })
    expect(http.post.mock.calls[0][1].proposta.operacaoBase).toEqual({ tipoOperacao: 'DEFINIR_TAXA', valorAjuste: '0.0425', referenciaBase: null })
    expect(http.post.mock.calls[0][2].timeout).toBe(30000)
    expect(http.post.mock.calls.map((c) => c[0])).toEqual(['/interpretador/atualizar-artefatos', '/interpretador/validar-proposta'])
    await client.validateCampaign({ proposal, campaign, rate: null })
    expect(http.post.mock.calls[2][1].taxa).toBeNull()
  })
  it.each([400, 503, 504])('does not turn HTTP %s into a demo result', async (status) => {
    const client = createCampaignProposalApiClient({ post: vi.fn(async () => { throw { response: { status } } }) })
    await expect(client.interpretCampaign({ descricao: 'Texto' })).rejects.toThrow()
  })
})

describe('comparison transactions', () => {
  it('applies initial interpretation, preserving the title and original description', async () => {
    const { campaign, integration } = setup([])
    expect(await integration.interpretCampaign()).toBe(true)
    expect(integration.state.review).toBeNull()
    expect(campaign.titulo).toBe('Meu título'); expect(campaign.tituloSugerido).toBe('Sugerido')
    expect(campaign.textoOriginal).toBe('Texto completo da campanha')
  })
  it('replaces the entire collection atomically after a valid response without a comparison', async () => {
    const { campaign, integration, provider } = setup()
    campaign.propostas[0].camposManuais.push('codLoja'); campaign.propostas[0].campos.codLoja = '76'
    const original = JSON.stringify(campaign)
    const wait = deferred(); provider.interpretCampaign.mockReturnValue(wait.promise)
    const request = integration.interpretCampaign()
    expect(JSON.stringify(campaign)).toBe(original)
    wait.resolve(response([block({ vigencia: { dataInicio: '2027-01-01', dataFim: '2027-01-31' } }), block({ blocoId: 'b2', vigencia: { dataInicio: '2027-01-01', dataFim: '2027-01-31' } })]))
    expect(await request).toBe(true)
    expect(campaign.propostas).toHaveLength(2); expect(campaign.dataInicio).toBe('2027-01-01')
    expect(integration.state.review).toBeNull()
    expect(campaign.titulo).toBe('Meu título'); expect(campaign.textoOriginal).toBe('Texto completo da campanha')
    expect(campaign.propostas[0].campos.codLoja).toBe('75')
  })
  it.each(['cancel', 'change'])('preserves the collection after a complete request becomes inapplicable: %s', async (change) => {
    const { campaign, integration, provider } = setup(); const wait = deferred()
    provider.interpretCampaign.mockReturnValue(wait.promise)
    const id = campaign.propostas[0].clientId
    const request = integration.interpretCampaign()
    if (change === 'cancel') integration.cancel()
    else campaign.propostas[0].campos.codLoja = '76'
    const original = JSON.stringify(campaign)
    wait.resolve(response([block(), block({ blocoId: 'b2' })]))
    expect(await request).toBe(false)
    expect(JSON.stringify(campaign)).toBe(original)
    expect(campaign.propostas[0].clientId).toBe(id)
  })
  it('preserves the collection on a complete HTTP failure', async () => {
    const { campaign, integration, provider } = setup(); const original = JSON.stringify(campaign)
    provider.interpretCampaign.mockRejectedValue(new Error('Serviço indisponível'))
    expect(await integration.interpretCampaign()).toBe(false)
    expect(integration.state.error).toBe('Serviço indisponível')
    expect(JSON.stringify(campaign)).toBe(original)
  })
  it('preserves everything when no proposals are returned', async () => {
    const { campaign, integration, provider } = setup(); const original = JSON.stringify(campaign)
    provider.interpretCampaign.mockResolvedValue(response([], [{ codigo: 'N', mensagem: 'Texto não compreendido', severidade: 'IMPEDIMENTO' }]))
    expect(await integration.interpretCampaign()).toBe(false)
    expect(integration.state.error).toContain('Texto não compreendido'); expect(JSON.stringify(campaign)).toBe(original)
  })
  it('retains target identity, displays explicit null removals and supports manual corrections', async () => {
    const { campaign, integration, provider } = setup(); const id = campaign.propostas[0].clientId
    provider.reinterpretRule.mockResolvedValue(response([block({ filtros: { ...block().filtros, codLoja: null } })]))
    integration.openEditor(id); integration.state.text = 'Texto atualizado'
    await integration.reinterpretRule(id)
    expect(integration.state.review.after.propostas[0].campos.codLoja).toBe('')
    integration.correct('taxaPercentual', '4,5'); expect(integration.applyReview()).toBe(true)
    expect(campaign.propostas[0].clientId).toBe(id)
    expect(campaign.propostas[0].campos.taxaPercentual).toBe('4,5')
    expect(campaign.propostas[0].artefatosDesatualizados).toBe(true)
  })
  it('confirms a split in place and preserves edits made in another block during the request', async () => {
    const { campaign, integration, provider } = setup([block(), block({ blocoId: 'b2' })])
    const other = campaign.propostas[1]; const oldId = campaign.propostas[0].clientId; const wait = deferred()
    provider.reinterpretRule.mockReturnValue(wait.promise)
    integration.openEditor(oldId); const request = integration.reinterpretRule(oldId)
    other.campos.taxaPercentual = '9'; other.camposManuais.push('taxaPercentual')
    expect(await integration.interpretCampaign()).toBe(false)
    wait.resolve(response([block(), block({ blocoId: 'b2' })])); await request
    expect(campaign.propostas).toHaveLength(2); expect(integration.applyReview()).toBe(true)
    expect(campaign.propostas).toHaveLength(3); expect(campaign.propostas[2]).toBe(other)
    expect(campaign.propostas[2].campos.taxaPercentual).toBe('9')
    expect(campaign.propostas[0].clientId).not.toBe(oldId)
    expect(campaign.propostas[0].metadadosRecebidos.blocoOrigemClientId).toBe(oldId)
  })
  it.each(['target', 'text', 'context', 'remove', 'cancel'])('rejects stale individual results after %s changes', async (change) => {
    const { campaign, integration, provider } = setup(); const id = campaign.propostas[0].clientId; const wait = deferred()
    provider.reinterpretRule.mockReturnValue(wait.promise); integration.openEditor(id)
    const request = integration.reinterpretRule(id)
    if (change === 'target') campaign.propostas[0].campos.codLoja = '76'
    if (change === 'text') integration.state.text += ' mudou'
    if (change === 'context') campaign.dataFim = '2026-11-01'
    if (change === 'remove') campaign.propostas.splice(0, 1)
    if (change === 'cancel') integration.cancel()
    wait.resolve(response()); expect(await request).toBe(false); expect(integration.state.review).toBeNull()
  })
  it('checks the snapshot again when confirming a comparison', async () => {
    const { campaign, integration } = setup(); const id = campaign.propostas[0].clientId
    integration.openEditor(id); await integration.reinterpretRule(id)
    campaign.textoOriginal += ' alterado'; expect(integration.canApply()).toBe(false); expect(integration.applyReview()).toBe(false)
  })
  it('allows editing the text and interpreting again inside the review without replacing the rule early', async () => {
    const { campaign, integration, provider } = setup(); const id = campaign.propostas[0].clientId
    integration.openEditor(id); await integration.reinterpretRule(id)
    integration.correct('taxaPercentual', '4')
    expect(integration.state.review.correctedFields).toEqual(['taxaPercentual'])
    integration.state.text = 'Nova intenção: taxa de 6%'
    expect(integration.canApply()).toBe(false)
    provider.reinterpretRule.mockResolvedValue(response([block({ taxaFinal: '0.06' })]))
    expect(await integration.reinterpretRule(id)).toBe(false)
    expect(await integration.reinterpretRule(id, { reviewRetry: true })).toBe(true)
    expect(provider.reinterpretRule.mock.calls.at(-1)[0].texto).toBe('Nova intenção: taxa de 6%')
    expect(campaign.propostas[0].campos.taxaPercentual).toBe('3,5')
    expect(integration.state.review.after.propostas[0].campos.taxaPercentual).toBe('6')
    expect(integration.canApply()).toBe(true)
    expect(integration.applyReview()).toBe(true)
    expect(campaign.propostas[0].campos.taxaPercentual).toBe('6')
  })
  it('keeps the review open after retry failure and blocks the previous result until a successful retry', async () => {
    const { campaign, integration, provider } = setup(); const id = campaign.propostas[0].clientId
    integration.openEditor(id); await integration.reinterpretRule(id)
    provider.reinterpretRule.mockRejectedValue(new Error('IA indisponível'))
    expect(await integration.reinterpretRule(id, { reviewRetry: true })).toBe(false)
    expect(integration.state.review).not.toBeNull()
    expect(integration.canApply()).toBe(false)
    expect(campaign.propostas[0].campos.taxaPercentual).toBe('3,5')
    provider.reinterpretRule.mockResolvedValue(response())
    expect(await integration.reinterpretRule(id, { reviewRetry: true })).toBe(true)
    expect(integration.canApply()).toBe(true)
  })
  it('rejects a stale retry before sending and preserves rules when cancelling an in-flight retry', async () => {
    const { campaign, integration, provider } = setup(); const id = campaign.propostas[0].clientId
    integration.openEditor(id); await integration.reinterpretRule(id)
    campaign.dataFim = '2026-11-01'
    expect(await integration.reinterpretRule(id, { reviewRetry: true })).toBe(false)
    expect(provider.reinterpretRule).toHaveBeenCalledOnce()
    integration.cancel(); integration.openEditor(id); await integration.reinterpretRule(id)
    const wait = deferred(); provider.reinterpretRule.mockReturnValue(wait.promise)
    const original = JSON.stringify(campaign)
    const request = integration.reinterpretRule(id, { reviewRetry: true })
    integration.cancel(); wait.resolve(response([block({ taxaFinal: '0.09' })]))
    expect(await request).toBe(false)
    expect(integration.state.review).toBeNull()
    expect(JSON.stringify(campaign)).toBe(original)
  })
  it('rejects malformed individual proposals without removing the current rule', async () => {
    const { campaign, integration, provider } = setup(); const id = campaign.propostas[0].clientId
    const raw = block(); delete raw.taxaFinal; provider.reinterpretRule.mockResolvedValue(response([raw]))
    integration.openEditor(id); expect(await integration.reinterpretRule(id)).toBe(false); expect(campaign.propostas[0].clientId).toBe(id)
  })
})

describe('current explanations, validation and navigation', () => {
  it('removes an old competition blocker only after a fresh explicit analysis confirms no active competitors', async () => {
    const { campaign, integration, provider } = setup()
    const p = campaign.propostas[0]
    p.metadadosRecebidos.validacaoPendente = false
    p.pendenciasRemotas = [{ id: 'conflito', codigo: 'CONFLITO_REGRA', mensagem: 'Concorrente 12', severidade: 'IMPEDITIVO' }]
    provider.validateCampaign.mockResolvedValue({ valida: true, erros: [], avisos: [], referenciasValidadas: [], analiseConcorrencia: { totalConcorrentes: 0, temEmpate: false, temIdentica: false, regrasConcorrentes: [] } })
    expect(await integration.prepareReview()).toBe(true)
    expect(provider.validateCampaign).toHaveBeenCalledOnce()
    expect(p.pendenciasRemotas).toHaveLength(0)
  })
  it.each([undefined, { totalConcorrentes: 1, temEmpate: true, temIdentica: false, regrasConcorrentes: [{ idRegra: 12 }] }, { totalConcorrentes: 0 }])('keeps the blocker when competition is present or its absence is not confirmed: %j', async (analiseConcorrencia) => {
    const { campaign, integration, provider } = setup()
    campaign.propostas[0].pendenciasRemotas = [{ id: 'conflito', codigo: 'CONFLITO_REGRA', mensagem: 'Concorrente 12', severidade: 'IMPEDITIVO' }]
    provider.validateCampaign.mockResolvedValue({ valida: true, erros: [], avisos: [], referenciasValidadas: [], analiseConcorrencia })
    expect(await integration.prepareReview()).toBe(false)
    expect(campaign.propostas[0].pendenciasRemotas.some((p) => p.codigo === 'CONFLITO_REGRA')).toBe(true)
  })
  it('refreshes explanations while retaining semantic and global issues outside validation coverage', async () => {
    const { campaign, integration } = setup(); const p = campaign.propostas[0]
    p.pendenciasRemotas = [{ id: 'semantic', codigo: 'CRITERIO_NAO_SUPORTADO', campo: null, mensagem: 'Condição sem editor', severidade: 'IMPEDITIVO' }]
    campaign.pendenciasCampanha = [{ id: 'global', codigo: 'TEXTO', mensagem: 'Trecho não mapeado', severidade: 'AVISO' }]
    expect(await integration.refreshRule(p.clientId)).toBe(true)
    expect(p.metadadosRecebidos.explicacao).toBe('Explicação atual')
    expect(p.pendenciasRemotas[0].codigo).toBe('CRITERIO_NAO_SUPORTADO'); expect(campaign.pendenciasCampanha).toHaveLength(1)
    expect(await integration.prepareReview()).toBe(false)
  })
  it('only retires supported field-level issues explicitly corrected and verified', async () => {
    const { campaign, integration } = setup(); const p = campaign.propostas[0]
    p.camposManuais.push('taxaPercentual')
    p.pendenciasRemotas = [{ id: 'rate', codigo: 'CAMPO_AUSENTE', campo: 'taxaPercentual', severidade: 'IMPEDITIVO', mensagem: 'Taxa ausente' }]
    await integration.refreshRule(p.clientId); expect(p.pendenciasRemotas).toHaveLength(0)
  })
  it('requires confirmation when the backend recalculates another final rate', async () => {
    const { campaign, integration, provider } = setup(); const p = campaign.propostas[0]
    provider.updateArtifacts.mockResolvedValue({ blocoId: p.clientId, taxaCalculada: '0.04', explicacao: 'Nova taxa', pendencias: [], completa: true })
    expect(await integration.prepareReview()).toBe(false); expect(integration.state.review.kind).toBe('artifacts')
    expect(p.campos.taxaPercentual).toBe('3,5'); integration.applyReview()
    expect(campaign.propostas[0].campos.taxaPercentual).toBe('4'); expect(await integration.prepareReview()).toBe(true)
  })
  it('never clears a validation requirement when HTTP or response validation fails', async () => {
    const { campaign, integration, provider } = setup(); const p = campaign.propostas[0]; p.artefatosDesatualizados = true
    provider.validateCampaign.mockRejectedValue(new Error('Sem conexão'))
    expect(await integration.prepareReview()).toBe(false); expect(p.artefatosDesatualizados).toBe(true)
    expect(integration.state.errors[p.clientId]).toBe('Sem conexão')
    provider.validateCampaign.mockResolvedValue({ valida: true, erros: [] })
    expect(await integration.refreshRule(p.clientId)).toBe(false); expect(p.artefatosDesatualizados).toBe(true)
  })
  it('keeps cadastral errors blocking and replaces them after a successful retry', async () => {
    const { campaign, integration, provider } = setup(); const p = campaign.propostas[0]
    provider.validateCampaign.mockResolvedValueOnce({ valida: false, erros: ['Loja não encontrada'], avisos: ['Consultar cadastro'], referenciasValidadas: [] })
    await integration.refreshRule(p.clientId)
    expect(validateCampaignProposalSet(campaign).blockers.some((item) => item.codigo === 'CADASTRO_ERRO')).toBe(true)
    await integration.refreshRule(p.clientId)
    expect(validateCampaignProposalSet(campaign).blockers).toHaveLength(0)
  })
  it('does not apply stale artifact responses after fields change', async () => {
    const { campaign, integration, provider } = setup(); const p = campaign.propostas[0]; const wait = deferred()
    provider.validateCampaign.mockReturnValue(wait.promise); const request = integration.refreshRule(p.clientId)
    await Promise.resolve(); p.campos.taxaPercentual = '7'
    wait.resolve({ valida: true, erros: [], avisos: [], referenciasValidadas: [] }); expect(await request).toBe(false)
    expect(p.campos.taxaPercentual).toBe('7'); expect(p.metadadosRecebidos.explicacao).toBe('Explicação inicial')
  })
  it('blocks direct navigation during processing, pending confirmation or validation', () => {
    const { campaign } = setup(); const validation = validateCampaignProposalSet(campaign)
    for (const target of ['simulacao', 'conferencia']) {
      expect(getRequiredProposalStep(target, validation, campaign, { processing: true })).toBe('propostas')
      expect(getRequiredProposalStep(target, validation, campaign, { needsValidation: true })).toBe('propostas')
    }
  })
  it('exposes manual origins, missing evidence, inherited dates and calculated operation evidence', () => {
    const { campaign } = setup(); const p = campaign.propostas[0]
    expect(describeFieldOrigin(p, 'codLoja')).toContain('Texto informado')
    expect(describeFieldOrigin(p, 'canal')).toContain('não informada')
    p.camposManuais.push('codLoja'); expect(describeFieldOrigin(p, 'codLoja')).toContain('Edição manual')
    p.metadadosRecebidos.origensPorCampo.dataInicio = 'CONTEXTO'; expect(describeFieldOrigin(p, 'dataInicio')).toContain('herdada')
    p.metadadosRecebidos.operacaoBase = { tipoOperacao: 'ACRESCIMO_PONTOS', valorAjuste: '0.01', referenciaBase: { taxaBaseConsultada: '0.03' } }
    expect(describeFieldOrigin(p, 'taxaPercentual')).toContain('Operação calculada')
    p.metadadosRecebidos.origensDesatualizadas = true; expect(describeFieldOrigin(p, 'taxaPercentual')).toContain('não confirmada')
  })
})
