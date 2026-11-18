<template>
  <section class="space-y-6" aria-labelledby="report-colaboradores-heading">
    <!-- Barra de Filtros e Busca Rápida -->
    <div class="rounded-2xl border border-sage-border bg-white p-5 shadow-sm sm:p-6 space-y-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 id="report-colaboradores-heading" class="text-xl font-extrabold tracking-tight text-brand-dark flex items-center gap-2">
            <Users class="h-5 w-5 text-brand" aria-hidden="true" />
            <span>Relatório Consolidado por Colaborador</span>
          </h3>
          <p class="mt-1 text-xs text-sage-muted">
            Apuração individual de vendas, comissões apuradas e montante líquido a pagar.
          </p>
        </div>

        <!-- Métricas Rápidas dos Filtrados -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="rounded-xl bg-sage-light px-3.5 py-2">
            <span class="block text-[10px] font-bold uppercase tracking-wider text-sage-muted">Colaboradores</span>
            <span class="text-sm font-extrabold text-brand-dark">{{ filteredItems.length }}</span>
          </div>
          <div class="rounded-xl bg-sage-light px-3.5 py-2">
            <span class="block text-[10px] font-bold uppercase tracking-wider text-sage-muted">Vendas Filtradas</span>
            <span class="text-sm font-extrabold text-brand-dark">{{ totalVendasFiltradas }}</span>
          </div>
          <div class="rounded-xl bg-brand/10 px-3.5 py-2 border border-brand/20">
            <span class="block text-[10px] font-bold uppercase tracking-wider text-brand-dark/80">Total a Pagar</span>
            <span class="text-sm font-black text-brand-dark">{{ formatCurrency(totalAPagarFiltrado) }}</span>
          </div>
        </div>
      </div>

      <!-- Controles de Filtro -->
      <div class="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Input de Busca -->
        <div class="relative lg:col-span-2">
          <label for="filter-colab-search" class="sr-only">Buscar por matrícula ou nome</label>
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sage-subtle">
            <Search class="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            id="filter-colab-search"
            v-model="searchTerm"
            type="search"
            autocomplete="off"
            class="focus-ring w-full rounded-xl border border-sage-border-dark bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-brand-dark placeholder:text-sage-muted transition hover:border-brand-dark"
            placeholder="Buscar por matrícula ou nome do colaborador…"
          />
        </div>

        <!-- Filtro por Loja -->
        <div>
          <label for="filter-colab-loja" class="sr-only">Filtrar por loja</label>
          <select
            id="filter-colab-loja"
            v-model="selectedLoja"
            class="focus-ring w-full rounded-xl border border-sage-border-dark bg-white px-3.5 py-2.5 text-xs font-semibold text-brand-dark transition hover:border-brand-dark"
          >
            <option value="">Todas as Lojas</option>
            <option v-for="loja in lojasDisponiveis" :key="loja" :value="loja">
              {{ loja }}
            </option>
          </select>
        </div>

        <!-- Filtro por Cargo -->
        <div>
          <label for="filter-colab-cargo" class="sr-only">Filtrar por cargo</label>
          <select
            id="filter-colab-cargo"
            v-model="selectedCargo"
            class="focus-ring w-full rounded-xl border border-sage-border-dark bg-white px-3.5 py-2.5 text-xs font-semibold text-brand-dark transition hover:border-brand-dark"
          >
            <option value="">Todos os Cargos</option>
            <option v-for="cargo in cargosDisponiveis" :key="cargo" :value="cargo">
              {{ cargo }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabela Consolidada -->
    <div class="rounded-2xl border border-sage-border bg-white shadow-sm overflow-hidden">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="p-8 text-center space-y-3">
        <div class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-dark border-t-transparent" />
        <p class="text-xs font-semibold text-sage-muted">Carregando relatório consolidado por colaborador…</p>
      </div>

      <!-- Estado Vazio -->
      <div v-else-if="!filteredItems.length" class="p-12 text-center space-y-2" role="status">
        <Users class="mx-auto h-8 w-8 text-sage-subtle opacity-60" aria-hidden="true" />
        <p class="text-sm font-extrabold text-brand-dark">Nenhum colaborador encontrado</p>
        <p class="text-xs text-sage-muted">
          {{ items.length ? 'Tente ajustar os filtros de busca, loja ou cargo.' : 'Não há registros consolidados de colaboradores para esta competência.' }}
        </p>
        <button
          v-if="searchTerm || selectedLoja || selectedCargo"
          type="button"
          class="focus-ring mt-3 inline-flex items-center rounded-full border border-sage-border px-4 py-1.5 text-xs font-bold text-brand-dark hover:bg-sage-light"
          @click="resetFilters"
        >
          Limpar filtros
        </button>
      </div>

      <!-- Tabela com Dados -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[880px] text-left text-xs">
          <thead class="bg-sage-pill text-[10px] font-bold uppercase tracking-[0.1em] text-sage-muted border-b border-sage-border">
            <tr>
              <th scope="col" class="px-4 py-3.5">Colaborador / Matrícula</th>
              <th scope="col" class="px-4 py-3.5">Cargo / Loja</th>
              <th scope="col" class="px-4 py-3.5 text-center">Vendas</th>
              <th scope="col" class="px-4 py-3.5 text-right">Faturamento Bruto</th>
              <th scope="col" class="px-4 py-3.5 text-right">Comissão Calculada</th>
              <th scope="col" class="px-4 py-3.5 text-right">Total Bônus</th>
              <th scope="col" class="px-4 py-3.5 text-right font-black text-brand-dark">Total a Pagar</th>
              <th scope="col" class="px-4 py-3.5 text-center">Taxa Média</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light text-sage-subtle">
            <tr
              v-for="item in paginatedItems"
              :key="item.rowKey"
              class="transition hover:bg-sage-light/60"
            >
              <!-- Nome e Matrícula -->
              <td class="px-4 py-3.5 font-bold text-brand-dark whitespace-nowrap">
                <div class="flex items-center gap-2.5">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-light text-[11px] font-black text-brand-dark">
                    {{ item.matricula.replace('MATRIC-', '').slice(-2) }}
                  </span>
                  <div>
                    <span class="block text-xs font-bold text-brand-dark">{{ item.nomeColaborador }}</span>
                    <span class="block text-[10px] font-semibold text-sage-muted">{{ item.matricula }}</span>
                  </div>
                </div>
              </td>

              <!-- Cargo e Loja -->
              <td class="px-4 py-3.5 whitespace-nowrap">
                <span class="block font-bold text-brand-dark">{{ item.cargo }}</span>
                <span class="block text-[10px] text-sage-muted">{{ item.loja }}</span>
              </td>

              <!-- Quantidade de Vendas -->
              <td class="px-4 py-3.5 text-center font-extrabold text-brand-dark whitespace-nowrap">
                {{ item.quantidadeVendas }}
              </td>

              <!-- Faturamento Total -->
              <td class="px-4 py-3.5 text-right font-semibold text-brand-dark whitespace-nowrap">
                {{ formatCurrency(item.valorTotalVendas) }}
              </td>

              <!-- Comissão Apurada -->
              <td class="px-4 py-3.5 text-right font-bold text-brand-dark whitespace-nowrap">
                {{ formatCurrency(item.valorTotalComissao) }}
              </td>

              <!-- Bônus Total -->
              <td class="px-4 py-3.5 text-right font-semibold whitespace-nowrap">
                <span v-if="item.valorTotalBonus > 0" class="text-success-dark font-bold">
                  +{{ formatCurrency(item.valorTotalBonus) }}
                </span>
                <span v-else class="text-sage-muted opacity-60">—</span>
              </td>

              <!-- Total Líquido a Pagar -->
              <td class="px-4 py-3.5 text-right whitespace-nowrap">
                <span v-if="item.valorTotalAPagar != null" class="font-black text-brand-dark text-sm">
                  {{ formatCurrency(item.valorTotalAPagar) }}
                </span>
                <span v-else class="text-sage-muted font-bold" title="Total líquido não informado">—</span>
              </td>

              <!-- Taxa Média Efetiva -->
              <td class="px-4 py-3.5 text-center whitespace-nowrap">
                <span class="inline-block rounded-md bg-sage-light px-2 py-0.5 text-[11px] font-extrabold text-brand-dark">
                  {{ formatPercent(item.taxaMediaEfetiva) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação Client-Side -->
      <div
        v-if="filteredItems.length > pageSize"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-sage-border-light bg-sage-light/40 px-5 py-3.5 text-xs text-sage-muted"
      >
        <span>
          Exibindo <strong class="font-bold text-brand-dark">{{ startRecord }}</strong> a
          <strong class="font-bold text-brand-dark">{{ endRecord }}</strong> de
          <strong class="font-bold text-brand-dark">{{ filteredItems.length }}</strong> colaboradores
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1 rounded-full border border-sage-border bg-white px-3 py-1.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          >
            <ChevronLeft class="h-3.5 w-3.5" aria-hidden="true" />
            <span>Anterior</span>
          </button>
          <span class="px-2 font-bold text-brand-dark">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1 rounded-full border border-sage-border bg-white px-3 py-1.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            <span>Próxima</span>
            <ChevronRight class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Users, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { formatCurrencyPtBr } from '@/services/currencyUtils'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const searchTerm = ref('')
const selectedLoja = ref('')
const selectedCargo = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// Reset pagination when any filter changes
watch([searchTerm, selectedLoja, selectedCargo], () => {
  currentPage.value = 1
})

const lojasDisponiveis = computed(() => {
  const set = new Set()
  for (const item of props.items) {
    if (item.loja) set.add(item.loja)
  }
  return Array.from(set).sort()
})

const cargosDisponiveis = computed(() => {
  const set = new Set()
  for (const item of props.items) {
    if (item.cargo) set.add(item.cargo)
  }
  return Array.from(set).sort()
})

const filteredItems = computed(() => {
  const search = searchTerm.value.trim().toLowerCase()
  const loja = selectedLoja.value
  const cargo = selectedCargo.value

  return props.items.filter((item) => {
    if (loja && item.loja !== loja) return false
    if (cargo && item.cargo !== cargo) return false
    if (!search) return true

    const name = String(item.nomeColaborador || '').toLowerCase()
    const mat = String(item.matricula || '').toLowerCase()
    return name.includes(search) || mat.includes(search)
  })
})

const totalVendasFiltradas = computed(() =>
  filteredItems.value.reduce((acc, curr) => acc + (curr.quantidadeVendas || 0), 0)
)

const totalAPagarFiltrado = computed(() =>
  filteredItems.value.reduce((acc, curr) => acc + (curr.valorTotalAPagar != null ? curr.valorTotalAPagar : curr.valorTotalComissao || 0), 0)
)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value))
)

const startRecord = computed(() =>
  filteredItems.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
)

const endRecord = computed(() =>
  Math.min(currentPage.value * pageSize.value, filteredItems.value.length)
)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

function resetFilters() {
  searchTerm.value = ''
  selectedLoja.value = ''
  selectedCargo.value = ''
  currentPage.value = 1
}

function formatCurrency(val) {
  return formatCurrencyPtBr(val, true)
}

function formatPercent(val) {
  if (val == null || !Number.isFinite(Number(val))) return '—'
  const pct = Number(val) * 100
  return `${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
}
</script>
