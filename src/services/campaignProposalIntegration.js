import { reactive } from 'vue'
import { ruleArtifactSignature, ruleArtifactsCurrent } from './campaignRuleArtifacts'
import { clonePlain, createClientId, createPending } from './campaignProposalModel'
import { normalizeBackendCampaignResponse, normalizeExternalPending } from './campaignProposalMappers'
import { decimalFractionToPercent, parseDecimalToMinor, validateCampaignProposalSet } from './campaignProposalValidation'

const context = (campaign) => JSON.stringify([campaign.titulo, campaign.textoOriginal, campaign.dataInicio, campaign.dataFim])
const fingerprint = (value) => JSON.stringify(value)
const snapshot = (campaign, proposals = campaign.propostas) => ({ ...clonePlain(campaign), propostas: clonePlain(proposals) })
const rebind = (proposal, id) => {
  proposal.clientId = id
  proposal.pendenciasRemotas.forEach((p) => { p.clientId = id; p.id += ':' + id })
  return proposal
}

// Only field-level, mechanically verifiable extraction issues may be retired by a manual correction.
const CORRECTABLE_CODES = new Set(['CAMPO_AUSENTE', 'TAXA_AUSENTE', 'TAXA_NAO_CALCULAVEL', 'TAXA_NAO_POSITIVA',
  'TAXA_EXCEDE_100_PORCENTO', 'MARCA_NAO_ENCONTRADA', 'CARGO_NAO_ENCONTRADO', 'LOJA_NAO_ENCONTRADA',
  'CANAL_NAO_ENCONTRADO', 'MATRICULA_NAO_ENCONTRADA', 'VALOR_MINIMO_NEGATIVO', 'VALOR_MAXIMO_INVALIDO'])

export function isRulePendingRevalidatable(proposal, pending) {
  return pending.codigo === 'CONFLITO_REGRA' || String(pending.id || '').startsWith('artefatos:') || String(pending.id || '').startsWith('cadastro:') ||
    (CORRECTABLE_CODES.has(pending.codigo) && Boolean(pending.campo) && proposal.camposManuais.includes(pending.campo))
}

export function createCampaignProposalIntegration({ campaign, provider, onChange = () => {}, onInterpreted = () => {} }) {
  const state = reactive({ busy: false, kind: '', targetId: null, error: '', errors: {}, review: null, editorId: null, text: '' })
  let sequence = 0
  let controller = null
  const find = (id) => campaign.propostas.find((p) => p.clientId === id)
  const sourceCurrent = (review) => review && review.context === context(campaign) &&
    review.fingerprint === fingerprint(find(review.targetId))
  const current = (review) => sourceCurrent(review) &&
    (review.kind !== 'rule' || state.text === review.text)

  function cancel() {
    sequence += 1
    controller?.abort()
    controller = null
    Object.assign(state, { busy: false, kind: '', targetId: null, review: null, error: '' })
  }
  function closeEditor() { cancel(); state.editorId = null; state.text = '' }
  function openEditor(id) {
    if (state.busy || state.review) return false
    const proposal = find(id)
    if (!proposal) return false
    state.editorId = id
    state.text = proposal.textoOrigem || proposal.resumo || ''
    state.error = ''
    return true
  }
  function begin(kind, targetId = null, reviewRetry = false) {
    if (state.busy || (state.review && !reviewRetry)) return null
    controller = new AbortController()
    state.busy = true
    state.kind = kind
    state.targetId = targetId
    state.error = ''
    if (targetId) state.errors[targetId] = ''
    return { number: ++sequence, controller }
  }
  function finish(request) {
    if (request.number === sequence) { state.busy = false; controller = null }
  }
  function fail(request, error) {
    if (request.number !== sequence || request.controller.signal.aborted) return
    state.error = error?.message || 'Não foi possível concluir. Seus dados foram preservados.'
    if (state.targetId) state.errors[state.targetId] = state.error
  }
  function newReview(kind, targetId, before, after, baseFingerprint, baseContext, text) {
    state.review = { kind, targetId, before, after, fingerprint: baseFingerprint, context: baseContext, text,
      initialFields: after.propostas.length === 1 ? clonePlain(after.propostas[0].campos) : null, correctedFields: [] }
  }

  async function interpretCampaign() {
    if (!campaign.titulo.trim() || !campaign.textoOriginal.trim()) {
      state.error = 'Preencha título e descrição antes de interpretar.'
      return false
    }
    const request = begin('campaign')
    if (!request) return false
    const before = snapshot(campaign)
    const baseFingerprint = fingerprint(campaign)
    try {
      const raw = await provider.interpretCampaign({ titulo: campaign.titulo, descricao: campaign.textoOriginal }, { signal: request.controller.signal })
      if (request.number !== sequence) return false
      if (baseFingerprint !== fingerprint(campaign)) throw new Error('Os dados mudaram durante a interpretação. Tente novamente; as regras foram preservadas.')
      const { campaign: received } = normalizeBackendCampaignResponse(raw)
      if (!received.propostas.length) throw new Error(received.pendenciasCampanha.map((p) => p.mensagem).join(' ') || 'Nenhuma regra foi identificada. Seus dados foram preservados.')
      const after = { ...before, ...received, titulo: before.titulo, textoOriginal: before.textoOriginal, revisaoLocal: before.revisaoLocal }
      applyCampaign(after)
      return true
    } catch (error) { fail(request, error); return false } finally { finish(request) }
  }
  function applyCampaign(after) {
    Object.assign(campaign, clonePlain(after))
    state.editorId = null
    state.text = ''
    state.errors = {}
    onChange()
    onInterpreted()
  }
  async function reinterpretRule(id, { reviewRetry = false } = {}) {
    const proposal = find(id)
    if (!proposal || state.editorId !== id || !state.text.trim()) return false
    if (reviewRetry && (!state.review || state.review.kind !== 'rule' || state.review.targetId !== id || !sourceCurrent(state.review))) {
      state.error = 'A regra ou o contexto mudou. Cancele e abra novamente a edição.'
      return false
    }
    const request = begin('rule', id, reviewRetry)
    if (!request) return false
    const before = snapshot(campaign, [proposal])
    const baseFingerprint = fingerprint(proposal)
    const baseContext = context(campaign)
    const text = state.text
    try {
      const raw = await provider.reinterpretRule({ clientId: id, texto: text, campanha: clonePlain(campaign) }, { signal: request.controller.signal })
      if (request.number !== sequence) return false
      if (baseFingerprint !== fingerprint(find(id)) || baseContext !== context(campaign) || text !== state.text) throw new Error('A regra ou o texto mudou. Reinterprete novamente; seus dados foram preservados.')
      const { campaign: received } = normalizeBackendCampaignResponse(raw)
      if (!received.propostas.length || received.propostas.some((p) => p.metadadosRecebidos.contratoInvalido)) {
        throw new Error(received.pendenciasCampanha.map((p) => p.mensagem).join(' ') || 'Nenhuma proposta válida foi recebida. A regra foi preservada.')
      }
      received.propostas.forEach((p) => {
        p.textoOrigem = p.textoOrigem || text
        p.trechoOriginal = proposal.trechoOriginal || proposal.textoOrigem
        p.metadadosRecebidos.blocoOrigemClientId = id
        p.metadadosRecebidos.textoReinterpretado = text
        p.pendenciasRemotas.push(...received.pendenciasCampanha.map((pending) => ({ ...clonePlain(pending), clientId: p.clientId, escopo: 'PROPOSTA', id: pending.id + ':' + p.clientId })))
        const validity = p.metadadosRecebidos.vigenciaRecebida
        if (validity.dataInicio !== campaign.dataInicio || validity.dataFim !== campaign.dataFim) {
          p.pendenciasRemotas.push(createPending({ clientId: p.clientId, codigo: 'VIGENCIA_INDIVIDUAL_DIVERGENTE',
            mensagem: 'A regra retornou outro período. Altere a vigência pelo texto completo da campanha.', exigeValidacaoRemota: true }))
        }
      })
      if (received.propostas.length === 1) {
        rebind(received.propostas[0], id)
        received.propostas[0].campos.publicoTodasVendas = proposal.campos.publicoTodasVendas &&
          !['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula'].some((f) => received.propostas[0].campos[f])
        if (received.propostas[0].campos.publicoTodasVendas) received.propostas[0].camposManuais.push('publicoTodasVendas')
      }
      newReview('rule', id, before, snapshot(campaign, received.propostas), baseFingerprint, baseContext, text)
      return true
    } catch (error) { fail(request, error); return false } finally { finish(request) }
  }

  function correct(field, value) {
    const review = state.review
    if (!review || review.kind !== 'rule' || review.after.propostas.length !== 1) return
    const p = review.after.propostas[0]
    if (!Object.hasOwn(p.campos, field)) return
    if (state.busy) return
    p.campos[field] = value
    if (!review.correctedFields.includes(field)) review.correctedFields.push(field)
    if (!p.camposManuais.includes(field)) p.camposManuais.push(field)
    p.artefatosDesatualizados = true
    p.metadadosRecebidos.validacaoPendente = true
    if (field === 'taxaPercentual') p.metadadosRecebidos.taxaDefinidaManualmente = true
    if (['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula'].includes(field)) p.metadadosRecebidos.origensDesatualizadas = true
    if (field !== 'publicoTodasVendas' && ['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula'].includes(field) && String(value).trim()) p.campos.publicoTodasVendas = false
  }
  function applyReview() {
    const review = state.review
    if (!review || state.busy || state.error || !current(review)) {
      state.error = 'Os dados mudaram desde a solicitação. Cancele esta revisão e tente novamente.'
      return false
    }
    const index = campaign.propostas.findIndex((p) => p.clientId === review.targetId)
    if (index < 0) return false
    const proposals = clonePlain(review.after.propostas)
    if (review.kind === 'rule' && proposals.length > 1) proposals.forEach((p) => rebind(p, createClientId()))
    proposals.forEach((p) => { p.revisaoLocal += 1 })
    campaign.propostas.splice(index, 1, ...proposals)
    onChange()
    closeEditor()
    return true
  }

  async function refreshRule(id) {
    const proposal = find(id)
    if (!proposal || !campaign.dataInicio || !campaign.dataFim || proposal.metadadosRecebidos.contratoInvalido) {
      state.errors[id] = 'Interprete uma vigência comum completa e corrija o contrato antes de validar.'
      return false
    }
    const local = validateCampaignProposalSet({ ...campaign, pendenciasCampanha: [], propostas: [{ ...proposal, pendenciasRemotas: [] }] })
    const blockers = local.blockers.filter((p) => !(p.codigo === 'TAXA_AUSENTE' && proposal.metadadosRecebidos.operacaoBase?.tipoOperacao !== 'DEFINIR_TAXA' && !proposal.camposManuais.includes('taxaPercentual')))
    if (blockers.length) { state.errors[id] = blockers.map((p) => p.mensagem).join(' '); return false }
    const request = begin('artifacts', id)
    if (!request) return false
    const original = clonePlain(proposal)
    const baseFingerprint = fingerprint(proposal)
    const baseContext = context(campaign)
    try {
      const artifacts = await provider.updateArtifacts({ proposal: original, campaign: clonePlain(campaign) }, { signal: request.controller.signal })
      if (request.number !== sequence) return false
      if (artifacts?.blocoId !== id || !Array.isArray(artifacts.pendencias) || typeof artifacts.explicacao !== 'string' ||
          typeof artifacts.completa !== 'boolean' || !Object.hasOwn(artifacts, 'taxaCalculada') || (artifacts.taxaCalculada !== null && !Number.isFinite(parseDecimalToMinor(String(artifacts.taxaCalculada), 4)))) throw new Error('A atualização retornou dados inválidos. A regra foi preservada.')
      const validation = await provider.validateCampaign({ proposal: original, campaign: clonePlain(campaign), rate: artifacts.taxaCalculada }, { signal: request.controller.signal })
      if (request.number !== sequence) return false
      if (baseFingerprint !== fingerprint(find(id)) || baseContext !== context(campaign)) throw new Error('Os campos mudaram durante a validação. Valide novamente.')
      if (typeof validation?.valida !== 'boolean' || !Array.isArray(validation.erros) || !Array.isArray(validation.avisos) || !Array.isArray(validation.referenciasValidadas) || validation.valida !== (validation.erros.length === 0)) throw new Error('A validação retornou dados inválidos. Seus dados foram preservados.')
      const updated = clonePlain(original)
      const artifactPendings = artifacts.pendencias.map((p) => normalizeExternalPending({ ...p, id: 'artefatos:' + p.codigo + ':' + p.campo }, id))
      const cadastral = [...validation.erros.map((mensagem, i) => createPending({ clientId: id, codigo: 'CADASTRO_ERRO', id: 'cadastro:erro:' + id + ':' + i, mensagem, origem: 'BACKEND', exigeValidacaoRemota: true })),
        ...validation.avisos.map((mensagem, i) => createPending({ clientId: id, codigo: 'CADASTRO_AVISO', id: 'cadastro:aviso:' + id + ':' + i, mensagem, origem: 'BACKEND', severidade: 'AVISO' }))]
      for (const [type, field] of [['MARCA', 'descrMarca'], ['CARGO', 'descriCargo']]) {
        const reference = validation.referenciasValidadas.find((item) => item.tipo === type)
        if (reference?.descricao && original.campos[field].trim() && reference.descricao.trim().toLocaleLowerCase('pt-BR') !== original.campos[field].trim().toLocaleLowerCase('pt-BR')) {
          cadastral.push(createPending({ clientId: id, codigo: 'DESCRICAO_DIVERGENTE', campo: field, id: 'cadastro:descricao:' + id + ':' + field, origem: 'BACKEND', mensagem: 'A descrição informada difere do cadastro para este código. Valor consultado: ' + reference.descricao + '. Corrija ou remova a descrição e valide novamente.' }))
        }
      }
      // The cadastral endpoint also returns a fresh concurrency analysis. Never infer
      // absence of conflict from valida=true alone: active competition may be a warning.
      const concurrency = validation.analiseConcorrencia
      const noCompetition = validation.valida && concurrency?.totalConcorrentes === 0 &&
        concurrency.temEmpate === false && concurrency.temIdentica === false &&
        Array.isArray(concurrency.regrasConcorrentes) && concurrency.regrasConcorrentes.length === 0
      updated.pendenciasRemotas = original.pendenciasRemotas.filter((p) => {
        if (p.codigo === 'CONFLITO_REGRA') return !noCompetition
        if (p.id.startsWith('artefatos:') || p.id.startsWith('cadastro:')) return false
        return !(validation.valida && isRulePendingRevalidatable(original, p) && !artifactPendings.some((a) => a.campo === p.campo && a.severidade === 'IMPEDITIVO'))
      }).concat(artifactPendings, cadastral)
      updated.campos.taxaPercentual = artifacts.taxaCalculada === null ? '' : decimalFractionToPercent(artifacts.taxaCalculada).replace('.', ',')
      updated.metadadosRecebidos.artefatosLegados = false
      updated.metadadosRecebidos.explicacao = artifacts.explicacao
      updated.metadadosRecebidos.pythonAtualizado = artifacts.pythonEquivalente || null
      if (artifacts.operacaoBase) updated.metadadosRecebidos.operacaoBase = clonePlain(artifacts.operacaoBase)
      if (artifacts.origensPorCampo) {
        updated.metadadosRecebidos.origensPorCampo = clonePlain(artifacts.origensPorCampo)
        updated.metadadosRecebidos.origensDesatualizadas = false
      }
      if (Array.isArray(artifacts.referenciasConsultadas)) updated.metadadosRecebidos.referenciasConsultadas = clonePlain(artifacts.referenciasConsultadas)
      updated.metadadosRecebidos.completa = artifacts.completa
      updated.metadadosRecebidos.validacaoPendente = false
      updated.metadadosRecebidos.referenciasValidadas = clonePlain(validation.referenciasValidadas)
      updated.artefatosDesatualizados = false
      updated.metadadosRecebidos.assinaturaArtefatos = ruleArtifactSignature(updated, campaign)
      const changedRate = parseDecimalToMinor(updated.campos.taxaPercentual, 2) !== parseDecimalToMinor(original.campos.taxaPercentual, 2)
      if (changedRate && updated.campos.taxaPercentual !== original.campos.taxaPercentual) {
        newReview('artifacts', id, snapshot(campaign, [original]), snapshot(campaign, [updated]), baseFingerprint, baseContext)
      } else {
        Object.assign(find(id), updated)
        onChange()
      }
      return true
    } catch (error) { fail(request, error); return false } finally { finish(request) }
  }
  async function prepareReview() {
    if (state.busy || state.review) return false
    for (const p of campaign.propostas) {
      if (!ruleArtifactsCurrent(p, campaign) || p.pendenciasRemotas.some((pending) => pending.codigo === 'CONFLITO_REGRA')) {
        if (!await refreshRule(p.clientId) || state.review) return false
      }
    }
    return !validateCampaignProposalSet(campaign).blockers.length
  }
  return { state, interpretCampaign, openEditor, closeEditor, reinterpretRule, refreshRule, prepareReview, correct, applyReview,
    canApply: () => Boolean(state.review && !state.busy && !state.error && current(state.review)),
    reviewSourceCurrent: () => Boolean(sourceCurrent(state.review)), cancel, dispose: closeEditor }
}
