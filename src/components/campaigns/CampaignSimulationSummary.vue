<template>
  <div class="mt-6 space-y-5">
    <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-sage-muted">
      <p>Referência: <strong class="text-brand-dark">{{ competence }}</strong></p>
      <p><strong class="text-brand-dark">{{ simulation.totalVendasRecortadas ?? '—' }}</strong> vendas consideradas</p>
      <p>Vigência: <strong class="text-brand-dark">{{ formatPeriodArrow(simulation.dataInicioCampanha, simulation.dataFimCampanha) }}</strong></p>
    </div>
    <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in amounts" :key="item.label" class="min-w-0 rounded-2xl border border-sage-border bg-sage-light p-4">
        <dt class="text-xs font-bold text-sage-muted">{{ item.label }}</dt>
        <dd class="mt-2 break-words text-xl font-extrabold text-brand-dark">{{ money(item.value) }}</dd>
      </div>
    </dl>
    <p v-if="budget" class="rounded-xl p-4 text-sm" :class="budget.dentroDoOrcamento === false ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-dark'">
      Orçamento: <strong>{{ money(budget.orcamentoTeto) }}</strong> ·
      {{ budget.dentroDoOrcamento === false ? 'Acima do orçamento' : budget.dentroDoOrcamento === true ? 'Dentro do orçamento' : 'Enquadramento não informado' }}
      <span v-if="budget.dentroDoOrcamento === true && budget.saldoOrcamento != null"> · Saldo: {{ money(budget.saldoOrcamento) }}</span>
    </p>
    <details class="rounded-xl border border-sage-border p-4">
      <summary class="focus-ring cursor-pointer rounded font-bold text-sm">Ver cenários da simulação</summary>
      <dl class="mt-4 grid gap-3 sm:grid-cols-3">
        <div v-for="item in scenarios" :key="item.key" class="rounded-xl bg-sage-light p-4">
          <dt class="text-sm font-bold">{{ item.key }}% do volume</dt>
          <dd class="mt-2 font-extrabold">{{ money(item.value?.comissaoProjetada) }}</dd>
          <dd v-if="item.value?.enquadramento?.dentroDoOrcamento === false" class="mt-2 text-xs font-semibold text-warning-text">Acima do orçamento</dd>
        </div>
      </dl>
    </details>
    <p class="text-xs leading-5 text-sage-muted">Valores projetados para a vigência da campanha a partir da competência de referência, considerando o mês comercial de 30 dias. Os resultados reais podem variar conforme as vendas do período.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatPeriodArrow } from '@/services/campaignMappers'
const props = defineProps({ simulation: { type: Object, required: true } })
const competence = computed(() => /^\d{4}-\d{2}$/.test(props.simulation.competencia || '') ? props.simulation.competencia.split('-').reverse().join('/') : 'Não informada')
const budget = computed(() => props.simulation.cenario100?.enquadramento)
const amounts = computed(() => {
  const scenario = props.simulation.cenario100 || {}
  const proposed = scenario.comissaoProjetada
  const delta = scenario.deltaProjetado
  return [
    { label: 'Comissão sem campanha · projeção', value: proposed != null && delta != null ? Number(proposed) - Number(delta) : null },
    { label: 'Comissão com campanha · projeção', value: proposed },
    { label: 'Impacto adicional estimado', value: delta },
    { label: 'Comissão na referência · sem projeção', value: scenario.totalComissaoProposta }
  ]
})
const scenarios = computed(() => ['80', '120', '150'].map(key => ({ key, value: props.simulation[`cenario${key}`] })))
function money(value) {
  return value != null && value !== '' && Number.isFinite(Number(value)) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)) : 'Não informado'
}
</script>
