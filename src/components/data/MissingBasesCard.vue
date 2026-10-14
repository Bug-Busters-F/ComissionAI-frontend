<template>
  <section
    v-if="groups.length"
    class="rounded-[22px] border border-warning-border bg-white p-6 shadow-sm sm:p-7"
    aria-labelledby="missing-bases-title"
    role="alert"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3.5">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning-bg text-warning-dark">
          <ShieldAlert class="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="missing-bases-title" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">
              Bloqueio de Cobertura: Bases de Comissão Ausentes
            </h2>
            <StatusBadge label="Bloqueio Financeiro Ativo" tone="warning" />
          </div>
          <p class="mt-1 text-sm text-sage-muted">
            Foram identificadas vendas sem regra ativa nem taxa padrão contratual aplicável em <code class="rounded bg-sage-light px-1.5 py-0.5 text-xs font-semibold text-brand-dark">tb_basecomiss</code>.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border-dark bg-white px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isProcessing"
          @click="openComissModalForCompetence(competenceKey)"
        >
          <UploadCloud class="h-4 w-4" aria-hidden="true" />
          <span>Importar base (COMISS)</span>
        </button>
        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isProcessing"
          @click="$emit('recalculate')"
        >
          <RefreshCw :class="['h-4 w-4', isProcessing ? 'animate-spin' : '']" aria-hidden="true" />
          <span>{{ isProcessing ? 'Recalculando…' : 'Tentar novamente após importação' }}</span>
        </button>
      </div>
    </div>

    <!-- Resumo dos impactos retidos -->
    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl bg-warning-bg/60 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.1em] text-warning-dark/80">Combinações sem base</p>
        <p class="mt-1 text-2xl font-extrabold text-warning-dark">{{ groups.length }}</p>
      </div>
      <div class="rounded-2xl bg-warning-bg/60 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.1em] text-warning-dark/80">Vendas impactadas</p>
        <p class="mt-1 text-2xl font-extrabold text-warning-dark">{{ totalVendasImpactadas }}</p>
      </div>
      <div class="rounded-2xl bg-warning-bg/60 p-4">
        <p class="text-xs font-bold uppercase tracking-[0.1em] text-warning-dark/80">Montante retido (protegido)</p>
        <p class="mt-1 text-2xl font-extrabold text-warning-dark">{{ formatCurrency(totalValorRetido) }}</p>
      </div>
    </div>

    <!-- Tabela consolidada de bases ausentes -->
    <div class="mt-6 overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
          <tr>
            <th class="rounded-l-xl px-4 py-3">Competência</th>
            <th class="px-4 py-3">Marca</th>
            <th class="px-4 py-3">Cargo</th>
            <th class="px-4 py-3 text-right">Vendas</th>
            <th class="px-4 py-3 text-right">Valor Retido</th>
            <th class="px-4 py-3">Documento Necessário</th>
            <th class="rounded-r-xl px-4 py-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sage-border-light">
          <tr v-for="group in groups" :key="group.key" class="hover:bg-sage-light/40">
            <td class="px-4 py-4 font-semibold text-brand-dark">
              {{ group.competencia }}
            </td>
            <td class="px-4 py-4 font-bold text-brand-dark">
              {{ group.marca }}
            </td>
            <td class="px-4 py-4 text-sage-subtle">
              {{ group.cargo }}
            </td>
            <td class="px-4 py-4 text-right font-semibold text-brand-dark">
              {{ group.totalVendas }}
            </td>
            <td class="px-4 py-4 text-right font-extrabold text-warning-dark">
              {{ formatCurrency(group.valorTotal) }}
            </td>
            <td class="px-4 py-4 text-xs font-medium text-sage-muted">
              {{ group.documentoNecessario }}
            </td>
            <td class="px-4 py-4 text-right">
              <button
                type="button"
                class="focus-ring inline-flex items-center gap-1.5 rounded-full border border-sage-border-dark px-3 py-1.5 text-xs font-bold text-brand-dark transition hover:bg-white"
                @click="openComissModalForCompetence(group.competenciaKey || competenceKey)"
              >
                <UploadCloud class="h-3.5 w-3.5" aria-hidden="true" />
                <span>Importar COMISS</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Nota de Integridade e Compliance -->
    <div class="mt-6 flex items-start gap-3 rounded-2xl border border-sage-border-light bg-sage-light p-4 text-xs leading-5 text-sage-muted">
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-warning-dark" aria-hidden="true" />
      <div>
        <strong class="font-bold text-brand-dark">Nota de Integridade Financeira:</strong>
        Nenhuma taxa fictícia foi adotada ou estimada para as vendas sem base cadastrada. Para garantir o compliance e a precisão contábil, estas transações permanecem protegidas com comissão zerada até a importação oficial da tabela de comissões com a vigência correspondente.
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle, RefreshCw, ShieldAlert, UploadCloud } from 'lucide-vue-next'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useDataStore } from '@/stores/dataStore'

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  },
  competenceKey: {
    type: String,
    default: ''
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
})

defineEmits(['recalculate', 'import-comiss'])

const dataStore = useDataStore()

const totalVendasImpactadas = computed(() =>
  props.groups.reduce((acc, g) => acc + (g.totalVendas || 0), 0)
)

const totalValorRetido = computed(() =>
  props.groups.reduce((acc, g) => acc + (g.valorTotal || 0), 0)
)

function openComissModalForCompetence(competencia) {
  dataStore.openComissModal(competencia || props.competenceKey)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
}
</script>
