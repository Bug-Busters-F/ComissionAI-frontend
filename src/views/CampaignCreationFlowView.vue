<template>
  <div class="space-y-6">
    <header>
      <button type="button" class="focus-ring rounded font-semibold text-brand-dark" @click="requestLeave('/campanhas')">← Voltar às campanhas</button>
      <div class="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">{{ campaign.titulo.trim() || 'Nova campanha' }}</h1>
          <p class="mt-2 text-sm text-sage-muted">Informe os dados da campanha e configure cada regra.</p>
        </div>
        <span v-if="provider.mode === 'demo'" class="rounded-full bg-warning-bg px-3 py-1 text-xs font-bold text-warning-text">Demonstração — dados fictícios</span>
      </div>
    </header>

    <section v-if="provider.mode === 'demo'" class="flex flex-wrap items-end gap-3 rounded-2xl border border-warning-border bg-warning-bg p-4">
      <div class="min-w-0 flex-1">
        <label for="proposal-demo-example" class="block text-xs font-bold text-warning-text">Carregar campanha demonstrativa (substitui os dados após confirmação)</label>
        <select id="proposal-demo-example" v-model="demoExample" class="focus-ring mt-2 w-full rounded-xl border border-warning-border bg-white p-3 text-sm">
          <option v-for="(example, key) in demoExamples" :key="key" :value="key">{{ example.label }}</option>
        </select>
      </div>
      <button type="button" class="focus-ring rounded-full border border-warning-border bg-white px-4 py-3 text-sm font-bold" @click="loadDemoExample">Carregar exemplo</button>
    </section>

    <section v-if="persistence.versaoVigente" class="rounded-2xl border border-sage-border bg-white p-5 text-sm">
      <p class="font-bold">Versão vigente {{ persistence.versaoVigente }}<span v-if="persistence.editingPublished"> · Proposta {{ persistence.versaoProposta }} baseada na versão {{ persistence.versaoOrigem }}</span></p>
      <p class="mt-2 text-sage-muted">As alterações ficam separadas da versão vigente e dos seus resultados até a publicação. Toda alteração exige nova simulação.</p>
      <button v-if="persistence.editingPublished && !persistence.remoteChanged" type="button" class="focus-ring mt-3 rounded-full border border-danger/30 px-4 py-2 font-bold text-danger-dark hover:bg-danger-bg disabled:opacity-50" :disabled="persistenceBusy" @click="cancelProposalOpen = true">Descartar proposta de alteração</button>
    </section>
    <CampaignStepNav :steps="steps" :current-step="activeStep" :current-step-number="activeStepIndex + 1" :reached-step="reachedStep" @select="navigateTo" />

    <p v-if="persistence.loading" role="status" class="rounded-2xl bg-white p-5 text-sm">Carregando campanha e todas as regras…</p>
    <div v-if="persistence.error" role="alert" class="rounded-2xl bg-danger-bg p-4 text-sm text-danger-dark">
      <p>{{ userFacingText(persistence.error) }}</p>
      <button v-if="persistence.remoteChanged" type="button" class="focus-ring mt-3 rounded font-bold underline" @click="reloadProposalOpen = true">Recarregar proposta atual</button>
      <button v-if="route.params.id && (!persistence.id || persistence.remoteChanged) && !isDirty" type="button" class="mt-3 font-bold underline" @click="lifecycle.load(route.params.id)">Tentar carregar novamente</button>
      <RouterLink v-if="persistence.uncertainCreate" to="/campanhas" class="mt-3 block font-bold underline">Consultar campanhas cadastradas</RouterLink>
    </div>
    <p v-if="persistence.progressError" role="status" class="rounded-2xl bg-warning-bg p-4 text-sm text-warning-text">{{ userFacingText(persistence.progressError) }} <button type="button" class="font-bold underline" @click="lifecycle.recordProgress(activeStepIndex + 1)">Tentar novamente</button></p>
    <p v-if="lifecycle.readOnly.value" class="rounded-xl bg-warning-bg p-4 text-sm text-warning-text">{{ userFacingText(persistence.motivoBloqueioEdicao || (persistence.remoteChanged ? 'A proposta está desatualizada. Consulte a versão atual antes de continuar.' : 'Campanha disponível somente para consulta.')) }}</p>
    <CampaignVersionComparison v-if="activeStep === 'conferencia' && persistence.editingPublished" :published="persistence.published" :campaign="campaign" :proposed-number="persistence.versaoProposta" :source-number="persistence.versaoOrigem" />
    <main data-campaign-main tabindex="-1" class="outline-none">
      <CampaignProposalReviewSummary v-if="lifecycle.readOnly.value" :campaign="campaign" :validation="validation" :show-python="true" :impact="lifecycle.currentSimulation.value && simulation.accepted ? simulation.result : null" />
      <fieldset v-else :disabled="persistenceBusy || Boolean(route.params.id && !persistence.id)" class="min-w-0 border-0 p-0">
      <CampaignCommonFieldsStep
        v-if="activeStep === 'dados'"
        :campaign="campaign"
        :errors="commonValidationAttempted ? commonValidation.errors : {}"
        :description-needs-confirmation="descriptionNeedsConfirmation"
        @update-campaign="updateCampaign"
        @confirm-retain="confirmRetainProposals"
      />
      <CampaignProposalCollectionStep
        v-else-if="activeStep === 'propostas'"
        :campaign="campaign"
        :proposals="campaign.propostas"
        :validation="validation"
        :interpretation="interpretation"
        :provider="provider"
        :integration="integration"
        @apply-reinterpretation="applyReinterpretation"
        :description-changed="descriptionChanged"
        @add-proposal="addProposal"
        @update-campaign="updateCampaign"
        @update-proposal="updateProposal"
        @set-all-sales="setAllSales"
        @request-remove="requestRemove"
        @interpret="interpretDescription"
        @cancel-interpretation="cancelInterpretation"
      />
      <CampaignPersistedSimulationStep
        v-else-if="activeStep === 'simulacao' && provider.mode === 'api'"
        :form="campaign" :simulation="simulation"
        @refresh-competences="lifecycle.loadCompetences"
        @select-competence="lifecycle.selectCompetence"
        @run-simulation="runSimulation"
        @accept-simulation="requestAccept"
        @change-page="lifecycle.changePage"
        @change-page-size="(size) => lifecycle.changePage(1, size)"
        @back-to-rules="navigateTo('propostas')"
      />
      <CampaignProposalHandoffStep v-else-if="activeStep === 'simulacao'" :campaign="campaign" :validation="validation" :snapshot="canonicalSnapshot" :can-run-simulation="false" />
      <CampaignProposalReviewSummary
        v-else
        :show-python="true" :impact="lifecycle.currentSimulation.value && simulation.accepted ? simulation.result : null"
        :campaign="campaign"
        :validation="validation"
      />
      </fieldset>
      <section v-if="activeStep === 'conferencia' && simulation.accepted" class="mt-5 rounded-2xl border border-sage-border bg-white p-5 text-sm">
        <h2 class="text-lg font-extrabold">Simulação aceita</h2>
        <p class="mt-2">Protocolo: {{ simulation.result?.protocolo }} · Competência: {{ simulation.result?.competencia }}</p>
        <p class="mt-1">Responsável: {{ simulation.acceptance?.aceitoPor }} · Aceite: {{ simulation.acceptance?.aceitoEm }}</p>
        <p class="mt-2">{{ userFacingText(persistence.readiness?.mensagem) }}</p>
        <p v-for="(difference, index) in persistence.readiness?.divergencias" :key="index" class="mt-2 text-danger-dark">{{ userFacingText(difference) }}</p>
      </section>
    </main>

    <p v-if="activeStep === 'dados' && integrationState.error" role="alert" class="rounded-xl bg-danger-bg p-3 text-sm text-danger-dark">{{ userFacingText(integrationState.error) }}</p>
    <p class="text-sm text-sage-muted">{{ persistence.id ? `${isDirty ? 'Existem alterações ainda não salvas.' : persistence.editingPublished ? 'Proposta de alteração salva.' : 'Rascunho salvo.'}` : 'Os dados estão somente nesta página e ainda não foram salvos.' }}</p>
    <p v-if="message" class="rounded-2xl border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-6 text-warning-text" role="alert">{{ userFacingText(message) }}</p>

    <footer v-if="!lifecycle.readOnly.value" class="flex flex-col gap-4 border-t border-sage-border pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <CampaignRequestStatus v-if="activeStep === 'dados' && integrationState.busy" class="w-full" message="Interpretando o texto da campanha…" @cancel="integration.cancel" />
      <div class="order-2 flex items-center justify-between gap-3 sm:order-1 sm:justify-start">
        <button v-if="activeStep !== 'dados'" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="backOneStep">← Voltar</button>
        <button type="button" class="focus-ring rounded-full px-5 py-3 text-sm font-semibold text-sage-subtle transition hover:bg-white" @click="requestLeave('/campanhas')">Cancelar</button>
      </div>
      <div class="order-1 grid gap-3 sm:order-2 sm:flex sm:items-center sm:justify-end">
        <button v-if="provider.mode === 'api'" type="button" class="focus-ring rounded-full border border-sage-border-dark bg-white px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-sage-light disabled:opacity-50" :disabled="persistenceBusy || integrationState.busy || Boolean(integrationState.review) || persistence.uncertainCreate || Boolean(route.params.id && !persistence.id)" @click="saveDraft">{{ persistence.saving ? 'Salvando…' : persistence.editingPublished ? 'Salvar proposta' : 'Salvar rascunho' }}</button>
        <template v-if="activeStep === 'dados'">
          <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50" :disabled="persistenceBusy || Boolean(route.params.id && !persistence.id) || !provider.capabilities.interpret || integrationState.busy || Boolean(integrationState.review)" @click="interpretDescription">{{ integrationState.busy ? 'Interpretando…' : 'Interpretar e continuar →' }}</button>
        </template>
        <template v-else-if="activeStep === 'propostas'">
          <button type="button" class="focus-ring whitespace-nowrap rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canAdvanceLocally" :aria-describedby="!canAdvanceLocally ? 'advance-blocked-reason' : undefined" @click="navigateTo('simulacao')">{{ canAdvanceLocally && validation.blockers.length ? 'Verificar correções →' : 'Ir para simulação →' }}</button>
        </template>
        <template v-else-if="activeStep === 'simulacao'">
          <button v-if="provider.mode === 'api' && !simulation.accepted" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50" :disabled="persistenceBusy || integrationState.busy || !lifecycle.currentSimulation.value" @click="requestAccept">Aceitar simulação e continuar →</button>
          <button v-else type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:opacity-50" :disabled="provider.mode === 'api' && !lifecycle.canReview.value" @click="navigateTo('conferencia')">Conferir regras →</button>
        </template>
        <template v-else>
          <button v-if="provider.mode === 'api'" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold transition hover:bg-brand-hover disabled:opacity-50" :disabled="!lifecycle.canActivate.value" @click="persistence.activationOpen = true">{{ persistence.editingPublished ? 'Publicar nova versão' : 'Aprovar e ativar campanha' }}</button>
        </template>
      </div>
      <p v-if="activeStep === 'propostas' && !canAdvanceLocally" id="advance-blocked-reason" class="order-3 w-full text-sm font-semibold text-danger-dark">
        {{ validation.blockers.length ? 'Corrija ' + validation.blockers.length + (validation.blockers.length === 1 ? ' pendência impeditiva' : ' pendências impeditivas') + ' para continuar.' : integrationState.busy || integrationState.review ? 'Conclua ou cancele a solicitação/revisão pendente para continuar.' : 'Adicione ao menos uma regra para continuar.' }}
      </p>
    </footer>

    <CampaignLifecycleDialog :open="persistence.defaultsOpen" title="Salvar com a vigência padrão?" confirm-label="Salvar rascunho" :busy="persistence.saving" @cancel="persistence.defaultsOpen = false" @confirm="saveDraft(true)">
      <p>O texto não forneceu uma vigência comum completa. Se o início estiver ausente, será usada a data de hoje. Se o fim estiver ausente, usará o início mais 30 dias.</p>
      <p class="mt-3 font-bold">O período confirmado será exibido após salvar. As explicações e validações dependentes serão verificadas antes da simulação.</p>
    </CampaignLifecycleDialog>
    <CampaignLifecycleDialog :open="simulation.acceptOpen" title="Aceitar a simulação" confirm-label="Registrar aceite e continuar" :busy="persistence.working" :disabled="!simulation.aceitoPor.trim()" @cancel="simulation.acceptOpen = false" @confirm="acceptSimulation">
      <p>O aceite será registrado para esta campanha e para o protocolo {{ simulation.result?.protocolo }}.</p>
      <label for="simulation-accepted-by" class="mt-4 block font-bold">Responsável pelo aceite *</label>
      <input id="simulation-accepted-by" v-model="simulation.aceitoPor" class="focus-ring mt-2 w-full rounded-xl border border-sage-border p-3" autocomplete="name" :disabled="persistence.working" />
      <label for="simulation-accept-reason" class="mt-4 block font-bold">Observação (opcional)</label>
      <textarea id="simulation-accept-reason" v-model="simulation.motivo" rows="2" class="focus-ring mt-2 w-full rounded-xl border border-sage-border p-3" :disabled="persistence.working" />
      <p v-if="simulation.error" role="alert" class="mt-3 text-danger-dark">{{ userFacingText(simulation.error) }}</p>
    </CampaignLifecycleDialog>
    <CampaignLifecycleDialog :open="persistence.activationOpen" :title="persistence.editingPublished ? 'Publicar esta nova versão?' : 'Aprovar e ativar esta campanha?'" :confirm-label="persistence.editingPublished ? 'Confirmar publicação' : 'Confirmar ativação'" :busy="persistence.working" @cancel="persistence.activationOpen = false" @confirm="activateCampaign">
      <p v-if="persistence.editingPublished" class="mb-3 font-bold">A nova versão substituirá a vigente para todo o período da campanha. As versões anteriores continuarão disponíveis no histórico.</p>
      <p>Serão ativadas as {{ campaign.propostas.length }} regras da versão salva, com a vigência {{ campaign.dataInicio }} a {{ campaign.dataFim }} e o aceite registrado no protocolo {{ simulation.result?.protocolo }}.</p>
    </CampaignLifecycleDialog>
    <CampaignReinterpretConfirmDialog :open="campaignReinterpretationOpen" @cancel="cancelCampaignReinterpretation" @confirm="confirmCampaignReinterpretation" />
    <CampaignApiRuleReviewDialog :integration="integration" :index="Math.max(0, campaign.propostas.findIndex((p) => p.clientId === integrationState.review?.targetId))" @confirm="applyIntegrationReview" />
    <CampaignProposalComparisonDialog :review="integrationState.review?.kind === 'artifacts' ? integrationState.review : null" :can-apply="integration.canApply()" :error="integrationState.error" @cancel="integration.cancel" @confirm="applyIntegrationReview" @correct="integration.correct" />
    <CampaignProposalRemoveDialog
      :open="Boolean(pendingRemovalId)"
      :index="pendingRemovalIndex"
      @cancel="cancelRemoveProposal"
      @confirm="confirmRemove"
    />
    <CampaignVersionHistory v-if="persistence.versaoVigente" :campaign-id="persistence.id" />
    <CampaignLifecycleDialog :open="reloadProposalOpen" title="Recarregar a proposta atual?" confirm-label="Recarregar" :busy="persistence.loading" @cancel="reloadProposalOpen = false" @confirm="reloadProposal">
      <p>O preenchimento local será substituído pela proposta salva mais recente. Copie as alterações que deseja preservar antes de continuar.</p>
    </CampaignLifecycleDialog>
    <CampaignLifecycleDialog :open="cancelProposalOpen" title="Descartar a proposta de alteração?" confirm-label="Descartar proposta" :busy="persistence.working" @cancel="cancelProposalOpen = false" @confirm="cancelSavedProposal">
      <p>As alterações desta proposta, incluindo as já salvas, serão descartadas. A campanha vigente e seus resultados serão preservados.</p>
    </CampaignLifecycleDialog>
    <CampaignDiscardDialog :open="discardDialogOpen" :is-new="!persistence.id" @continue="discardDialogOpen = false" @discard="confirmDiscard" />
  </div>
</template>

<script setup>
import { userFacingText } from '@/services/userFacingText'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter, useRoute } from 'vue-router'
import CampaignVersionComparison from '@/components/campaigns/CampaignVersionComparison.vue'
import CampaignVersionHistory from '@/components/campaigns/CampaignVersionHistory.vue'
import CampaignDiscardDialog from '@/components/common/CampaignDiscardDialog.vue'
import CampaignStepNav from '@/components/common/CampaignStepNav.vue'
import CampaignCommonFieldsStep from '@/components/campaigns/CampaignCommonFieldsStep.vue'
import CampaignProposalCollectionStep from '@/components/campaigns/CampaignProposalCollectionStep.vue'
import CampaignLifecycleDialog from '@/components/campaigns/CampaignLifecycleDialog.vue'
import CampaignPersistedSimulationStep from '@/components/campaigns/CampaignPersistedSimulationStep.vue'
import CampaignProposalHandoffStep from '@/components/campaigns/CampaignProposalHandoffStep.vue'
import CampaignRequestStatus from '@/components/campaigns/CampaignRequestStatus.vue'
import CampaignProposalComparisonDialog from '@/components/campaigns/CampaignProposalComparisonDialog.vue'
import CampaignApiRuleReviewDialog from '@/components/campaigns/CampaignApiRuleReviewDialog.vue'
import CampaignReinterpretConfirmDialog from '@/components/campaigns/CampaignReinterpretConfirmDialog.vue'
import CampaignProposalRemoveDialog from '@/components/campaigns/CampaignProposalRemoveDialog.vue'
import CampaignProposalReviewSummary from '@/components/campaigns/CampaignProposalReviewSummary.vue'
import { CAMPAIGN_PROPOSAL_SCENARIOS as demoExamples } from '@/services/campaignProposalFixtures'
import { useCampaignProposalFlow } from '@/services/useCampaignProposalFlow'
import { useNotificationStore } from '@/stores/notificationStore'
import { createCampaignActionFeedback } from '@/services/campaignActionFeedback'

const router = useRouter()
const route = useRoute()
const {
  campaign, lifecycle, persistence, simulation, persistenceBusy, saveDraft: persistDraft, provider, integration, integrationState, applyIntegrationReview: applyReview, activeStep, activeStepIndex, reachedStep, steps, message, interpretation,
  validation, commonValidation, commonValidationAttempted, canAdvanceLocally, canRunSimulation,
  canonicalSnapshot, isDirty, pendingRemovalId, descriptionChanged, descriptionNeedsConfirmation,
  navigateTo, updateCampaign, confirmRetainProposals, addProposal: addProposalToCampaign,
  updateProposal, setAllSales, requestRemoveProposal, confirmRemoveProposal, cancelRemoveProposal,
  interpretDescription: interpretCampaign, cancelInterpretation, applyReinterpretation, loadExample,
  campaignReinterpretationOpen, confirmCampaignReinterpretation: reinterpretCampaign, cancelCampaignReinterpretation
} = useCampaignProposalFlow()
const feedback = createCampaignActionFeedback(useNotificationStore())
const integrationError = () => integrationState.error || message.value
async function interpretDescription() {
  return feedback('interpret', interpretCampaign, { error: () => campaignReinterpretationOpen.value ? '' : integrationError() })
}
async function confirmCampaignReinterpretation() {
  return feedback('reinterpret', reinterpretCampaign, { error: integrationError })
}
async function applyIntegrationReview() {
  return feedback('apply', applyReview, { error: integrationError })
}
async function runSimulation() {
  return feedback('simulate', () => lifecycle.runSimulation(), { error: () => simulation.error || persistence.error })
}
async function saveDraft(confirmDefaults = false) {
  const confirmed = confirmDefaults === true
  const saved = await feedback(persistence.editingPublished ? 'saveProposal' : 'save', () => persistDraft({ confirmDefaults: confirmed }), {
    error: () => persistence.defaultsOpen ? '' : persistence.error || message.value,
    successMessage: () => persistence.notice
  })
  if (saved && !route.params.id) {
    await router.replace({ name: 'campanha-editar', params: { id: persistence.id }, query: { ...route.query, etapa: activeStep.value } })
  }
}
async function requestAccept() {
  if (simulation.accepted && lifecycle.canReview.value) await navigateTo('conferencia')
  else simulation.acceptOpen = true
}
async function acceptSimulation() {
  if (await feedback('accept', () => lifecycle.accept(), { error: () => simulation.error || persistence.error })) await navigateTo('conferencia')
}
async function activateCampaign() {
  if (await feedback(persistence.editingPublished ? 'publish' : 'activate', () => lifecycle.activate(), { error: () => persistence.error })) await router.push('/campanhas/' + persistence.id)
}
const demoExample = ref('threeComplete')
async function loadDemoExample() { if (loadExample(demoExample.value)) await navigateTo('propostas') }
const discardDialogOpen = ref(false)
const cancelProposalOpen = ref(false)
const reloadProposalOpen = ref(false)
async function reloadProposal() {
  if (await lifecycle.load(persistence.id)) {
    reloadProposalOpen.value = false
    await navigateTo('dados')
  }
}
async function cancelSavedProposal() {
  if (await feedback('discardProposal', () => lifecycle.cancelProposal(), { error: () => persistence.error })) {
    cancelProposalOpen.value = false
    allowLeave = true
    try { await router.push('/campanhas/' + persistence.id) } finally { allowLeave = false }
  }
}
const pendingRoute = ref('/campanhas')
const pendingRemovalIndex = computed(() => campaign.propostas.findIndex((item) => item.clientId === pendingRemovalId.value) + 1)
let allowLeave = false

onBeforeRouteLeave((to) => {
  if (persistenceBusy.value) return false
  if (allowLeave || !isDirty.value) return true
  pendingRoute.value = to.fullPath
  discardDialogOpen.value = true
  return false
})

function handleBeforeUnload(event) {
  if (!isDirty.value && !persistenceBusy.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))

function requestLeave(path) {
  if (persistenceBusy.value) return
  pendingRoute.value = path
  if (!isDirty.value) {
    allowLeave = true
    router.push(path).finally(() => { allowLeave = false })
    return
  }
  discardDialogOpen.value = true
}

async function confirmDiscard() {
  discardDialogOpen.value = false
  allowLeave = true
  try {
    await router.push(pendingRoute.value)
  } finally {
    allowLeave = false
  }
}

async function addProposal() {
  const clientId = addProposalToCampaign()
  await nextTick()
  document.getElementById('proposal-card-' + encodeURIComponent(clientId))?.focus()
}

async function requestRemove(clientId) {
  const focusTarget = requestRemoveProposal(clientId)
  if (!pendingRemovalId.value) await focusAfterRemoval(focusTarget)
}

async function confirmRemove() {
  const focusTarget = confirmRemoveProposal()
  await focusAfterRemoval(focusTarget)
}

async function focusAfterRemoval(clientId) {
  await nextTick()
  if (clientId) document.getElementById('proposal-card-' + encodeURIComponent(clientId))?.focus()
  else document.getElementById('add-proposal-button')?.focus()
}

function backOneStep() {
  const previous = steps[Math.max(0, activeStepIndex.value - 1)]
  if (previous) navigateTo(previous.key)
}
</script>
