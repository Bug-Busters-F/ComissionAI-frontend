<template>
  <section class="rounded-[22px] border border-brand-dark bg-brand-dark p-5 text-white sm:p-6" aria-labelledby="campaign-impact-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="campaign-impact-heading" class="text-xl font-extrabold text-brand">Impacto da campanha</h2>
      <span v-if="impact" class="rounded-full border border-sage-muted bg-brand-dark-hover px-3 py-1 text-xs text-sage-light">Simulação aceita · {{ impact.competencia }}</span>
    </div>
    <p v-if="!impact" class="mt-4 text-sm leading-6 text-sage-border">Não há uma simulação aceita e confirmada para os campos atuais. Simule a versão salva e registre o aceite para consultar o impacto.</p>
    <template v-else>
      <p class="mt-3 text-sm text-sage-border">Comparação de {{ impact.totals.totalVendasConsideradas }} vendas do público da campanha com a comissão contratual da competência de referência.</p>
      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <div v-for="metric in historical" :key="metric.label" class="rounded-2xl border border-sage-muted/40 bg-brand-dark-hover p-4">
          <p class="text-xs text-sage-border">{{ metric.label }}</p><p class="mt-2 text-2xl font-extrabold" :class="metric.highlight ? 'text-brand' : ''">{{ money(metric.value) }}</p>
        </div>
      </div>
      <div class="mt-5 rounded-2xl border border-sage-muted/40 p-4">
        <p class="text-xs font-bold uppercase tracking-wider text-brand">Projeção para a vigência</p>
        <p class="mt-2 text-sm text-sage-border">{{ impact.totals.duracaoCampanhaDias }} dias · fator {{ impact.totals.fatorDuracaoTexto }}. Estimativa baseada na referência, sujeita ao volume de vendas.</p>
        <dl class="mt-4 grid gap-4 sm:grid-cols-3"><div v-for="metric in projected" :key="metric.label"><dt class="text-xs text-sage-border">{{ metric.label }}</dt><dd class="mt-1 text-lg font-bold text-brand">{{ money(metric.value) }}</dd></div></dl>
      </div>
      <p class="mt-4 break-all text-xs text-sage-border">Protocolo: {{ impact.protocolo }}. Valores da simulação confirmada.</p>
    </template>
  </section>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ impact: { type: Object, default: null } })
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
const historical = computed(() => props.impact ? [
  { label: 'Comissão base na competência', value: props.impact.totals.historico.comissaoBase },
  { label: 'Comissão com as regras propostas', value: props.impact.totals.historico.comissaoProposta },
  { label: 'Diferença na competência', value: props.impact.totals.historico.diferenca, highlight: true }
] : [])
const projected = computed(() => props.impact ? [
  { label: 'Comissão base projetada', value: props.impact.totals.projetado.comissaoBase },
  { label: 'Comissão proposta projetada', value: props.impact.totals.projetado.comissaoProposta },
  { label: 'Diferença projetada', value: props.impact.totals.projetado.diferenca }
] : [])
</script>
