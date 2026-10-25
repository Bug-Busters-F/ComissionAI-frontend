import { describe, expect, it, vi } from 'vitest'
import { createCampaignProposal } from './campaignProposalModel'
import { campaignProposalToCanonical, normalizeCampaignProposalResponse } from './campaignProposalMappers'
import { createRuleReinterpretationSession, mergeRuleReinterpretation, normalizeRuleReinterpretation } from './ruleReinterpretation'
import { createCampaignProposalProvider } from './campaignProposalService'

const response = (campos = { taxaPercentual: '4' }, extra = {}) => ({ propostas: [{ campos, pendencias: [], resumo: 'Comissão de 4%', ...extra }] })
function setup(provider = { capabilities: { reinterpret: true }, reinterpretRule: vi.fn(async () => response()) }) {
  const proposal = createCampaignProposal({ clientId: 'a', origem: 'interpretacao', textoOrigem: '3% marca PRETO', campos: { taxaPercentual: '3', codMarca: '10', codLoja: '22' }, camposManuais: ['codLoja', 'taxaPercentual'] })
  const other = createCampaignProposal({ clientId: 'b', origem: 'interpretacao', campos: { taxaPercentual: '6' } })
  const campaign = { titulo: 'Campanha', textoOriginal: 'Proposta original', dataInicio: '2026-10-01', dataFim: '2026-10-31', propostas: [proposal, other] }
  const state = { text: '', reviewing: false, loading: false, editing: false, result: null, error: '' }
  const applied = vi.fn((updated) => Object.assign(proposal, updated))
  const session = createRuleReinterpretationSession({ state, provider, getProposal: () => proposal, getContext: () => ({ titulo: campaign.titulo, dataInicio: campaign.dataInicio }), onApply: applied })
  return { proposal, other, campaign, state, applied, session, provider }
}

describe('reinterpretação individual', () => {
  it('não altera a regra até confirmar e preserva identidade, posição e campos ausentes', async () => {
    const { proposal, other, campaign, state, session, applied } = setup()
    const otherSnapshot = JSON.stringify(other)
    session.start()
    state.text = 'Comissão de 4%'
    await session.interpret()
    expect(state.reviewing).toBe(true)
    expect(proposal.campos.taxaPercentual).toBe('3')
    expect(applied).not.toHaveBeenCalled()
    expect(session.apply()).toBe(true)
    expect(campaign.propostas[0]).toBe(proposal)
    expect(proposal.clientId).toBe('a')
    expect(proposal.campos).toMatchObject({ taxaPercentual: '4', codLoja: '22', codMarca: '10' })
    expect(proposal.camposManuais).toEqual(['codLoja'])
    expect(proposal.trechoOriginal).toBe('3% marca PRETO')
    expect(proposal.textoOrigem).toBe('Comissão de 4%')
    expect(proposal.artefatosDesatualizados).toBe(true)
    expect(JSON.stringify(other)).toBe(otherSnapshot)
    expect(campaign.textoOriginal).toBe('Proposta original')
  })

  it('cancelar a revisão preserva texto, campos e metadados', async () => {
    const { proposal, state, session, applied } = setup()
    const before = JSON.stringify(proposal)
    session.start(); state.text = '4%'; await session.interpret()
    session.correct('taxaPercentual', '5')
    session.cancel()
    expect(JSON.stringify(proposal)).toBe(before)
    expect(applied).not.toHaveBeenCalled()
    expect(state.reviewing).toBe(false)
  })

  it('permite corrigir apenas campos retornados e marca a correção manual', async () => {
    const { proposal, state, session } = setup()
    session.start(); await session.interpret()
    session.correct('codLoja', '99')
    expect(state.proposed.codLoja).toBeUndefined()
    session.correct('taxaPercentual', '4,5')
    expect(session.apply()).toBe(true)
    expect(proposal.campos.taxaPercentual).toBe('4,5')
    expect(proposal.campos.codLoja).toBe('22')
    expect(proposal.camposManuais).toContain('taxaPercentual')
    expect(proposal.metadadosRecebidos.ultimaReinterpretacao.camposCorrigidos).toEqual(['taxaPercentual'])
  })

  it('texto modificado exige nova interpretação e continua comparando com a regra original', async () => {
    const { proposal, state, session, provider } = setup()
    session.start(); await session.interpret()
    state.text = '5%'
    expect(session.canApply()).toBe(false)
    provider.reinterpretRule.mockResolvedValueOnce(response({ taxaPercentual: '5' }))
    await session.interpret()
    expect(state.original.campos.taxaPercentual).toBe('3')
    expect(proposal.campos.taxaPercentual).toBe('3')
    expect(state.proposed.taxaPercentual).toBe('5')
    expect(session.canApply()).toBe(true)
  })

  it('ignora respostas canceladas mesmo quando o cliente não respeita AbortSignal', async () => {
    let resolve
    const provider = { capabilities: { reinterpret: true }, reinterpretRule: vi.fn(() => new Promise((r) => { resolve = r })) }
    const { session, state, applied } = setup(provider)
    session.start()
    const pending = session.interpret()
    expect(state.loading).toBe(true)
    session.cancel()
    resolve(response())
    await pending
    expect(state.result).toBeNull()
    expect(state.reviewing).toBe(false)
    expect(state.loading).toBe(false)
    expect(applied).not.toHaveBeenCalled()
  })

  it('alterar outro bloco não invalida o resultado; alterar o alvo ou contexto invalida', async () => {
    const { session, other, proposal, campaign } = setup()
    session.start(); await session.interpret()
    other.campos.taxaPercentual = '8'
    expect(session.canApply()).toBe(true)
    proposal.campos.codLoja = '33'
    expect(session.apply()).toBe(false)
    session.start(); await session.interpret()
    campaign.titulo = 'Novo título'
    expect(session.canApply()).toBe(false)
  })

  it('descarta uma resposta se o contexto mudar durante o carregamento', async () => {
    let resolve
    const provider = { capabilities: { reinterpret: true }, reinterpretRule: () => new Promise((r) => { resolve = r }) }
    const { session, state, campaign } = setup(provider)
    session.start(); const pending = session.interpret()
    campaign.dataInicio = '2026-11-01'
    resolve(response()); await pending
    expect(state.result).toBeNull()
    expect(state.error).toContain('contexto mudou')
  })

  it('preserva o texto em caso de falha e permite repetir', async () => {
    const { session, state, provider, proposal } = setup()
    provider.reinterpretRule.mockRejectedValueOnce(new Error('Serviço indisponível'))
    session.start(); state.text = '4%'
    await session.interpret()
    expect(state.text).toBe('4%')
    expect(state.error).toBe('Serviço indisponível')
    expect(proposal.campos.taxaPercentual).toBe('3')
    expect(await session.interpret()).toBe(true)
    expect(session.canApply()).toBe(true)
  })

  it.each([[], [{ campos: {} }, { campos: {} }]])('rejeita resultados fora de uma regra sem aplicar', async (propostas) => {
    const { session, state, applied, provider } = setup()
    provider.reinterpretRule.mockResolvedValueOnce({ propostas })
    session.start(); await session.interpret()
    expect(state.error).toContain('única regra')
    expect(session.apply()).toBe(false)
    expect(applied).not.toHaveBeenCalled()
  })

  it('preserva pendências de campos ausentes e substitui somente as de campos retornados', () => {
    const { proposal } = setup()
    proposal.pendenciasRemotas = [
      { id: 'taxa', campo: 'taxaPercentual' }, { id: 'loja', campo: 'codLoja' },
      { id: 'geral' }, { id: 'cruzada', camposRelacionados: ['taxaPercentual', 'codLoja'] }
    ]
    const merged = mergeRuleReinterpretation(proposal, normalizeRuleReinterpretation(response(), 'a'), '4%')
    expect(merged.pendenciasRemotas.map((item) => item.id)).toEqual(['loja', 'geral', 'cruzada'])
    expect(proposal.pendenciasRemotas).toHaveLength(4)
  })

  it('distingue remoção explícita de campo ausente e mantém a origem após confirmações sucessivas', () => {
    const { proposal } = setup()
    const first = mergeRuleReinterpretation(proposal, normalizeRuleReinterpretation(response({ codLoja: null }), 'a'), 'sem loja')
    expect(first.campos.codLoja).toBe('')
    expect(first.campos.codMarca).toBe('10')
    const second = mergeRuleReinterpretation(first, normalizeRuleReinterpretation(response(), 'a'), '4%')
    expect(second.trechoOriginal).toBe('3% marca PRETO')
  })

  it('preserva resumo e trecho original no mapeamento de ida e volta', () => {
    const { campaign } = setup()
    campaign.propostas[0].resumo = 'Resumo editável'
    const output = normalizeCampaignProposalResponse(campaignProposalToCanonical(campaign))
    expect(output.campaign.propostas[0]).toMatchObject({ resumo: 'Resumo editável', trechoOriginal: '3% marca PRETO' })
  })

  it('rejeita campos desconhecidos e tipos inválidos sem eliminar campos silenciosamente', () => {
    expect(() => normalizeRuleReinterpretation(response({ valorDesconhecido: '3' }), 'a')).toThrow('não suportado')
    expect(() => normalizeRuleReinterpretation(response({ publicoTodasVendas: 'false' }), 'a')).toThrow('opção inválida')
  })
})

describe('adaptador de reinterpretação', () => {
  it('modo real sem cliente informa indisponibilidade sem resposta fictícia', async () => {
    const provider = createCampaignProposalProvider({ mode: 'api' })
    const { session, state } = setup(provider)
    session.start(); await session.interpret()
    expect(state.error).toContain('não está integrada')
    expect(state.result).toBeNull()
  })

  it('repassa entrada e cancelamento ao cliente real sem fallback', async () => {
    const client = { reinterpretRule: vi.fn().mockRejectedValue(new Error('Falha real')) }
    const provider = createCampaignProposalProvider({ mode: 'api', client })
    const controller = new AbortController()
    await expect(provider.reinterpretRule({ texto: '4%' }, { signal: controller.signal })).rejects.toThrow('Falha real')
    expect(client.reinterpretRule).toHaveBeenCalledWith({ texto: '4%' }, { signal: controller.signal })
  })

  it('demonstra novo preenchimento somente em modo explícito', async () => {
    vi.useFakeTimers()
    try {
      const provider = createCampaignProposalProvider({ mode: 'demo' })
      const pending = provider.reinterpretRule({ texto: '4%', cenarioDemonstrativo: 'novoFiltro' })
      await vi.advanceTimersByTimeAsync(1000)
      expect(await pending).toMatchObject({ demonstrativo: true, propostas: [{ campos: { taxaPercentual: '4', codLoja: '75' } }] })
    } finally { vi.useRealTimers() }
  })
})
