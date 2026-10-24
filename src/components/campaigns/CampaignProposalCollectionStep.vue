<template>
  <div :class="proposals.length ? 'grid grid-cols-[minmax(0,1fr)_2.75rem] items-start gap-2 sm:gap-4' : ''">
    <div ref="contentElement" class="min-w-0 space-y-5">
    <section class="rounded-[22px] bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Interpretação</h2>
          <p class="mt-2 text-sm leading-6 text-sage-muted">Cada bloco representa uma regra. Corrija as pendências antes de continuar.</p>
        </div>
        <button id="add-proposal-button" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover" @click="$emit('add-proposal')">＋ Adicionar regra</button>
      </div>
      <div class="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Resumo da coleção" role="status" aria-live="polite">
        <div class="rounded-xl bg-sage-light px-4 py-3"><p class="text-xs font-semibold text-sage-muted">Total de regras</p><p class="mt-1 text-xl font-extrabold text-brand-dark">{{ proposals.length }}</p></div>
        <div class="rounded-xl bg-sage-light px-4 py-3"><p class="text-xs font-semibold text-sage-muted">Vigência</p><p class="mt-1 text-sm font-bold leading-6 text-brand-dark">{{ formatCampaignValidity(campaign).replace(' até ', ' → ') }}</p></div>
        <div class="rounded-xl px-4 py-3" :class="validation.blockers.length ? 'bg-danger-bg text-danger-dark' : validation.warnings.length ? 'bg-warning-bg text-warning-text' : 'bg-sage-light text-brand-dark'">
          <p class="text-xs font-semibold">Pendências totais</p>
          <p class="mt-1 text-xl font-extrabold">{{ validation.pending.length }}</p>
          <p class="mt-1 text-xs">{{ validation.blockers.length }} {{ validation.blockers.length === 1 ? 'impeditiva' : 'impeditivas' }} · {{ validation.warnings.length }} {{ validation.warnings.length === 1 ? 'aviso' : 'avisos' }}</p>
        </div>
      </div>
      <div class="mt-4 rounded-xl border border-sage-border bg-white p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <label for="proposal-campaign-description" class="campaign-label">Texto da campanha</label>
          </div>
          <button type="button" class="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" :disabled="interpretation.isProcessing || (provider.mode !== 'api' && !descriptionChanged) || !campaign.textoOriginal.trim() || !provider.capabilities.interpret || Boolean(integration?.state.busy) || Boolean(integration?.state.review)" @click="$emit('interpret')">
            {{ campaignProcessing ? 'Reinterpretando…' : 'Reinterpretar regras' }}
          </button>
        </div>
        <textarea id="proposal-campaign-description" :value="campaign.textoOriginal" rows="5" class="campaign-control campaign-description-control mt-3 resize-y" placeholder="Descreva os públicos, percentuais e condições..." @input="$emit('update-campaign', 'textoOriginal', $event.target.value)" />
        <CampaignRequestStatus v-if="campaignProcessing" class="mt-3" message="Reinterpretando o texto da campanha…" @cancel="cancelCampaignRequest" />
        <p v-if="interpretation.error" class="mt-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger-dark" role="alert">{{ interpretation.error }}</p>
      </div>
    </section>

    <p v-if="provider.mode === 'api' && integration?.state.error" role="alert" class="rounded-xl bg-danger-bg p-3 text-sm text-danger-dark">{{ integration.state.error }}</p>
    <section v-if="!proposals.length" class="rounded-[22px] border border-dashed border-sage-border-dark bg-white px-6 py-12 text-center">
      <h3 class="text-lg font-extrabold text-brand-dark">Nenhuma regra adicionada</h3>
      <p class="mt-2 text-sm text-sage-muted">Adicione um bloco para definir o público, a taxa e os limites da regra.</p>
      <button type="button" class="focus-ring mt-5 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark" @click="$emit('add-proposal')">Adicionar regra</button>
    </section>

    <div v-else class="space-y-5">
      <component :is="provider.mode === 'api' ? CampaignApiRuleEditor : CampaignRuleEditor" v-for="(proposal, index) in proposals" :integration="integration" :key="proposal.clientId" :provider="provider" @apply-reinterpretation="$emit('apply-reinterpretation', $event)" :proposal="proposal" :campaign="campaign" :index="index" :pendencias="proposalDisplayPendings(validation, proposal.clientId)" @update-proposal="(...args) => $emit('update-proposal', ...args)" @request-remove="$emit('request-remove', $event)" @set-all-sales="(...args) => $emit('set-all-sales', ...args)" />
      <button type="button" class="focus-ring w-full rounded-full border border-sage-border-dark bg-white px-5 py-3 text-sm font-bold text-brand-dark" @click="$emit('add-proposal')">＋ Adicionar outra regra</button>
    </div>
    </div>
    <CampaignRuleScrollNav :proposals="proposals" :content-element="contentElement" />
  </div>
</template>

<script setup>
import CampaignApiRuleEditor from './CampaignApiRuleEditor.vue'
import CampaignRequestStatus from './CampaignRequestStatus.vue'
import { computed, ref } from 'vue'
import CampaignRuleEditor from './CampaignRuleEditor.vue'
import CampaignRuleScrollNav from './CampaignRuleScrollNav.vue'
import { formatCampaignValidity, proposalDisplayPendings } from '@/services/campaignProposalFormatting'

const contentElement = ref(null)

const props = defineProps({
  integration: { type: Object, default: null },
  campaign: { type: Object, required: true },
  provider: { type: Object, required: true },
  proposals: { type: Array, required: true },
  validation: { type: Object, required: true },
  interpretation: { type: Object, required: true },
  descriptionChanged: { type: Boolean, default: false }
})
const emit = defineEmits(['apply-reinterpretation', 'add-proposal', 'update-campaign', 'update-proposal', 'request-remove', 'set-all-sales', 'interpret', 'cancel-interpretation'])

const campaignProcessing = computed(() => props.interpretation.isProcessing ||
  (props.provider.mode === 'api' && props.integration?.state.busy && props.integration.state.kind === 'campaign'))

function cancelCampaignRequest() {
  if (props.provider.mode === 'api') props.integration?.cancel()
  else emit('cancel-interpretation')
}

</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted; }
.campaign-description-control:focus { @apply outline-none ring-0 ring-offset-0 border-brand-ring; }
</style>
