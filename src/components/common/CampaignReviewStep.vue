<template>
  <div class="space-y-5">
    <CampaignSummary :title="'Revisão consolidada'" :subtitle="isPersisted ? 'Confira os dados reais e a última situação retornada pelo backend.' : 'Confira os dados reais antes da primeira persistência.'" :badge="stateLabel" :summary-items="summaryItems" :original-text="form.textoOriginal" />

    <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="review-simulation-heading">
      <div><h2 id="review-simulation-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Premissas e cenários</h2><p class="mt-1 text-sm text-sage-muted">Consulte as premissas e os cenários antes de concluir a campanha.</p></div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div v-for="premise in CAMPAIGN_SIMULATION_PREMISES" :key="premise.label" class="rounded-2xl bg-sage-light p-4"><p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ premise.label }}</p><p class="mt-2 text-sm font-extrabold text-brand-dark">{{ premise.value }}</p></div></div>
      <div class="mt-6 grid gap-4 xl:grid-cols-3"><article v-for="scenario in fixture.scenarios" :key="scenario.key" class="rounded-2xl border border-sage-border-light p-5"><div><p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ scenario.percentage }} das vendas</p><h3 class="mt-2 text-lg font-extrabold text-brand-dark">{{ scenario.classification }}</h3></div><dl class="mt-5 space-y-2 text-sm"><div class="flex justify-between gap-3"><dt class="text-sage-muted">Com proposta</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.withProposal) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Sem proposta</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.withoutProposal) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Vendas</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.sales) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Impacto</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.impact) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Orçamento</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.budget) }}</dd></div></dl><p class="mt-4 text-xs text-sage-muted">Utilização: {{ percent(usage(scenario)) }}</p></article></div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CampaignSummary from './CampaignSummary.vue'
import { formatCampaignChannel, formatCampaignState, formatPeriodArrow } from '@/services/campaignMappers'
import { CAMPAIGN_SIMULATION_PREMISES, formatSimulationCurrency, formatSimulationPercent, getCampaignSimulationFixture, simulationUsage } from '@/services/campaignSimulation'

const props = defineProps({
  form: { type: Object, required: true },
  persistedState: { type: String, default: '' },
  campaignId: { type: [String, Number], default: null },
  demo: { type: Object, required: true }
})

const summaryItems = computed(() => [
  { label: 'Canal', value: formatCampaignChannel(props.form.canal) },
  { label: 'Vigência', value: formatPeriodArrow(props.form.dataInicio, props.form.dataFim) },
  { label: 'Regra percentual', value: props.form.taxaPercentual ? `${props.form.taxaPercentual}%` : 'Não informado' },
  { label: 'Marca', value: props.form.descrMarca || 'Não informada' },
  { label: 'Código da marca', value: props.form.codMarca || 'Não informado' },
  { label: 'Código da loja', value: props.form.codLoja || 'Não informado' },
  { label: 'Cargo', value: props.form.descriCargo || 'Não informado' },
  { label: 'Código do cargo', value: props.form.codCargo || 'Não informado' },
  { label: 'Matrícula', value: props.form.matricula || 'Todos' }
])

const fixture = computed(() => getCampaignSimulationFixture(props.demo.simulationVariant))
const isPersisted = computed(() => Boolean(props.campaignId))
const stateLabel = computed(() => props.persistedState ? formatCampaignState(props.persistedState) : 'Não salva')

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
