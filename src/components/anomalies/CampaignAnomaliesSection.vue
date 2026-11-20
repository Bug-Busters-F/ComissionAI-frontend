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
            class="shrink-0 whitespace-nowrap rounded-full bg-danger-bg border border-danger/30 px-2.5 py-0.5 text-xs font-extrabold text-danger-dark"
          >
            {{ counts.totalGeral }} caso(s)
          </span>
        </div>
        <p class="mt-1 text-xs text-sage-muted">
          <template v-if="selectedCompetence">
            Detecção de outliers em vendas diárias e inconsistências cadastrais para a competência
            <strong class="text-brand-dark">{{ formatCompetenceLabel(selectedCompetence) }}</strong>.
          </template>
          <template v-else>Detecção de outliers em vendas diárias e inconsistências cadastrais.</template>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Modo Demonstração quando ativo -->
        <div v-if="isDemoMode" class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-warning-bg border border-warning-border px-3 py-1 text-xs font-bold text-warning-dark">
            <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dados de Exemplo Ativos</span>
          </span>
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-1 rounded-full border border-sage-border bg-white px-3 py-1.5 text-xs font-bold text-sage-muted hover:text-brand-dark hover:bg-sage-light transition"
            title="Voltar a consultar os alertas reais do servidor"
            @click="resetToRealData"
          >
            <span>Voltar aos dados reais</span>
          </button>
        </div>

        <!-- Ação de Reprocessar Lote (SoD: Auditor apenas consulta) -->
        <span
          v-if="selectedLot"
          class="inline-block"
          :title="canReprocess ? 'Reprocessar anomalias para o lote selecionado' : deniedMessage"
        >
          <button
            ref="reprocessTriggerRef"
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-full border border-warning-border bg-warning-bg px-4 py-2 text-xs font-bold text-warning-dark transition hover:bg-warning-bg/80 disabled:cursor-not-allowed disabled:opacity-50 pointer-events-auto"
            :disabled="isReprocessing || !canReprocess"
            :aria-describedby="!canReprocess ? 'reprocess-denied-hint' : undefined"
            @click="openReprocessModal"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isReprocessing }" aria-hidden="true" />
            <span>{{ isReprocessing ? 'Reprocessando…' : 'Reprocessar Lote' }}</span>
          </button>
          <span v-if="!canReprocess" id="reprocess-denied-hint" class="sr-only">{{ deniedMessage }}</span>
        </span>

        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border-dark bg-white px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light disabled:opacity-50"
          :disabled="isLoading || !selectedCompetence"
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
      v-if="reprocessFeedback"
      class="rounded-xl border p-3.5 text-xs font-bold flex items-center justify-between gap-2"
      :class="reprocessFeedback.tone === 'neutral' ? 'border-sage-border bg-sage-light text-brand-dark' : 'border-success/30 bg-success-bg text-success-dark'"
      role="status"
    >
      <span>{{ reprocessFeedback.message }}</span>
      <button type="button" class="hover:opacity-70 text-xs font-bold" aria-label="Fechar aviso" @click="reprocessFeedback = null">✕</button>
    </div>
    <div
      v-if="reprocessErrorMessage"
      class="rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-xs font-bold text-danger-dark flex items-center justify-between gap-2"
      role="alert"
    >
      <span>{{ reprocessErrorMessage }}</span>
      <button type="button" class="text-danger-dark hover:opacity-70 text-xs font-bold" aria-label="Fechar aviso de erro" @click="reprocessErrorMessage = ''">✕</button>
    </div>

    <!-- Barra de Filtros e Chips por Tipo -->
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Chips por Classificação (com contadores do backend) -->
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por classificação">
          <button
            v-for="chip in typeChips"
            :key="chip.value || 'todos'"
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition"
            :class="selectedType === chip.value ? 'bg-brand text-brand-dark shadow-sm' : 'bg-sage-light text-sage-muted hover:bg-sage-border-light hover:text-brand-dark'"
            :aria-pressed="selectedType === chip.value"
            @click="setTypeFilter(chip.value)"
          >
            <span v-if="chip.dot" class="h-2 w-2 rounded-full shrink-0" :class="chip.dot" aria-hidden="true"></span>
            <span>{{ chip.label }}</span>
            <span class="rounded-full bg-brand-dark/10 px-1.5 py-0.5 text-[11px] font-extrabold">
              {{ counts[chip.countKey] }}
            </span>
          </button>
        </div>

        <!-- Filtros de Competência, Lote e Matrícula -->
        <div class="flex flex-wrap items-center gap-2.5">
          <div v-if="availableCompetences.length > 1" class="flex items-center">
            <label class="sr-only" for="anomaly-competence-filter">Competência</label>
            <select
              id="anomaly-competence-filter"
              v-model="selectedCompetence"
              class="campaign-control text-xs max-w-[150px]"
              @change="handleCompetenceChange"
            >
              <option v-for="comp in availableCompetences" :key="comp" :value="comp">
                {{ formatCompetenceLabel(comp) }}
              </option>
            </select>
          </div>

          <div v-if="availableLots.length" class="flex items-center">
            <label class="sr-only" for="anomaly-lot-filter">Filtrar por lote</label>
            <select
              id="anomaly-lot-filter"
              v-model="selectedLot"
              class="campaign-control text-xs max-w-[260px]"
              @change="handleFilterChange"
            >
              <option value="">Todos os lotes da competência</option>
              <option v-for="lote in availableLots" :key="lote.id" :value="lote.id">
                {{ lote.label }}
              </option>
            </select>
          </div>

          <div class="flex items-center">
            <label class="sr-only" for="anomaly-matricula-filter">Filtrar por matrícula exata</label>
            <input
              id="anomaly-matricula-filter"
              v-model="matriculaFilter"
              type="search"
              class="campaign-control text-xs max-w-[170px]"
              placeholder="Matrícula exata"
              :disabled="!selectedCompetence"
              @input="handleMatriculaDebounced"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Estado: Carregando (primeira carga) -->
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

    <!-- Estado: Sem competência definida -->
    <div
      v-else-if="!selectedCompetence"
      class="rounded-2xl border border-sage-border bg-sage-light/40 p-10 text-center space-y-2"
      role="status"
    >
      <h3 class="text-base font-extrabold text-brand-dark">Selecione uma competência</h3>
      <p class="text-xs text-sage-muted max-w-md mx-auto">
        Escolha a competência na seção de bases da campanha para consultar os alertas estatísticos.
      </p>
    </div>

    <!-- Estado: Vazio -->
    <div
      v-else-if="!alerts.content.length"
      class="rounded-2xl border border-sage-border bg-sage-light/40 p-10 text-center space-y-3"
      role="status"
    >
      <CheckCircle2 class="mx-auto h-8 w-8 text-success-dark opacity-80" aria-hidden="true" />
      <h3 class="text-base font-extrabold text-brand-dark">Nenhum alerta ou anomalia estatística encontrada</h3>
      <p class="text-xs text-sage-muted max-w-md mx-auto">
        Não foram identificados desvios estatísticos com |Z| ≥ 3 ou inconsistências de cadastro para os filtros informados.
      </p>
      <div v-if="demoEnabled && !isDemoMode" class="pt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full border border-brand bg-brand px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-brand-hover shadow-sm"
          @click="loadDemoAnomalies"
        >
          <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Carregar Dados de Exemplo (Demonstração)</span>
        </button>
      </div>
    </div>

    <!-- Tabela de Alertas Estatísticos -->
    <div v-else class="space-y-4">
      <p v-if="isLoading" class="sr-only" role="status">Atualizando alertas estatísticos…</p>
      <div
        class="overflow-x-auto rounded-2xl border border-sage-border transition-opacity"
        :class="{ 'opacity-60': isLoading }"
        :aria-busy="isLoading ? 'true' : 'false'"
      >
        <table class="w-full min-w-[960px] text-left text-xs">
          <thead class="bg-sage-pill text-[10px] font-bold uppercase tracking-[0.1em] text-sage-muted border-b border-sage-border">
            <tr>
              <th scope="col" class="px-3.5 py-3.5">Classificação</th>
              <th scope="col" class="px-3.5 py-3.5">Referência</th>
              <th scope="col" class="px-3.5 py-3.5">Matrícula</th>
              <th scope="col" class="px-3.5 py-3.5">Grupo Comparável</th>
              <th scope="col" class="px-3.5 py-3.5 text-right font-black text-brand-dark">Valor Observado</th>
              <th scope="col" class="px-3.5 py-3.5 text-center">Faixa Esperada</th>
              <th scope="col" class="px-3.5 py-3.5 text-center">Método</th>
              <th scope="col" class="px-3.5 py-3.5 min-w-[420px]">Explicação Orientativa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light text-sage-subtle">
            <tr
              v-for="alerta in alerts.content"
              :key="alerta.id"
              class="transition hover:bg-sage-light/50"
            >
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

              <td class="px-3.5 py-3.5 whitespace-nowrap">
                <span class="block text-sage-muted font-mono font-medium">{{ getAlertReferenceLabel(alerta).value }}</span>
                <span class="block text-[10px] text-sage-muted">{{ getAlertReferenceLabel(alerta).hint }}</span>
              </td>

              <td class="px-3.5 py-3.5 whitespace-nowrap font-mono font-bold text-brand-dark">
                {{ alerta.matricula || '—' }}
              </td>

              <td class="px-3.5 py-3.5 font-medium text-brand-dark">
                <span class="block text-xs font-semibold whitespace-nowrap" :title="alerta.grupoComparavel || ''">
                  {{ parseComparableGroup(alerta.grupoComparavel).label }}
                </span>
              </td>

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

              <td class="px-3.5 py-3.5 text-center whitespace-nowrap">
                <template v-if="getEstimatedRange(alerta)">
                  <span class="text-xs font-bold text-brand-dark">{{ getEstimatedRange(alerta).label }}</span>
                  <span class="block text-[10px] font-medium text-sage-muted">
                    {{ getEstimatedRange(alerta).uniform ? 'Desvio padrão zero no grupo' : 'Faixa estimada (±3σ)' }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-sage-muted">—</span>
                </template>
              </td>

              <td class="px-3.5 py-3.5 text-center whitespace-nowrap">
                <span class="rounded bg-sage-light px-2 py-0.5 text-[10px] font-bold text-sage-muted" :title="alerta.metodo || ''">
                  {{ formatMethodLabel(alerta) }}
                </span>
              </td>

              <td class="px-3.5 py-3.5 text-xs text-sage-subtle leading-relaxed">
                {{ getAlertExplanation(alerta) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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

    <!-- Modal de Confirmação de Reprocessamento de Lote (teleportado para cobrir também a sidebar) -->
    <Teleport to="body">
    <div
      v-if="showReprocessModal"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
      @click.self="closeReprocessModal"
    >
      <div
        ref="reprocessDialogRef"
        class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reprocess-modal-title"
        aria-describedby="reprocess-modal-description"
        tabindex="-1"
        @keydown.esc.stop="closeReprocessModal"
      >
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
            class="focus-ring rounded-lg p-1 text-sage-muted hover:text-brand-dark"
            aria-label="Fechar modal"
            :disabled="isReprocessing"
            @click="closeReprocessModal"
          >
            ✕
          </button>
        </div>

        <p id="reprocess-modal-description" class="text-xs text-sage-muted leading-relaxed">
          Esta ação solicitará ao servidor a reanálise estatística completa do lote de preparação
          <strong class="text-brand-dark font-bold">{{ selectedLotLabel }}</strong>.
          Alertas cujas bases mudaram serão substituídos; se nada mudou, nenhum alerta é recalculado.
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
    </Teleport>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { RefreshCw, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-vue-next'
import { formatCurrencyPtBr } from '@/services/currencyUtils'
import defaultStatisticalAlertsApi from '@/services/statisticalAlertsApi'
import { useAccessPolicy } from '@/services/useAccessPolicy'
import {
  TIPO_ALERTA,
  TIPO_ALERTA_LABEL,
  getEstimatedRange,
  parseComparableGroup,
  getAlertReferenceLabel,
  formatMethodLabel,
  formatCompetenceLabel,
  getAlertExplanation,
  buildLotOptions,
  describeAlertsError,
  describeReprocessResult,
  reprocessDeniedMessage,
  createLatestGuard
} from '@/services/statisticalAlertsLogic'
import {
  isAnomaliesDemoEnabled,
  buildDemoAlerts,
  buildDemoLots,
  filterDemoAlerts,
  countDemoAlerts,
  simulateDemoReprocess,
  DEMO_LOT_SALES_ID
} from '@/services/statisticalAlertsDemo'

const props = defineProps({
  campaign: { type: Object, default: () => ({}) },
  /** Lotes de preparação (LotePreparacaoResponseDTO) da campanha; apenas EFETIVADO são exibidos. */
  activeLots: { type: Array, default: () => [] },
  /** Competência AAAA-MM sincronizada pela tela (v-model:competence). */
  competence: { type: String, default: '' },
  initialAlerts: { type: Object, default: null },
  apiClient: { type: Object, default: null },
  accessPolicy: { type: Object, default: null },
  /** Permite o modo demonstração; por padrão segue VITE_ANOMALIES_DEMO. */
  demoEnabled: { type: Boolean, default: isAnomaliesDemoEnabled }
})

const emit = defineEmits(['loaded', 'reprocessed', 'update:competence'])

const EMPTY_PAGE = Object.freeze({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 })
const EMPTY_COUNTS = Object.freeze({ totalOutliers: 0, totalInconsistencias: 0, totalSemAmostra: 0, totalGeral: 0 })
const pageSize = 20

const typeChips = [
  { value: '', label: 'Todos', countKey: 'totalGeral', dot: '' },
  { value: TIPO_ALERTA.OUTLIER_VENDA, label: 'Anomalias', countKey: 'totalOutliers', dot: 'bg-danger' },
  { value: TIPO_ALERTA.SEM_VENDAS_PARA_RH, label: 'Inconsistências de Carga', countKey: 'totalInconsistencias', dot: 'bg-warning' },
  { value: TIPO_ALERTA.AMOSTRA_INSUFICIENTE, label: 'Amostra Insuficiente', countKey: 'totalSemAmostra', dot: 'bg-sage-muted' }
]

// ----- Acesso (SoD) -----
let safeAccess = null
try {
  safeAccess = useAccessPolicy()
} catch {
  safeAccess = { can: () => true, role: null }
}
const access = computed(() => props.accessPolicy || safeAccess)
const canReprocess = computed(() => access.value.can('reprocessAnomalies'))
const currentRole = computed(() => {
  const r = access.value.role
  return r && typeof r === 'object' && 'value' in r ? r.value : r
})
const deniedMessage = computed(() => reprocessDeniedMessage(currentRole.value))

const api = computed(() => props.apiClient || defaultStatisticalAlertsApi)

// ----- Filtros e paginação -----
const selectedType = ref('')
const selectedLot = ref('')
const matriculaFilter = ref('')
const page = ref(0)
const sort = ref('geradoEm,desc')

function campaignStartCompetence() {
  return props.campaign?.dataInicio ? String(props.campaign.dataInicio).slice(0, 7) : ''
}

const selectedCompetence = ref(props.competence || campaignStartCompetence())

const availableCompetences = computed(() => {
  const start = campaignStartCompetence()
  const end = props.campaign?.dataFim ? String(props.campaign.dataFim).slice(0, 7) : ''
  const list = []
  if (start) {
    list.push(start)
    let curr = start
    while (end && curr < end && list.length <= 24) {
      const [anoStr, mesStr] = curr.split('-')
      let ano = parseInt(anoStr, 10)
      let mes = parseInt(mesStr, 10) + 1
      if (mes > 12) { mes = 1; ano += 1 }
      curr = `${ano}-${String(mes).padStart(2, '0')}`
      list.push(curr)
    }
  }
  // Competência sincronizada fora da vigência continua selecionável para não deixar o seletor inconsistente
  if (selectedCompetence.value && !list.includes(selectedCompetence.value)) list.push(selectedCompetence.value)
  return list.sort()
})

// ----- Modo demonstração -----
const isDemoMode = ref(false)
const demoAlerts = computed(() => (isDemoMode.value ? buildDemoAlerts(selectedCompetence.value) : []))

const availableLots = computed(() =>
  isDemoMode.value ? buildLotOptions(buildDemoLots(selectedCompetence.value)) : buildLotOptions(props.activeLots)
)
const selectedLotLabel = computed(() => availableLots.value.find(l => l.id === selectedLot.value)?.label || selectedLot.value)

// ----- Dados -----
const alerts = ref(props.initialAlerts || { ...EMPTY_PAGE })
const counts = ref({ ...EMPTY_COUNTS })
const isLoading = ref(false)
const loadError = ref('')
const requestGuard = createLatestGuard()

// ----- Reprocessamento -----
const isReprocessing = ref(false)
const showReprocessModal = ref(false)
const reprocessFeedback = ref(null)
const reprocessErrorMessage = ref('')
const reprocessDialogRef = ref(null)
const reprocessTriggerRef = ref(null)

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

function resetScopeForCompetence() {
  page.value = 0
  selectedLot.value = ''
  isDemoMode.value = false
  reprocessFeedback.value = null
  reprocessErrorMessage.value = ''
}

function handleCompetenceChange() {
  resetScopeForCompetence()
  emit('update:competence', selectedCompetence.value)
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

function loadDemoAnomalies() {
  if (!props.demoEnabled || !selectedCompetence.value) return
  isDemoMode.value = true
  selectedLot.value = DEMO_LOT_SALES_ID
  page.value = 0
  void loadData()
}

function resetToRealData() {
  isDemoMode.value = false
  selectedLot.value = ''
  page.value = 0
  reprocessFeedback.value = null
  void loadData()
}

function currentBaseFilters() {
  return {
    competencia: selectedCompetence.value,
    matricula: matriculaFilter.value.trim() || undefined,
    lotePreparacaoId: selectedLot.value || undefined
  }
}

async function loadData() {
  const token = requestGuard.next()
  loadError.value = ''

  if (!selectedCompetence.value) {
    isLoading.value = false
    alerts.value = { ...EMPTY_PAGE }
    counts.value = { ...EMPTY_COUNTS }
    return
  }

  const baseFilters = currentBaseFilters()

  if (isDemoMode.value) {
    // Dados de exemplo nunca são emitidos para a tela pai (evento loaded) para não contaminar indicadores reais
    const content = filterDemoAlerts(demoAlerts.value, { ...baseFilters, tipo: selectedType.value || undefined })
    alerts.value = { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: pageSize }
    counts.value = countDemoAlerts(demoAlerts.value, baseFilters)
    isLoading.value = false
    return
  }

  isLoading.value = true
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
    if (!requestGuard.isCurrent(token)) return

    alerts.value = alertsData || { ...EMPTY_PAGE }
    counts.value = countsData || { ...EMPTY_COUNTS }
    emit('loaded', { alerts: alerts.value, counts: counts.value })
  } catch (err) {
    if (!requestGuard.isCurrent(token)) return
    loadError.value = describeAlertsError(err, 'list')
  } finally {
    if (requestGuard.isCurrent(token)) isLoading.value = false
  }
}

async function reloadAlerts() {
  await loadData()
}

function openReprocessModal() {
  if (!canReprocess.value || isReprocessing.value || !selectedLot.value) return
  showReprocessModal.value = true
  void nextTick(() => reprocessDialogRef.value?.focus?.())
}

function closeReprocessModal() {
  if (isReprocessing.value) return
  showReprocessModal.value = false
  void nextTick(() => reprocessTriggerRef.value?.focus?.())
}

async function confirmReprocessLote() {
  if (!selectedLot.value || !canReprocess.value || isReprocessing.value) return
  const loteId = selectedLot.value
  isReprocessing.value = true
  reprocessFeedback.value = null
  reprocessErrorMessage.value = ''

  try {
    let result
    if (isDemoMode.value) {
      await new Promise(resolve => setTimeout(resolve, 600))
      result = simulateDemoReprocess(loteId, demoAlerts.value)
    } else {
      result = await api.value.reprocessLote(loteId)
    }
    reprocessFeedback.value = describeReprocessResult(result)
    if (!isDemoMode.value) emit('reprocessed', result)
    isReprocessing.value = false
    closeReprocessModal()
    await loadData()
  } catch (err) {
    reprocessErrorMessage.value = describeAlertsError(err, 'reprocess')
    isReprocessing.value = false
    closeReprocessModal()
  } finally {
    isReprocessing.value = false
  }
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
    resetScopeForCompetence()
    void loadData()
  }
})

// Lote selecionado que deixou de existir (descartado, outra competência) é limpo para não filtrar por id órfão
watch(availableLots, (lots) => {
  if (selectedLot.value && !lots.some(l => l.id === selectedLot.value)) {
    selectedLot.value = ''
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

onBeforeUnmount(() => {
  clearTimeout(debounceTimeout)
})

defineExpose({
  reloadAlerts,
  loadData,
  selectedCompetence,
  selectedType,
  selectedLot,
  availableLots,
  alerts,
  counts,
  isDemoMode,
  showReprocessModal,
  reprocessFeedback,
  reprocessErrorMessage,
  openReprocessModal,
  confirmReprocessLote,
  loadDemoAnomalies,
  resetToRealData
})
</script>
