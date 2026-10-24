<template>
  <Teleport to="body">
    <dialog ref="dialog" class="comparison-dialog w-[calc(100%-2rem)] max-w-6xl rounded-[22px] bg-white p-0 text-brand-dark shadow-2xl" :aria-labelledby="titleId" @cancel.prevent="$emit('cancel')">
      <div v-if="review" class="max-h-[88dvh] overflow-y-auto p-5 sm:p-7">
        <h2 :id="titleId" class="text-xl font-extrabold">{{ title }}</h2>
        <p class="mt-2 text-sm text-sage-muted">{{ review.kind === 'campaign' ? 'Confira o conjunto atual e o proposto. Confirmar substituirá todas as regras atuais, incluindo valores editados manualmente.' : 'Somente o bloco selecionado será substituído. As demais regras serão preservadas.' }}</p>
        <p v-if="!canApply" role="alert" class="mt-4 rounded-xl bg-warning-bg p-3 text-sm text-warning-text">Os dados mudaram desde a solicitação. Cancele esta revisão e interprete novamente.</p>
        <p v-if="error" role="alert" class="mt-4 rounded-xl bg-danger-bg p-3 text-sm text-danger-dark">{{ error }}</p>
        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <section aria-label="Valores atuais" class="min-w-0 rounded-2xl border border-sage-border p-3">
            <h3 class="p-2 text-lg font-bold">Atual · {{ review.before.propostas.length }} regra(s)</h3>
            <p v-for="p in review.before.propostas.filter((p) => p.camposManuais.length)" :key="p.clientId" class="m-2 rounded-xl bg-warning-bg p-3 text-xs font-bold text-warning-text">Valores editados manualmente: {{ p.camposManuais.map((field) => labels[field]).join(', ') }}. Confirmar autoriza sua substituição.</p>
            <CampaignProposalReviewSummary :collapsible="true" :campaign="review.before" :validation="beforeValidation" />
          </section>
          <section aria-label="Valores propostos" class="min-w-0 rounded-2xl border border-brand p-3">
            <h3 class="p-2 text-lg font-bold">Proposto · {{ review.after.propostas.length }} regra(s)</h3>
            <template v-if="review.kind === 'rule' && review.after.propostas.length === 1">
              <p class="p-2 text-sm text-sage-muted">Os campos abaixo podem ser corrigidos antes da confirmação. Campo vazio propõe remover o valor atual.</p>
              <div v-for="field in fields" :key="field" class="m-2 rounded-xl border border-sage-border p-3">
                <label :for="titleId + field" class="block text-sm font-bold">{{ labels[field] }}</label>
                <p class="mt-1 break-words text-xs text-sage-muted">Atual: {{ display(review.before.propostas[0].campos[field]) }} → Proposto: {{ display(review.after.propostas[0].campos[field]) }}</p>
                <select v-if="booleans.includes(field)" :id="titleId + field" :value="String(review.after.propostas[0].campos[field])" class="focus-ring mt-2 w-full rounded-xl border border-sage-border p-2 text-sm" @change="$emit('correct', field, $event.target.value === 'null' ? null : $event.target.value === 'true')">
                  <option v-if="field !== 'publicoTodasVendas'" value="null">Não informado</option><option value="true">Sim</option><option value="false">Não</option>
                </select>
                <input v-else :id="titleId + field" :value="review.after.propostas[0].campos[field]" type="text" class="focus-ring mt-2 w-full rounded-xl border border-sage-border p-2 text-sm" @input="$emit('correct', field, $event.target.value)" />
              </div>
            </template>
            <p v-if="review.kind === 'rule' && review.after.propostas.length > 1" class="m-2 rounded-xl bg-warning-bg p-3 text-sm text-warning-text">Divisão sugerida: confirmar substituirá o bloco original por todas estas regras, na mesma posição. Você poderá corrigir cada uma depois.</p>
            <CampaignProposalReviewSummary :collapsible="true" :campaign="review.after" :validation="afterValidation" />
          </section>
        </div>
        <footer class="sticky bottom-0 mt-5 flex flex-wrap justify-end gap-3 border-t border-sage-border bg-white py-4">
          <button type="button" autofocus class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold" @click="$emit('cancel')">Cancelar</button>
          <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold disabled:opacity-50" :disabled="!canApply" @click="$emit('confirm')">{{ review.kind === 'campaign' ? 'Aplicar novo conjunto' : review.after.propostas.length > 1 ? 'Confirmar divisão' : 'Aplicar mudanças' }}</button>
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import CampaignProposalReviewSummary from './CampaignProposalReviewSummary.vue'
import { validateCampaignProposalSet } from '@/services/campaignProposalValidation'
import { PROPOSAL_FIELD_NAMES as fields } from '@/services/campaignProposalModel'
import { RULE_FIELD_LABELS as labels, RULE_BOOLEAN_FIELDS as booleans } from '@/services/ruleReinterpretation'
const props = defineProps({ review: { type: Object, default: null }, canApply: Boolean, error: String })
defineEmits(['cancel', 'confirm', 'correct'])
const dialog = ref(null)
const titleId = 'comparison-' + useId()
let previousFocus = null
let previousCardId = null
const title = computed(() => props.review?.kind === 'campaign' ? 'Comparar conjuntos de regras' : props.review?.kind === 'artifacts' ? 'Confirmar taxa recalculada' : 'Revisar reinterpretação do bloco')
const beforeValidation = computed(() => props.review ? validateCampaignProposalSet(props.review.before) : {})
const afterValidation = computed(() => props.review ? validateCampaignProposalSet(props.review.after) : {})
function display(v) { return v === '' || v == null ? 'Sem valor' : typeof v === 'boolean' ? v ? 'Sim' : 'Não' : v }
watch(() => Boolean(props.review), async (open) => {
  if (open) { previousFocus = document.activeElement; previousCardId = previousFocus?.closest?.('article')?.id }
  await nextTick()
  if (open && dialog.value && !dialog.value.open) dialog.value.showModal()
  else if (!open && dialog.value?.open) { dialog.value.close(); (previousFocus?.isConnected ? previousFocus : document.getElementById(previousCardId) || document.querySelector('[data-campaign-main]'))?.focus?.() }
})
onBeforeUnmount(() => dialog.value?.close())
</script>
<style scoped>
.comparison-dialog::backdrop { background: rgb(0 0 0 / 45%); }
</style>
