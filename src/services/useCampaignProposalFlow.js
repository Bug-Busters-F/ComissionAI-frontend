import { focusCampaignStepStart } from './campaignStepNavigation'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { campaignProposalToCanonical, normalizeCampaignProposalResponse } from './campaignProposalMappers'
import { createCampaignProposal, createCampaignProposalForm, hasCampaignContent, isProposalBlank } from './campaignProposalModel'
import { createCampaignProposalProvider } from './campaignProposalService'
import { createCampaignProposalLifecycle } from './campaignProposalLifecycle'
import { createCampaignProposalApiClient } from './campaignProposalApiClient'
import { createCampaignProposalIntegration, isRulePendingRevalidatable } from './campaignProposalIntegration'
import { getRequiredProposalStep, validateCampaignCommon, validateCampaignProposalSet } from './campaignProposalValidation'

export const CAMPAIGN_PROPOSAL_STEPS = Object.freeze([
  { key: 'dados', label: 'Proposta', number: 1 },
  { key: 'propostas', label: 'Interpretação', number: 2 },
  { key: 'simulacao', label: 'Simulação', number: 3 },
  { key: 'conferencia', label: 'Conferência', number: 4 }
])

const STEP_KEYS = new Set(CAMPAIGN_PROPOSAL_STEPS.map((step) => step.key))
const AUDIENCE_FIELDS = ['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula']

export function normalizeProposalStep(step) {
  return STEP_KEYS.has(step) ? step : 'dados'
}

export function proposalFieldId(clientId, field) {
  return 'proposal-field-' + encodeURIComponent(clientId) + '-' + field
}

export function useCampaignProposalFlow() {
  const route = useRoute()
  const router = useRouter()
  const campaign = reactive(createCampaignProposalForm())
  const activeStep = ref(normalizeProposalStep(route.query.etapa))
  const revision = ref(0)
  const message = ref('')
  const interpretation = reactive({ status: 'idle', isProcessing: false, error: '' })
  const pendingRemovalId = ref(null)
  const provider = createCampaignProposalProvider({ client: createCampaignProposalApiClient() })
  const descriptionAtProposalSource = ref('')
  const descriptionChanged = computed(() => campaign.textoOriginal !== descriptionAtProposalSource.value)
  const descriptionNeedsConfirmation = ref(false)
  const commonValidationAttempted = ref(false)
  const campaignReinterpretationOpen = ref(false)
  let campaignConfirmationFingerprint = ''
  const activeStepIndex = computed(() => CAMPAIGN_PROPOSAL_STEPS.findIndex((step) => step.key === activeStep.value))
  const commonValidation = computed(() => validateCampaignCommon(campaign))
  const validation = computed(() => validateCampaignProposalSet(campaign))
  const integration = createCampaignProposalIntegration({ campaign, provider, onChange: markChanged, onInterpreted: () => {
    descriptionAtProposalSource.value = campaign.textoOriginal
    descriptionNeedsConfirmation.value = false
    interpretation.status = 'ready'
  } })
  const integrationState = integration.state
  const lifecycle = createCampaignProposalLifecycle({ campaign, enabled: provider.mode === 'api', processing: () => interpretation.isProcessing || integrationState.busy || Boolean(integrationState.review) || campaignReinterpretationOpen.value, onLoaded: () => {
    descriptionAtProposalSource.value = campaign.textoOriginal
    descriptionNeedsConfirmation.value = false
  } })
  const persistence = lifecycle.state
  const simulation = lifecycle.simulation
  const isDirty = lifecycle.dirty
  const persistenceBusy = lifecycle.busy
  watch(() => route.params?.id, async (id) => {
    if (!id || String(id) === String(persistence.id)) return
    if (await lifecycle.load(id)) {
      activeStep.value = requiredStep(normalizeProposalStep(route.query.etapa))
      await router.replace({ query: { ...route.query, etapa: activeStep.value } })
    }
  }, { immediate: true })

  const canAdvanceLocally = computed(() => {
    if (lifecycle.busy.value || lifecycle.readOnly.value || interpretation.isProcessing || integrationState.busy || integrationState.review || campaignReinterpretationOpen.value) return false
    if (provider.mode !== 'api') return validation.value.canAdvanceLocally
    // Allow another verification after corrections, keeping the actual pending
    // issues visible. Navigation still checks the complete backend result.
    const retryableCampaign = { ...campaign, propostas: campaign.propostas.map((proposal) => ({
      ...proposal,
      pendenciasRemotas: proposal.pendenciasRemotas.filter((pending) =>
        !(proposal.metadadosRecebidos.validacaoPendente !== false && isRulePendingRevalidatable(proposal, pending)))
    })) }
    return validateCampaignProposalSet(retryableCampaign).canAdvanceLocally
  })
  const canRunSimulation = computed(() => canAdvanceLocally.value && provider.capabilities.simulate)
  const canonicalSnapshot = computed(() => campaignProposalToCanonical(campaign))

  let navigationSequence = 0
  let interpretationSequence = 0
  let interpretationController = null

  watch(
    () => route.query.etapa,
    async (requested) => {
      if (persistence.loading) return
      const navigation = ++navigationSequence
      const normalized = normalizeProposalStep(requested)
      if (normalized !== 'dados' && commonValidation.value.pending.some((item) => item.severidade === 'IMPEDITIVO')) {
        commonValidationAttempted.value = true
      }
      if (provider.mode === 'api' && !lifecycle.readOnly.value && !persistence.loading && ['simulacao', 'conferencia'].includes(normalized) && !integrationState.busy && !integrationState.review && !campaignReinterpretationOpen.value) await integration.prepareReview()
      if (navigation !== navigationSequence || requested !== route.query.etapa) return
      const allowed = requiredStep(normalized)
      activeStep.value = allowed
      if (requested !== allowed) {
        if (descriptionNeedsConfirmation.value && normalized !== 'dados') {
          message.value = 'Confirme que deseja manter as regras atuais depois de alterar a descrição.'
        }
        await router.replace({ query: { ...route.query, etapa: allowed } })
      }
      await focusCampaignStepStart()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => { cancelInterpretation(); integration.dispose(); lifecycle.dispose() })

  function requiredStep(target) {
    if (provider.mode === 'api' && !lifecycle.readOnly.value) {
      if (target === 'conferencia' && !lifecycle.canReview.value) target = 'simulacao'
      if (['simulacao', 'conferencia'].includes(target) && (!persistence.id || lifecycle.dirty.value)) return 'propostas'
    }
    return getRequiredProposalStep(target, validation.value, campaign, {
      descriptionNeedsConfirmation: descriptionNeedsConfirmation.value,
      processing: interpretation.isProcessing || integrationState.busy || Boolean(integrationState.review) || campaignReinterpretationOpen.value,
      needsValidation: provider.mode === 'api' && (campaign.propostas.some((p) => p.artefatosDesatualizados || p.metadadosRecebidos.validacaoPendente !== false) || !campaign.dataInicio || !campaign.dataFim)
    })
  }

  async function saveDraft(options = {}) {
    if (descriptionNeedsConfirmation.value) {
      message.value = 'Reinterprete o texto alterado ou confirme que deseja manter as regras atuais antes de salvar.'
      await navigateTo('dados')
      return false
    }
    return lifecycle.save(options)
  }

  async function applyIntegrationReview() {
    return integration.applyReview()
  }

  function markChanged() {
    revision.value += 1
    campaign.revisaoLocal += 1
    message.value = ''
    interpretation.error = ''
  }

  async function navigateTo(step, { replace = false } = {}) {
    if (campaignReinterpretationOpen.value || lifecycle.busy.value) return false
    const navigation = ++navigationSequence
    const target = normalizeProposalStep(step)
    if (target !== 'dados' && commonValidation.value.pending.some((item) => item.severidade === 'IMPEDITIVO')) {
      commonValidationAttempted.value = true
    }
    if (provider.mode === 'api' && !lifecycle.readOnly.value && ['simulacao', 'conferencia'].includes(target)) {
      if (!await integration.prepareReview()) {
        message.value = 'Valide as regras e confirme os resultados pendentes antes de continuar.'
      }
    }
    if (navigation !== navigationSequence) return false
    if (provider.mode === 'api' && ['simulacao', 'conferencia'].includes(target) && !descriptionNeedsConfirmation.value && validation.value.canAdvanceLocally && !integrationState.review && !lifecycle.readOnly.value) {
      if (lifecycle.dirty.value && !await lifecycle.save()) return false
      if (target === 'simulacao' && !simulation.competences.length) void lifecycle.loadCompetences()
    }
    const allowed = requiredStep(target)
    if (target !== allowed) {
      activeStep.value = allowed
      if (descriptionNeedsConfirmation.value && target !== 'dados') {
        message.value = 'Confirme que deseja manter as regras atuais depois de alterar a descrição.'
      } else if (allowed === 'dados') {
        message.value = 'Preencha os dados da campanha antes de continuar.'
      } else if (target === 'conferencia' && provider.mode === 'api' && !lifecycle.canReview.value) {
        message.value = 'Execute e aceite formalmente uma simulação da versão salva antes da conferência.'
      } else if (!campaign.propostas.length) {
        message.value = 'Adicione ao menos uma regra antes de abrir a simulação.'
      } else if (integrationState.busy || integrationState.review) {
        message.value = 'Aguarde a solicitação ou confirme/cancele a revisão antes de continuar.'
      } else if (provider.mode === 'api' && (!campaign.dataInicio || !campaign.dataFim)) {
        message.value = 'Informe uma vigência comum no texto da campanha e reinterprete.'
      } else if (provider.mode === 'api' && campaign.propostas.some((p) => p.artefatosDesatualizados || p.metadadosRecebidos.validacaoPendente !== false)) {
        message.value = 'Valide as regras alteradas antes de continuar. Seus dados foram preservados.'
      } else {
        const blockingCount = validation.value.blockers.length
        message.value = 'Corrija ' + blockingCount + (blockingCount === 1 ? ' pendência impeditiva' : ' pendências impeditivas') + ' antes de continuar.'
      }
      await router.replace({ query: { ...route.query, etapa: allowed } })
      await focusCampaignStepStart()
      return false
    }

    if (target === 'propostas' && descriptionNeedsConfirmation.value && campaign.propostas.length) {
      activeStep.value = 'dados'
      message.value = 'Confirme que deseja manter as regras atuais depois de alterar a descrição.'
      await router.replace({ query: { ...route.query, etapa: 'dados' } })
      await focusCampaignStepStart()
      return false
    }

    message.value = ''
    activeStep.value = target
    const method = replace ? 'replace' : 'push'
    await router[method]({ ...(provider.mode === 'api' && persistence.id && !route.params?.id ? { name: 'campanha-editar', params: { id: persistence.id } } : {}), query: { ...route.query, etapa: target } })
    await focusCampaignStepStart()
    return true
  }

  function updateCampaign(field, value) {
    if (lifecycle.busy.value || lifecycle.readOnly.value) return
    if (!['titulo', 'textoOriginal', 'dataInicio', 'dataFim'].includes(field)) return
    const previousDescription = campaign.textoOriginal
    campaign[field] = value
    if (field === 'textoOriginal' && value !== previousDescription && campaign.propostas.length) {
      descriptionNeedsConfirmation.value = value !== descriptionAtProposalSource.value
    }
    if (field === 'dataInicio' || field === 'dataFim') {
      campaign.propostas.forEach((proposal) => {
        if (proposal.metadadosRecebidos?.dependeDaVigencia) proposal.artefatosDesatualizados = true
      })
    }
    markChanged()
  }

  function confirmRetainProposals() {
    descriptionAtProposalSource.value = campaign.textoOriginal
    descriptionNeedsConfirmation.value = false
    campaign.propostas.forEach((proposal) => { proposal.revisaoLocal += 1 })
    markChanged()
  }

  function startManualEntry() {
    commonValidationAttempted.value = true
    if (descriptionNeedsConfirmation.value && campaign.propostas.length) {
      message.value = 'Confirme que deseja manter as regras atuais depois de alterar a descrição.'
      return navigateTo('dados')
    }
    if (commonValidation.value.pending.some((item) => item.severidade === 'IMPEDITIVO')) {
      message.value = 'Preencha os dados da campanha antes de adicionar regras.'
      return navigateTo('dados')
    }
    if (!campaign.propostas.length) addProposal()
    descriptionAtProposalSource.value = campaign.textoOriginal
    descriptionNeedsConfirmation.value = false
    interpretation.status = 'manual'
    return navigateTo('propostas')
  }

  function addProposal() {
    if (lifecycle.busy.value || lifecycle.readOnly.value) return
    const proposal = createCampaignProposal({ origem: 'manual' })
    campaign.propostas.push(proposal)
    markChanged()
    return proposal.clientId
  }

  function updateProposal(clientId, field, value) {
    if (lifecycle.busy.value || lifecycle.readOnly.value) return
    if (!['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula', 'publicoTodasVendas', 'taxaPercentual', 'valorMinimo', 'minimoInclusivo', 'valorMaximo', 'maximoInclusivo'].includes(field)) return
    const proposal = campaign.propostas.find((item) => item.clientId === clientId)
    if (!proposal) return
    proposal.campos[field] = value
    if (AUDIENCE_FIELDS.includes(field) && String(value || '').trim() && proposal.campos.publicoTodasVendas) {
      proposal.campos.publicoTodasVendas = false
      if (!proposal.camposManuais.includes('publicoTodasVendas')) proposal.camposManuais.push('publicoTodasVendas')
    }
    if (!proposal.camposManuais.includes(field)) proposal.camposManuais.push(field)
    proposal.revisaoLocal += 1
    proposal.artefatosDesatualizados = true
    proposal.metadadosRecebidos.validacaoPendente = true
    if (AUDIENCE_FIELDS.includes(field)) proposal.metadadosRecebidos.origensDesatualizadas = true
    if (field === 'taxaPercentual') {
      proposal.metadadosRecebidos.taxaDefinidaManualmente = true
    }
    markChanged()
  }

  function applyReinterpretation(updated) {
    if (lifecycle.busy.value || lifecycle.readOnly.value) return
    const proposal = campaign.propostas.find((item) => item.clientId === updated.clientId)
    if (!proposal || proposal.origem === 'manual') return
    Object.assign(proposal, updated)
    markChanged()
  }

  function setAllSales(clientId, enabled) {
    if (lifecycle.busy.value || lifecycle.readOnly.value) return
    const proposal = campaign.propostas.find((item) => item.clientId === clientId)
    if (!proposal) return
    if (enabled) {
      AUDIENCE_FIELDS.forEach((field) => {
        proposal.campos[field] = ''
        if (!proposal.camposManuais.includes(field)) proposal.camposManuais.push(field)
      })
    }
    updateProposal(clientId, 'publicoTodasVendas', Boolean(enabled))
  }

  function requestRemoveProposal(clientId) {
    if (lifecycle.busy.value || lifecycle.readOnly.value) return
    const proposal = campaign.propostas.find((item) => item.clientId === clientId)
    if (!proposal) return null
    if (isProposalBlank(proposal)) return removeProposal(clientId)
    pendingRemovalId.value = clientId
    return null
  }

  function removeProposal(clientId) {
    if (integrationState.targetId === clientId || integrationState.editorId === clientId) integration.closeEditor()
    const index = campaign.propostas.findIndex((item) => item.clientId === clientId)
    if (index < 0) return null
    campaign.propostas.splice(index, 1)
    pendingRemovalId.value = null
    markChanged()
    return campaign.propostas[index]?.clientId || campaign.propostas[index - 1]?.clientId || null
  }

  function confirmRemoveProposal() {
    if (lifecycle.busy.value || lifecycle.readOnly.value || !pendingRemovalId.value) return null
    return removeProposal(pendingRemovalId.value)
  }

  function cancelRemoveProposal() {
    pendingRemovalId.value = null
  }

  function loadExample(key) {
    if (!provider.capabilities.examples) return false
    if (hasCampaignContent(campaign) && typeof globalThis.confirm === 'function' &&
        !globalThis.confirm('Carregar este exemplo substituirá os dados da campanha atual. Deseja continuar?')) return false
    try {
      const normalized = normalizeCampaignProposalResponse(provider.loadExample(key))
      normalized.campaign.propostas.forEach((proposal) => {
        proposal.origem = 'demonstracao'
        proposal.metadadosRecebidos = { ...proposal.metadadosRecebidos, demonstrativo: true }
      })
      Object.assign(campaign, normalized.campaign)
      descriptionAtProposalSource.value = campaign.textoOriginal
      descriptionNeedsConfirmation.value = false
      interpretation.status = 'example'
      revision.value += 1
      campaign.revisaoLocal += 1
      message.value = ''
      return true
    } catch (error) {
      message.value = error?.message || 'Não foi possível carregar este exemplo.'
      return false
    }
  }

  async function interpretDescription() {
    commonValidationAttempted.value = true
    if (lifecycle.busy.value || lifecycle.readOnly.value || interpretation.isProcessing || integrationState.busy || integrationState.review || campaignReinterpretationOpen.value) return false
    if (campaign.propostas.length && campaign.titulo.trim() && campaign.textoOriginal.trim() && provider.capabilities.interpret) {
      campaignConfirmationFingerprint = JSON.stringify(campaign)
      campaignReinterpretationOpen.value = true
      return false
    }
    return executeCampaignInterpretation()
  }

  function cancelCampaignReinterpretation() {
    campaignReinterpretationOpen.value = false
    campaignConfirmationFingerprint = ''
  }

  async function confirmCampaignReinterpretation() {
    if (!campaignReinterpretationOpen.value) return false
    const unchanged = campaignConfirmationFingerprint === JSON.stringify(campaign)
    cancelCampaignReinterpretation()
    if (!unchanged) {
      message.value = 'Os dados mudaram desde a confirmação. Solicite a reinterpretação novamente.'
      return false
    }
    return executeCampaignInterpretation()
  }

  async function executeCampaignInterpretation() {
    if (provider.mode === 'api') {
      const applied = await integration.interpretCampaign()
      if (applied && !integrationState.review) await navigateTo('propostas')
      return applied
    }
    if (!provider.capabilities.interpret) {
      interpretation.error = 'Interpretação indisponível. Você pode preencher as regras manualmente.'
      return false
    }
    if (interpretation.isProcessing) return false
    const requestId = ++interpretationSequence
    const requestedRevision = revision.value
    const requestedRoute = route.fullPath
    const controller = new AbortController()
    interpretationController = controller
    interpretation.status = 'processing'
    interpretation.isProcessing = true
    interpretation.error = ''
    try {
      const response = await provider.interpretCampaign({
        titulo: campaign.titulo,
        descricao: campaign.textoOriginal,
        dataInicio: campaign.dataInicio,
        dataFim: campaign.dataFim
      }, { signal: controller.signal })
      if (requestId !== interpretationSequence || requestedRevision !== revision.value || requestedRoute !== route.fullPath) {
        interpretation.status = 'stale'
        interpretation.error = 'A resposta foi ignorada porque os dados da campanha mudaram durante a interpretação.'
        return false
      }
      const normalized = normalizeCampaignProposalResponse(response)
      campaign.propostas = normalized.campaign.propostas
      descriptionAtProposalSource.value = campaign.textoOriginal
      descriptionNeedsConfirmation.value = false
      campaign.propostas.forEach((proposal) => { proposal.origem = 'interpretacao' })
      markChanged()
      interpretation.status = 'ready'
      await navigateTo('propostas')
      return true
    } catch (error) {
      if (requestId === interpretationSequence) {
        interpretation.status = 'error'
        interpretation.error = error?.message || 'Não foi possível interpretar a descrição. Seus dados foram mantidos.'
      }
      return false
    } finally {
      if (requestId === interpretationSequence) interpretation.isProcessing = false
      if (interpretationController === controller) interpretationController = null
    }
  }

  function cancelInterpretation() {
    interpretationSequence += 1
    interpretationController?.abort()
    interpretationController = null
    interpretation.isProcessing = false
    if (interpretation.status === 'processing') interpretation.status = 'cancelled'
  }

  async function focusPending({ clientId, campo } = {}) {
    if (clientId) {
      await navigateTo('propostas')
      await nextTick()
      const target = campo
        ? document.getElementById(proposalFieldId(clientId, campo))
        : document.getElementById('proposal-card-' + encodeURIComponent(clientId))
      target?.focus?.()
      return
    }
    await navigateTo('dados')
    await nextTick()
    const id = campo ? 'campaign-' + campo : 'campaign-title'
    document.getElementById(id)?.focus?.()
  }

  return {
    campaign,
    lifecycle, persistence, simulation, persistenceBusy, saveDraft,
    provider,
    integration,
    integrationState,
    applyIntegrationReview,
    activeStep,
    activeStepIndex,
    steps: CAMPAIGN_PROPOSAL_STEPS,
    revision,
    message,
    interpretation,
    validation,
    commonValidation,
    commonValidationAttempted,
    canAdvanceLocally,
    canRunSimulation,
    canonicalSnapshot,
    isDirty,
    pendingRemovalId,
    descriptionChanged,
    descriptionNeedsConfirmation,
    navigateTo,
    updateCampaign,
    confirmRetainProposals,
    startManualEntry,
    addProposal,
    updateProposal,
    applyReinterpretation,
    setAllSales,
    requestRemoveProposal,
    confirmRemoveProposal,
    cancelRemoveProposal,
    loadExample,
    interpretDescription,
    campaignReinterpretationOpen,
    confirmCampaignReinterpretation,
    cancelCampaignReinterpretation,
    cancelInterpretation,
    focusPending
  }
}
