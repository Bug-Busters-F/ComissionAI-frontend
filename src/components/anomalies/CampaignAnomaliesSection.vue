<template>
  <section class="rounded-[22px] bg-white p-6 sm:p-7 space-y-6" aria-labelledby="anomalies-section-heading">
    <!-- Cabeçalho da Seção -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-sage-border pb-5">
      <div>
        <div class="flex items-center gap-2.5">
          <h2 id="anomalies-section-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark flex items-center gap-2">
            <span>Alertas Estatísticos e Anomalias de Vendas</span>
          </h2>
          <span
            v-if="counts.totalGeral > 0"
            class="rounded-full bg-danger-bg border border-danger/30 px-2.5 py-0.5 text-xs font-extrabold text-danger-dark"
          >
            {{ counts.totalGeral }} caso(s)
          </span>
        </div>
        <p class="mt-1 text-xs text-sage-muted">
          Detecção de outliers em vendas diárias e inconsistências cadastrais para a competência
          <strong class="text-brand-dark">{{ formatCompetenceDisplay(selectedCompetence) }}</strong>.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Ação de Reprocessar Lote de Bases (SoD / Auditor apenas consulta) -->
        <span
          v-if="selectedLot"
          class="inline-block"
          :title="!canReprocess ? 'Seu perfil permite somente consulta. Nenhuma alteração pode ser feita.' : 'Reprocessar anomalias para o lote selecionado'"
        >
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-full border border-warning-border bg-warning-bg px-4 py-2 text-xs font-bold text-warning-dark transition hover:bg-warning-bg/80 disabled:cursor-not-allowed disabled:opacity-50 pointer-events-auto"
            :disabled="isReprocessing || !canReprocess"
            @click="openReprocessModal"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isReprocessing }" aria-hidden="true" />
            <span>{{ isReprocessing ? 'Reprocessando…' : 'Reprocessar Lote' }}</span>
          </button>
        </span>

        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border-dark bg-white px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light disabled:opacity-50"
          :disabled="isLoading"
          title="Recarregar alertas estatísticos"
          @click="reloadAlerts"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" aria-hidden="true" />
          <span>Atualizar</span>
        </button>
      </div>
    </div>

    <!-- Feedback de Reprocessamento -->
    <div
      v-if="reprocessSuccessMessage"
      class="rounded-xl border border-success/30 bg-success-bg p-3.5 text-xs font-bold text-success-dark flex items-center justify-between gap-2"
      role="status"
    >
      <span>{{ reprocessSuccessMessage }}</span>
      <button type="button" class="text-success-dark hover:opacity-70 text-xs font-bold" @click="reprocessSuccessMessage = ''">✕</button>
    </div>
    <div
      v-if="reprocessErrorMessage"
      class="rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-xs font-bold text-danger-dark flex items-center justify-between gap-2"
      role="alert"
    >
      <span>{{ reprocessErrorMessage }}</span>
      <button type="button" class="text-danger-dark hover:opacity-70 text-xs font-bold" @click="reprocessErrorMessage = ''">✕</button>
    </div>

    <!-- Barra de Filtros e Chips por Tipo -->
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Chips por Classificação (com contadores do backend) -->
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por classificação">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition"
            :class="selectedType === '' ? 'bg-brand text-brand-dark shadow-sm' : 'bg-sage-light text-sage-muted hover:bg-sage-border-light hover:text-brand-dark'"
            @click="setTypeFilter('')"
          >
            <span>Todos</span>
            <span class="rounded-full bg-brand-dark/10 px-1.5 py-0.2 text-[11px] font-extrabold">
              {{ counts.totalGeral }}
            </span>
          </button>

          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition"
            :class="selectedType === TIPO_ALERTA.OUTLIER_VENDA ? 'bg-brand text-brand-dark shadow-sm' : 'bg-sage-light text-sage-muted hover:bg-sage-border-light hover:text-brand-dark'"
            @click="setTypeFilter(TIPO_ALERTA.OUTLIER_VENDA)"
          >
            <span class="h-2 w-2 rounded-full bg-danger shrink-0" aria-hidden="true"></span>
            <span>Anomalias</span>
            <span class="rounded-full bg-brand-dark/10 px-1.5 py-0.2 text-[11px] font-extrabold">
              {{ counts.totalOutliers }}
            </span>
          </button>

          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition"
            :class="selectedType === TIPO_ALERTA.SEM_VENDAS_PARA_RH ? 'bg-brand text-brand-dark shadow-sm' : 'bg-sage-light text-sage-muted hover:bg-sage-border-light hover:text-brand-dark'"
            @click="setTypeFilter(TIPO_ALERTA.SEM_VENDAS_PARA_RH)"
          >
            <span class="h-2 w-2 rounded-full bg-warning shrink-0" aria-hidden="true"></span>
            <span>Inconsistências de Carga</span>
            <span class="rounded-full bg-brand-dark/10 px-1.5 py-0.2 text-[11px] font-extrabold">
              {{ counts.totalInconsistencias }}
            </span>
          </button>

          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition"
            :class="selectedType === TIPO_ALERTA.AMOSTRA_INSUFICIENTE ? 'bg-brand text-brand-dark shadow-sm' : 'bg-sage-light text-sage-muted hover:bg-sage-border-light hover:text-brand-dark'"
            @click="setTypeFilter(TIPO_ALERTA.AMOSTRA_INSUFICIENTE)"
          >
            <span class="h-2 w-2 rounded-full bg-sage-muted shrink-0" aria-hidden="true"></span>
            <span>Amostra Insuficiente</span>
            <span class="rounded-full bg-brand-dark/10 px-1.5 py-0.2 text-[11px] font-extrabold">
              {{ counts.totalSemAmostra }}
            </span>
          </button>
        </div>

        <!-- Filtros de Competência, Lote e Matrícula -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Seletor de Competência da Vigência (quando multi-competência) -->
          <div v-if="availableCompetences.length > 1" class="flex items-center">
            <label class="sr-only" for="anomaly-competence-filter">Competência</label>
            <select
              id="anomaly-competence-filter"
              v-model="selectedCompetence"
              class="campaign-control text-xs max-w-[150px]"
              @change="handleCompetenceChange"
            >
              <option v-for="comp in availableCompetences" :key="comp" :value="comp">
                {{ formatCompetenceDisplay(comp) }}
              </option>
            </select>
          </div>

          <!-- Seletor de Lote da Campanha -->
          <div v-if="activeLots.length" class="flex items-center">
            <label class="sr-only" for="anomaly-lot-filter">Filtrar por lote</label>
            <select
              id="anomaly-lot-filter"
              v-model="selectedLot"
              class="campaign-control text-xs max-w-[210px]"
              @change="handleFilterChange"
            >
              <option value="">Todos os lotes da competência</option>
              <option v-for="lote in activeLots" :key="lote.id" :value="lote.id">
                {{ lote.tipoBase || 'LOTE' }} — {{ lote.nomeArquivo || lote.id.slice(0, 8) }}
              </option>
            </select>
          </div>

          <!-- Filtro por Matrícula -->
          <div class="flex items-center">
            <label class="sr-only" for="anomaly-matricula-filter">Filtrar matrícula</label>
            <input
              id="anomaly-matricula-filter"
              v-model="matriculaFilter"
              type="search"
              class="campaign-control text-xs max-w-[170px]"
              placeholder="Buscar matrícula"
              @input="handleMatriculaDebounced"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Estado: Carregando -->
    <div v-if="isLoading && !alerts.content.length" class="p-12 text-center space-y-3" role="status">
      <RefreshCw class="mx-auto h-7 w-7 animate-spin text-brand" aria-hidden="true" />
      <p class="text-sm font-semibold text-sage-muted">Carregando alertas estatísticos…</p>
    </div>

    <!-- Estado: Erro de Consulta -->
    <div v-else-if="loadError" class="rounded-2xl border border-danger/30 bg-danger-bg p-5" role="alert">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-danger-dark shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 class="text-sm font-bold text-danger-dark">Não foi possível carregar os alertas estatísticos</h3>
          <p class="mt-1 text-xs text-danger-dark/80">{{ loadError }}</p>
          <button
            type="button"
            class="focus-ring mt-3 rounded-full bg-danger px-4 py-2 text-xs font-bold text-white transition hover:bg-danger-dark"
            @click="reloadAlerts"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>

    <!-- Estado: Vazio -->
    <div
      v-else-if="!alerts.content.length"
      class="rounded-2xl border border-sage-border bg-sage-light/40 p-10 text-center space-y-2"
      role="status"
    >
      <CheckCircle2 class="mx-auto h-8 w-8 text-success-dark opacity-80" aria-hidden="true" />
      <h3 class="text-base font-extrabold text-brand-dark">Nenhum alerta ou anomalia estatística encontrada</h3>
      <p class="text-xs text-sage-muted max-w-md mx-auto">
        Não foram identificados desvios estatísticos superiores a 3σ ou inconsistências de cadastro para os filtros informados.
      </p>
    </div>

    <!-- Tabela de Alertas Estatísticos -->
    <div v-else class="space-y-4">
      <div class="overflow-x-auto rounded-2xl border border-sage-border">
        <table class="w-full min-w-[960px] text-left text-xs">
          <thead class="bg-sage-pill text-[10px] font-bold uppercase tracking-[0.1em] text-sage-muted border-b border-sage-border">
            <tr>
              <th scope="col" class="px-3.5 py-3.5">Classificação</th>
              <th scope="col" class="px-3.5 py-3.5">Data</th>
              <th scope="col" class="px-3.5 py-3.5">Matrícula</th>
              <th scope="col" class="px-3.5 py-3.5">Grupo Comparável</th>
              <th scope="col" class="px-3.5 py-3.5 text-right font-black text-brand-dark">Valor Observado</th>
              <th scope="col" class="px-3.5 py-3.5 text-center">Faixa Esperada</th>
              <th scope="col" class="px-3.5 py-3.5 text-center">Método</th>
              <th scope="col" class="px-3.5 py-3.5 min-w-[240px]">Explicação Orientativa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light text-sage-subtle">
            <tr
              v-for="alerta in alerts.content"
              :key="alerta.id"
              class="transition hover:bg-sage-light/50"
            >
              <!-- Classificação com Badges Diferenciados -->
              <td class="px-3.5 py-3.5 whitespace-nowrap">
                <span
                  v-if="alerta.tipo === TIPO_ALERTA.OUTLIER_VENDA"
                  class="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-black text-danger-dark border border-danger/20"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-danger"></span>
                  <span>{{ formatTypeLabel(alerta.tipo) }}</span>
                </span>
                <span
                  v-else-if="alerta.tipo === TIPO_ALERTA.SEM_VENDAS_PARA_RH"
                  class="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-black text-warning-dark border border-warning-border"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-warning"></span>
                  <span>{{ formatTypeLabel(alerta.tipo) }}</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1.5 rounded-full bg-sage-light px-2.5 py-1 text-[11px] font-bold text-sage-muted border border-sage-border"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-sage-muted"></span>
                  <span>{{ formatTypeLabel(alerta.tipo) }}</span>
                </span>
              </td>

              <!-- Data da Venda / Referência -->
              <td class="px-3.5 py-3.5 whitespace-nowrap text-sage-muted font-mono font-medium">
                {{ formatAlertDate(alerta.dataReferencia) }}
              </td>

              <!-- Matrícula -->
              <td class="px-3.5 py-3.5 whitespace-nowrap font-mono font-bold text-brand-dark">
                {{ alerta.matricula || '—' }}
              </td>

              <!-- Grupo Comparável Estruturado -->
              <td class="px-3.5 py-3.5 font-medium text-brand-dark">
                <span class="block text-xs font-semibold">
                  {{ parseComparableGroup(alerta.grupoComparavel).label }}
                </span>
              </td>

              <!-- Valor da Venda (Observado) -->
              <td class="px-3.5 py-3.5 text-right whitespace-nowrap font-black text-brand-dark">
                <template v-if="alerta.valorObservado != null">
                  <span class="text-xs">{{ formatCurrency(alerta.valorObservado) }}</span>
                  <span class="block text-[10px] font-normal text-sage-muted">Valor da venda</span>
                </template>
                <template v-else>
                  <span class="text-sage-muted">—</span>
                  <span class="block text-[10px] font-normal text-sage-muted">Sem vendas</span>
                </template>
              </td>

              <!-- Faixa Esperada Provisória (Leave-One-Out) -->
              <td class="px-3.5 py-3.5 text-center whitespace-nowrap">
                <template v-if="getEstimatedRange(alerta)">
                  <span class="text-xs font-bold text-brand-dark">{{ getEstimatedRange(alerta).label }}</span>
                  <span class="block text-[10px] font-medium text-sage-muted">Faixa estimada (±3σ)</span>
                </template>
                <template v-else>
                  <span class="text-sage-muted">—</span>
                </template>
              </td>

              <!-- Método Estatístico -->
              <td class="px-3.5 py-3.5 text-center whitespace-nowrap">
                <span class="rounded bg-sage-light px-2 py-0.5 text-[10px] font-mono font-bold text-sage-muted">
                  {{ alerta.metodo || '—' }}
                </span>
              </td>

              <!-- Explicação Orientativa Contextual -->
              <td class="px-3.5 py-3.5 text-xs text-sage-subtle leading-relaxed">
                {{ getAlertExplanation(alerta) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação Oficial -->
      <div v-if="alerts.totalPages > 1" class="flex items-center justify-between gap-4 border-t border-sage-border pt-4">
        <button
          type="button"
          class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="page <= 0 || isLoading"
          @click="changePage(page - 1)"
        >
          Anterior
        </button>

        <span class="text-xs font-semibold text-sage-muted">
          Página {{ page + 1 }} de {{ alerts.totalPages }} (Total: {{ alerts.totalElements }})
        </span>

        <button
          type="button"
          class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="page >= alerts.totalPages - 1 || isLoading"
          @click="changePage(page + 1)"
        >
          Próxima
        </button>
      </div>
    </div>

    <!-- Modal de Confirmação de Reprocessamento de Lote -->
    <div
      v-if="showReprocessModal"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reprocess-modal-title"
      @keydown.esc="closeReprocessModal"
    >
      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-start justify-between border-b border-sage-border-light pb-3">
          <div class="flex items-center gap-2">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning-bg text-warning-dark">
              <RefreshCw class="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 id="reprocess-modal-title" class="text-base font-extrabold text-brand-dark">
              Reprocessar anomalias do lote?
            </h3>
          </div>
          <button
            type="button"
            @click="closeReprocessModal"
            class="focus-ring rounded-lg p-1 text-sage-muted hover:text-brand-dark"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-sage-muted leading-relaxed">
          Esta ação solicitará ao servidor a reanálise estatística completa para o lote de preparação
          <strong class="text-brand-dark font-bold font-mono">{{ selectedLot }}</strong>.
          Os alertas e métricas estatísticas da campanha serão recalculados.
        </p>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="focus-ring rounded-xl border border-sage-border-dark bg-white px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
            :disabled="isReprocessing"
            @click="closeReprocessModal"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-xl bg-warning-dark px-4 py-2 text-xs font-bold text-white transition hover:bg-warning-dark/90 disabled:opacity-50"
            :disabled="isReprocessing"
            @click="confirmReprocessLote"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isReprocessing }" aria-hidden="true" />
            <span>{{ isReprocessing ? 'Reprocessando…' : 'Confirmar reprocessamento' }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import { formatCurrencyPtBr } from '@/services/currencyUtils'
import defaultStatisticalAlertsApi from '@/services/statisticalAlertsApi'
import { useAccessPolicy } from '@/services/useAccessPolicy'
import {
  TIPO_ALERTA,
  TIPO_ALERTA_LABEL,
  getEstimatedRange,
  parseComparableGroup,
  formatAlertDate,
  getAlertExplanation
} from '@/services/statisticalAlertsLogic'

const props = defineProps({
  campaign: {
    type: Object,
    default: () => ({})
  },
  activeLots: {
    type: Array,
    default: () => []
  },
  competence: {
    type: String,
    default: ''
  },
  initialAlerts: {
    type: Object,
    default: null
  },
  apiClient: {
    type: Object,
    default: null
  },
  accessPolicy: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['loaded'])

let safeAccess = null
try {
  safeAccess = useAccessPolicy()
} catch {
  safeAccess = { can: () => true }
}

const access = computed(() => props.accessPolicy || safeAccess)
const canReprocess = computed(() => access.value.can('reprocessAnomalies'))
const isReprocessing = ref(false)
const showReprocessModal = ref(false)
const reprocessSuccessMessage = ref('')
const reprocessErrorMessage = ref('')

const api = computed(() => props.apiClient || defaultStatisticalAlertsApi)

// Estados de filtro e paginação
const selectedType = ref('')
const selectedLot = ref('')
const matriculaFilter = ref('')
const page = ref(0)
const pageSize = 20
const sort = ref('geradoEm,desc')

// Determina competência inicial com base na campanha ou prop
const initialComp = computed(() => {
  if (props.competence) return props.competence
  if (props.campaign?.dataInicio) return String(props.campaign.dataInicio).slice(0, 7)
  return '2025-08'
})

const selectedCompetence = ref(initialComp.value)

// Computa competências disponíveis se a vigência abranger múltiplos meses
const availableCompetences = computed(() => {
  const start = props.campaign?.dataInicio ? String(props.campaign.dataInicio).slice(0, 7) : ''
  const end = props.campaign?.dataFim ? String(props.campaign.dataFim).slice(0, 7) : ''
  if (!start) return [selectedCompetence.value].filter(Boolean)
  if (!end || start === end) return [start]

  const list = []
  let curr = start
  list.push(curr)
  while (curr < end) {
    const [anoStr, mesStr] = curr.split('-')
    let ano = parseInt(anoStr, 10)
    let mes = parseInt(mesStr, 10) + 1
    if (mes > 12) {
      mes = 1
      ano += 1
    }
    curr = `${ano}-${String(mes).padStart(2, '0')}`
    list.push(curr)
    if (list.length > 24) break // Trava de segurança
  }
  return list
})

// Estados de dados e carregamento
const alerts = ref(props.initialAlerts || {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: pageSize
})

const counts = ref({
  totalOutliers: 0,
  totalInconsistencias: 0,
  totalSemAmostra: 0,
  totalGeral: 0
})

const isLoading = ref(false)
const loadError = ref('')

let debounceTimeout = null
function handleMatriculaDebounced() {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    page.value = 0
    void loadData()
  }, 350)
}

function handleFilterChange() {
  page.value = 0
  void loadData()
}

function handleCompetenceChange() {
  page.value = 0
  selectedLot.value = ''
  void loadData()
}

function setTypeFilter(tipo) {
  selectedType.value = tipo
  page.value = 0
  void loadData()
}

function changePage(newPage) {
  if (newPage < 0 || newPage >= alerts.value.totalPages) return
  page.value = newPage
  void loadData()
}

async function loadData() {
  isLoading.value = true
  loadError.value = ''

  const baseFilters = {
    competencia: selectedCompetence.value,
    matricula: matriculaFilter.value.trim() || undefined,
    lotePreparacaoId: selectedLot.value || undefined
  }

  try {
    const [alertsData, countsData] = await Promise.all([
      api.value.listAlerts({
        ...baseFilters,
        tipo: selectedType.value || undefined,
        page: page.value,
        size: pageSize,
        sort: sort.value
      }),
      api.value.countAlertsByType(baseFilters)
    ])

    alerts.value = alertsData || { content: [], totalElements: 0, totalPages: 0, number: 0, size: pageSize }
    counts.value = countsData || { totalOutliers: 0, totalInconsistencias: 0, totalSemAmostra: 0, totalGeral: 0 }
    emit('loaded', { alerts: alerts.value, counts: counts.value })
  } catch (err) {
    loadError.value = err?.response?.data?.message || err?.message || 'Erro ao consultar alertas estatísticos.'
  } finally {
    isLoading.value = false
  }
}

async function reloadAlerts() {
  await loadData()
}

function openReprocessModal() {
  if (!canReprocess.value || isReprocessing.value || !selectedLot.value) return
  showReprocessModal.value = true
}

function closeReprocessModal() {
  if (isReprocessing.value) return
  showReprocessModal.value = false
}

async function confirmReprocessLote() {
  if (!selectedLot.value || !canReprocess.value || isReprocessing.value) return
  isReprocessing.value = true
  reprocessSuccessMessage.value = ''
  reprocessErrorMessage.value = ''
  try {
    await api.value.reprocessLote(selectedLot.value)
    reprocessSuccessMessage.value = 'Lote reprocessado com sucesso! Alertas atualizados.'
    showReprocessModal.value = false
    await loadData()
  } catch (err) {
    reprocessErrorMessage.value = err?.response?.data?.message || err?.message || 'Falha ao reprocessar lote de bases.'
    showReprocessModal.value = false
  } finally {
    isReprocessing.value = false
  }
}

function formatCompetenceDisplay(comp) {
  if (!comp) return ''
  const m = String(comp).match(/^(\d{4})-(\d{2})$/)
  if (m) return `${m[2]}/${m[1]}`
  return comp
}

function formatTypeLabel(tipo) {
  return TIPO_ALERTA_LABEL[tipo] || tipo || 'Alerta'
}

function formatCurrency(val) {
  return formatCurrencyPtBr(val, true)
}

watch(() => props.competence, (newComp) => {
  if (newComp && newComp !== selectedCompetence.value) {
    selectedCompetence.value = newComp
    page.value = 0
    void loadData()
  }
})

onMounted(() => {
  if (!props.initialAlerts) {
    void loadData()
  } else if (props.initialAlerts?.totalElements != null) {
    counts.value.totalGeral = props.initialAlerts.totalElements
  }
})

defineExpose({
  reloadAlerts,
  loadData,
  selectedCompetence,
  selectedType,
  selectedLot,
  alerts,
  counts,
  showReprocessModal,
  openReprocessModal,
  confirmReprocessLote
})
</script>
