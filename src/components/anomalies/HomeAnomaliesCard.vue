<template>
  <!-- Sinalização de Alertas Estatísticos e Novos Casos ([FRONT-6]) -->
  <section
    class="rounded-2xl border bg-white p-6 sm:p-7 space-y-4"
    :class="showNewCases ? 'border-danger/40 bg-danger-bg/20' : 'border-sage-border'"
    aria-labelledby="home-anomalies-heading"
    :aria-busy="summary.loading ? 'true' : 'false'"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-start sm:items-center gap-3">
        <div
          class="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          :class="showNewCases ? 'bg-danger/10 text-danger-dark' : 'bg-sage-light text-brand-dark'"
        >
          <AlertTriangle class="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="home-anomalies-heading" class="text-lg font-extrabold tracking-[-0.03em] text-brand-dark">
              Alertas Estatísticos e Anomalias de Vendas
            </h2>
            <span
              v-if="showNewCases"
              class="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-0.5 text-xs font-black text-white motion-safe:animate-pulse"
            >
              ● Novos casos nas últimas 48h
            </span>
          </div>

          <!-- Erro explícito: nunca aparece como contador zerado -->
          <div v-if="summary.error" class="mt-1 flex items-center gap-2 text-xs text-danger-dark" role="alert">
            <span>Não foi possível carregar os alertas: {{ summary.error }}</span>
            <button type="button" class="focus-ring font-bold underline underline-offset-2 hover:text-danger-dark/80 ml-1" @click="retry">
              Tentar novamente
            </button>
          </div>

          <p v-else-if="summary.loading" class="mt-0.5 text-xs text-sage-muted" role="status">
            Carregando alertas estatísticos…
          </p>

          <p v-else class="mt-0.5 text-xs text-sage-muted">
            Competência em exibição: <strong class="text-brand-dark">{{ formatCompetenceLabel(summary.competencia) }}</strong> ·
            <strong class="text-brand-dark">{{ summary.totalOutliers }}</strong> anomalia(s) estatística(s) (|Z| ≥ 3) e
            <strong class="text-brand-dark">{{ summary.totalInconsistencias }}</strong> inconsistência(s) de carga.
          </p>
        </div>
      </div>

      <RouterLink
        to="/campanhas"
        class="focus-ring inline-flex items-center gap-1 text-sm font-bold text-brand-dark underline underline-offset-4 hover:text-brand-dark/80 whitespace-nowrap"
      >
        <span>Conferir anomalias nas campanhas →</span>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import defaultStatisticalAlertsApi, { loadHomeAnomalySummary } from '@/services/statisticalAlertsApi'
import { describeAlertsError, formatCompetenceLabel, createLatestGuard } from '@/services/statisticalAlertsLogic'

const props = defineProps({
  /** Campanhas já carregadas pela Home (usadas para escolher a competência em exibição). */
  campaigns: { type: Array, default: () => [] },
  campaignsLoading: { type: Boolean, default: false },
  initialSummary: { type: Object, default: null },
  apiClient: { type: Object, default: null }
})

const api = computed(() => props.apiClient || defaultStatisticalAlertsApi)
const guard = createLatestGuard()

const summary = ref({
  competencia: '',
  hasNewCases48h: false,
  totalOutliers: 0,
  totalInconsistencias: 0,
  totalGeral: 0,
  loading: !props.initialSummary,
  error: '',
  ...(props.initialSummary || {})
})

const showNewCases = computed(() => summary.value.hasNewCases48h && !summary.value.error && !summary.value.loading)

async function load(competence) {
  const token = guard.next()
  summary.value = { ...summary.value, loading: true, error: '' }
  try {
    const result = await loadHomeAnomalySummary(api.value, { competence, campaigns: props.campaigns })
    if (!guard.isCurrent(token)) return
    summary.value = { ...result, loading: false, error: '' }
  } catch (err) {
    if (!guard.isCurrent(token)) return
    summary.value = { ...summary.value, loading: false, error: describeAlertsError(err, 'list') }
  }
}

function retry() {
  void load(summary.value.competencia)
}

// Aguarda a Home terminar de carregar as campanhas para escolher a competência uma única vez
let started = false
function startWhenReady() {
  if (started || props.initialSummary || props.campaignsLoading) return
  started = true
  void load()
}

watch(() => props.campaignsLoading, startWhenReady)
onMounted(startWhenReady)

defineExpose({ load, summary })
</script>
