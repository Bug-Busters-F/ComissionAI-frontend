import { computed, reactive, watch } from 'vue'
import { ruleArtifactsCurrent } from './campaignRuleArtifacts'
import { isCoverageImpediment, parseCoverageDetails } from './coverageService'
import { validateCampaignProposalSet } from './campaignProposalValidation'
import { clonePlain, hasCampaignContent } from './campaignProposalModel'
import { campaignToDraftRequest, draftFingerprint, persistedCampaignToProposal, validateDraftForPersistence } from './campaignProposalPersistence'
import { createCampaignLifecycleApi } from './campaignLifecycleApi'
import { normalizeCampaignError } from './campaignService'
import { assertSimulation, simulationSaleRow, simulationViewModel } from './campaignPersistedSimulation'

function message(error) {
  if (error?.response || error?.code === 'ERR_NETWORK') {
    const normalized = normalizeCampaignError(error)
    if (/No static resource/i.test(normalized.message)) return 'O backend em execução ainda não disponibiliza esta operação. Atualize o serviço e tente novamente. Seus dados foram preservados.'
    const fields = Object.entries(normalized.fieldErrors).map(([field, value]) => `${field}: ${value}`)
    return [normalized.message, ...fields].join(' ')
  }
  return error?.message || normalizeCampaignError(error).message
}

export function createCampaignProposalLifecycle({ campaign, enabled = true, api = createCampaignLifecycleApi(), processing = () => false, onLoaded = () => {}, currentStep = () => 1 }) {
  const state = reactive({ id: null, estado: 'DRAFT', loading: false, saving: false, working: false, error: '', notice: '', baseline: null, defaultsOpen: false, activationOpen: false, uncertainCreate: false, readiness: null, savedAt: null, remoteChanged: false, serverSnapshot: null, ultimaEtapa: 1, etapaMaisAvancada: 1, versaoProposta: null, progressError: '', versaoVigente: null, versaoOrigem: null, revisaoControle: null, motivoBloqueioEdicao: '', published: null, editingPublished: false })
  const simulation = reactive({ competences: [], selectedCompetencia: '', referenceValidation: null, isLoadingCompetences: false, isValidatingReference: false, isRunning: false, error: '', result: null, page: 1, pageSize: 10, totalItems: 0, totalPages: 1, executionId: '', status: '', progress: 0, stageMessage: '', accepted: false, acceptance: null, invalidationReasons: [], acceptOpen: false, aceitoPor: '', motivo: '', loadingSales: false, pageError: '' })
  const fingerprint = computed(() => draftFingerprint(campaign))
  const dirty = computed(() => state.baseline === null ? hasCampaignContent(campaign) : fingerprint.value !== state.baseline)
  const busy = computed(() => state.loading || state.saving || state.working || simulation.isRunning || simulation.isValidatingReference)
  const readOnly = computed(() => Boolean(state.motivoBloqueioEdicao || state.remoteChanged || !['DRAFT', 'ATIVA', 'INATIVA'].includes(state.estado) || (state.estado !== 'DRAFT' && !state.editingPublished)))
  let requestSequence = 0
  let referenceSequence = 0
  let pageSequence = 0
  let disposed = false
  let simulationFingerprint = ''
  let defaultsFingerprint = ''
  let progressQueue = Promise.resolve()
  const rulesReady = computed(() => validateCampaignProposalSet(campaign).canAdvanceLocally && campaign.propostas.every((p) => ruleArtifactsCurrent(p, campaign)))
  const currentSimulation = computed(() => Boolean(rulesReady.value && simulation.result && simulationFingerprint === fingerprint.value && !dirty.value && simulation.result.competencia === simulation.selectedCompetencia))
  const canReview = computed(() => !busy.value && !processing() && !state.remoteChanged && currentSimulation.value && simulation.accepted && state.readiness?.aptaParaAtivacao === true)
  const canActivate = computed(() => canReview.value && !readOnly.value && state.id)
  watch(fingerprint, (value) => {
    if (simulationFingerprint && simulationFingerprint !== value) {
      simulation.accepted = false; state.readiness = null
      simulation.invalidationReasons = ['A campanha foi alterada. Salve e execute uma nova simulação antes de aceitar.']
    }
  }, { flush: 'sync' })

  function applySaved(raw, previous) {
    const next = persistedCampaignToProposal(raw, previous)
    Object.assign(campaign, next)
    if (!previous) {
      state.ultimaEtapa = raw.ultimaEtapa || 1
      state.etapaMaisAvancada = raw.etapaMaisAvancada || state.ultimaEtapa
    }
    state.versaoProposta = raw.versaoProposta ?? null
    state.versaoVigente = raw.versaoVigente ?? null
    state.versaoOrigem = raw.versaoOrigem ?? null
    state.revisaoControle = raw.revisaoControle ?? null
    state.motivoBloqueioEdicao = raw.motivoBloqueioEdicao || ''
    state.editingPublished = Boolean(raw.versaoVigente && raw.versaoProposta)
    if (!previous && state.editingPublished && campaign.propostas.length && state.etapaMaisAvancada < 2) {
      state.ultimaEtapa = 2; state.etapaMaisAvancada = 2
    }
    state.id = raw.id; state.estado = raw.estado; state.savedAt = raw.atualizadoEm || null
    state.baseline = fingerprint.value
    state.serverSnapshot = serverSignature(raw); state.remoteChanged = false
    if (!previous) onLoaded()
  }
  function serverSignature(raw) {
    return JSON.stringify({ estado: raw.estado, titulo: raw.titulo, textoOriginal: raw.textoOriginal, dataInicio: raw.dataInicio, dataFim: raw.dataFim, regras: raw.regras })
  }
  async function verifySavedVersion({ acceptanceId = null } = {}) {
    const raw = await api.load(state.id)
    if (disposed) return false
    if ((raw.estado !== state.estado) || raw.motivoBloqueioEdicao ||
        (state.revisaoControle != null && raw.revisaoControle !== state.revisaoControle && !(acceptanceId && String(raw.simulacaoAceitaId) === String(acceptanceId))) ||
        (state.serverSnapshot && serverSignature(raw) !== state.serverSnapshot)) {
      state.remoteChanged = true; simulation.accepted = false; state.readiness = null
      state.estado = raw.estado
      state.motivoBloqueioEdicao = raw.motivoBloqueioEdicao || ''
      throw new Error(raw.motivoBloqueioEdicao || 'A campanha ou a proposta foi alterada por outra pessoa. Suas alterações locais foram preservadas. Consulte a versão atual antes de continuar.')
    }
    state.revisaoControle = raw.revisaoControle ?? state.revisaoControle
    return true
  }
  function recordProgress(step) {
    if (!enabled || !api.progress || !state.id || !state.versaoProposta || readOnly.value || state.loading) return Promise.resolve(false)
    const id = state.id, version = state.versaoProposta
    // Serialize writes: a slow earlier response must not restore an older last stage.
    progressQueue = progressQueue.catch(() => {}).then(async () => {
      if (disposed || id !== state.id || version !== state.versaoProposta) return false
      try {
        const raw = await api.progress(id, { ultimaEtapa: step, etapaMaisAvancada: Math.max(step, state.etapaMaisAvancada), versaoProposta: version })
        if (disposed || id !== state.id || version !== state.versaoProposta) return false
        if (raw.ultimaEtapa !== step || raw.versaoProposta !== version) throw new Error('O backend não confirmou a etapa visitada.')
        state.ultimaEtapa = raw.ultimaEtapa; state.etapaMaisAvancada = raw.etapaMaisAvancada; state.progressError = ''
        return true
      } catch (error) {
        if (!disposed && id === state.id) state.progressError = 'A última etapa visitada não foi salva. ' + message(error)
        return false
      }
    })
    return progressQueue
  }
  async function load(id) {
    const request = ++requestSequence
    ++referenceSequence; ++pageSequence
    state.loading = true; state.uncertainCreate = false; state.remoteChanged = false; state.error = ''; simulation.accepted = false; simulation.result = null; simulationFingerprint = ''; state.readiness = null
    try {
      let raw = await api.load(id)
      if (disposed || request !== requestSequence) return false
      state.published = null
      if (raw.versaoVigente && api.version) {
        state.published = await api.version(id, raw.versaoVigente)
        if (disposed || request !== requestSequence) return false
      }
      if (raw.versaoVigente && !raw.versaoProposta && !raw.motivoBloqueioEdicao && ['ATIVA', 'INATIVA'].includes(raw.estado) && api.startProposal) {
        raw = await api.startProposal(id, raw.revisaoControle)
        if (disposed || request !== requestSequence) return false
      }
      applySaved(raw)
      if (raw.simulacaoAceitaId && raw.statusAceite === 'ACEITA') {
        try {
          const [savedSimulation, readiness] = await Promise.all([api.simulation(raw.simulacaoAceitaId), api.readiness(id)])
          if (disposed || request !== requestSequence) return false
          assertSimulation(savedSimulation, id, savedSimulation.competencia)
          simulation.selectedCompetencia = savedSimulation.competencia
          simulation.result = simulationViewModel(savedSimulation); simulation.executionId = savedSimulation.id
          simulation.totalItems = savedSimulation.totalVendasRecortadas; simulation.totalPages = Math.max(1, Math.ceil(simulation.totalItems / simulation.pageSize))
          simulationFingerprint = fingerprint.value
          state.readiness = readiness; simulation.accepted = readiness.aptaParaAtivacao === true && String(readiness.simulacaoId) === String(savedSimulation.id)
          simulation.acceptance = { aceitoPor: readiness.aceitoPor, aceitoEm: readiness.dataAceite, protocolo: readiness.protocoloSimulacao }
          simulation.status = 'CONCLUIDA'; simulation.progress = 100
          await changePage(1)
        } catch (error) { simulation.error = 'O rascunho foi carregado, mas o aceite não pôde ser conferido: ' + message(error) }
      }
      return true
    } catch (error) { if (request === requestSequence) state.error = message(error); return false }
    finally { if (request === requestSequence) state.loading = false }
  }
  async function save({ confirmDefaults = false } = {}) {
    if (!enabled || busy.value || processing() || readOnly.value || state.uncertainCreate) return false
    state.error = ''; state.notice = ''
    const errors = validateDraftForPersistence(campaign)
    if (errors.length) { state.error = errors.join(' '); return false }
    if (state.id && !dirty.value) { state.notice = 'O rascunho já está atualizado.'; return true }
    if ((!campaign.dataInicio || !campaign.dataFim) && !confirmDefaults) { defaultsFingerprint = fingerprint.value; state.defaultsOpen = true; return false }
    if (confirmDefaults && defaultsFingerprint !== fingerprint.value) { state.defaultsOpen = false; state.error = 'Os dados mudaram. Salve novamente para conferir a vigência.'; return false }
    state.defaultsOpen = false; state.saving = true
    const before = fingerprint.value, previous = clonePlain(campaign), id = state.id
    const request = ++requestSequence
    try {
      if (id && !await verifySavedVersion()) return false
      if (before !== fingerprint.value) throw new Error('Os dados mudaram antes do salvamento. Tente novamente.')
      const raw = await api.save(id, campaignToDraftRequest(previous), state.revisaoControle)
      if (disposed || request !== requestSequence) return false
      if (raw.estado !== (state.editingPublished ? state.estado : 'DRAFT') || (id && String(raw.id) !== String(id)) || raw.regras?.length !== previous.propostas.length || raw.regras?.some((r) => !previous.propostas.some((p) => p.clientId === r.blocoId))) throw new Error('O backend não confirmou o rascunho com todas as regras. Consulte a campanha antes de repetir.')
      if (!Number.isInteger(raw.versaoProposta) || raw.regras.some((r) => !r.rastreabilidade || typeof r.rastreabilidade.artefatosAtualizados !== 'boolean')) {
        throw new Error('O backend em execução não confirmou a versão e a rastreabilidade das regras. Reconstrua/reinicie o backend com a integração atual e recarregue a página antes de continuar. A resposta de salvamento é incompatível; consulte o rascunho antes de repetir a criação.')
      }
      if (before !== fingerprint.value) {
        const persisted = persistedCampaignToProposal(raw)
        state.id = raw.id; campaign.id = raw.id; state.baseline = draftFingerprint(persisted); state.serverSnapshot = serverSignature(raw)
        state.notice = 'A versão enviada foi salva. Há alterações posteriores ainda não salvas.'
      } else { applySaved(raw, previous); state.notice = `${state.editingPublished ? 'Proposta de alteração salva' : 'Rascunho salvo'} com ${raw.regras.length} regra(s).` }
      simulation.accepted = false; state.readiness = null
      await recordProgress(currentStep())
      return true
    } catch (error) {
      state.error = message(error)
      if (error?.response?.status === 409) state.remoteChanged = true
      // A lost POST response can already have created a campaign; do not repeat it automatically.
      if (!id && (!error?.response || error.response.status >= 500)) { state.uncertainCreate = true; state.error += ' O resultado da criação é incerto. Consulte a lista de campanhas antes de criar novamente.' }
      return false
    } finally { state.saving = false }
  }
  async function loadCompetences() {
    if (!enabled || simulation.isLoadingCompetences) return
    simulation.isLoadingCompetences = true; simulation.error = ''
    try {
      const rows = await api.competences()
      if (!Array.isArray(rows) || rows.some((r) => !r.competencia || !Number.isInteger(r.totalVendas))) throw new Error('A consulta de competências retornou dados inválidos.')
      if (disposed) return
      simulation.competences = rows.map((r) => ({ ...r, label: r.statusReferencia || 'Referência cadastrada' }))
      if (simulation.selectedCompetencia) await selectCompetence(simulation.selectedCompetencia, { preserveAccepted: true })
    } catch (error) { simulation.error = message(error) } finally { simulation.isLoadingCompetences = false }
  }
  async function selectCompetence(value, { preserveAccepted = false } = {}) {
    if (busy.value || processing()) return false
    if (!preserveAccepted || value !== simulation.selectedCompetencia) {
      simulation.accepted = false; state.readiness = null; simulation.result = null; simulationFingerprint = ''; simulation.status = ''; simulation.executionId = ''; simulation.progress = 0
    }
    simulation.selectedCompetencia = value; simulation.referenceValidation = null; simulation.error = ''; simulation.invalidationReasons = []
    if (!value || !state.id) return false
    if (dirty.value) { simulation.error = 'Salve as alterações antes de validar o público.'; return false }
    const request = ++referenceSequence, before = fingerprint.value
    simulation.isValidatingReference = true
    try {
      if (!await verifySavedVersion()) return false
      const raw = await api.cut(state.id, value)
      if (disposed || request !== referenceSequence || before !== fingerprint.value || value !== simulation.selectedCompetencia) return false
      if (raw.competencia !== value || !Array.isArray(raw.impedimentosGerais) || !Number.isInteger(raw.totalVendasComImpedimento) || !Number.isInteger(raw.totalVendasRecortadas)) throw new Error('A validação de público retornou dados inválidos.')
      const impediments = raw.impedimentosGerais.map((m) => ({ code: isCoverageImpediment(m) ? 'MISSING_BASE_COVERAGE' : 'BACKEND', message: m }))
      if (raw.totalVendasComImpedimento) impediments.push({ code: 'BACKEND', message: `${raw.totalVendasComImpedimento} venda(s) com impedimentos cadastrais ou contratuais.` })
      if (raw.possuiAmbiguidadeCritica) impediments.push({ code: 'BACKEND', message: 'O recorte contém sobreposição de regras com ambiguidade crítica.' })
      if (!raw.totalVendasRecortadas) impediments.push({ code: 'INSUFFICIENT_REFERENCE', message: 'Nenhuma venda atende ao público nesta competência.' })
      const missingBases = impediments.filter((i) => i.code === 'MISSING_BASE_COVERAGE').map((i) => parseCoverageDetails(i.message, null, value))
      simulation.referenceValidation = { ...raw, impediments, missingBases, canExecute: !impediments.length, origemDados: 'Vendas, RH e taxas contratuais de ' + value }
      if (impediments.length) { simulation.accepted = false; state.readiness = null }
      return !impediments.length
    } catch (error) { if (request === referenceSequence) { simulation.error = message(error); simulation.accepted = false; state.readiness = null }; return false }
    finally { if (request === referenceSequence) simulation.isValidatingReference = false }
  }
  async function runSimulation() {
    if (!enabled || busy.value || processing() || !rulesReady.value || dirty.value || readOnly.value || !state.id || !simulation.selectedCompetencia) { simulation.error = 'Salve o rascunho e escolha a competência antes de simular.'; return false }
    const competence = simulation.selectedCompetencia
    if (!await selectCompetence(competence)) return false
    const before = fingerprint.value, id = state.id, request = ++requestSequence
    simulation.isRunning = true; simulation.error = ''; simulation.accepted = false; simulation.result = null; simulation.status = 'PROCESSANDO'; simulation.progress = 0; state.readiness = null
    simulation.stageMessage = 'Calculando os cenários. Aguarde a conclusão.'
    try {
      const raw = await api.simulate(id, competence)
      if (!await verifySavedVersion()) return false
      if (disposed || request !== requestSequence || before !== fingerprint.value || competence !== simulation.selectedCompetencia) { simulation.status = 'INVALIDADA'; simulation.stageMessage = 'A campanha mudou durante a execução. Salve e simule novamente.'; return false }
      assertSimulation(raw, id, competence)
      simulation.result = simulationViewModel(raw); simulation.executionId = raw.id; simulationFingerprint = before
      simulation.status = 'CONCLUIDA'; simulation.progress = 100; simulation.stageMessage = 'Simulação concluída. Protocolo: ' + raw.protocolo; simulation.invalidationReasons = []
      simulation.totalItems = raw.totalVendasRecortadas; simulation.totalPages = Math.max(1, Math.ceil(raw.totalVendasRecortadas / simulation.pageSize)); simulation.page = 1
      await changePage(1)
      return true
    } catch (error) { simulation.error = message(error); simulation.status = 'FALHOU'; simulation.stageMessage = 'Nenhum resultado foi aceito.'; return false }
    finally { simulation.isRunning = false }
  }
  async function changePage(page, size = simulation.pageSize) {
    if (!simulation.result) return false
    const id = simulation.result.id, request = ++pageSequence
    simulation.loadingSales = true; simulation.pageError = ''
    try {
      const raw = await api.sales(id, page, size)
      if (disposed || request !== pageSequence || simulation.result?.id !== id) return false
      if (String(raw.simulacaoId) !== String(id) || !Array.isArray(raw.vendas) || !Number.isInteger(raw.totalElementos) || raw.paginaAtual !== page - 1) throw new Error('A página de vendas retornada é inválida.')
      simulation.result.rows = raw.vendas.map(simulationSaleRow); simulation.page = page; simulation.pageSize = size; simulation.totalItems = raw.totalElementos; simulation.totalPages = Math.max(1, raw.totalPaginas)
      return true
    } catch (error) { if (request === pageSequence) simulation.pageError = message(error); return false } finally { if (request === pageSequence) simulation.loadingSales = false }
  }
  async function accept() {
    if (busy.value || processing() || !currentSimulation.value || readOnly.value) return false
    if (!simulation.aceitoPor.trim()) { simulation.error = 'Informe o responsável pelo aceite.'; return false }
    const before = fingerprint.value, id = simulation.result.id, competence = simulation.selectedCompetencia
    state.working = true; simulation.error = ''
    try {
      if (!await verifySavedVersion()) return false
      const accepted = await api.accept(id, { campanhaId: state.id, aceitoPor: simulation.aceitoPor.trim(), motivo: simulation.motivo.trim() || null, ...(state.versaoVigente == null ? {} : { versaoEsperada: state.versaoVigente }) })
      if (disposed || before !== fingerprint.value || simulation.result?.id !== id || competence !== simulation.selectedCompetencia) return false
      if (accepted.statusAceite !== 'ACEITA' || String(accepted.simulacaoId) !== String(id) || String(accepted.campanhaId) !== String(state.id)) throw new Error('O backend não confirmou o aceite desta simulação.')
      const readiness = await api.readiness(state.id)
      if (!await verifySavedVersion({ acceptanceId: id })) return false
      if (disposed || before !== fingerprint.value || simulation.result?.id !== id || competence !== simulation.selectedCompetencia) return false
      state.readiness = readiness
      simulation.accepted = readiness.aptaParaAtivacao === true && String(readiness.simulacaoId) === String(id)
      simulation.acceptance = accepted
      simulation.acceptOpen = false
      if (!simulation.accepted) throw new Error(readiness.mensagem || 'O backend apontou divergências no aceite. Confira os bloqueios.')
      return true
    } catch (error) { simulation.accepted = false; simulation.error = message(error); return false } finally { state.working = false }
  }
  async function activate() {
    if (!canActivate.value) return false
    const before = fingerprint.value, id = state.id
    state.working = true; state.error = ''; state.activationOpen = false
    try {
      if (!await verifySavedVersion()) return false
      const readiness = await api.readiness(id)
      state.readiness = readiness
      if (readiness.aptaParaAtivacao !== true || String(readiness.simulacaoId) !== String(simulation.result.id)) throw new Error(readiness.mensagem || 'A campanha deixou de estar apta para ativação.')
      if (disposed || before !== fingerprint.value) throw new Error('A campanha mudou. Simule e aceite novamente.')
      // Never update the draft here: PUT would invalidate the formal acceptance.
      const raw = await api.activate(id, state.versaoVigente, state.revisaoControle)
      if (state.editingPublished && (raw?.versaoVigente !== state.versaoProposta || raw?.versaoProposta != null)) throw new Error('A publicação da versão proposta não foi confirmada. Consulte a campanha antes de tentar novamente.')
      if (String(raw?.id) !== String(id) || raw.estado !== 'ATIVA' || raw.regras?.length !== campaign.propostas.length) throw new Error('A ativação não foi confirmada. Consulte o estado atual da campanha antes de repetir.')
      state.estado = raw.estado; campaign.estado = raw.estado; state.notice = state.editingPublished ? 'Nova versão publicada.' : 'Campanha ativada.'
      return true
    } catch (error) { state.error = message(error); if (error?.response?.status === 409) state.remoteChanged = true; return false } finally { state.working = false }
  }
  async function cancelProposal() {
    if (!state.editingPublished || busy.value || processing()) return false
    state.working = true; state.error = ''
    try {
      if (!await verifySavedVersion()) return false
      await api.cancelProposal(state.id, state.revisaoControle)
      state.baseline = fingerprint.value
      state.editingPublished = false; state.versaoProposta = null
      return true
    } catch (error) { state.error = message(error); if (error?.response?.status === 409) state.remoteChanged = true; return false }
    finally { state.working = false }
  }
  return { state, simulation, cancelProposal, dirty, busy, readOnly, currentSimulation, canReview, canActivate, load, save, recordProgress, loadCompetences, selectCompetence, runSimulation, changePage, accept, activate, dispose() { disposed = true; ++requestSequence; ++referenceSequence; ++pageSequence } }
}
