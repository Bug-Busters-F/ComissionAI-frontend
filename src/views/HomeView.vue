<template>
  <div class="space-y-7">
    <PageHeader title="Visão geral" description="Acompanhe os dados e o ciclo das suas campanhas.">
      <template #action>
        <RouterLink
          to="/campanhas"
          class="focus-ring inline-flex items-center rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover"
        >
          + Nova campanha
        </RouterLink>
      </template>
    </PageHeader>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
      <article
        v-for="card in metrics"
        :key="card.label"
        :class="['rounded-2xl p-6', card.highlight ? 'bg-brand-dark text-white' : 'bg-white']"
      >
        <p class="text-sm font-medium" :class="card.highlight ? 'text-sage-border' : 'text-sage-muted'">{{ card.label }}</p>
        <p class="mt-6 text-4xl font-extrabold tracking-[-0.05em]" :class="card.highlight ? 'text-brand' : 'text-brand-dark'">{{ card.value }}</p>
        <p class="mt-2 text-xs" :class="card.highlight ? 'text-sage-border' : 'text-sage-muted'">{{ card.detail }}</p>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
      <article class="rounded-2xl bg-white p-6 sm:p-7">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Campanhas recentes</h2>
          <RouterLink to="/campanhas" class="focus-ring text-sm font-semibold underline underline-offset-4 text-brand-dark">Ver todas →</RouterLink>
        </div>
        <div class="mt-6 overflow-x-auto">
          <table class="w-full min-w-[520px] text-left text-sm">
            <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
              <tr>
                <th class="rounded-l-xl px-4 py-3 font-semibold">Campanha</th>
                <th class="px-4 py-3 font-semibold">Situação</th>
                <th class="rounded-r-xl px-4 py-3 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sage-border-light">
              <tr v-for="campaign in campaigns" :key="campaign.name">
                <td class="px-4 py-4">
                  <p class="font-bold text-brand-dark">{{ campaign.name }}</p>
                  <p class="mt-1 text-xs text-sage-muted">{{ campaign.period }}</p>
                </td>
                <td class="px-4 py-4"><StatusBadge :label="campaign.status" :tone="campaign.tone" /></td>
                <td class="px-4 py-4">
                  <RouterLink to="/campanhas" class="focus-ring font-semibold underline underline-offset-4 text-brand-dark">
                    {{ campaign.action }} →
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="rounded-2xl bg-white p-6 sm:p-7">
        <h2 class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Do dado ao resultado</h2>
        <ol class="mt-6 space-y-5">
          <li v-for="step in process" :key="step.number" class="flex gap-4">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-pill text-sm font-bold text-brand-dark">
              {{ step.number }}
            </span>
            <div>
              <p class="text-sm font-bold text-brand-dark">{{ step.title }}</p>
              <p class="mt-1 text-sm text-sage-muted">{{ step.detail }}</p>
            </div>
          </li>
        </ol>
      </article>
    </section>

    <section class="rounded-2xl border border-warning-border bg-warning-bg p-6 sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.12em] text-warning-dark">Atenção aos dados</p>
      <h2 class="mt-3 text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Dezembro tem pendências para revisão</h2>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-sage-muted">A estrutura visual desta área está integrada ao fechamento e validação das bases.</p>
      <RouterLink to="/dados" class="focus-ring mt-5 inline-flex font-semibold underline underline-offset-4 text-brand-dark">Revisar competência →</RouterLink>
    </section>
  </div>
</template>

<script setup>
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const metrics = [
  { label: 'Competências cadastradas', value: '3', detail: 'RH, Vendas e Comissão', highlight: true },
  { label: 'Campanhas', value: '2', detail: 'Propostas e campanhas aprovadas' },
  { label: 'Aguardando apuração', value: '1', detail: 'Campanhas com vigência encerrada' },
  { label: 'Pendências nos dados', value: '3', detail: 'Revisão antes dos cálculos' }
]

const campaigns = [
  { name: 'Incentivo de novembro', period: '01/11/2025 → 30/11/2025', status: 'Finalizada', tone: 'success', action: 'Ver campanha' },
  { name: 'Campanha de dezembro', period: '01/12/2025 → 31/12/2025', status: 'Rascunho', tone: 'warning', action: 'Continuar' }
]

const process = [
  { number: 1, title: 'Prepare as bases mensais', detail: 'Importe RH, Vendas e Comissão.' },
  { number: 2, title: 'Crie e simule a campanha', detail: 'Revise as regras e o orçamento.' },
  { number: 3, title: 'Aprove a proposta', detail: 'Registre a decisão e a versão.' },
  { number: 4, title: 'Apure os resultados', detail: 'Compare a simulação com o realizado.' }
]
</script>
