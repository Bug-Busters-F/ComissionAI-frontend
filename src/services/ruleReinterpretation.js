import { clonePlain, PROPOSAL_FIELD_NAMES } from './campaignProposalModel'
import { normalizeExternalPending } from './campaignProposalMappers'

export const RULE_FIELD_LABELS = Object.freeze({
  codMarca: 'Código da marca', descrMarca: 'Descrição da marca', codCargo: 'Código do cargo',
  descriCargo: 'Descrição do cargo', codLoja: 'Código da loja', canal: 'Canal', matricula: 'Matrícula',
  publicoTodasVendas: 'Aplicar a todas as vendas', taxaPercentual: 'Taxa percentual final (%)',
  valorMinimo: 'Valor mínimo', minimoInclusivo: 'Incluir valor mínimo',
  valorMaximo: 'Valor máximo', maximoInclusivo: 'Incluir valor máximo'
})
export const RULE_BOOLEAN_FIELDS = ['publicoTodasVendas', 'minimoInclusivo', 'maximoInclusivo']

export function normalizeRuleReinterpretation(raw, clientId) {
  if (!Array.isArray(raw?.propostas) || raw.propostas.length !== 1) {
    throw new Error('Esta versão aceita o resultado de uma única regra. Nenhuma alteração foi aplicada ao bloco.')
  }
  const source = raw.propostas[0]
  if (!source?.campos || typeof source.campos !== 'object' || Array.isArray(source.campos)) {
    throw new Error('A interpretação não retornou campos reconhecidos. A regra foi preservada.')
  }
  const campos = {}
  for (const field of Object.keys(source.campos)) {
    if (!PROPOSAL_FIELD_NAMES.includes(field)) throw new Error('A interpretação retornou um campo não suportado: ' + field)
    const value = source.campos[field]
    if (RULE_BOOLEAN_FIELDS.includes(field)) {
      if (typeof value !== 'boolean' && !(value === null && field !== 'publicoTodasVendas')) {
        throw new Error('A interpretação retornou uma opção inválida para ' + RULE_FIELD_LABELS[field] + '.')
      }
      campos[field] = value
    } else {
      if (value !== null && typeof value !== 'string' && typeof value !== 'number') throw new Error('Valor de campo inválido.')
      campos[field] = value === null ? '' : String(value)
    }
  }
  if (!Object.keys(campos).length) throw new Error('A interpretação não retornou campos para revisar.')
  if (!Array.isArray(source.pendencias)) throw new Error('A interpretação não retornou as pendências para revisão.')
  return {
    campos,
    resumo: typeof source.resumo === 'string' ? source.resumo.trim() : '',
    pendencias: source.pendencias.map((item) => normalizeExternalPending(item, clientId)),
    metadados: clonePlain(source.metadados || {}),
    demonstrativo: raw.demonstrativo === true
  }
}

export function mergeRuleReinterpretation(proposal, result, texto, correctedFields = []) {
  const returned = Object.keys(result.campos)
  const corrections = correctedFields.filter((field) => returned.includes(field))
  const merged = clonePlain(proposal)
  merged.trechoOriginal = proposal.trechoOriginal || proposal.textoOrigem
  merged.textoOrigem = texto
  merged.resumo = result.resumo || texto
  Object.assign(merged.campos, result.campos)
  merged.camposManuais = [...new Set([...proposal.camposManuais.filter((field) => !returned.includes(field)), ...corrections])]
  // Keep pending evidence for untouched fields; only replace evidence scoped to returned fields.
  merged.pendenciasRemotas = [
    ...proposal.pendenciasRemotas.filter((item) => {
      const related = item.camposRelacionados?.length ? item.camposRelacionados : item.campo ? [item.campo] : []
      return !related.length || !related.every((field) => returned.includes(field))
    }),
    ...result.pendencias
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
  merged.metadadosRecebidos = {
    ...proposal.metadadosRecebidos,
    ultimaReinterpretacao: {
      ...clonePlain(result.metadados),
      texto, camposRetornados: returned, camposCorrigidos: corrections, demonstrativo: result.demonstrativo
    }
  }
  // Partial results cannot certify explanations for the entire merged rule.
  merged.artefatosDesatualizados = corrections.length > 0 || returned.length < PROPOSAL_FIELD_NAMES.length
  merged.revisaoLocal += 1
  return merged
}

export function createRuleReinterpretationSession({ state, provider, getProposal, getContext, onApply }) {
  let sequence = 0
  let controller = null
  let baseFingerprint = ''
  let baseContext = ''
  const fingerprint = () => JSON.stringify(getProposal())
  const contextFingerprint = () => JSON.stringify(getContext())
  const isCurrent = () => baseFingerprint === fingerprint() && baseContext === contextFingerprint()

  function cancel() {
    sequence += 1
    controller?.abort()
    controller = null
    Object.assign(state, { editing: false, loading: false, reviewing: false, result: null, error: '' })
  }
  function start() {
    cancel()
    state.text = getProposal().resumo || getProposal().textoOrigem
    state.editing = true
  }
  async function interpret() {
    if (!state.text.trim() || state.loading) return false
    if (!provider.capabilities.reinterpret) {
      state.error = 'A reinterpretação deste bloco ainda não está integrada. Seus dados foram mantidos.'
      return false
    }
    if (!state.reviewing) {
      state.original = clonePlain(getProposal())
      baseFingerprint = fingerprint()
      baseContext = contextFingerprint()
    }
    if (!isCurrent()) {
      state.error = 'A regra ou o contexto da campanha mudou. Cancele e abra novamente a edição.'
      return false
    }
    const request = ++sequence
    controller = new AbortController()
    const sentText = state.text
    Object.assign(state, { loading: true, error: '', result: null })
    try {
      const raw = await provider.reinterpretRule({
        clientId: state.original.clientId, texto: sentText,
        campanha: clonePlain(getContext()), regraAtual: clonePlain(state.original),
        cenarioDemonstrativo: state.scenario || 'texto'
      }, { signal: controller.signal })
      if (request !== sequence) return false
      if (!isCurrent()) throw new Error('A regra ou o contexto mudou durante a interpretação. Cancele e tente novamente.')
      state.result = normalizeRuleReinterpretation(raw, state.original.clientId)
      state.proposed = clonePlain(state.result.campos)
      state.sentText = sentText
      state.corrected = []
      state.reviewing = true
      return true
    } catch (error) {
      if (request === sequence) state.error = error?.message || 'Não foi possível reinterpretar. Seus dados foram mantidos.'
      return false
    } finally {
      if (request === sequence) state.loading = false
    }
  }
  function correct(field, value) {
    if (!state.result || !Object.hasOwn(state.result.campos, field) || state.loading) return
    state.proposed[field] = value
    state.corrected = Object.keys(state.proposed).filter((key) => state.proposed[key] !== state.result.campos[key])
  }
  function canApply() {
    return Boolean(state.result && !state.loading && !state.error && state.text === state.sentText && isCurrent())
  }
  function apply() {
    if (!canApply()) return false
    const result = { ...state.result, campos: clonePlain(state.proposed) }
    onApply(mergeRuleReinterpretation(getProposal(), result, state.sentText, state.corrected))
    cancel()
    return true
  }
  return { start, cancel, interpret, correct, apply, canApply, isCurrent }
}
