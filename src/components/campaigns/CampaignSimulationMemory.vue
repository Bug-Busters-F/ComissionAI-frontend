<template>
  <div class="space-y-5">
    <ul v-if="row.impedimentos?.length" class="space-y-2"><li v-for="(issue, index) in row.impedimentos" :key="index" class="rounded-xl bg-warning-bg p-3 text-sm text-warning-text">{{ userFacingText(issue) }}</li></ul>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="item in summary" :key="item.label" class="rounded-2xl p-4" :class="item.highlight ? 'bg-brand-dark text-white' : 'bg-sage-light text-brand-dark'">
        <p class="text-xs" :class="item.highlight ? 'text-sage-border' : 'text-sage-muted'">{{ item.label }}</p>
        <p class="mt-2 break-words text-lg font-extrabold" :class="item.highlight ? 'text-brand' : ''">{{ money(item.value) }}</p>
      </div>
    </div>
    <section aria-label="Fontes utilizadas no cálculo" class="rounded-2xl border border-sage-border p-4 sm:p-5">
      <h4 class="text-base font-extrabold">De onde vêm os valores</h4>
      <dl class="mt-4 grid gap-4 sm:grid-cols-2">
        <div><dt class="text-xs font-bold text-sage-muted">Valor e data da venda</dt><dd class="mt-1 text-sm font-semibold">{{ memory.saleSource }}</dd><dd class="mt-1 text-xs text-sage-muted">{{ memory.date ? formatDate(memory.date) : 'Data não informada' }} · Referência {{ memory.competence || 'não informada' }}</dd></div>
        <div><dt class="text-xs font-bold text-sage-muted">Público considerado</dt><dd class="mt-1 text-sm font-semibold">Loja {{ row.loja }} · {{ row.marca }} · {{ row.cargo }}</dd><dd class="mt-1 text-xs text-sage-muted">{{ memory.audienceSource }}</dd></div>
        <div><dt class="text-xs font-bold text-sage-muted">Taxa sem a campanha</dt><dd class="mt-1 text-sm font-semibold">{{ percent(memory.baseRate) }}</dd><dd class="mt-1 text-xs text-sage-muted">{{ memory.baseSource }}</dd></div>
        <div><dt class="text-xs font-bold text-sage-muted">Taxa aplicada nesta venda</dt><dd class="mt-1 text-sm font-semibold">{{ percent(memory.rate) }} · {{ memory.appliedSource }}</dd><dd v-if="memory.rule" class="mt-1 text-xs text-sage-muted">{{ memory.rule }}</dd><dd v-if="memory.eligibility" class="mt-1 text-xs text-sage-muted">{{ memory.eligibility }}</dd></div>
      </dl>
    </section>
    <section class="rounded-2xl border border-sage-border bg-sage-light p-4 sm:p-5">
      <h4 class="text-base font-extrabold">Como a comissão é formada</h4>
      <p class="mt-3 text-sm">Valor da venda <strong>{{ money(row.valorVenda) }}</strong> × taxa de <strong>{{ percent(memory.rate) }}</strong><template v-if="commissionPart != null"> = <strong>{{ money(commissionPart) }}</strong></template>.</p>
      <p v-if="memory.bonusPercentAmount != null && memory.bonusFixedAmount != null && Number(memory.bonusPercentAmount) === 0 && Number(memory.bonusFixedAmount) === 0" class="mt-2 text-xs text-sage-muted">Esta venda não tem bônus adicionais.</p>
      <dl class="mt-3 space-y-2 text-sm">
        <div v-if="memory.bonusPercentAmount != null && Number(memory.bonusPercentAmount) !== 0" class="flex justify-between gap-3"><dt>Bônus percentual calculado</dt><dd class="font-bold">{{ money(memory.bonusPercentAmount) }}</dd></div>
        <div v-if="memory.bonusFixedAmount != null && Number(memory.bonusFixedAmount) !== 0" class="flex justify-between gap-3"><dt>Bônus fixo</dt><dd class="font-bold">{{ money(memory.bonusFixedAmount) }}</dd></div>
        <div class="flex justify-between gap-3 border-t border-sage-border pt-3"><dt>Total da comissão com a campanha</dt><dd class="font-extrabold">{{ money(row.comissaoProposta) }}</dd></div>
      </dl>
      <p class="mt-3 text-xs leading-5 text-sage-muted">{{ memory.rounding }}</p>
    </section>
    <section v-if="memory.scenarios.length" class="overflow-hidden rounded-2xl border border-sage-border">
      <h4 class="p-4 text-base font-extrabold">O que muda nos outros cenários</h4>
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><caption class="sr-only">Valores desta venda nos cenários de volume</caption><thead class="bg-sage-light text-xs text-sage-muted"><tr><th class="p-3">Volume</th><th class="p-3">Venda</th><th class="p-3">Taxa</th><th class="p-3">Comissão</th></tr></thead><tbody class="divide-y divide-sage-border-light"><tr v-for="scenario in memory.scenarios" :key="scenario.key"><th class="p-3">{{ scenario.key }}%<span v-if="scenario.changedRange" class="block text-xs font-normal text-warning-text">Faixa alterada</span></th><td class="whitespace-nowrap p-3">{{ money(scenario.value) }}</td><td class="p-3">{{ percent(scenario.rate) }}</td><td class="whitespace-nowrap p-3 font-bold">{{ money(scenario.commission) }}</td></tr></tbody></table></div>
    </section>
    <p v-if="memory.factor != null" class="rounded-xl bg-sage-light p-4 text-xs leading-5 text-sage-muted">Os valores desta venda pertencem ao histórico da competência. No resumo da campanha, a projeção considera {{ memory.duration }} dias e aplica o fator {{ memory.factor }} sobre os totais, com mês comercial de 30 dias.</p>
    <details v-if="memory.explanation" class="rounded-xl border border-sage-border p-4 text-sm"><summary class="focus-ring cursor-pointer rounded font-bold">Explicação detalhada</summary><p class="mt-3 whitespace-pre-wrap break-words leading-6 text-sage-subtle">{{ memory.explanation }}</p></details>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { userFacingText } from '@/services/userFacingText'
import { simulationMemory } from '@/services/campaignSimulationMemory'
const props = defineProps({ row: { type: Object, required: true }, simulation: { type: Object, default: () => ({}) } })
const memory = computed(() => simulationMemory(props.row, props.simulation))
const commissionPart = computed(() => memory.value.bonusPercentAmount != null && memory.value.bonusFixedAmount != null && props.row.comissaoProposta != null ? Number(props.row.comissaoProposta) - Number(memory.value.bonusPercentAmount) - Number(memory.value.bonusFixedAmount) : null)
const summary = computed(() => [{ label: 'Valor da venda', value: props.row.valorVenda }, { label: 'Sem a campanha', value: props.row.comissaoBase }, { label: 'Com a campanha', value: props.row.comissaoProposta }, { label: 'Diferença', value: props.row.diferenca, highlight: true }])
const money = (v) => v == null ? 'Não informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))
const percent = (v) => v == null ? 'Não informada' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(Number(v)) + '%'
const formatDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v
</script>
