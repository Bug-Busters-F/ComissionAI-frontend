<template>
  <div class="space-y-7">
    <PageHeader title="Base de dados" description="Organize e feche os ciclos mensais de dados de cada competência.">
      <template #action>
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="store.openComissModal('Dezembro')"
            class="focus-ring rounded-full border border-sage-border-dark bg-white px-4 py-3 text-sm font-semibold text-brand-dark hover:bg-sage-light"
          >
            Tabelas de Comissão
          </button>
          <button
            type="button"
            @click="store.openCicloModal('Dezembro')"
            class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover"
          >
            + Enviar ciclo (RH + Vendas)
          </button>
        </div>
      </template>
    </PageHeader>

    <section class="rounded-2xl border border-warning-border bg-warning-bg p-6 sm:p-7">
      <div class="flex items-center gap-2">
        <span class="rounded bg-warning-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-warning-dark">
          Integridade Relacional
        </span>
      </div>
      <h2 class="mt-2 text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Fechamento do ciclo mensal</h2>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-sage-muted">
        Para a correta apuração e simulação das regras de negócio, as bases de <strong>RH e Vendas devem ser enviadas conjuntamente</strong> para cada competência mensal. A validação cruzada garante que todos os vendedores registrados nas vendas existam no quadro de colaboradores ativos.
      </p>
    </section>

    <section class="grid gap-5 lg:grid-cols-3" aria-label="Competências disponíveis">
      <article
        v-for="period in store.competencias"
        :key="period.name"
        class="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm border border-sage-border-light"
      >
        <div>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-sage-muted">Competência 2025</p>
              <h2 class="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">{{ period.name }}</h2>
            </div>
            <StatusBadge :label="period.status" :tone="period.tone" />
          </div>

          <div class="mt-6 space-y-3 text-sm text-sage-muted">
            <div
              v-for="base in period.bases"
              :key="base.label"
              class="flex items-center justify-between border-b border-sage-border-light pb-3"
            >
              <span class="font-semibold text-brand-dark">{{ base.label }}</span>
              <span
                :class="[
                  'text-xs font-semibold',
                  base.value === 'Pendente' || base.value === 'Não importado'
                    ? 'text-warning'
                    : 'text-success'
                ]"
              >
                {{ base.value }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-7 pt-4 border-t border-sage-border-light flex flex-col gap-2">
          <button
            type="button"
            @click="store.openCicloModal(period.name)"
            class="focus-ring flex items-center justify-between rounded-xl bg-sage-light px-4 py-2.5 text-xs font-bold text-brand-dark hover:bg-sage-border transition"
          >
            <span>{{ period.cicloFechado ? 'Reenviar ciclo (RH + Vendas)' : 'Fechar ciclo (RH + Vendas)' }}</span>
            <span>→</span>
          </button>

          <button
            type="button"
            @click="store.openComissModal(period.name)"
            class="text-left text-[11px] font-semibold text-sage-muted hover:text-brand-dark hover:underline"
          >
            Gerenciar taxas de comissão
          </button>
        </div>
      </article>
    </section>

    <!-- Modal de Upload e Relatório de Validação -->
    <UploadBaseModal />
  </div>
</template>

<script setup>
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import UploadBaseModal from '@/components/data/UploadBaseModal.vue'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()
</script>
