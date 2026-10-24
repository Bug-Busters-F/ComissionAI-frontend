<template>
  <div class="space-y-5">
    <section class="rounded-[22px] border border-warning-border bg-warning-bg p-5 sm:p-6" aria-labelledby="simulation-unavailable-heading">
      <h2 id="simulation-unavailable-heading" class="text-xl font-extrabold text-warning-text">Simulação ainda não disponível para esta campanha</h2>
      <p class="mt-2 text-sm leading-6 text-warning-text">Os campos passaram pela verificação local. As verificações disponíveis são apresentadas por regra. Esta etapa não executa cálculo financeiro nem confirma resultados.</p>
      <p class="mt-3 text-sm font-bold text-warning-text">{{ snapshot.propostas.length }} regras mantidas no resumo desta campanha.</p>
    </section>
    <CampaignProposalReviewSummary :campaign="campaign" :validation="validation" />
    <div class="rounded-2xl border border-sage-border bg-white p-4 text-sm leading-6 text-sage-muted">
      Esta etapa não salva, simula, aceita nem ativa uma campanha. Os dados ficam em memória enquanto esta página permanecer aberta.
    </div>
  </div>
</template>

<script setup>
import CampaignProposalReviewSummary from './CampaignProposalReviewSummary.vue'

defineProps({
  campaign: { type: Object, required: true },
  validation: { type: Object, required: true },
  snapshot: { type: Object, required: true },
  canRunSimulation: { type: Boolean, default: false }
})
</script>
