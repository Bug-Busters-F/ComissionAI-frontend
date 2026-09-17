<template>
  <div class="space-y-7">
    <PageHeader title="Base de dados" description="Organize e confira os arquivos de cada competência.">
      <template #action>
        <button
          type="button"
          @click="store.openUploadModal('RH', 'Dezembro')"
          class="focus-ring rounded-full bg-[#9fe870] px-5 py-3 text-sm font-bold"
        >
          + Nova competência
        </button>
      </template>
    </PageHeader>

    <section class="rounded-2xl border border-[#eadca9] bg-[#fff7d9] p-6 sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.12em] text-[#8c6e1e]">Atenção aos dados</p>
      <h2 class="mt-3 text-xl font-extrabold tracking-[-0.03em] text-[#0e0f0c]">Uma base completa por mês</h2>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-[#646862]">
        Cadastre a competência e anexe as três planilhas. Esta tela define o espaço visual para a validação e upload das bases.
      </p>
    </section>

    <section class="grid gap-5 lg:grid-cols-3" aria-label="Competências disponíveis">
      <article v-for="period in store.competencias" :key="period.name" class="rounded-2xl bg-white p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#646862]">Competência 2025</p>
            <h2 class="mt-2 text-2xl font-extrabold tracking-[-0.04em]">{{ period.name }}</h2>
          </div>
          <StatusBadge :label="period.status" :tone="period.tone" />
        </div>
        <div class="mt-7 space-y-3 text-sm text-[#646862]">
          <p v-for="base in period.bases" :key="base.label" class="flex items-center justify-between border-b border-[#edf0eb] pb-3">
            <span class="font-semibold text-[#0e0f0c]">{{ base.label }}</span>
            <button
              type="button"
              @click="store.openUploadModal(base.tipo, period.name)"
              class="focus-ring text-sm hover:underline hover:text-[#0e0f0c]"
              title="Importar ou visualizar planilha para esta base"
            >
              {{ base.value }}
            </button>
          </p>
        </div>
        <button
          type="button"
          @click="store.openUploadModal('RH', period.name)"
          class="focus-ring mt-6 text-sm font-semibold underline underline-offset-4"
        >
          Visualizar competência →
        </button>
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
