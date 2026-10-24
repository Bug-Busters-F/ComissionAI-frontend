<template>
  <CampaignRuleReviewDialog :open="Boolean(review)" :state="dialogState" :index="index" :client-id="review?.targetId || ''" :can-apply="integration.canApply()" :stale="Boolean(review) && !integration.reviewSourceCurrent()" :confirm-label="split ? 'Confirmar divisão' : 'OK'" description="Confira os valores antes de substituir esta regra. As demais regras da campanha serão preservadas." @cancel="integration.cancel" @closed="restoreFocus" @text="integration.state.text = $event" @reinterpret="integration.reinterpretRule(review.targetId, { reviewRetry: true })" @correct="integration.correct" @confirm="$emit('confirm')">
    <template v-if="!split" #before-comparison>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p v-if="!changedFields.length" class="text-sm text-sage-muted">Nenhum campo foi alterado pela interpretação. Confira o texto e as pendências da proposta.</p>
        <button type="button" class="focus-ring rounded text-xs font-bold text-sage-subtle underline underline-offset-4" @click="showAllFields = !showAllFields">{{ showAllFields ? 'Mostrar somente alterações' : 'Ver todos os campos' }}</button>
      </div>
    </template>
    <template v-if="split" #comparison>
      <p class="rounded-xl bg-warning-bg p-3 text-sm leading-6 text-warning-text">Este texto originou {{ review.after.propostas.length }} regras. Confirmar substituirá somente a regra {{ index + 1 }} pelas propostas abaixo, na mesma posição. Você poderá corrigir os campos depois.</p>
      <p v-if="review.before.propostas[0].camposManuais.length" class="text-xs font-bold text-warning-text">A regra atual contém ajustes manuais. Confirmar a divisão autoriza sua substituição.</p>
      <h3 class="pt-2 text-sm font-bold">Regra atual</h3>
      <CampaignProposalReviewSummary :campaign="review.before" :validation="beforeValidation" hide-campaign-summary collapsible />
      <h3 class="pt-2 text-sm font-bold">Novas regras propostas</h3>
      <CampaignProposalReviewSummary :campaign="review.after" :validation="afterValidation" hide-campaign-summary collapsible />
    </template>
    <template v-if="!split" #after-comparison>
      <details class="rounded-xl border border-sage-border p-3 text-sm">
        <summary class="focus-ring cursor-pointer rounded font-bold">Detalhes da proposta</summary>
        <CampaignProposalReviewSummary class="mt-3" :campaign="review.after" :validation="afterValidation" hide-campaign-summary />
      </details>
    </template>
  </CampaignRuleReviewDialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import CampaignRuleReviewDialog from './CampaignRuleReviewDialog.vue'
import CampaignProposalReviewSummary from './CampaignProposalReviewSummary.vue'
import { PROPOSAL_FIELD_NAMES } from '@/services/campaignProposalModel'
import { validateCampaignProposalSet } from '@/services/campaignProposalValidation'
import { proposalDisplayPendings } from '@/services/campaignProposalFormatting'

const props = defineProps({ integration: { type: Object, required: true }, index: { type: Number, default: 0 } })
defineEmits(['confirm'])
const review = computed(() => props.integration.state.review?.kind === 'rule' ? props.integration.state.review : null)
const split = computed(() => Boolean(review.value && review.value.after.propostas.length > 1))
const showAllFields = ref(false)
const beforeValidation = computed(() => review.value ? validateCampaignProposalSet(review.value.before) : {})
const afterValidation = computed(() => review.value ? validateCampaignProposalSet(review.value.after) : {})
const changedFields = computed(() => review.value && !split.value ? PROPOSAL_FIELD_NAMES.filter((field) =>
  review.value.before.propostas[0].campos[field] !== review.value.initialFields[field] || review.value.correctedFields.includes(field)) : [])
const dialogState = computed(() => {
  const current = review.value
  const proposal = current?.after.propostas[0]
  const fields = showAllFields.value ? PROPOSAL_FIELD_NAMES : changedFields.value
  return {
    text: props.integration.state.text, sentText: current?.text || '', loading: props.integration.state.busy,
    error: props.integration.state.error,
    original: current?.before.propostas[0] || { campos: {}, camposManuais: [] },
    proposed: proposal?.campos || {}, corrected: current?.correctedFields || [],
    result: current && !props.integration.state.busy && !props.integration.state.error ? {
      campos: split.value ? {} : Object.fromEntries(fields.map((field) => [field, proposal.campos[field]])),
      pendencias: split.value ? [] : proposalDisplayPendings(afterValidation.value, proposal.clientId)
    } : null
  }
})
let previousFocus = null
let previousCardId = null
watch(review, (value, previous) => {
  showAllFields.value = false
  if (value && !previous) {
    previousFocus = document.activeElement
    previousCardId = 'proposal-card-' + encodeURIComponent(value.targetId)
  }
})
async function restoreFocus() {
  await nextTick()
  const target = previousFocus?.isConnected ? previousFocus : document.getElementById(previousCardId) || document.querySelector('[data-campaign-main]')
  target?.focus?.()
}
</script>
