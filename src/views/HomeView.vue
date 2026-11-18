<template>
  <div class="space-y-7">
    <PageHeader title="Visão geral" description="Acompanhe os dados e o ciclo das suas campanhas.">
      <template #action>
        <RouterLink
          v-if="access.can('createCampaign')" to="/campanhas/nova"
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
        class="rounded-2xl bg-white p-6"
      >
        <p class="text-sm font-medium text-sage-muted">{{ card.label }}</p>
        <p class="mt-6 text-4xl font-extrabold tracking-[-0.05em] text-brand-dark">{{ card.value }}</p>
        <p class="mt-2 text-xs text-sage-muted">{{ card.detail }}</p>
      </article>
    </section>

    <!-- Sinalização de Alertas Estatísticos e Novos Casos ([FRONT-6]) -->
    <section
      v-if="access.can('viewAnomalies')"
      class="rounded-2xl border bg-white p-6 sm:p-7 shadow-sm space-y-4"
      :class="anomalySummary.hasNewCases48h && !anomalySummary.error ? 'border-danger/40 bg-danger-bg/20' : 'border-sage-border'"
      aria-labelledby="home-anomalies-heading"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start sm:items-center gap-3">
          <div
            class="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            :class="anomalySummary.hasNewCases48h && !anomalySummary.error ? 'bg-danger/10 text-danger-dark' : 'bg-sage-light text-brand-dark'"
          >
            <AlertTriangle class="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="home-anomalies-heading" class="text-lg font-extrabold tracking-[-0.03em] text-brand-dark">
                Alertas Estatísticos e Anomalias de Vendas
              </h2>
              <span
                v-if="anomalySummary.hasNewCases48h && !anomalySummary.error"
                class="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-0.5 text-xs font-black text-white animate-pulse"
              >
                ● Novos casos nas últimas 48h
              </span>
            </div>

            <!-- Estado de erro explícito: erro nunca aparece como contador zerado -->
            <div v-if="anomalySummary.error" class="mt-1 flex items-center gap-2 text-xs text-danger-dark" role="alert">
              <span>Não foi possível carregar os alertas: {{ anomalySummary.error }}</span>
              <button
                type="button"
                class="font-bold underline underline-offset-2 hover:text-danger-dark/80 ml-1"
                @click="retryAnomalySummary"
              >
                Tentar novamente
              </button>
            </div>

            <!-- Estado de carregamento -->
            <p v-else-if="anomalySummary.loading" class="mt-0.5 text-xs text-sage-muted" role="status">
              Carregando alertas estatísticos…
            </p>

            <!-- Estado de sucesso com dados -->
            <p v-else class="mt-0.5 text-xs text-sage-muted">
              Competência em exibição: <strong class="text-brand-dark">{{ formatCompetenceDisplay(anomalySummary.competencia) }}</strong> ·
              <strong class="text-brand-dark">{{ anomalySummary.totalOutliers }}</strong> anomalia(s) estatística(s) (&gt;3σ) e
              <strong class="text-brand-dark">{{ anomalySummary.totalInconsistencias }}</strong> inconsistência(s) de carga.
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

    <section class="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
      <article class="rounded-2xl bg-white p-6 sm:p-7">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Campanhas recentes</h2>
          <RouterLink to="/campanhas" class="focus-ring text-sm font-semibold underline underline-offset-4 text-brand-dark">Ver todas →</RouterLink>
        </div>
        <div class="mt-6 overflow-x-auto">
          <div v-if="campaignsLoading" class="rounded-xl bg-sage-light px-4 py-6 text-sm text-sage-muted" role="status">Carregando campanhas recentes…</div>
          <p v-else-if="campaignsError" class="rounded-xl border border-danger/30 bg-danger-bg px-4 py-4 text-sm leading-6 text-danger-dark" role="alert">{{ campaignsError }}</p>
          <p v-else-if="campaigns.length === 0" class="rounded-xl bg-sage-light px-4 py-6 text-sm text-sage-muted">Nenhuma campanha cadastrada ainda.</p>
          <table v-else class="w-full min-w-[520px] text-left text-sm">
            <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
              <tr>
                <th class="rounded-l-xl px-4 py-3 font-semibold">Campanha</th>
                <th class="px-4 py-3 font-semibold">Situação</th>
                <th class="rounded-r-xl px-4 py-3 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sage-border-light">
              <tr v-for="campaign in campaigns" :key="campaign.id">
                <td class="px-4 py-4">
                  <p class="font-bold text-brand-dark">{{ campaign.titulo }}</p>
                  <p class="mt-1 text-xs text-sage-muted">{{ formatPeriod(campaign.dataInicio, campaign.dataFim) }}</p>
                </td>
                <td class="px-4 py-4"><StatusBadge :label="formatCampaignState(campaign.estado)" :tone="campaignStateTone(campaign.estado)" /></td>
                <td class="px-4 py-4">
                  <RouterLink :to="`/campanhas/${campaign.id}`" class="focus-ring font-semibold underline underline-offset-4 text-brand-dark">
                    Ver campanha →
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
      <p class="mt-2 max-w-2xl text-sm leading-6 text-sage-muted">Acompanhe as pendências e certifique-se de que os ciclos mensais foram validados antes da apuração.</p>
      <RouterLink v-if="access.can('viewData')" to="/dados" class="focus-ring mt-5 inline-flex font-semibold underline underline-offset-4 text-brand-dark">Revisar competência →</RouterLink>
    </section>
  </div>
</template>

<script setup>
import { useAccessPolicy } from '@/services/useAccessPolicy'
const access = useAccessPolicy()
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { AlertTriangle } from 'lucide-vue-next'
import defaultStatisticalAlertsApi from '@/services/statisticalAlertsApi'
import { extractAlertCompetence } from '@/services/statisticalAlertsLogic'
import { campaignDemo, isCampaignDemoEnabled } from '@/services/campaignDemo'
import { campaignService, normalizeCampaignError } from '@/services/campaignService'
import { campaignStateTone, formatCampaignState, formatPeriod } from '@/services/campaignMappers'

const metrics = [
  { label: 'Competências cadastradas', value: '3', detail: 'RH, Vendas e Comissão' },
  { label: 'Campanhas', value: '2', detail: 'Regras e campanhas aprovadas' },
  { label: 'Aguardando apuração', value: '1', detail: 'Campanhas com vigência encerrada' },
  { label: 'Pendências nos dados', value: '3', detail: 'Revisão antes dos cálculos' }
]

const props = defineProps({
  initialAnomalySummary: {
    type: Object,
    default: null
  }
})

const campaigns = ref([])
const campaignsLoading = ref(true)
const campaignsError = ref('')

const anomalySummary = ref({
  competencia: '2025-08',
  hasNewCases48h: false,
  totalOutliers: 0,
  totalInconsistencias: 0,
  totalGeral: 0,
  loading: !props.initialAnomalySummary,
  error: '',
  ...(props.initialAnomalySummary || {})
})

function formatCompetenceDisplay(comp) {
  if (!comp) return ''
  const m = String(comp).match(/^(\d{4})-(\d{2})$/)
  if (m) return `${m[2]}/${m[1]}`
  return comp
}

const process = [
  { number: 1, title: 'Prepare as bases mensais', detail: 'Importe RH, Vendas e Comissão.' },
  { number: 2, title: 'Crie e simule a campanha', detail: 'Revise as regras e o orçamento.' },
  { number: 3, title: 'Aprove a regra', detail: 'Registre a decisão e a versão.' },
  { number: 4, title: 'Apure os resultados', detail: 'Compare a simulação com o realizado.' }
]

async function loadAnomalySummary(competence) {
  anomalySummary.value.loading = true
  anomalySummary.value.error = ''
  let targetCompetence = competence

  try {
    // Prioridade 2: Sem competência definida por campanha ativa, busca a competência do último alerta registrado
    if (!targetCompetence) {
      const latest = await defaultStatisticalAlertsApi.listAlerts({ size: 1, sort: 'dataReferencia,desc' })
      const topAlert = latest?.content?.[0]
      if (topAlert) {
        targetCompetence = extractAlertCompetence(topAlert)
      }
    }

    // Prioridade 3: Fallback usando data local (getFullYear e getMonth + 1)
    if (!targetCompetence) {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      targetCompetence = `${year}-${month}`
    }

    anomalySummary.value.competencia = targetCompetence

    const [newCasesCheck, counts] = await Promise.all([
      defaultStatisticalAlertsApi.checkNewCases48h(targetCompetence),
      defaultStatisticalAlertsApi.countAlertsByType({ competencia: targetCompetence })
    ])
    anomalySummary.value.hasNewCases48h = Boolean(newCasesCheck?.hasNewCases48h)
    anomalySummary.value.totalOutliers = counts?.totalOutliers ?? 0
    anomalySummary.value.totalInconsistencias = counts?.totalInconsistencias ?? 0
    anomalySummary.value.totalGeral = counts?.totalGeral ?? 0
  } catch (err) {
    anomalySummary.value.error = err?.response?.data?.message || err?.message || 'Falha ao consultar alertas no servidor.'
  } finally {
    anomalySummary.value.loading = false
  }
}

async function retryAnomalySummary() {
  await loadAnomalySummary(anomalySummary.value.competencia)
}

onMounted(async () => {
  let detectedCompetence = ''
  try {
    const list = isCampaignDemoEnabled ? campaignDemo.list() : await campaignService.list()
    campaigns.value = list.slice(0, 3)

    // Prioridade 1: Apenas campanhas em estado ATIVA com dataInicio definida, ordenadas pela mais recente
    const activeCampaigns = (list || [])
      .filter(c => c.estado === 'ATIVA' && c.dataInicio)
      .sort((a, b) => String(b.dataInicio).localeCompare(String(a.dataInicio)))

    if (activeCampaigns.length > 0) {
      detectedCompetence = String(activeCampaigns[0].dataInicio).slice(0, 7)
    }
  } catch (error) {
    campaignsError.value = normalizeCampaignError(error).message
  } finally {
    campaignsLoading.value = false
  }

  if (access.can('viewAnomalies') && !props.initialAnomalySummary) {
    await loadAnomalySummary(detectedCompetence)
  }
})
</script>
