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

    <CampaignStepNav :steps="steps" :current-step="activeStep" :current-step-number="activeStepIndex + 1" @select="navigateTo" />

    <main data-campaign-main tabindex="-1" class="outline-none">
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
      <CampaignProposalHandoffStep
        v-else-if="activeStep === 'simulacao'"
        :campaign="campaign"
        :validation="validation"
        :snapshot="canonicalSnapshot"
        :can-run-simulation="canRunSimulation"
      />
      <CampaignProposalReviewSummary
        v-else
        :campaign="campaign"
        :validation="validation"
      />
    </main>

    <p v-if="message" class="rounded-2xl border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-6 text-warning-text" role="alert">{{ message }}</p>

    <footer class="grid gap-3 border-t border-sage-border pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <button v-if="activeStep !== 'dados'" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="backOneStep">← Voltar</button>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <template v-if="activeStep === 'dados'">
          <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover" @click="startManualEntry">Continuar para interpretação →</button>
        </template>
        <template v-else-if="activeStep === 'propostas'">
          <button type="button" class="focus-ring whitespace-nowrap rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canAdvanceLocally" :aria-describedby="!canAdvanceLocally ? 'advance-blocked-reason' : undefined" @click="navigateTo('simulacao')">Ir para simulação →</button>
        </template>
        <template v-else-if="activeStep === 'simulacao'">
          <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover" @click="navigateTo('conferencia')">Conferir regras →</button>
        </template>
        <template v-else>
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="navigateTo('simulacao')">Voltar à simulação</button>
        </template>
        <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="requestLeave('/campanhas')">Cancelar</button>
      </div>
      <p v-if="activeStep === 'propostas' && !canAdvanceLocally" id="advance-blocked-reason" class="text-sm font-semibold text-danger-dark sm:col-span-2">
        {{ validation.blockers.length ? 'Corrija ' + validation.blockers.length + (validation.blockers.length === 1 ? ' pendência impeditiva' : ' pendências impeditivas') + ' para continuar.' : 'Adicione ao menos uma regra para continuar.' }}
      </p>
    </footer>

    <CampaignProposalRemoveDialog
      :open="Boolean(pendingRemovalId)"
      :index="pendingRemovalIndex"
      @cancel="cancelRemoveProposal"
      @confirm="confirmRemove"
    />
    <CampaignDiscardDialog :open="discardDialogOpen" :is-new="true" @continue="discardDialogOpen = false" @discard="confirmDiscard" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import CampaignDiscardDialog from '@/components/common/CampaignDiscardDialog.vue'
import CampaignStepNav from '@/components/common/CampaignStepNav.vue'
import CampaignCommonFieldsStep from '@/components/campaigns/CampaignCommonFieldsStep.vue'
import CampaignProposalCollectionStep from '@/components/campaigns/CampaignProposalCollectionStep.vue'
import CampaignProposalHandoffStep from '@/components/campaigns/CampaignProposalHandoffStep.vue'
import CampaignProposalRemoveDialog from '@/components/campaigns/CampaignProposalRemoveDialog.vue'
import CampaignProposalReviewSummary from '@/components/campaigns/CampaignProposalReviewSummary.vue'
import { CAMPAIGN_PROPOSAL_SCENARIOS as demoExamples } from '@/services/campaignProposalFixtures'
import { useCampaignProposalFlow } from '@/services/useCampaignProposalFlow'

const router = useRouter()
const {
  campaign, provider, activeStep, activeStepIndex, steps, message, interpretation,
  validation, commonValidation, commonValidationAttempted, canAdvanceLocally, canRunSimulation,
  canonicalSnapshot, isDirty, pendingRemovalId, descriptionChanged, descriptionNeedsConfirmation,
  navigateTo, updateCampaign, confirmRetainProposals, startManualEntry, addProposal: addProposalToCampaign,
  updateProposal, setAllSales, requestRemoveProposal, confirmRemoveProposal, cancelRemoveProposal,
  interpretDescription, cancelInterpretation, applyReinterpretation, loadExample
} = useCampaignProposalFlow()
const demoExample = ref('threeComplete')
async function loadDemoExample() { if (loadExample(demoExample.value)) await navigateTo('propostas') }
const discardDialogOpen = ref(false)
const pendingRoute = ref('/campanhas')
const pendingRemovalIndex = computed(() => campaign.propostas.findIndex((item) => item.clientId === pendingRemovalId.value) + 1)
let allowLeave = false

onBeforeRouteLeave((to) => {
  if (allowLeave || !isDirty.value) return true
  pendingRoute.value = to.fullPath
  discardDialogOpen.value = true
  return false
})

function handleBeforeUnload(event) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))

function requestLeave(path) {
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
