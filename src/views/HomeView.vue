<template>
  <div class="space-y-7">
    <PageHeader title="Visão geral" description="Acompanhe os dados e o ciclo das suas campanhas.">
      <template #action>
        <div class="flex flex-wrap items-center gap-3">
          <RouterLink v-if="access.can('createCampaign')" to="/campanhas/nova" class="focus-ring inline-flex items-center rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover">+ Nova campanha</RouterLink>
        </div>
      </template>
    </PageHeader>

    <section aria-label="Indicadores principais" :aria-busy="indicatorsLoading">
      <div v-if="indicatorsLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status">
        <span class="sr-only">Carregando indicadores…</span>
        <div v-for="n in 4" :key="n" class="rounded-2xl bg-white p-6 motion-safe:animate-pulse" aria-hidden="true"><div class="h-4 w-36 rounded bg-sage-pill"></div><div class="mt-6 h-10 w-20 rounded bg-sage-pill"></div><div class="mt-3 h-3 w-44 rounded bg-sage-pill"></div></div>
      </div>
      <div v-else-if="indicatorsError" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
        <p class="font-semibold text-danger-dark">{{ indicatorsError }}</p>
        <button type="button" class="focus-ring mt-3 text-sm font-semibold underline underline-offset-4 text-danger-dark" @click="home.loadIndicators">Tentar novamente</button>
      </div>
      <template v-else-if="indicators">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article v-for="card in metrics" :key="card.label" class="rounded-2xl bg-white p-6">
            <p class="text-sm font-medium text-sage-muted">{{ card.label }}</p>
            <p class="mt-6 text-4xl font-extrabold tracking-[-0.05em] text-brand-dark">{{ number(card.value) }}</p>
            <p class="mt-2 text-xs leading-5 text-sage-muted">{{ card.detail }}</p>
          </article>
        </div>
        <p class="mt-3 text-xs text-sage-muted">Atualizado em {{ updatedAt }}</p>
      </template>
    </section>

    <section class="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <article class="rounded-2xl bg-white p-6 sm:p-7" :aria-busy="campaignsLoading">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Campanhas recentes</h2>
          <RouterLink to="/campanhas" class="focus-ring text-sm font-semibold underline underline-offset-4 text-brand-dark">Ver todas →</RouterLink>
        </div>
        <div class="mt-6 overflow-x-auto">
          <p v-if="campaignsLoading" class="rounded-xl bg-sage-light px-4 py-6 text-sm text-sage-muted" role="status">Carregando campanhas recentes…</p>
          <div v-else-if="campaignsError" class="rounded-xl border border-danger/30 bg-danger-bg p-4 text-sm text-danger-dark" role="alert">
            <p>{{ campaignsError }}</p>
            <button type="button" class="focus-ring mt-3 font-semibold underline underline-offset-4" @click="home.loadCampaigns">Tentar novamente</button>
          </div>
          <p v-else-if="campaigns.length === 0" class="rounded-xl bg-sage-light px-4 py-6 text-sm text-sage-muted">Nenhuma campanha cadastrada ainda.</p>
          <table v-else class="w-full min-w-[480px] text-left text-sm">
            <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted"><tr><th class="rounded-l-xl px-4 py-3 font-semibold" scope="col">Campanha</th><th class="px-4 py-3 font-semibold" scope="col">Situação</th><th class="rounded-r-xl px-4 py-3 font-semibold" scope="col">Ação</th></tr></thead>
            <tbody class="divide-y divide-sage-border-light">
              <tr v-for="campaign in campaigns" :key="campaign.id">
                <td class="px-4 py-4"><p class="font-bold text-brand-dark">{{ campaign.titulo }}</p><p class="mt-1 text-xs text-sage-muted">{{ formatPeriod(campaign.dataInicio, campaign.dataFim) }}</p></td>
                <td class="px-4 py-4"><StatusBadge :label="formatCampaignState(campaign.estado)" :tone="campaignStateTone(campaign.estado)" /></td>
                <td class="px-4 py-4"><RouterLink :to="{ name: 'campanha-detalhes', params: { id: campaign.id } }" class="focus-ring font-semibold underline underline-offset-4 text-brand-dark" :aria-label="`Ver campanha ${campaign.titulo}`">Ver campanha →</RouterLink></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="rounded-2xl bg-white p-6 sm:p-7" :aria-busy="indicatorsLoading">
        <h2 class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Próximas ações</h2>
        <p class="mt-2 text-sm text-sage-muted">Atividades disponíveis para o seu perfil.</p>
        <p v-if="indicatorsLoading" class="mt-6 text-sm text-sage-muted" role="status">Consultando atividades…</p>
        <p v-else-if="indicatorsError" class="mt-6 text-sm text-sage-muted">As atividades estarão disponíveis quando os indicadores forem carregados.</p>
        <template v-else-if="indicators">
          <p v-if="!actions.length" class="mt-6 rounded-xl bg-sage-light p-4 text-sm text-sage-muted">Nenhuma ação disponível para o seu perfil neste momento. Consulte as campanhas para acompanhar o andamento.</p>
          <ul v-else class="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            <li v-for="action in actions" :key="action.key">
              <RouterLink :to="action.to" class="focus-ring flex items-center justify-between gap-3 rounded-xl border border-sage-border p-4 text-brand-dark transition hover:bg-sage-light">
                <span><span class="block text-sm font-bold">{{ action.title }}</span><span class="mt-1 block text-xs text-sage-muted">{{ action.campaignId ? `Campanha #${action.campaignId}` : `Competência ${formatCompetence(action.competence)}` }}</span></span>
                <ArrowRight class="h-4 w-4 shrink-0" aria-hidden="true" />
              </RouterLink>
            </li>
          </ul>
        </template>
      </article>
    </section>

    <section v-if="indicators && !indicatorsLoading && !indicatorsError" class="rounded-2xl border p-6 sm:p-7" :class="notices.length ? 'border-warning-border bg-warning-bg' : 'border-sage-border bg-white'">
      <h2 class="text-lg font-extrabold text-brand-dark">{{ notices.length ? 'Pontos de atenção' : 'Sem alertas operacionais' }}</h2>
      <ul v-if="notices.length" class="mt-3 space-y-2 text-sm leading-6 text-brand-dark"><li v-for="notice in notices" :key="notice">{{ notice }}</li></ul>
      <p v-else class="mt-2 text-sm text-sage-muted">Não há falhas de cálculo, falhas de fechamento ou lotes com linhas impeditivas no resumo atual.</p>
      <p v-if="indicators.alertas.fechamentosEmProcessamento" class="mt-3 text-sm text-sage-muted">{{ number(indicators.alertas.fechamentosEmProcessamento) }} fechamento(s) em processamento.</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onUnmounted, watch } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAccountStore } from '@/stores/accountStore'
import { useAccessPolicy } from '@/services/useAccessPolicy'
import { createHomeDashboardState } from '@/services/homeDashboardState'
import { dashboardActions } from '@/services/homeDashboard'
import { campaignStateTone, formatCampaignState, formatPeriod } from '@/services/campaignMappers'

const access = useAccessPolicy()
const account = useAccountStore()
const home = createHomeDashboardState()
const { indicators, campaigns, indicatorsLoading, campaignsLoading, indicatorsError, campaignsError } = home
const number = value => new Intl.NumberFormat('pt-BR').format(value)
const updatedAt = computed(() => indicators.value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(indicators.value.atualizadoEm)) : '')
const formatCompetence = value => `${value.slice(5)}/${value.slice(0, 4)}`
const metrics = computed(() => {
  if (!indicators.value) return []
  const { competencias: c, campanhas: p, pendencias: d } = indicators.value
  return [
    { label: 'Competências cadastradas', value: c.total, detail: `${number(c.abertas)} abertas · ${number(c.processando)} em processamento · ${number(c.fechadas)} fechadas` },
    { label: 'Campanhas', value: p.total, detail: `${number(p.rascunhos)} rascunhos · ${number(p.ativas)} ativas` },
    { label: 'Aguardando gerente', value: p.aguardandoGerente, detail: 'Campanhas encaminhadas para conferência' },
    { label: 'Pendências', value: d.total, detail: `${number(d.orcamentoNaoConfirmado)} de orçamento · ${number(d.revisaoCodigo)} de código · ${number(d.lotesComImpedimento)} lotes com impedimentos` }
  ]
})
const actions = computed(() => dashboardActions(indicators.value?.aguardandoAcao || [], access.can))
const notices = computed(() => {
  if (!indicators.value) return []
  const a = indicators.value.alertas
  return [
    a.lotesComLinhasImpeditivas && `${number(a.lotesComLinhasImpeditivas)} lote(s) com linhas que precisam de correção.`,
    a.execucoesFalhas && `${number(a.execucoesFalhas)} execução(ões) de cálculo com falha.`,
    a.fechamentosFalhos && `${number(a.fechamentosFalhos)} fechamento(s) com falha.`
  ].filter(Boolean)
})
watch(() => [account.user?.id, account.user?.role, ...(account.user?.permissions || [])].join('|'), () => {
  if (account.user) home.refresh()
  else home.reset()
}, { immediate: true })
onUnmounted(() => home.dispose())
</script>
