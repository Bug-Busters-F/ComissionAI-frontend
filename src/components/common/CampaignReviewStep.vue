<template>
  <div class="space-y-5">
    <CampaignSummary
      :title="'Revisão consolidada'"
      :subtitle="isPersisted ? 'Confira as informações consolidadas da campanha e o status atual.' : 'Confira as informações da proposta, os resultados da simulação aceita e confirme explicitamente antes de ativar.'"
      :badge="stateLabel"
      :summary-items="summaryItems"
      :original-text="form.textoOriginal"
    />

    <!-- 1. Alerta de Bloqueio se a Simulação não foi Aceita ou foi Invalidada ([FRONT-6]) -->
    <section
      v-if="!hasValidAcceptedSimulation"
      class="rounded-[22px] border border-warning-border bg-warning-bg p-6 sm:p-7"
      role="alert"
      aria-labelledby="review-simulation-missing-heading"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-warning-dark">
            <AlertTriangle class="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="review-simulation-missing-heading" class="text-xl font-extrabold text-brand-dark">
                {{ hasInvalidation ? 'Simulação desatualizada — Novo aceite obrigatório' : 'Simulação pendente de aceite' }}
              </h2>
              <StatusBadge :label="hasInvalidation ? 'Aceite retirado' : 'Pendente'" tone="warning" />
            </div>
            <p class="mt-2 text-sm leading-6 text-warning-dark">
              {{
                hasInvalidation
                  ? 'A proposta, a competência, a vigência ou os dados de referência mudaram após o aceite da simulação. A ativação da campanha está bloqueada até que uma nova simulação seja executada e aceita.'
                  : 'Para ativar a campanha, é obrigatório executar uma simulação sobre uma competência cadastrada e registrar o aceite explícito dos resultados.'
              }}
            </p>
            <ul v-if="hasInvalidation" class="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-warning-dark">
              <li v-for="(reason, idx) in simulation.invalidationReasons" :key="idx">
                {{ userFacingText(reason) }}
              </li>
            </ul>
          </div>
        </div>

        <button
          type="button"
          class="focus-ring shrink-0 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover"
          @click="$emit('go-to-simulation')"
        >
          ← Ir para Simulação
        </button>
      </div>
    </section>

    <!-- 2. Resultados da Simulação Aceita e Cenários Projetados ([FRONT-5] + [FRONT-6]) -->
    <section
      v-else
      class="rounded-[22px] bg-white p-6 sm:p-7"
      aria-labelledby="review-simulation-heading"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2.5">
            <h2 id="review-simulation-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">
              Resultados da simulação aceita
            </h2>
            <StatusBadge label="Simulação aceita" tone="success" />
            <code class="rounded-full bg-sage-light px-3 py-1 text-xs font-bold text-brand-dark">
              ID: {{ simulationResult.simulationId }}
            </code>
          </div>
          <p class="mt-1 text-sm text-sage-muted">
            Competência de referência <strong class="font-bold text-brand-dark">{{ simulationResult.competencia }}</strong> ·
            Origem: <strong class="font-bold text-brand-dark">{{ simulationResult.origemDados }}</strong>
          </p>
        </div>

        <button
          type="button"
          class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
          @click="$emit('go-to-simulation')"
        >
          Rever tabela e memória do cálculo
        </button>
      </div>

      <!-- Resumo de Premissas e Totais Consolidados -->
      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Público considerado</p>
          <p class="mt-2 text-base font-extrabold text-brand-dark">
            {{ simulationTotals.totalVendasConsideradas }} venda(s) únicas
          </p>
          <p class="mt-1 text-xs text-sage-muted">Vendas fora do público excluídas</p>
        </div>

        <div class="rounded-2xl bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Duração e fator (30 dias)</p>
          <p class="mt-2 text-base font-extrabold text-brand-dark">
            {{ simulationTotals.duracaoCampanhaDias }} dia(s) · {{ simulationTotals.fatorDuracaoTexto }}
          </p>
          <p class="mt-1 text-xs text-sage-muted">Mês comercial de 30 dias</p>
        </div>

        <div class="rounded-2xl bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Comissão projetada (campanha)</p>
          <p class="mt-2 text-base font-extrabold text-brand-dark">
            {{ currency(simulationTotals.projetado.comissaoProposta) }}
          </p>
          <p class="mt-1 text-xs text-sage-muted">
            Base sem campanha: {{ currency(simulationTotals.projetado.comissaoBase) }}
          </p>
        </div>

        <div class="rounded-2xl bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Impacto projetado (100%)</p>
          <p class="mt-2 text-base font-extrabold text-brand-dark">
            {{ signedCurrency(simulationTotals.projetado.diferenca) }}
          </p>
          <p class="mt-1 text-xs text-sage-muted">
            Variação de {{ percent(simulationTotals.projetado.impactoPct) }} sobre a base
          </p>
        </div>
      </div>

      <!-- Cards dos Cenários Projetados (80%, 120% e 150%) -->
      <div class="mt-6 grid gap-4 xl:grid-cols-3">
        <article
          v-for="scenario in projectedVariationCards"
          :key="scenario.key"
          class="rounded-2xl border border-sage-border-light p-5"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
              {{ scenario.percentage }} do valor das vendas
            </p>
            <h3 class="mt-1.5 text-lg font-extrabold text-brand-dark">
              {{ scenario.classification }}
            </h3>
          </div>
          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-sage-muted">Vendas projetadas</dt>
              <dd class="font-bold text-brand-dark">{{ currency(scenario.sales) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-sage-muted">Sem proposta (base)</dt>
              <dd class="font-bold text-brand-dark">{{ currency(scenario.withoutProposal) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-sage-muted">Com proposta (campanha)</dt>
              <dd class="font-bold text-brand-dark">{{ currency(scenario.withProposal) }}</dd>
            </div>
            <div class="flex justify-between gap-3 border-t border-sage-border-light pt-2">
              <dt class="font-semibold text-brand-dark">Diferença</dt>
              <dd class="font-extrabold text-brand-dark">
                {{ signedCurrency(scenario.impact) }} ({{ percent(scenario.impactPct) }})
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <!-- Confirmação Humana Explícita para Ativação ([FRONT-6]) -->
      <div
        v-if="canApprove"
        class="mt-6 rounded-2xl border border-sage-border-dark bg-sage-light p-4 sm:p-5"
      >
        <label class="flex cursor-pointer items-start gap-3.5">
          <input
            type="checkbox"
            data-testid="confirm-activation-checkbox"
            :checked="simulation.explicitActivationConfirmed"
            class="focus-ring mt-1 h-4 w-4 rounded border-sage-border-dark text-brand-dark"
            @change="$emit('toggle-activation-confirm', $event.target.checked)"
          />
          <span class="text-sm leading-6 text-brand-dark">
            <strong class="font-extrabold">Confirmação explícita para ativação:</strong>
            Confirmo que revisei as regras parametrizadas, a competência de referência
            <strong>{{ simulationResult.competencia }}</strong> e os resultados da simulação aceita
            (ID <code>{{ simulationResult.simulationId }}</code>), autorizando a ativação imediata desta campanha.
          </span>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup>
import { userFacingText } from '@/services/userFacingText'
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import CampaignSummary from './CampaignSummary.vue'
import StatusBadge from './StatusBadge.vue'
import { formatCampaignChannel, formatCampaignState, formatPeriodArrow } from '@/services/campaignMappers'
import { formatSimulationCurrency, formatSimulationPercent } from '@/services/campaignSimulation'

const props = defineProps({
  form: { type: Object, required: true },
  persistedState: { type: String, default: '' },
  campaignId: { type: [String, Number], default: null },
  demo: { type: Object, required: true },
  canApprove: { type: Boolean, default: true },
  simulation: {
    type: Object,
    default: () => ({
      accepted: false,
      result: null,
      invalidationReasons: [],
      explicitActivationConfirmed: false
    })
  }
})

defineEmits(['go-to-simulation', 'toggle-activation-confirm'])

const summaryItems = computed(() => [
  { label: 'Canal', value: formatCampaignChannel(props.form.canal) },
  { label: 'Vigência', value: formatPeriodArrow(props.form.dataInicio, props.form.dataFim) },
  { label: 'Regra percentual', value: props.form.taxaPercentual ? `${props.form.taxaPercentual}%` : 'Não informado' },
  { label: 'Marca', value: props.form.descrMarca || 'Não informada' },
  { label: 'Código da marca', value: props.form.codMarca || 'Não informado' },
  { label: 'Código da loja', value: props.form.codLoja || 'Não informado' },
  { label: 'Cargo', value: props.form.descriCargo || 'Não informado' },
  { label: 'Código do cargo', value: props.form.codCargo || 'Não informado' },
  { label: 'Matrícula', value: props.form.matricula || 'Todos' }
])

const isPersisted = computed(() => Boolean(props.campaignId))
const stateLabel = computed(() => props.persistedState ? formatCampaignState(props.persistedState) : 'Não salva')

const hasInvalidation = computed(() =>
  Array.isArray(props.simulation?.invalidationReasons) &&
  props.simulation.invalidationReasons.length > 0
)

const simulationResult = computed(() => props.simulation?.result || null)

const hasValidAcceptedSimulation = computed(() =>
  Boolean(
    props.simulation?.accepted &&
      simulationResult.value &&
      !hasInvalidation.value
  )
)

const simulationTotals = computed(() => simulationResult.value?.totals || {
  totalVendasConsideradas: 0,
  duracaoCampanhaDias: 30,
  fatorDuracaoTexto: '30/30 dias (1,0000x)',
  historico: { totalVendas: 0, comissaoBase: 0, comissaoProposta: 0, diferenca: 0, impactoPct: 0 },
  projetado: { totalVendas: 0, comissaoBase: 0, comissaoProposta: 0, diferenca: 0, impactoPct: 0 }
})

const projectedVariationCards = computed(() => {
  const scenarios = simulationResult.value?.scenarios || []
  const filtered = scenarios.filter((item) => ['80', '120', '150'].includes(String(item.key)))
  return filtered.length ? filtered : scenarios
})

function currency(value) {
  return formatSimulationCurrency(value)
}

function signedCurrency(value) {
  const numeric = Number(value || 0)
  const formatted = formatSimulationCurrency(Math.abs(numeric))
  return numeric >= 0 ? `+${formatted}` : `-${formatted}`
}

function percent(value) {
  return formatSimulationPercent(value)
}
</script>
