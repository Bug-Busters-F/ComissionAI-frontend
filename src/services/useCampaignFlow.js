import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { applyInterpretationToForm, normalizeInterpretationResult } from './campaignInterpretation'
import { campaignDemo, isCampaignDemoEnabled } from './campaignDemo'
import { campaignService, mapCampaignFieldErrors, normalizeCampaignError } from './campaignService'
import { campaignInterpretationService, normalizeInterpretationError } from './campaignInterpretationService'
import { campaignFormToPayload, campaignResponseToForm, createEmptyCampaignForm } from './campaignMappers'
import { hasValidationErrors, validateCampaignForm } from './campaignValidation'

export const CAMPAIGN_STEPS = [
  { key: 'proposta', label: 'Proposta', number: 1 },
  { key: 'interpretacao', label: 'Interpretação', number: 2 },
  { key: 'simulacao', label: 'Simulação', number: 3 },
  { key: 'revisao', label: 'Revisão', number: 4 }
]

const STEP_KEYS = new Set(CAMPAIGN_STEPS.map((step) => step.key))
const ERROR_TARGETS = {
  titulo: { step: 'proposta', selector: '#campaign-title' },
  textoOriginal: { step: 'proposta', selector: '#campaign-original-text' },
  taxaPercentual: { step: 'interpretacao', selector: '#campaign-rate' },
  codMarca: { step: 'interpretacao', selector: '#campaign-brand-code' },
  descrMarca: { step: 'interpretacao', selector: '#campaign-brand-description' },
  codLoja: { step: 'interpretacao', selector: '#campaign-store-code' },
  codCargo: { step: 'interpretacao', selector: '#campaign-job-code' },
  descriCargo: { step: 'interpretacao', selector: '#campaign-job-description' },
  matricula: { step: 'interpretacao', selector: '#campaign-registration' },
  dataInicio: { step: 'interpretacao', selector: '#campaign-start' },
  dataFim: { step: 'interpretacao', selector: '#campaign-end' }
}

export function normalizeCampaignStep(step) {
  return STEP_KEYS.has(step) ? step : 'proposta'
}

export function useCampaignFlow() {
  const route = useRoute()
  const router = useRouter()
  const notifications = useNotificationStore()
  const form = reactive(createEmptyCampaignForm())
  const state = reactive({
    campaignId: null,
    persistedState: null,
    persistedRecord: null,
    persistedSnapshot: '',
    isLoading: true,
    isSaving: false,
    isApproving: false,
    activationFailed: false,
    fieldErrors: {},
    generalError: '',
    discardDialogOpen: false,
    interpretation: {
      status: 'manual',
      isProcessing: false,
      requestId: 0,
      requestRouteName: null,
      requestRouteId: null,
      source: null,
      sourceText: null,
      requestContext: {},
      lastResponse: null,
      manualFields: [],
      dirtyFields: [],
      suggestedFields: [],
      preservedFields: [],
      pending: [],
      confidence: null,
      error: ''
    },
    demo: {
      budget: '',
      bonus: 100,
      simulationVariant: 'base',
      simulationHasRun: false
    }
  })
  const activeStep = ref(normalizeCampaignStep(route.query.etapa))
  const loadError = ref('')
  const loadSequence = ref(0)
  const loadedRouteKey = ref('')
  const allowNavigation = ref(false)
  const pendingNavigation = ref(null)
  let interpretationSequence = 0
  let activeInterpretationController = null
  let componentActive = true
  const isDemo = computed(() => isCampaignDemoEnabled)
  const isEdit = computed(() => route.name === 'campanha-editar')
  const isPersisted = computed(() => Boolean(state.campaignId))
  const isDirty = computed(() => !state.isLoading && createSnapshot() !== state.persistedSnapshot)
  const campaignTitle = computed(() => form.titulo || (isEdit.value ? 'Campanha' : 'Nova campanha'))
  const currentStepIndex = computed(() => CAMPAIGN_STEPS.findIndex((step) => step.key === activeStep.value))
  const canApprove = computed(() => !isPersisted.value || state.persistedState === 'DRAFT')

  onMounted(() => {
    loadForRoute()
    window.addEventListener('beforeunload', handleBeforeUnload)
  })
  onBeforeUnmount(() => {
    loadSequence.value += 1
    invalidateInterpretationRequest({ silent: true })
    componentActive = false
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  watch(
    () => [route.name, route.params.id],
    () => loadForRoute(),
    { flush: 'post' }
  )

  watch(
    () => route.query.etapa,
    (step) => {
      const normalized = normalizeCampaignStep(step)
      activeStep.value = normalized
      if (step !== normalized) {
        router.replace({ query: { ...route.query, etapa: normalized } })
        return
      }
      focusMainStart()
    },
    { immediate: true }
  )

  onBeforeRouteLeave((to) => {
    if (allowNavigation.value || !isDirty.value) {
      return true
    }

    queueDiscard(to.fullPath)
    return false
  })

  async function loadForRoute({ force = false } = {}) {
    const routeKey = `${route.name}:${route.params.id || ''}`
    if (!force && loadedRouteKey.value === routeKey) {
      return
    }

    invalidateInterpretationRequest({ silent: true })
    loadedRouteKey.value = routeKey
    const requestSequence = ++loadSequence.value
    const nextStep = normalizeCampaignStep(route.query.etapa)
    activeStep.value = nextStep
    state.fieldErrors = {}
    state.generalError = ''
    state.interpretation.error = ''
    loadError.value = ''
    state.isLoading = true

    if (route.query.etapa !== nextStep) {
      await router.replace({ query: { ...route.query, etapa: nextStep } })
    }

    if (!isEdit.value) {
      resetForm()
      if (currentStepIndex.value > 0) {
        await router.replace({ query: { ...route.query, etapa: 'proposta' } })
      }
      state.isLoading = false
      return
    }

    if (isDemo.value) {
      const demoCampaign = campaignDemo.get(route.params.id)
      if (!demoCampaign) {
        loadError.value = 'Esta campanha demonstrativa não está disponível.'
      } else {
        state.campaignId = demoCampaign.id
        setFormFromResponse(demoCampaign)
      }
      state.isLoading = false
      return
    }

    try {
      const campaign = await campaignService.get(route.params.id)
      if (requestSequence !== loadSequence.value) {
        return
      }
      state.campaignId = campaign.id
      setFormFromResponse(campaign)
      if (currentStepIndex.value > 0 && !form.taxaPercentual) {
        state.generalError = 'Revise a taxa da regra antes de avançar para esta etapa.'
        await goToStep('proposta')
      }
    } catch (error) {
      if (requestSequence === loadSequence.value) {
        loadError.value = normalizeCampaignError(error).message
      }
    } finally {
      if (requestSequence === loadSequence.value) {
        state.isLoading = false
      }
    }
  }

  function resetForm() {
    Object.assign(form, createEmptyCampaignForm())
    state.campaignId = null
    state.persistedState = null
    state.persistedRecord = null
    state.interpretation = createInterpretationState()
    state.demo = createDemoState()
    state.persistedSnapshot = createSnapshot()
  }

  function setFormFromResponse(campaign, { resetDemo = false } = {}) {
    Object.assign(form, campaignResponseToForm(campaign))
    state.campaignId = campaign?.id ?? null
    state.persistedState = campaign?.estado ?? null
    state.persistedRecord = campaign ?? null
    state.interpretation = createInterpretationState()
    if (resetDemo) state.demo = createDemoState()
    state.persistedSnapshot = createSnapshot()
  }

  function updateField(field, value) {
    if (!(field in form)) {
      return
    }
    form[field] = value
    if (!state.interpretation.manualFields.includes(field)) {
      state.interpretation.manualFields.push(field)
    }
    if (!state.interpretation.dirtyFields.includes(field)) {
      state.interpretation.dirtyFields.push(field)
    }
    state.fieldErrors = { ...state.fieldErrors, [field]: undefined }
    state.generalError = ''
    state.interpretation.error = ''
  }

  function updateDemoField(field, value) {
    if (field in state.demo) {
      state.demo[field] = value
    }
  }

  async function goToStep(step) {
    const normalized = normalizeCampaignStep(step)
    if (state.interpretation.isProcessing && normalized !== 'proposta' && normalized !== 'interpretacao') {
      state.interpretation.error = 'Aguarde a interpretação terminar antes de continuar.'
      return false
    }

    if (normalized === 'interpretacao' && !form.textoOriginal.trim()) {
      state.fieldErrors = { ...state.fieldErrors, textoOriginal: 'Informe o texto da proposta para abrir a interpretação.' }
      await router.push({ query: { ...route.query, etapa: 'proposta' } })
      await nextTick()
      document.querySelector('#campaign-original-text')?.focus()
      return false
    }

    if ((normalized === 'simulacao' || normalized === 'revisao') && (!form.titulo.trim() || !form.textoOriginal.trim())) {
      state.fieldErrors = validateCampaignForm(form)
      await router.push({ query: { ...route.query, etapa: 'proposta' } })
      await nextTick()
      focusFirstError()
      return false
    }

    if ((normalized === 'simulacao' || normalized === 'revisao') && !form.taxaPercentual) {
      state.generalError = 'Revise a taxa da regra antes de continuar.'
      await router.push({ query: { ...route.query, etapa: 'interpretacao' } })
      await nextTick()
      document.querySelector('#campaign-rate')?.focus()
      return false
    }

    state.generalError = ''
    state.interpretation.error = ''
    await router.push({ query: { ...route.query, etapa: normalized } })
    return true
  }

  async function interpretProposal() {
    if (state.interpretation.isProcessing) return false

    const originalText = String(form.textoOriginal ?? '')
    if (!originalText.trim()) {
      state.fieldErrors = { ...state.fieldErrors, textoOriginal: 'Informe o texto da proposta para interpretar.' }
      await router.push({ query: { ...route.query, etapa: 'proposta' } })
      await nextTick()
      document.querySelector('#campaign-original-text')?.focus()
      return false
    }

    state.generalError = ''
    state.interpretation.error = ''
    invalidateInterpretationRequest({ silent: true })
    const requestId = ++interpretationSequence
    const controller = new AbortController()
    activeInterpretationController = controller
    const context = buildInterpretationContext({ onlyExplicit: true })
    const manualFields = [...state.interpretation.manualFields]
    const previousSuggestions = [...state.interpretation.suggestedFields]

    state.interpretation = {
      ...state.interpretation,
      status: 'processing',
      isProcessing: true,
      requestId,
      requestRouteName: route.name,
      requestRouteId: route.params.id || null,
      sourceText: state.interpretation.sourceText,
      requestContext: context,
      error: ''
    }
    state.fieldErrors = { ...state.fieldErrors, textoOriginal: undefined }

    try {
      const result = isDemo.value
        ? createDemoInterpretationResult(form)
        : await campaignInterpretationService.interpret({ texto: originalText, contexto: context }, { signal: controller.signal })

      if (!isCurrentInterpretationRequest(requestId, originalText, context)) {
        markStaleInterpretation(requestId, originalText)
        return false
      }

      const normalized = normalizeInterpretationResult(result)
      if (!normalized.valid) {
        throw createInterpretationFlowError(normalized.message)
      }

      const applied = applyInterpretationToForm(form, normalized, {
        sourceText: originalText,
        currentSourceText: form.textoOriginal,
        manualFields,
        suggestedFields: previousSuggestions
      })

      if (!applied.applied) {
        if (applied.reason === 'stale-source') {
          markStaleInterpretation(requestId, originalText)
          return false
        }
        throw createInterpretationFlowError(applied.message || 'Não foi possível aplicar a resposta da interpretação.')
      }

      Object.assign(form, applied.form)
      state.interpretation = {
        ...state.interpretation,
        status: normalized.pending.length ? 'pending' : 'interpreted',
        isProcessing: false,
        source: isDemo.value ? 'demo' : 'real',
        sourceText: originalText,
        requestContext: context,
        lastResponse: result,
        manualFields,
        dirtyFields: manualFields,
        suggestedFields: applied.suggestedFields,
        preservedFields: applied.preservedFields,
        pending: normalized.pending,
        confidence: normalized.confidence,
        error: ''
      }
      await router.push({ query: { ...route.query, etapa: 'interpretacao' } })
      notifications.success(isDemo.value ? 'Interpretação demonstrativa aplicada' : 'Proposta interpretada', isDemo.value ? 'Revise os campos fictícios antes de continuar.' : 'Revise os campos sugeridos antes de salvar a campanha.')
      return true
    } catch (error) {
      if (!isCurrentInterpretationRequest(requestId, originalText, context)) {
        return false
      }
      const normalizedError = normalizeInterpretationError(error)
      if (normalizedError.kind === 'canceled') {
        state.interpretation.isProcessing = false
        state.interpretation.status = state.interpretation.sourceText ? 'stale' : 'manual'
        return false
      }
      state.interpretation.isProcessing = false
      state.interpretation.status = 'error'
      state.interpretation.error = normalizedError.message
      return false
    } finally {
      if (activeInterpretationController === controller) {
        activeInterpretationController = null
      }
    }
  }

  function cancelInterpretation() {
    if (!state.interpretation.isProcessing) return
    invalidateInterpretationRequest({ silent: true })
    state.interpretation.isProcessing = false
    state.interpretation.status = state.interpretation.sourceText ? 'stale' : 'manual'
  }

  async function saveDraft({ returnToCampaigns = true } = {}) {
    if (state.isSaving || state.isApproving) return false
    if (!(await validateBeforePersistence())) return false

    state.isSaving = true
    state.generalError = ''
    state.interpretation.error = ''
    try {
      const currentState = state.campaignId && state.persistedState && state.persistedState !== 'DRAFT'
        ? state.persistedState
        : 'DRAFT'
      const campaign = await persistCampaign({ desiredState: currentState })
      notifications.success('Rascunho salvo', isDemo.value ? 'Apenas o exemplo demonstrativo foi atualizado.' : 'A campanha foi persistida como rascunho.')
      if (returnToCampaigns) await leaveAfterPersistence()
      return campaign
    } catch (error) {
      handlePersistenceError(error)
      return false
    } finally {
      state.isSaving = false
    }
  }

  async function approveCampaign() {
    if (state.isSaving || state.isApproving) return false
    if (!(await validateBeforePersistence())) return false

    state.isApproving = true
    state.generalError = ''
    state.activationFailed = false
    let draftPersisted = false

    try {
      const draft = await persistCampaign({ desiredState: 'DRAFT' })
      if (!draft?.id) {
        throw createCampaignFlowError('A campanha foi salva, mas o backend não retornou o ID necessário para ativação.')
      }
      draftPersisted = true

      const activeCampaign = isDemo.value
        ? campaignDemo.updateStatus(draft.id, 'ATIVA')
        : await campaignService.updateStatus(draft.id, 'ATIVA')

      if (!activeCampaign?.id) {
        throw createCampaignFlowError('A ativação não retornou uma campanha válida.')
      }

      setFormFromResponse(activeCampaign)
      notifications.success('Campanha aprovada', 'A campanha foi ativada com sucesso.')
      await leaveAfterPersistence()
      return activeCampaign
    } catch (error) {
      if (draftPersisted) {
        state.activationFailed = true
        state.generalError = 'A campanha foi salva como rascunho, mas não foi possível ativá-la. Corrija a conexão e tente novamente.'
      } else {
        handlePersistenceError(error)
      }
      return false
    } finally {
      state.isApproving = false
    }
  }

  async function validateBeforePersistence() {
    state.fieldErrors = validateCampaignForm(form)
    if (!hasValidationErrors(state.fieldErrors)) return true

    state.generalError = 'Revise os campos destacados antes de continuar.'
    await focusValidationError()
    return false
  }

  async function focusValidationError() {
    const firstError = Object.keys(state.fieldErrors).find((field) => state.fieldErrors[field])
    const target = ERROR_TARGETS[firstError] || ERROR_TARGETS.titulo
    await router.push({ query: { ...route.query, etapa: target.step } })
    await nextTick()
    document.querySelector(target.selector)?.focus()
  }

  async function persistCampaign({ desiredState }) {
    const payload = campaignFormToPayload(form, { estado: desiredState })
    const campaign = isDemo.value
      ? state.campaignId
        ? campaignDemo.update(state.campaignId, payload)
        : campaignDemo.create(payload)
      : state.campaignId
        ? await campaignService.update(state.campaignId, payload)
        : await campaignService.create(payload)

    if (!campaign?.id) {
      throw createCampaignFlowError('A operação foi concluída, mas o backend não retornou o ID da campanha. Verifique a listagem antes de tentar novamente.')
    }

    setFormFromResponse(campaign)
    return campaign
  }

  function handlePersistenceError(error) {
    const normalized = normalizeCampaignError(error)
    state.fieldErrors = mapCampaignFieldErrors(normalized.fieldErrors)
    state.generalError = normalized.message
  }

  async function leaveAfterPersistence() {
    allowNavigation.value = true
    try {
      await router.push('/campanhas')
    } finally {
      allowNavigation.value = false
    }
  }

  function interpretationIsStale() {
    if (!state.interpretation.sourceText) return false
    if (state.interpretation.sourceText !== form.textoOriginal) return true

    const currentContext = buildInterpretationContext({ onlyExplicit: true })
    return ['ano_referencia', 'canal_padrao'].some((key) =>
      state.interpretation.manualFields.some((field) => (key === 'ano_referencia' ? ['dataInicio', 'dataFim'].includes(field) : field === 'canal')) &&
      currentContext[key] !== state.interpretation.requestContext[key]
    )
  }

  function buildInterpretationContext({ onlyExplicit = false } = {}) {
    const context = {}
    const referenceDate = validDate(form.dataInicio) ? form.dataInicio : validDate(form.dataFim) ? form.dataFim : null
    const datesAreExplicit = state.interpretation.manualFields.includes('dataInicio') || state.interpretation.manualFields.includes('dataFim')
    if (referenceDate && (!onlyExplicit || datesAreExplicit)) {
      context.ano_referencia = Number(referenceDate.slice(0, 4))
    }

    if (state.interpretation.manualFields.includes('canal') && form.canal && form.canal !== 'TODOS') {
      context.canal_padrao = form.canal
    }

    return context
  }

  function isCurrentInterpretationRequest(requestId, originalText, context) {
    return componentActive &&
      requestId === interpretationSequence &&
      state.interpretation.requestId === requestId &&
      route.name === state.interpretation.requestRouteName &&
      (route.params.id || null) === state.interpretation.requestRouteId &&
      String(form.textoOriginal ?? '') === originalText &&
      JSON.stringify(buildInterpretationContext({ onlyExplicit: true })) === JSON.stringify(context)
  }

  function markStaleInterpretation(requestId, originalText) {
    if (state.interpretation.requestId !== requestId) return
    state.interpretation.isProcessing = false
    state.interpretation.status = state.interpretation.sourceText ? 'stale' : 'manual'
    state.interpretation.error = state.interpretation.sourceText
      ? 'A resposta foi ignorada porque o texto ou o contexto mudou. Interprete novamente para atualizar as sugestões.'
      : `A resposta foi ignorada porque o texto mudou após a solicitação (${originalText.length} caracteres).`
  }

  function invalidateInterpretationRequest({ silent = false } = {}) {
    interpretationSequence += 1
    activeInterpretationController?.abort()
    activeInterpretationController = null
    if (!silent && state.interpretation.isProcessing) {
      state.interpretation.isProcessing = false
      state.interpretation.status = state.interpretation.sourceText ? 'stale' : 'manual'
    }
  }

  function requestLeave(target) {
    if (!isDirty.value) {
      navigateWithPermission(target)
      return
    }
    queueDiscard(typeof target === 'string' ? target : target.fullPath)
  }

  function queueDiscard(target) {
    pendingNavigation.value = target
    state.discardDialogOpen = true
  }

  function cancelDiscard() {
    state.discardDialogOpen = false
    pendingNavigation.value = null
  }

  async function confirmDiscard() {
    const target = pendingNavigation.value || '/campanhas'
    state.discardDialogOpen = false
    pendingNavigation.value = null
    invalidateInterpretationRequest({ silent: true })
    resetForm()
    await navigateWithPermission(target)
  }

  async function navigateWithPermission(target) {
    allowNavigation.value = true
    try {
      await router.push(target)
    } finally {
      allowNavigation.value = false
    }
  }

  function handleBeforeUnload(event) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  function focusMainStart() {
    nextTick(() => document.querySelector('[data-campaign-main]')?.focus())
  }

  function focusFirstError() {
    const firstError = Object.keys(state.fieldErrors).find((field) => state.fieldErrors[field])
    const target = ERROR_TARGETS[firstError]
    if (target) document.querySelector(target.selector)?.focus()
  }

  function createSnapshot() {
    return JSON.stringify({ form: { ...form }, demo: { ...state.demo } })
  }

  return {
    form,
    state,
    activeStep,
    loadError,
    isDemo,
    isEdit,
    isPersisted,
    isDirty,
    canApprove,
    campaignTitle,
    currentStepIndex,
    goToStep,
    interpretProposal,
    cancelInterpretation,
    saveDraft,
    approveCampaign,
    updateField,
    updateDemoField,
    interpretationIsStale,
    requestLeave,
    confirmDiscard,
    cancelDiscard,
    resetForm,
    reload: () => loadForRoute({ force: true })
  }
}

function createDemoState() {
  return {
    budget: '',
    bonus: 100,
    simulationVariant: 'base',
    simulationHasRun: false
  }
}

function createInterpretationState() {
  return {
    status: 'manual',
    isProcessing: false,
    requestId: 0,
    requestRouteName: null,
    requestRouteId: null,
    source: null,
    sourceText: null,
    requestContext: {},
    lastResponse: null,
    manualFields: [],
    dirtyFields: [],
    suggestedFields: [],
    preservedFields: [],
    pending: [],
    confidence: null,
    error: ''
  }
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const [year, month, day] = String(value).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function createDemoInterpretationResult(form) {
  return {
    canal: form.canal || null,
    codMarca: form.codMarca || 10,
    descrMarca: form.descrMarca || 'Aurora',
    descriCargo: form.descriCargo || 'Vendedores',
    taxa: form.taxaPercentual ? Number(String(form.taxaPercentual).replace(',', '.')) / 100 : 0.03,
    dataInicio: form.dataInicio || null,
    dataFim: form.dataFim || null,
    confianca: null,
    pendencias: []
  }
}

function createCampaignFlowError(message) {
  const error = new Error(message)
  error.code = 'CAMPAIGN_FLOW'
  return error
}

function createInterpretationFlowError(message) {
  const error = new Error(message)
  error.code = 'INTERPRETATION_FLOW'
  return error
}
