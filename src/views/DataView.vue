<template>
  <div class="space-y-7">
    <PageHeader title="Base de dados" description="Organize e confira os arquivos de cada competência.">
      <template #action><button type="button" class="focus-ring rounded-full bg-[#9fe870] px-5 py-3 text-sm font-bold">+ Nova competência</button></template>
    </PageHeader>

    <section class="rounded-2xl bg-white p-6 sm:p-7">
      <h2 class="text-xl font-extrabold tracking-[-0.03em]">Uma base completa por mês</h2>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-[#646862]">Cadastre a competência e anexe as três planilhas. Esta tela define o espaço visual para a futura implementação de upload e validação.</p>
    </section>

    <section class="grid gap-5 lg:grid-cols-3" aria-label="Competências disponíveis">
      <article v-for="period in periods" :key="period.name" class="rounded-2xl bg-white p-6">
        <div class="flex items-start justify-between gap-4">
          <div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#646862]">Competência 2025</p><h2 class="mt-2 text-2xl font-extrabold tracking-[-0.04em]">{{ period.name }}</h2></div>
          <StatusBadge :label="period.status" :tone="period.tone" />
        </div>
        <div class="mt-7 space-y-3 text-sm text-[#646862]"><p v-for="base in period.bases" :key="base.label" class="flex items-center justify-between border-b border-[#edf0eb] pb-3"><span class="font-semibold text-[#0e0f0c]">{{ base.label }}</span><span>{{ base.value }}</span></p></div>
        <button type="button" class="focus-ring mt-6 text-sm font-semibold underline underline-offset-4">Visualizar competência →</button>
      </article>
    </section>
  </div>
</template>

<script setup>
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const periods = [
  { name: 'Dezembro', status: 'Carga rejeitada', tone: 'warning', bases: [{ label: 'RH', value: 'Não importado' }, { label: 'Vendas', value: 'Não importado' }, { label: 'Comissão', value: 'Não importado' }] },
  { name: 'Novembro', status: 'Disponível', tone: 'success', bases: [{ label: 'RH', value: '5 registros' }, { label: 'Vendas', value: '5 registros' }, { label: 'Comissão', value: '1 taxa' }] },
  { name: 'Outubro', status: 'Disponível', tone: 'success', bases: [{ label: 'RH', value: '5 registros' }, { label: 'Vendas', value: '5 registros' }, { label: 'Comissão', value: '1 taxa' }] }
]
</script>
