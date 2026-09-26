<template>
  <div class="space-y-5">
    <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="simulation-heading">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="simulation-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Simulação</h2>
          <p class="mt-2 text-sm text-sage-muted">Explore cenários para revisar o impacto da proposta antes de concluir.</p>
        </div>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="premise in CAMPAIGN_SIMULATION_PREMISES" :key="premise.label" class="rounded-2xl bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ premise.label }}</p>
          <p class="mt-2 text-sm font-extrabold text-brand-dark">{{ premise.value }}</p>
        </article>
      </div>

      <div class="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ fixture.label }}</p>
          <p class="mt-1 text-sm text-sage-muted">Atualize os cenários ou aplique uma sugestão antes da revisão final.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2.5 text-sm font-bold text-brand-dark" @click="simulate">{{ demo.simulationHasRun ? 'Atualizar simulação' : 'Simular campanha' }}</button>
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2.5 text-sm font-bold text-brand-dark" @click="applySuggestion">Aplicar sugestão</button>
        </div>
      </div>

      <div class="mt-6 grid gap-4 xl:grid-cols-3">
        <article v-for="scenario in fixture.scenarios" :key="scenario.key" class="rounded-2xl border border-sage-border-light p-5" :class="scenario.key === '100' ? 'ring-2 ring-brand/50' : ''">
          <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ scenario.percentage }} das vendas</p><h3 class="mt-2 text-xl font-extrabold text-brand-dark">{{ scenario.classification }}</h3></div></div>
          <dl class="mt-5 space-y-3 text-sm"><div class="flex justify-between gap-3"><dt class="text-sage-muted">Vendas</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.sales) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Sem proposta</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.withoutProposal) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Com proposta</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.withProposal) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Impacto</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.impact) }}</dd></div></dl>
          <div class="mt-5 border-t border-sage-border-light pt-4"><div class="flex justify-between gap-3 text-sm"><span class="text-sage-muted">Orçamento</span><strong class="text-brand-dark">{{ currency(scenario.budget) }}</strong></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-sage-pill"><div class="h-full rounded-full" :class="scenario.withProposal > scenario.budget ? 'bg-danger' : 'bg-brand'" :style="{ width: `${Math.min(100, usage(scenario))}%` }"></div></div><div class="mt-2 flex justify-between gap-3 text-xs"><span class="text-sage-muted">Utilização {{ percent(usage(scenario)) }}</span><span :class="scenario.withProposal > scenario.budget ? 'font-bold text-danger-dark' : 'text-success-text'">{{ scenario.withProposal > scenario.budget ? 'Orçamento excedido' : 'Dentro do orçamento' }}</span></div></div>
        </article>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CAMPAIGN_SIMULATION_PREMISES, formatSimulationCurrency, formatSimulationPercent, getCampaignSimulationFixture, simulationUsage } from '@/services/campaignSimulation'

const props = defineProps({
  demo: { type: Object, required: true }
})

const emit = defineEmits(['update-demo'])
const fixture = computed(() => getCampaignSimulationFixture(props.demo.simulationVariant))

function simulate() {
  emit('update-demo', 'simulationHasRun', true)
}

function applySuggestion() {
  emit('update-demo', 'simulationVariant', props.demo.simulationVariant === 'adjusted' ? 'base' : 'adjusted')
  emit('update-demo', 'simulationHasRun', true)
}

function currency(value) {
  return formatSimulationCurrency(value)
}

function percent(value) {
  return formatSimulationPercent(value)
}

function usage(scenario) {
  return simulationUsage(scenario)
}
</script>
