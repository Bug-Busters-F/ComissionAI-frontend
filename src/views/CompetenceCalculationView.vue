<template>
  <div class="space-y-7">
    <PageHeader
      :title="`Cálculo · ${formatCompetenceLabel(competenceKey)}`"
      description="Calcule as comissões das vendas persistidas da competência."
    >
      <template #action>
        <RouterLink to="/dados" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-white">
          ← Dados
        </RouterLink>
      </template>
    </PageHeader>

    <section class="flex flex-col gap-5 rounded-[22px] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Competência selecionada</p>
        <h2 class="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-brand-dark">{{ formatCompetenceCode(competenceKey) }}</h2>
        <p class="mt-2 text-sm text-sage-muted">
          <template v-if="salesQueryState === SALES_QUERY_STATE.SUCCESS">{{ salesCount }} vendas persistidas no período.</template>
          <template v-else-if="salesQueryState === SALES_QUERY_STATE.LOADING">Consultando as vendas persistidas…</template>
          <template v-else-if="salesQueryState === SALES_QUERY_STATE.ERROR">Não foi possível consultar as vendas.</template>
          <template v-else>Competência não validada.</template>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canCalculate"
          @click="handleCalculation"
        >
          <RefreshCw v-if="isCalculating" class="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{{ isCalculating ? (recalculationRequested ? 'Recalculando…' : 'Calculando…') : hasPreviousCalculation ? 'Recalcular comissões' : 'Calcular comissões' }}</span>
        </button>
      </div>
    </section>

    <section v-if="!competenceKey" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Competência inválida</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">Informe uma competência válida no formato MM/AAAA, com mês entre 01 e 12.</p>
    </section>

    <section v-else-if="salesQueryState === SALES_QUERY_STATE.LOADING" class="rounded-2xl border border-sage-border bg-white p-6" role="status" aria-live="polite">
      <div class="flex items-center gap-3">
        <RefreshCw class="h-5 w-5 animate-spin text-sage-muted" aria-hidden="true" />
        <div>
          <h2 class="font-extrabold text-brand-dark">Consultando vendas da competência…</h2>
          <p class="mt-1 text-sm text-sage-muted">Os botões de cálculo serão liberados após a consulta.</p>
        </div>
      </div>
    </section>

    <section v-else-if="salesQueryState === SALES_QUERY_STATE.ERROR" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Não foi possível consultar as vendas</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ salesQueryError }}</p>
      <button type="button" class="focus-ring mt-5 rounded-full bg-danger px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="isCalculating" @click="retrySalesQuery">
        Tentar consultar novamente
      </button>
    </section>

    <section v-else-if="salesQueryState === SALES_QUERY_STATE.SUCCESS && salesCount === 0" class="rounded-2xl border border-sage-border bg-white p-6" role="status">
      <h2 class="text-xl font-extrabold text-brand-dark">Nenhuma venda encontrada</h2>
      <p class="mt-2 text-sm leading-6 text-sage-muted">Não há vendas persistidas para essa competência. O cálculo permanece indisponível.</p>
    </section>

    <p v-if="result" class="rounded-2xl border border-sage-border bg-sage-light px-5 py-4 text-sm leading-6 text-sage-muted">
      {{ result.recalculoExecutado ? 'As regras atuais foram aplicadas ao recálculo desta competência.' : 'Resultados já registrados são reaproveitados pelo servidor quando a competência é executada novamente.' }}
    </p>

    <p v-if="restoredResult" class="rounded-2xl border border-sage-border bg-white px-5 py-4 text-sm leading-6 text-sage-muted" role="status">
      <strong class="text-brand-dark">Resultado da última execução nesta sessão</strong>
      — recebido em {{ formatDateTime(restoredResult.recebidoEm) }}. Esse resultado não garante que as regras e bases atuais já tenham sido aplicadas.
    </p>

    <p v-if="result?.recalculoExecutado && result.totalImpedimentos" class="rounded-2xl border border-warning-border bg-warning-bg px-5 py-4 text-sm leading-6 text-warning-dark" role="status">
      Algumas vendas não foram recalculadas; seus resultados anteriores foram preservados.
    </p>

    <section v-if="isCalculating" class="rounded-[22px] border border-warning-border bg-warning-bg p-6" role="status" aria-live="polite">
      <div class="flex items-center gap-3">
        <RefreshCw class="h-5 w-5 animate-spin text-warning-dark" aria-hidden="true" />
        <div>
          <h2 class="font-extrabold text-brand-dark">{{ recalculationRequested ? 'Recalculando as comissões' : 'Calculando as comissões' }} de {{ formatCompetenceLabel(competenceKey) }}…</h2>
          <p class="mt-1 text-sm text-sage-muted">O processamento está sendo executado no servidor.</p>
        </div>
      </div>
    </section>

    <section v-else-if="anotherCalculationProcessing" class="rounded-[22px] border border-warning-border bg-warning-bg p-6" role="status" aria-live="polite">
      <div class="flex items-center gap-3">
        <RefreshCw class="h-5 w-5 animate-spin text-warning-dark" aria-hidden="true" />
        <div>
          <h2 class="font-extrabold text-brand-dark">Outra competência está sendo processada</h2>
          <p class="mt-1 text-sm text-sage-muted">{{ formatCompetenceLabel(calculationStore.competencia) }} está em processamento. Aguarde a conclusão antes de iniciar outro cálculo.</p>
        </div>
      </div>
    </section>

    <section v-if="calculationErrorMessage" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Não foi possível concluir o cálculo</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ calculationErrorMessage }}</p>
      <div v-if="!isCalculating" class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="focus-ring rounded-full border border-sage-border-dark bg-white px-5 py-3 text-sm font-bold text-brand-dark" @click="consultHistory">
          Consultar histórico
        </button>
        <button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canCalculate" @click="retryLastOperation">
          Tentar novamente
        </button>
      </div>
    </section>

    <p v-if="previousResultAfterFailure" class="rounded-2xl border border-warning-border bg-warning-bg px-5 py-4 text-sm leading-6 text-warning-dark" role="status">
      O resultado exibido é da execução anterior. A tentativa mais recente falhou; consulte o histórico antes de tentar novamente.
    </p>

    <template v-if="result">
      <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="calculation-summary-heading">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="calculation-summary-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Resultado da competência</h2>
            <p class="mt-1 text-sm text-sage-muted">Os totais consideram o retorno integral do cálculo.</p>
          </div>
          <StatusBadge :label="result.totalImpedimentos ? 'Concluído com impedimentos' : 'Concluído'" :tone="result.totalImpedimentos ? 'warning' : 'success'" />
        </div>

        <dl class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div v-for="item in summaryItems" :key="item.label" class="rounded-2xl bg-sage-light p-4">
            <dt class="text-xs font-bold uppercase tracking-[0.1em] text-sage-muted">{{ item.label }}</dt>
            <dd class="mt-2 text-xl font-extrabold text-brand-dark">{{ item.value }}</dd>
          </div>
        </dl>

        <p v-if="result.totalImpedimentos" class="mt-5 rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-6 text-warning-dark">
          O total de comissões considera somente as vendas calculadas com sucesso.
        </p>
      </section>

      <section v-if="result.resultados.length" class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="calculated-sales-heading">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="calculated-sales-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Vendas calculadas</h2>
            <p class="mt-1 text-sm text-sage-muted">Valores e taxas retornados pelo motor de cálculo.</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <label class="sr-only" for="calculation-registration-filter">Filtrar por matrícula</label>
            <input id="calculation-registration-filter" v-model="matriculaFilter" type="search" class="campaign-control max-w-[220px]" placeholder="Filtrar matrícula" />
            <label class="sr-only" for="calculation-origin-filter">Filtrar por origem da taxa</label>
            <select id="calculation-origin-filter" v-model="originFilter" class="campaign-control max-w-[220px]">
              <option value="">Todas as origens</option>
              <option v-for="origin in originOptions" :key="origin" :value="origin">{{ formatOrigin(origin) }}</option>
            </select>
          </div>
        </div>

        <div class="mt-6 overflow-x-auto">
          <table class="w-full min-w-[920px] text-left text-sm">
            <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
              <tr>
                <th class="rounded-l-xl px-3 py-3">Venda</th>
                <th class="px-3 py-3">Matrícula</th>
                <th class="px-3 py-3">Data</th>
                <th class="px-3 py-3">Valor da venda</th>
                <th class="px-3 py-3">Taxa aplicada</th>
                <th class="px-3 py-3">Origem</th>
                <th class="px-3 py-3">Comissão</th>
                <th class="rounded-r-xl px-3 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sage-border-light">
              <tr v-for="sale in paginatedResults" :key="sale.idVenda || sale.protocoloCalculo">
                <td class="px-3 py-4 font-semibold text-brand-dark">{{ shortId(sale.idVenda) }}</td>
                <td class="px-3 py-4 text-sage-subtle">{{ sale.matricula || 'Não informada' }}</td>
                <td class="px-3 py-4 text-sage-subtle">{{ formatDate(sale.dataVenda) }}</td>
                <td class="px-3 py-4 font-semibold text-brand-dark">{{ currency(sale.valorVenda) }}</td>
                <td class="px-3 py-4 text-sage-subtle">{{ percent(sale.taxaAplicada) }}</td>
                <td class="px-3 py-4"><StatusBadge :label="formatOrigin(sale.origemTaxa)" :tone="sale.origemTaxa === 'REGRA_NEGOCIO' ? 'success' : 'neutral'" /></td>
                <td class="px-3 py-4 font-extrabold text-brand-dark">{{ currency(sale.valorComissao) }}</td>
                <td class="px-3 py-4">
                  <details>
                    <summary class="cursor-pointer font-bold text-brand-dark">Ver</summary>
                    <dl class="mt-3 min-w-[210px] space-y-1 text-xs text-sage-muted">
                      <div><dt class="inline">Protocolo: </dt><dd class="inline break-all">{{ sale.protocoloCalculo || 'Não informado' }}</dd></div>
                      <div><dt class="inline">Marca: </dt><dd class="inline">{{ sale.codMarca ?? 'Não informada' }}</dd></div>
                      <div><dt class="inline">Loja: </dt><dd class="inline">{{ sale.codLoja ?? 'Não informada' }}</dd></div>
                      <div><dt class="inline">Cargo: </dt><dd class="inline">{{ sale.codCargo ?? 'Não informado' }}</dd></div>
                      <div><dt class="inline">Regra: </dt><dd class="inline">{{ sale.idRegra ?? 'Não informada' }}</dd></div>
                      <div><dt class="inline">Calculado em: </dt><dd class="inline">{{ formatDateTime(sale.dataCalculo) }}</dd></div>
                    </dl>
                  </details>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!paginatedResults.length" class="mt-5 rounded-xl bg-sage-light px-4 py-3 text-sm text-sage-muted" role="status">
          Nenhuma venda corresponde aos filtros selecionados.
        </p>

        <PaginationControls :page="resultPage" :total-pages="resultTotalPages" @previous="resultPage -= 1" @next="resultPage += 1" />
      </section>

      <section v-if="result.impedimentos.length" class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="blocked-sales-heading">
        <div>
          <h2 id="blocked-sales-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Vendas com impedimento</h2>
          <p class="mt-1 text-sm text-sage-muted">O motivo abaixo foi retornado pelo backend para cada venda.</p>
        </div>
        <div class="mt-6 overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
              <tr><th class="rounded-l-xl px-3 py-3">Venda</th><th class="px-3 py-3">Matrícula</th><th class="px-3 py-3">Data</th><th class="px-3 py-3">Valor</th><th class="rounded-r-xl px-3 py-3">Motivo</th></tr>
            </thead>
            <tbody class="divide-y divide-sage-border-light">
              <tr v-for="blocked in result.impedimentos" :key="blocked.idVenda || `${blocked.matricula}-${blocked.dataVenda}`">
                <td class="px-3 py-4 font-semibold text-brand-dark">{{ shortId(blocked.idVenda) }}</td>
                <td class="px-3 py-4 text-sage-subtle">{{ blocked.matricula || 'Não informada' }}</td>
                <td class="px-3 py-4 text-sage-subtle">{{ formatDate(blocked.dataVenda) }}</td>
                <td class="px-3 py-4 font-semibold text-brand-dark">{{ currency(blocked.valorVenda) }}</td>
                <td class="px-3 py-4 text-danger-dark">{{ blocked.motivo || 'Motivo não informado' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="!result.resultados.length && !result.impedimentos.length" class="rounded-2xl border border-sage-border bg-white p-6" role="status">
        <h2 class="text-xl font-extrabold text-brand-dark">Nenhuma venda encontrada</h2>
        <p class="mt-2 text-sm leading-6 text-sage-muted">Não há vendas persistidas para essa competência.</p>
      </section>
    </template>

    <section v-if="historyLoading" class="rounded-2xl bg-white px-6 py-10 text-center text-sm text-sage-muted" role="status">
      Consultando cálculos já registrados…
    </section>

    <section v-else-if="historyError" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Não foi possível consultar os cálculos registrados</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ historyError }}</p>
      <button type="button" class="focus-ring mt-5 rounded-full bg-danger px-5 py-3 text-sm font-bold text-white" @click="loadHistory()">
        Tentar novamente
      </button>
    </section>

    <section v-else-if="history.content.length" class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="history-calculation-heading">
      <div>
        <h2 id="history-calculation-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Cálculos registrados</h2>
        <p class="mt-1 text-sm leading-6 text-sage-muted">Este histórico contém os logs persistidos de cada execução concluída, incluindo a origem histórica da taxa.</p>
      </div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full min-w-[820px] text-left text-sm">
          <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
            <tr><th class="rounded-l-xl px-3 py-3">Venda</th><th class="px-3 py-3">Matrícula</th><th class="px-3 py-3">Data</th><th class="px-3 py-3">Valor</th><th class="px-3 py-3">Taxa</th><th class="px-3 py-3">Origem</th><th class="px-3 py-3">Comissão</th><th class="rounded-r-xl px-3 py-3">Executado em</th></tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light">
            <tr v-for="log in history.content" :key="log.idLog">
              <td class="px-3 py-4 font-semibold text-brand-dark">{{ shortId(log.idVenda) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ log.matricula || 'Não informada' }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ formatDate(log.dataVenda) }}</td>
              <td class="px-3 py-4 font-semibold text-brand-dark">{{ currency(log.valorVenda ?? log.valorOriginal) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ percent(log.taxaAplicada) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ formatOrigin(log.origemTaxa) }}</td>
              <td class="px-3 py-4 font-extrabold text-brand-dark">{{ currency(log.valorComissao) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ formatDateTime(log.executadoEm) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationControls :page="history.number" :total-pages="history.totalPages" @previous="loadHistory(history.number - 1)" @next="loadHistory(history.number + 1)" />
    </section>

    <section v-else-if="!result && !historyLoading && salesCount === 0" class="rounded-2xl border border-sage-border bg-white p-6" role="status">
      <h2 class="text-xl font-extrabold text-brand-dark">Nenhuma venda encontrada</h2>
      <p class="mt-2 text-sm leading-6 text-sage-muted">Não há vendas persistidas para essa competência.</p>
    </section>

    <p v-else-if="!result && !historyLoading" class="rounded-2xl border border-sage-border bg-sage-light px-5 py-4 text-sm leading-6 text-sage-muted">
      Nenhum cálculo foi executado nesta sessão. Use o botão acima para iniciar o processamento.
    </p>

    <div v-if="showRecalculateConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 px-4" role="presentation" @click.self="showRecalculateConfirm = false">
      <section class="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="recalculate-confirm-title">
        <h2 id="recalculate-confirm-title" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Recalcular comissões?</h2>
        <p class="mt-3 text-sm leading-6 text-sage-muted">
          Serão usadas as regras atualmente cadastradas e aplicáveis às datas das vendas. Resultados anteriores bem-sucedidos serão substituídos; vendas impedidas manterão seus resultados anteriores no histórico.
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="showRecalculateConfirm = false">
            Cancelar
          </button>
          <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canCalculate" @click="confirmRecalculation">
            Confirmar recálculo
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { dataService } from '@/services/dataService'
import { calculationService } from '@/services/calculationService'
import { readCalculationCache } from '@/services/calculationCache'
import { CALCULATION_OPERATION, SALES_QUERY_STATE, hasPreviousCalculation as hasPreviousCalculationValue, isCalculationReady, operationToRecalculate } from '@/services/calculationFlow'
import { formatCompetenceCode, formatCompetenceLabel, getCompetenceDateRange, normalizeCompetence } from '@/services/competenceUtils'
import { useCalculationStore } from '@/stores/calculationStore'

const PaginationControls = defineComponent({
  props: { page: { type: Number, required: true }, totalPages: { type: Number, required: true } },
  emits: ['previous', 'next'],
  setup(props, { emit }) {
    return () => props.totalPages > 1
      ? h('div', { class: 'mt-5 flex items-center justify-between gap-4 border-t border-sage-border-light pt-4' }, [
        h('button', { type: 'button', class: 'focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-50', disabled: props.page <= 0, onClick: () => emit('previous') }, 'Anterior'),
        h('span', { class: 'text-xs font-semibold text-sage-muted' }, `Página ${props.page + 1} de ${props.totalPages}`),
        h('button', { type: 'button', class: 'focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-50', disabled: props.page >= props.totalPages - 1, onClick: () => emit('next') }, 'Próxima')
      ])
      : null
  }
})

const route = useRoute()
const router = useRouter()
const calculationStore = useCalculationStore()
const competenceKey = computed(() => normalizeCompetence(route.params.competencia))
const salesCount = ref(null)
const result = ref(null)
const lastOperation = ref(CALCULATION_OPERATION.NORMAL)
const restoredResult = ref(null)
const showRecalculateConfirm = ref(false)
const salesQueryState = ref(SALES_QUERY_STATE.IDLE)
const salesQueryError = ref('')
const historyLoading = ref(false)
const historyError = ref('')
const history = ref({ content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true })
const matriculaFilter = ref('')
const originFilter = ref('')
const resultPage = ref(0)
const resultPageSize = 10
const competenceGeneration = ref(0)
const salesQueryRequestId = ref(0)
const historyRequestId = ref(0)

const summaryItems = computed(() => [
  { label: 'Vendas processadas', value: result.value?.totalVendasProcessadas ?? 0 },
  { label: 'Calculadas com sucesso', value: result.value?.totalCalculados ?? 0 },
  { label: 'Com impedimento', value: result.value?.totalImpedimentos ?? 0 },
  { label: 'Valor das vendas calculadas', value: currency(result.value?.valorTotalVendas) },
  { label: 'Total de comissões', value: currency(result.value?.valorTotalComissao) }
])

const originOptions = computed(() => [...new Set((result.value?.resultados || []).map((item) => item.origemTaxa).filter(Boolean))])
const filteredResults = computed(() => (result.value?.resultados || []).filter((item) => {
  const registration = String(item.matricula || '').toLocaleLowerCase()
  const matchesRegistration = !matriculaFilter.value || registration.includes(matriculaFilter.value.toLocaleLowerCase())
  const matchesOrigin = !originFilter.value || item.origemTaxa === originFilter.value
  return matchesRegistration && matchesOrigin
}))
const resultTotalPages = computed(() => Math.max(1, Math.ceil(filteredResults.value.length / resultPageSize)))
const paginatedResults = computed(() => filteredResults.value.slice(resultPage.value * resultPageSize, (resultPage.value + 1) * resultPageSize))
const isCalculating = computed(() => calculationStore.isProcessing && calculationStore.competencia === competenceKey.value)
const recalculationRequested = computed(() => isCalculating.value && calculationStore.tipoOperacao === CALCULATION_OPERATION.RECALCULO)
const anotherCalculationProcessing = computed(() => calculationStore.isProcessing && calculationStore.competencia && calculationStore.competencia !== competenceKey.value)
const calculationErrorMessage = computed(() => calculationStore.competencia === competenceKey.value ? calculationStore.mensagemErro : '')
const previousResultAfterFailure = computed(() => calculationStore.competencia === competenceKey.value && calculationStore.hasError && Boolean(result.value))
const canCalculate = computed(() => isCalculationReady({
  competencia: competenceKey.value,
  consultaVendas: salesQueryState.value,
  vendasEncontradas: salesCount.value,
  historicoConsultando: historyLoading.value,
  historicoComErro: Boolean(historyError.value),
  calculando: calculationStore.isProcessing
}))
const hasPreviousCalculation = computed(() => hasPreviousCalculationState())

watch(competenceKey, () => {
  loadCompetence()
}, { immediate: true })

watch([matriculaFilter, originFilter], () => {
  resultPage.value = 0
})

async function loadCompetence() {
  const generation = competenceGeneration.value + 1
  competenceGeneration.value = generation
  salesQueryRequestId.value += 1
  historyRequestId.value += 1
  result.value = null
  restoredResult.value = null
  salesCount.value = null
  salesQueryError.value = ''
  salesQueryState.value = SALES_QUERY_STATE.IDLE
  historyError.value = ''
  historyLoading.value = false
  history.value = { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true }
  matriculaFilter.value = ''
  originFilter.value = ''
  resultPage.value = 0
  showRecalculateConfirm.value = false
  lastOperation.value = CALCULATION_OPERATION.NORMAL

  if (!competenceKey.value) return

  const hasSharedCalculationState = syncCalculationStoreState(competenceKey.value)
  if (!hasSharedCalculationState) restoreSessionResult(competenceKey.value)
  await Promise.all([
    loadSalesCount(competenceKey.value, generation),
    loadHistory(0, competenceKey.value, generation)
  ])
}

function syncCalculationStoreState(expectedCompetence = competenceKey.value) {
  if (calculationStore.competencia !== expectedCompetence) return false

  lastOperation.value = calculationStore.tipoOperacao

  if (calculationStore.isProcessing || calculationStore.hasError) {
    result.value = null
    restoredResult.value = null
    return true
  }

  if (!calculationStore.resultado) return false

  result.value = calculationStore.resultado
  restoredResult.value = null
  return true
}

watch(
  () => [calculationStore.competencia, calculationStore.status, calculationStore.resultado, calculationStore.concluidoEm],
  () => {
    if (calculationStore.competencia !== competenceKey.value) return
    const synchronized = syncCalculationStoreState(competenceKey.value)
    if (synchronized && calculationStore.resultado && !calculationStore.isProcessing) {
      void loadHistory(0, competenceKey.value, competenceGeneration.value)
    }
  }
)

async function loadSalesCount(expectedCompetence = competenceKey.value, generation = competenceGeneration.value) {
  const requestId = salesQueryRequestId.value + 1
  salesQueryRequestId.value = requestId
  salesQueryState.value = SALES_QUERY_STATE.LOADING
  salesQueryError.value = ''

  try {
    const sales = await dataService.listAllSales()
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== salesQueryRequestId.value) return
    salesCount.value = sales.filter((sale) => sale?.saleDate?.slice(0, 7) === expectedCompetence).length
    salesQueryState.value = SALES_QUERY_STATE.SUCCESS
  } catch (error) {
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== salesQueryRequestId.value) return
    salesCount.value = null
    salesQueryState.value = SALES_QUERY_STATE.ERROR
    salesQueryError.value = error?.response?.data?.message || 'Não foi possível consultar as vendas persistidas desta competência.'
  }
}

async function retrySalesQuery() {
  if (!competenceKey.value || isCalculating.value) return
  await loadSalesCount(competenceKey.value, competenceGeneration.value)
}

async function loadHistory(page = 0, expectedCompetence = competenceKey.value, generation = competenceGeneration.value) {
  if (!expectedCompetence) return
  const requestId = historyRequestId.value + 1
  historyRequestId.value = requestId
  historyLoading.value = true
  historyError.value = ''
  try {
    const range = getCompetenceDateRange(expectedCompetence)
    const response = await calculationService.listLogs({ ...range, page })
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== historyRequestId.value) return
    history.value = response
  } catch (error) {
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== historyRequestId.value) return
    history.value = { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true }
    historyError.value = error?.response?.data?.message || 'Não foi possível consultar os logs desta competência.'
  } finally {
    if (generation === competenceGeneration.value && expectedCompetence === competenceKey.value && requestId === historyRequestId.value) {
      historyLoading.value = false
    }
  }
}

function hasPreviousCalculationState() {
  return hasPreviousCalculationValue({
    resultadoSessao: result.value,
    totalHistorico: history.value.totalElements
  })
}

function handleCalculation() {
  if (!canCalculate.value) return
  if (hasPreviousCalculation.value) {
    showRecalculateConfirm.value = true
    return
  }
  calculate(false)
}

function confirmRecalculation() {
  if (!canCalculate.value) return
  showRecalculateConfirm.value = false
  calculate(true)
}

function calculate(recalcular = false) {
  const shouldRecalculate = recalcular === true
  if (!canCalculate.value) return
  const expectedCompetence = competenceKey.value
  lastOperation.value = shouldRecalculate ? CALCULATION_OPERATION.RECALCULO : CALCULATION_OPERATION.NORMAL
  result.value = null
  restoredResult.value = null
  resultPage.value = 0
  void calculationStore.execute({
    competencia: expectedCompetence,
    recalcular: shouldRecalculate,
    onViewResult: () => openCalculation(expectedCompetence),
    onViewHistory: () => openCalculation(expectedCompetence)
  })
}

function retryLastOperation() {
  if (!canCalculate.value) return
  calculate(operationToRecalculate(lastOperation.value))
}

function restoreSessionResult(expectedCompetence = competenceKey.value) {
  const cached = readCalculationCache(expectedCompetence)
  if (!cached) return
  result.value = cached.resultado
  restoredResult.value = cached
  lastOperation.value = cached.tipoOperacao
}

function openCalculation(expectedCompetence = competenceKey.value) {
  if (!expectedCompetence) return
  router.push({ name: 'dados-calculo', params: { competencia: expectedCompetence } })
}

function consultHistory() {
  if (!competenceKey.value) return
  void loadHistory(0, competenceKey.value, competenceGeneration.value)
}

function currency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
}

function percent(value) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 4 }).format(Number(value))
}

function formatDate(value) {
  if (!value) return 'Não informada'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : 'Não informada'
}

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatOrigin(origin) {
  return { REGRA_NEGOCIO: 'Regra de negócio', BASE_COMISS: 'Taxa base', PADRAO: 'Taxa padrão' }[origin] || origin || 'Não informada'
}

function shortId(value) {
  if (!value) return 'Não informado'
  const text = String(value)
  return text.length > 12 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text
}
</script>

<style scoped>
.campaign-control { @apply rounded-xl border border-sage-border bg-white px-3 py-2.5 text-sm text-brand-dark outline-none focus:border-sage-border-dark; }
</style>
