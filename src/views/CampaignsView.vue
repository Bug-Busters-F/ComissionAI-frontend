<template>
  <div class="space-y-7">
    <PageHeader title="Campanhas" description="Crie propostas, acompanhe aprovações e apure os resultados.">
      <template #action>
        <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover">
          + Nova campanha
        </button>
      </template>
    </PageHeader>

    <section class="rounded-2xl bg-white p-6 sm:p-7">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Campanhas cadastradas</h2>
        <div class="flex gap-3">
          <input
            aria-label="Buscar campanha"
            placeholder="Buscar campanha"
            class="focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none sm:w-56"
          />
          <select
            aria-label="Situação"
            class="focus-ring rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none"
          >
            <option>Todas</option>
            <option>Rascunho</option>
            <option>Aprovada</option>
          </select>
        </div>
      </div>

      <div class="mt-6 overflow-x-auto">
        <table class="w-full min-w-[680px] text-left text-sm">
          <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
            <tr>
              <th class="rounded-l-xl px-4 py-3 font-semibold">Campanha</th>
              <th class="px-4 py-3 font-semibold">Vigência</th>
              <th class="px-4 py-3 font-semibold">Regras</th>
              <th class="rounded-r-xl px-4 py-3 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light">
            <tr v-for="campaign in campaigns" :key="campaign.name">
              <td class="px-4 py-5">
                <p class="font-bold text-brand-dark">{{ campaign.name }}</p>
                <p class="mt-1 text-xs text-sage-muted">{{ campaign.scope }}</p>
              </td>
              <td class="px-4 py-5 text-sage-muted">{{ campaign.period }}</td>
              <td class="px-4 py-5 text-sage-muted">{{ campaign.rules }}</td>
              <td class="px-4 py-5"><StatusBadge :label="campaign.status" :tone="campaign.tone" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const campaigns = [
  { name: 'Incentivo de novembro', scope: 'Todos · Aurora · Vendedores', period: '01/11/2025 até 30/11/2025', rules: '2', status: 'Finalizada', tone: 'success' },
  { name: 'Campanha de dezembro', scope: 'Todos · Aurora · Vendedores', period: '01/12/2025 até 31/12/2025', rules: '2', status: 'Rascunho', tone: 'warning' }
]
</script>
