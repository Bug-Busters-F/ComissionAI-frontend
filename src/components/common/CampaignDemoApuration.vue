<template>
  <div class="space-y-5">
    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="apuration-period-heading">
        <h2 id="apuration-period-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Dados do período demonstrativo</h2>
        <p class="mt-2 text-sm text-sage-muted">A apuração por competência será conectada em uma entrega futura.</p>
        <label for="demo-competence" class="campaign-label mt-7">Competência</label>
        <select id="demo-competence" class="campaign-control" disabled><option>Novembro 2025</option></select>
        <div class="mt-5 rounded-2xl border border-sage-border-light p-5">
          <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-lg font-extrabold text-brand-dark">Novembro 2025</h3><p class="mt-1 text-sm text-sage-muted">RH, Vendas e Comissão · versão demonstrativa</p></div><span class="rounded-full bg-success-surface px-3 py-1.5 text-xs font-bold text-success-text">Exemplo</span></div>
          <p class="mt-6 text-sm font-semibold text-brand-dark">5 funcionários · 2 lojas · Aurora</p>
        </div>
        <button type="button" class="focus-ring mt-5 rounded-full bg-sage-pill px-5 py-3 text-sm font-bold text-brand-dark" @click="$emit('memory')">Abrir memória demonstrativa</button>
      </section>
      <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="apuration-input-heading">
        <h2 id="apuration-input-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">O que entraria no cálculo</h2>
        <ol class="mt-6 space-y-5"><li v-for="(item, index) in inputs" :key="item" class="flex gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-pill text-sm font-bold text-brand-dark">{{ index + 1 }}</span><span class="pt-1 text-sm font-bold text-brand-dark">{{ item }}</span></li></ol>
        <p class="mt-6 text-xs leading-5 text-sage-muted">Este painel é demonstrativo e não calcula, aprova, ativa ou lança comissões.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
defineProps({ campaignTitle: { type: String, default: '' } })
defineEmits(['memory'])
const inputs = ['Vendas reais da competência', 'RH e ocorrências do mesmo mês', 'Taxa e dimensões da regra', 'Vigência da campanha', 'Combinação das regras']
</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none; }
</style>
