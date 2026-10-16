<template>
  <div class="space-y-5">
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
        <div class="rounded-xl bg-danger-bg px-4 py-3"><p class="text-xs font-semibold text-danger-dark">Com impedimentos</p><p class="mt-1 text-xl font-extrabold text-danger-dark">{{ validation.incompleteProposalIds.length }}</p></div>
        <div class="rounded-xl bg-warning-bg px-4 py-3"><p class="text-xs font-semibold text-warning-text">Avisos</p><p class="mt-1 text-xl font-extrabold text-warning-text">{{ validation.warnings.length }}</p></div>
      </div>
      <div class="mt-4 rounded-xl border border-sage-border bg-white p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <label for="proposal-campaign-description" class="campaign-label">Texto da campanha</label>
            <p class="text-xs leading-5 text-sage-muted">Este é o mesmo texto informado na etapa Proposta. Edite aqui e reinterprete para atualizar as regras.</p>
          </div>
          <button type="button" class="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" :disabled="interpretation.isProcessing || !descriptionChanged" @click="$emit('interpret')">
            {{ interpretation.isProcessing ? 'Reinterpretando…' : 'Reinterpretar regras' }}
          </button>
        </div>
        <textarea id="proposal-campaign-description" :value="campaign.textoOriginal" rows="5" class="campaign-control mt-3 resize-y" placeholder="Descreva os públicos, percentuais e condições..." @input="$emit('update-campaign', 'textoOriginal', $event.target.value)" />
        <div v-if="interpretation.isProcessing" class="mt-3">
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-sm font-bold text-brand-dark" @click="$emit('cancel-interpretation')">Cancelar interpretação</button>
        </div>
        <p v-if="interpretation.error" class="mt-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger-dark" role="alert">{{ interpretation.error }}</p>
      </div>
    </section>

    <section v-if="!proposals.length" class="rounded-[22px] border border-dashed border-sage-border-dark bg-white px-6 py-12 text-center">
      <h3 class="text-lg font-extrabold text-brand-dark">Nenhuma regra adicionada</h3>
      <p class="mt-2 text-sm text-sage-muted">Adicione um bloco para definir o público, a taxa e os limites da regra.</p>
      <button type="button" class="focus-ring mt-5 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark" @click="$emit('add-proposal')">Adicionar regra</button>
    </section>

    <div v-else class="space-y-5">
      <CampaignProposalCard v-for="(proposal, index) in proposals" :key="proposal.clientId" :proposal="proposal" :campaign="campaign" :index="index" :pendencias="validation.byProposal[proposal.clientId] || []" @update-proposal="(...args) => $emit('update-proposal', ...args)" @request-remove="$emit('request-remove', $event)" @set-all-sales="(...args) => $emit('set-all-sales', ...args)" />
      <button type="button" class="focus-ring w-full rounded-full border border-sage-border-dark bg-white px-5 py-3 text-sm font-bold text-brand-dark" @click="$emit('add-proposal')">＋ Adicionar outra regra</button>
    </div>
  </div>
</template>

<script setup>
import CampaignProposalCard from './CampaignProposalCard.vue'

defineProps({
  campaign: { type: Object, required: true },
  proposals: { type: Array, required: true },
  validation: { type: Object, required: true },
  interpretation: { type: Object, required: true },
  descriptionChanged: { type: Boolean, default: false }
})
defineEmits(['add-proposal', 'update-campaign', 'update-proposal', 'request-remove', 'set-all-sales', 'interpret', 'cancel-interpretation'])

</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted; }
</style>
