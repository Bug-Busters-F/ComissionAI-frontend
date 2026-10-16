<template>
  <div class="space-y-5">
    <!-- Bloqueio de Cobertura de Base na Simulação -->
    <section
      v-if="isBlocked"
      class="rounded-[22px] border border-warning-border bg-white p-6 shadow-sm sm:p-7"
      aria-labelledby="simulation-blocked-heading"
      role="alert"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning-bg text-warning-dark">
            <ShieldAlert class="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="simulation-blocked-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">
                Simulação Bloqueada: Base Contratual Ausente
              </h2>
              <StatusBadge label="Bloqueio Financeiro" tone="warning" />
            </div>
            <p class="mt-2 text-sm leading-6 text-sage-muted">
              {{ coverageCheck.mensagem || 'Esta proposta atinge um público sem base de comissão aplicável cadastrada em tb_basecomiss.' }}
            </p>

            <div v-if="coverageCheck.missingBases?.length" class="mt-4 rounded-xl border border-sage-border-light bg-sage-light p-3.5">
              <p class="text-xs font-bold uppercase tracking-[0.1em] text-sage-muted">Combinação sem cobertura contratual:</p>
              <ul class="mt-1.5 space-y-1 text-sm font-semibold text-brand-dark">
                <li v-for="(base, idx) in coverageCheck.missingBases" :key="idx">
                  Marca: <span class="font-bold">{{ base.marca }}</span> · Cargo: <span class="font-bold">{{ base.cargo }}</span>
                </li>
              </ul>
            </div>

            <ul v-if="coverageCheck.messages?.length" class="mt-3 list-disc space-y-1 pl-5 text-xs text-warning-dark">
              <li v-for="(msg, idx) in coverageCheck.messages" :key="idx">{{ msg }}</li>
            </ul>
          </div>
        </div>

        <RouterLink
          to="/dados"
          class="focus-ring inline-flex items-center gap-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover"
        >
          <UploadCloud class="h-4 w-4" aria-hidden="true" />
          <span>Ir para Gestão de Dados (Importar COMISS)</span>
        </RouterLink>
      </div>

      <div class="mt-6 flex items-start gap-3 rounded-2xl border border-sage-border-light bg-sage-light p-4 text-xs leading-5 text-sage-muted">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-warning-dark" aria-hidden="true" />
        <div>
          <strong class="font-bold text-brand-dark">Proteção contra taxas fictícias:</strong>
          Projeções numéricas e simulações foram bloqueadas para manter a governança orçamentária e a conformidade contábil. Nenhuma taxa simulada ou fictícia pode ser utilizada para contornar a ausência da tabela contratual oficial.
        </div>
      </div>
    </section>

    <!-- Fluxo normal de simulação quando há cobertura -->
    <section v-else class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="simulation-heading">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="simulation-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Simulação</h2>
          <p class="mt-2 text-sm text-sage-muted">Explore cenários para revisar o impacto da proposta antes de concluir.</p>
        </div>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="premise in CAMPAIGN_SIMULATION_PREMISES" :key="premise.label" class="rounded-2xl bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ premise.label }}</p>
          <p class="mt-2 text-sm font-extrabold text-brand-dark">{{ premise.value }}</p>
        </article>
      </div>

      <div class="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ fixture.label }}</p>
          <p class="mt-1 text-sm text-sage-muted">Atualize os cenários ou aplique uma sugestão antes da revisão final.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2.5 text-sm font-bold text-brand-dark" @click="simulate">{{ demo.simulationHasRun ? 'Atualizar simulação' : 'Simular campanha' }}</button>
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2.5 text-sm font-bold text-brand-dark" @click="applySuggestion">Aplicar sugestão</button>
        </div>
      </div>

      <div class="mt-6 grid gap-4 xl:grid-cols-3">
        <article v-for="scenario in fixture.scenarios" :key="scenario.key" class="rounded-2xl border border-sage-border-light p-5" :class="scenario.key === '100' ? 'ring-2 ring-brand/50' : ''">
          <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">{{ scenario.percentage }} das vendas</p><h3 class="mt-2 text-xl font-extrabold text-brand-dark">{{ scenario.classification }}</h3></div></div>
          <dl class="mt-5 space-y-3 text-sm"><div class="flex justify-between gap-3"><dt class="text-sage-muted">Vendas</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.sales) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Sem proposta</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.withoutProposal) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Com proposta</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.withProposal) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-sage-muted">Impacto</dt><dd class="font-bold text-brand-dark">{{ currency(scenario.impact) }}</dd></div></dl>
          <div class="mt-5 border-t border-sage-border-light pt-4"><div class="flex justify-between gap-3 text-sm"><span class="text-sage-muted">Orçamento</span><strong class="text-brand-dark">{{ currency(scenario.budget) }}</strong></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-sage-pill"><div class="h-full rounded-full" :class="scenario.withProposal > scenario.budget ? 'bg-danger' : 'bg-brand'" :style="{ width: `${Math.min(100, usage(scenario))}%` }"></div></div><div class="mt-2 flex justify-between gap-3 text-xs"><span class="text-sage-muted">Utilização {{ percent(usage(scenario)) }}</span><span :class="scenario.withProposal > scenario.budget ? 'font-bold text-danger-dark' : 'text-success-text'">{{ scenario.withProposal > scenario.budget ? 'Orçamento excedido' : 'Dentro do orçamento' }}</span></div></div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle, ShieldAlert, UploadCloud } from 'lucide-vue-next'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { CAMPAIGN_SIMULATION_PREMISES, formatSimulationCurrency, formatSimulationPercent, getCampaignSimulationFixture, simulationUsage } from '@/services/campaignSimulation'
import { checkProposalCoverage } from '@/services/coverageService'

const props = defineProps({
  demo: { type: Object, required: true },
  form: { type: Object, default: () => ({}) },
  interpretation: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update-demo'])
const fixture = computed(() => getCampaignSimulationFixture(props.demo.simulationVariant))

const coverageCheck = computed(() =>
  checkProposalCoverage({
    form: props.form,
    interpretation: props.interpretation
  })
)

const isBlocked = computed(() => coverageCheck.value.isBlocked)

function simulate() {
  if (isBlocked.value) return
  emit('update-demo', 'simulationHasRun', true)
}

function applySuggestion() {
  if (isBlocked.value) return
  emit('update-demo', 'simulationVariant', props.demo.simulationVariant === 'adjusted' ? 'base' : 'adjusted')
  emit('update-demo', 'simulationHasRun', true)
}

function currency(value) {
  return formatSimulationCurrency(value)
}

function percent(value) {
  return formatSimulationPercent(value)
}

function usage(scenario) {
  return simulationUsage(scenario)
}
</script>
