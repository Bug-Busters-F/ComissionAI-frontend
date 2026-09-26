<template>
  <div class="space-y-6" :class="isDemo ? 'campaign-demo-mode' : ''">
    <div v-if="isDemo" class="flex items-center justify-between rounded-full border border-sage-border bg-white px-4 py-2 text-xs font-bold text-sage-muted" role="status">
      <span>Ambiente demonstrativo</span><span class="rounded-full bg-sage-pill px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-sage-subtle">Nenhum dado real será alterado</span>
    </div>

    <header>
      <button type="button" class="focus-ring rounded font-semibold text-brand-dark" @click="handleBack">← Voltar às campanhas</button>
      <div class="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div><h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">{{ campaignTitle }}</h1><p class="mt-2 text-sm text-sage-muted">Transforme a proposta em uma campanha pronta para revisão.</p></div>
        <StatusBadge :label="isPersisted ? formatCampaignState(state.persistedState) : 'Não salva'" :tone="isPersisted ? campaignStateTone(state.persistedState) : 'neutral'" />
      </div>
    </header>

    <CampaignStepNav :steps="CAMPAIGN_STEPS" :current-step="activeStep" :current-step-number="currentStepIndex + 1" @select="goToStep" />

    <main ref="mainContent" data-campaign-main tabindex="-1" class="outline-none">
      <div v-if="state.isLoading" class="rounded-[22px] bg-white px-6 py-14 text-center text-sm text-sage-muted" role="status">Carregando campanha…</div>
      <section v-else-if="loadError" class="rounded-[22px] border border-danger/30 bg-danger-bg p-6 sm:p-8" role="alert">
        <h2 class="text-xl font-extrabold text-danger-dark">Não foi possível abrir esta campanha</h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-danger-dark/80">{{ loadError }}</p>
        <div class="mt-5 flex flex-wrap gap-3"><button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white" @click="reload">Tentar novamente</button><RouterLink to="/campanhas" class="focus-ring rounded-full border border-danger/30 px-5 py-3 text-sm font-bold text-danger-dark">Voltar para campanhas</RouterLink></div>
      </section>
      <template v-else>
        <CampaignProposalStep v-if="activeStep === 'proposta'" :form="form" :errors="state.fieldErrors" :demo="state.demo" @update="updateField" @update-demo="updateDemoField" />
        <CampaignInterpretationStep v-else-if="activeStep === 'interpretacao'" :form="form" :errors="state.fieldErrors" :interpretation="state.interpretation" :stale="interpretationIsStale()" @update="updateField" @apply-example="applyExampleInterpretation" />
        <CampaignSimulationStep v-else-if="activeStep === 'simulacao'" :campaign-title="campaignTitle" :demo="state.demo" @update-demo="updateDemoField" @edit-manually="goToStep('interpretacao')" @continue-review="goToStep('revisao')" />
        <CampaignReviewStep v-else :form="form" :is-demo="isDemo" :persisted-state="state.persistedState" :campaign-id="state.campaignId" :demo="state.demo" @memory="isMemoryOpen = true" @edit-simulation="goToStep('simulacao')" />
      </template>
    </main>

    <p v-if="state.generalError" class="rounded-2xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger-dark" role="alert">{{ state.generalError }}</p>

    <footer v-if="!state.isLoading && !loadError" class="flex flex-col gap-3 border-t border-sage-border pt-5 sm:flex-row sm:items-center sm:justify-between">
      <button v-if="activeStep !== 'proposta'" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="goToStep(CAMPAIGN_STEPS[currentStepIndex - 1].key)">← Voltar</button>
      <span v-else></span>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button v-if="activeStep === 'interpretacao'" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="applyExampleInterpretation">Aplicar interpretação demonstrativa</button>
        <button v-if="activeStep === 'proposta'" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover" @click="goToStep('interpretacao')">Interpretar proposta →</button>
        <button v-else-if="activeStep === 'interpretacao'" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover" @click="goToStep('simulacao')">Ir para simulação →</button>
        <button v-else-if="activeStep === 'simulacao'" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover" @click="goToStep('revisao')">Ir para revisão →</button>
        <template v-else>
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-60" :disabled="state.isSaving || state.isApproving" @click="requestLeave('/campanhas')">Cancelar</button>
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-60" :disabled="state.isSaving || state.isApproving" @click="saveDraft({ returnToCampaigns: true })">{{ state.isSaving ? 'Salvando…' : isPersisted ? 'Salvar alterações' : 'Salvar como rascunho' }}</button>
          <button v-if="canApprove" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" :disabled="state.isSaving || state.isApproving" @click="approveCampaign">{{ state.isApproving ? 'Ativando…' : 'Aprovar campanha' }}</button>
        </template>
      </div>
    </footer>
  </div>

  <CampaignDiscardDialog :open="state.discardDialogOpen" :is-new="!isPersisted" @continue="cancelDiscard" @discard="confirmDiscard" />
  <CampaignMemoryDialog :open="isMemoryOpen" @close="isMemoryOpen = false" />
</template>

<script setup>
import { ref } from 'vue'
import CampaignDiscardDialog from '@/components/common/CampaignDiscardDialog.vue'
import CampaignInterpretationStep from '@/components/common/CampaignInterpretationStep.vue'
import CampaignMemoryDialog from '@/components/common/CampaignMemoryDialog.vue'
import CampaignProposalStep from '@/components/common/CampaignProposalStep.vue'
import CampaignReviewStep from '@/components/common/CampaignReviewStep.vue'
import CampaignSimulationStep from '@/components/common/CampaignSimulationStep.vue'
import CampaignStepNav from '@/components/common/CampaignStepNav.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { campaignStateTone, formatCampaignState } from '@/services/campaignMappers'
import { CAMPAIGN_STEPS, useCampaignFlow } from '@/services/useCampaignFlow'

const {
  form,
  state,
  activeStep,
  loadError,
  isDemo,
  isPersisted,
  canApprove,
  campaignTitle,
  currentStepIndex,
  goToStep,
  saveDraft,
  approveCampaign,
  updateField,
  updateDemoField,
  applyExampleInterpretation,
  interpretationIsStale,
  requestLeave,
  confirmDiscard,
  cancelDiscard,
  reload
} = useCampaignFlow()

const isMemoryOpen = ref(false)

function handleBack() {
  requestLeave('/campanhas')
}
</script>
