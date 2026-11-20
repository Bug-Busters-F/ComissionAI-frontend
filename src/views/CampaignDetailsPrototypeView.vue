<template>
  <div class="space-y-6">
    <header>
      <button type="button" class="focus-ring rounded font-semibold text-brand-dark" @click="router.push('/campanhas')">← Campanhas</button>
      <div v-if="isLoading" class="mt-7 rounded-[22px] bg-white px-6 py-12 text-sm text-sage-muted" role="status">Carregando detalhes…</div>
      <section v-else-if="loadError" class="mt-7 rounded-[22px] border border-danger/30 bg-danger-bg p-6" role="alert"><h1 class="text-xl font-extrabold text-danger-dark">Não foi possível abrir a campanha</h1><p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ loadError }}</p><div class="mt-5 flex flex-wrap gap-3"><button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white" @click="loadCampaign">Tentar novamente</button><RouterLink to="/campanhas" class="focus-ring rounded-full border border-danger/30 px-5 py-3 text-sm font-bold text-danger-dark">Voltar para campanhas</RouterLink></div></section>
      <template v-else-if="campaign">
        <div class="mt-7 flex flex-wrap items-end justify-between gap-5"><div><h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">{{ campaign.titulo }}</h1><p class="mt-2 text-sm text-sage-muted">{{ formatPeriodArrow(campaign.dataInicio, campaign.dataFim) }}</p><div v-if="!isDemo" class="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold"><span v-if="campaign.versaoVigente != null" class="rounded-full bg-success-bg px-3 py-1 text-success-dark">Versão atual: {{ campaign.versaoVigente }}</span><span v-else class="rounded-full bg-sage-pill px-3 py-1 text-sage-muted">Ainda não publicada</span><span v-if="campaign.versaoProposta != null && campaign.versaoVigente != null" class="rounded-full bg-warning-bg px-3 py-1 text-warning-text">Proposta de alteração: {{ campaign.versaoProposta }}</span></div></div><div class="flex flex-wrap items-center gap-3"><StatusBadge :label="formatCampaignState(campaign.estado)" :tone="campaignStateTone(campaign.estado)" /><RouterLink v-if="access.can('editCampaign') && ['DRAFT', 'ATIVA', 'INATIVA'].includes(campaign.estado) && !campaign.motivoBloqueioEdicao" :to="`/campanhas/${campaign.id}/editar`" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover">{{ campaign.estado === 'DRAFT' ? 'Continuar rascunho' : 'Editar campanha' }}</RouterLink><button v-if="access.can('removeCampaign')" type="button" class="focus-ring rounded-full border border-danger/30 px-5 py-3 text-sm font-bold text-danger-dark" @click="isDeleteOpen = true">Remover</button></div></div>
      </template>
    </header>

    <template v-if="campaign && !loadError">
      <div
        v-if="hasClosedCompetenceInVigencia"
        class="rounded-2xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-dark space-y-1"
        role="alert"
      >
        <div class="flex items-start gap-2.5">
          <Lock class="h-5 w-5 text-warning-dark shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p class="font-bold">Vigência com competência lacrada por fechamento contábil:</p>
            <p class="text-xs opacity-90 leading-relaxed">
              A(s) competência(s)
              <strong>{{ closedCompetencesInVigencia.map(c => c.competencia).join(', ') }}</strong>
              já possui(em) fechamento final concluído. A edição e publicação desta campanha estão permanentemente bloqueadas para este período.
            </p>
          </div>
        </div>
      </div>
      <div
        v-else-if="isClosingStatusRestricted"
        class="flex items-center gap-2 rounded-xl border border-sage-border bg-sage-light/60 p-3.5 text-xs text-sage-muted"
        role="status"
      >
        <Info class="h-4 w-4 text-sage-muted shrink-0" aria-hidden="true" />
        <span>Informações de fechamento contábil indisponíveis para o seu perfil de acesso.</span>
      </div>
      <p v-if="campaign.motivoBloqueioEdicao" class="rounded-xl bg-warning-bg p-4 text-sm text-warning-text">{{ campaign.motivoBloqueioEdicao }}</p>
      <p v-if="campaign.versaoProposta && campaign.versaoVigente" class="rounded-xl bg-sage-light p-4 text-sm">Existe uma proposta de alteração separada (versão {{ campaign.versaoProposta }}). A versão vigente é {{ campaign.versaoVigente }}. Use o seletor abaixo para consultar as versões publicadas.</p>
      <CampaignApprovalGovernanceCard v-if="!isDemo && campaign.id && codeApproval" :approval="codeApproval" :can-approve="canApproveCode" :loading="isApproving" @approve="handleApproveCode" @reject="handleRejectCode" />
      <CampaignVersionHistory v-if="!isDemo && campaign.versaoVigente != null" :campaign-id="campaign.id" :current-version="campaign.versaoVigente" />
      <div v-if="isDemo" class="rounded-[22px] border border-success/20 bg-success-bg p-5"><p class="font-bold text-success-dark">Campanha pronta para consulta</p><p class="mt-1 text-sm leading-6 text-success-dark/80">Confira os dados da regra vinculada.</p></div>
      <div v-else-if="campaign.versaoVigente == null" class="rounded-[22px] border border-success/20 bg-success-bg p-5"><p class="font-bold text-success-dark">Campanha salva como {{ formatCampaignState(campaign.estado).toLocaleLowerCase() }}</p><p class="mt-1 text-sm leading-6 text-success-dark/80">Texto original, vigência e todas as regras abaixo são os dados salvos.</p></div>

      <CampaignSummary v-if="isDemo" :title="'Revisão consolidada'" :subtitle="isDemo ? 'Regra vinculada à campanha.' : 'Dados salvos da regra vinculada à campanha.'" :badge="formatCampaignState(campaign.estado)" :summary-items="summaryItems" :original-text="campaign.textoOriginal" />

      <CampaignProposalReviewSummary v-if="!isDemo && campaign.versaoVigente == null && proposalCampaign" :campaign="proposalCampaign" :validation="proposalValidation" :show-python="true" hide-impact />
      
      <!-- Seção de Bases e Cobertura da Campanha ([FRONT-4]) -->
      <CampaignBasesSection
        v-if="!isDemo && campaign?.id"
        :campanha-id="campaign.id"
        @competence-selected="handleBasesCompetenceSelected"
        @base-effective="handleBaseEffective"
      />

      <!-- Seção de Alertas Estatísticos e Anomalias de Vendas ([FRONT-6]) -->
      <CampaignAnomaliesSection
        v-if="!isDemo && campaign?.id && access.can('viewAnomalies')"
        ref="anomaliesSectionRef"
        v-model:competence="anomalyCompetence"
        :campaign="campaign"
        :active-lots="anomalyLots"
      />

      <section class="rounded-[22px] bg-white p-6 sm:p-7 text-sm">
        <h2 class="text-xl font-extrabold">Registro da campanha</h2>
        <p class="mt-3">Criada em: {{ dateTime(campaign.criadoEm) }}</p>
        <p class="mt-2">Atualizada em: {{ dateTime(campaign.atualizadoEm) }}</p>
        <p v-if="campaign.simulacaoAceitaId" class="mt-3 break-words">Simulação vinculada: {{ campaign.simulacaoAceitaId }} · {{ campaign.statusAceite || 'Estado do aceite não informado' }}</p>
        <p v-if="campaign.estado !== 'DRAFT'" class="mt-3 text-sage-muted">O histórico preserva as versões publicadas. Alterações são preparadas em uma proposta separada.</p>
      </section>

    </template>

    <CampaignDeleteDialog :open="isDeleteOpen" :campaign-title="campaign?.titulo" :is-removing="isRemoving" :error-message="deleteError" @cancel="closeDelete" @confirm="removeCampaign" />
  </div>
</template>

<script setup>
import { useAccountStore } from '@/stores/accountStore'
import { useAccessPolicy } from '@/services/useAccessPolicy'
const access = useAccessPolicy()
const account = useAccountStore()
import { createCampaignLifecycleApi } from '@/services/campaignLifecycleApi'
import CampaignVersionHistory from '@/components/campaigns/CampaignVersionHistory.vue'
import CampaignApprovalGovernanceCard from '@/components/campaigns/CampaignApprovalGovernanceCard.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, Info } from 'lucide-vue-next'
import CampaignDeleteDialog from '@/components/common/CampaignDeleteDialog.vue'
import CampaignProposalReviewSummary from '@/components/campaigns/CampaignProposalReviewSummary.vue'
import CampaignBasesSection from '@/components/campaigns/CampaignBasesSection.vue'
import CampaignAnomaliesSection from '@/components/anomalies/CampaignAnomaliesSection.vue'
import { persistedCampaignToProposal } from '@/services/campaignProposalPersistence'
import { validateCampaignProposalSet } from '@/services/campaignProposalValidation'
import CampaignSummary from '@/components/common/CampaignSummary.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { campaignDemo, isCampaignDemoEnabled } from '@/services/campaignDemo'
import { campaignService, normalizeCampaignError } from '@/services/campaignService'
import { campaignStateTone, formatCampaignChannel, formatCampaignState, formatPeriodArrow } from '@/services/campaignMappers'
import { useNotificationStore } from '@/stores/notificationStore'
import { listClosings } from '@/services/closingService'
import { campaignPreparationService } from '@/services/campaignPreparationService'
import { fetchEffectivePreparationLots } from '@/services/statisticalAlertsApi'
import { isCompetenceWithinVigencia } from '@/services/statisticalAlertsLogic'

const route = useRoute()
const router = useRouter()
const notifications = useNotificationStore()
const campaign = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const isDeleteOpen = ref(false)
const isRemoving = ref(false)
const deleteError = ref('')
const isDemo = isCampaignDemoEnabled
const closedCompetencesInVigencia = ref([])
const isClosingStatusRestricted = ref(false)
const hasClosedCompetenceInVigencia = computed(() => closedCompetencesInVigencia.value.length > 0)
const proposalCampaign = computed(() => campaign.value && !isDemo ? persistedCampaignToProposal(campaign.value) : null)
const proposalValidation = computed(() => proposalCampaign.value ? validateCampaignProposalSet(proposalCampaign.value) : null)
const anomaliesSectionRef = ref(null)
const anomalyCompetence = ref('')
const anomalyLots = ref([])
let anomalyLotsRequest = 0

// FRONT-6: lotes de preparação EFETIVADO da competência alimentam o filtro e o reprocessamento de anomalias
async function loadAnomalyLots() {
  const token = ++anomalyLotsRequest
  const { lots, error } = await fetchEffectivePreparationLots(campaignPreparationService, {
    campanhaId: campaign.value?.id,
    competencia: anomalyCompetence.value,
    canViewLots: access.can('viewPreparationLots')
  })
  if (token !== anomalyLotsRequest) return
  anomalyLots.value = lots
  if (error) console.warn('Não foi possível carregar os lotes efetivados para os alertas estatísticos:', error)
}

// A seção de bases pré-seleciona a competência mais recente do sistema; só sincroniza quando ela pertence à vigência
function handleBasesCompetenceSelected(comp) {
  if (isCompetenceWithinVigencia(comp, campaign.value?.dataInicio, campaign.value?.dataFim)) anomalyCompetence.value = comp
}

watch(anomalyCompetence, () => {
  if (!isDemo && campaign.value?.id) void loadAnomalyLots()
})

async function handleBaseEffective() {
  await loadAnomalyLots()
  // A análise estatística passou a rodar no back depois do commit: acompanha até os alertas aparecerem.
  anomaliesSectionRef.value?.reloadAfterEffective()
}
function dateTime(value) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date) : 'Não informado'
}

const summaryItems = computed(() => {
  const rule = campaign.value?.regra || {}
  return [
    { label: 'Canal', value: formatCampaignChannel(rule.canal) },
    { label: 'Vigência', value: formatPeriodArrow(campaign.value?.dataInicio, campaign.value?.dataFim) },
    { label: 'Regra percentual', value: formatRate(rule.taxa) },
    { label: 'Canal da regra', value: formatCampaignChannel(rule.canal) },
    { label: 'Matrícula', value: rule.matricula || 'Todos' },
    { label: 'Código da loja', value: rule.codLoja ?? 'Todos' }
  ]
})

const codeApproval = ref(null)
const isApproving = ref(false)
const canApproveCode = computed(() => access.can('approveCode'))

async function handleApproveCode() {
  if (!campaign.value?.id) return
  isApproving.value = true
  try {
    const user = account.user?.email || account.user?.name || 'analista.codigo'
    await createCampaignLifecycleApi().approveCode(campaign.value.id, { aprovado: true, aprovadoPor: user })
    codeApproval.value = await createCampaignLifecycleApi().getCodeApproval(campaign.value.id)
  } catch (err) {
    console.error('Erro ao aprovar código:', err)
  } finally {
    isApproving.value = false
  }
}

async function handleRejectCode() {
  if (!campaign.value?.id) return
  isApproving.value = true
  try {
    const user = account.user?.email || account.user?.name || 'analista.codigo'
    await createCampaignLifecycleApi().approveCode(campaign.value.id, { aprovado: false, aprovadoPor: user, motivo: 'Rejeitado pelo analista' })
    codeApproval.value = await createCampaignLifecycleApi().getCodeApproval(campaign.value.id)
  } catch (err) {
    console.error('Erro ao rejeitar código:', err)
  } finally {
    isApproving.value = false
  }
}

onMounted(loadCampaign)

async function loadCampaign() {
  try {
    isLoading.value = true; loadError.value = ''
    let current = isDemo ? campaignDemo.get(route.params.id) : await campaignService.get(route.params.id)
    if (!isDemo && current?.versaoVigente) {
      const published = await createCampaignLifecycleApi().version(current.id, current.versaoVigente)
      current = { ...current, titulo: published.titulo, textoOriginal: published.textoOriginal,
        dataInicio: published.dataInicio, dataFim: published.dataFim,
        simulacaoAceitaId: published.simulacaoAceitaId, statusAceite: published.simulacaoAceitaId ? 'ACEITA' : null,
        regras: published.regras.map((r) => ({ ...r, dataInicio: published.dataInicio, dataFim: published.dataFim })) }
    }
    campaign.value = current
    if (!campaign.value) loadError.value = 'A campanha não foi encontrada ou já foi removida.'
    else if (!isDemo) {
      // Competência inicial dos alertas: início da vigência, até a seção de bases sincronizar a sua seleção
      if (!anomalyCompetence.value && campaign.value.dataInicio) anomalyCompetence.value = String(campaign.value.dataInicio).slice(0, 7)
      void checkVigenciaClosings(campaign.value)
      try {
        codeApproval.value = await createCampaignLifecycleApi().getCodeApproval(campaign.value.id)
      } catch {
        codeApproval.value = null
      }
    }
  } catch (error) {
    loadError.value = normalizeCampaignError(error).message
  } finally {
    isLoading.value = false
  }
}

async function checkVigenciaClosings(campaignData) {
  if (!campaignData?.dataInicio || !campaignData?.dataFim) return
  closedCompetencesInVigencia.value = []
  isClosingStatusRestricted.value = false
  // Perfis sem acesso ao histórico de fechamentos recebem direto o aviso neutro, sem disparar um 403 conhecido.
  if (!access.can('viewClosings')) {
    isClosingStatusRestricted.value = true
    return
  }
  try {
    const page = await listClosings({ size: 100 })
    const closings = page?.content || []
    const startYm = campaignData.dataInicio.slice(0, 7)
    const endYm = campaignData.dataFim.slice(0, 7)

    closedCompetencesInVigencia.value = closings.filter(c => {
      const comp = c.competencia
      return comp && comp >= startYm && comp <= endYm && c.status === 'CONCLUIDO'
    })
  } catch (err) {
    // Para 403 ou qualquer erro de rede/servidor na listagem, exibe aviso neutro para não sugerir falsamente competência aberta
    isClosingStatusRestricted.value = true
    if (err?.response?.status !== 403) {
      console.warn('Não foi possível verificar fechamentos da vigência:', err)
    }
  }
}

function formatRate(value) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(Number(value) * 100)}%`
}

function closeDelete() {
  if (!isRemoving.value) {
    isDeleteOpen.value = false
    deleteError.value = ''
  }
}

async function removeCampaign() {
  if (!access.can('removeCampaign') || !campaign.value || isRemoving.value) return
  isRemoving.value = true
  deleteError.value = ''
  try {
    if (isDemo) campaignDemo.remove(campaign.value.id)
    else await campaignService.remove(campaign.value.id)
    notifications.success('Campanha removida', 'A campanha foi removida da listagem.')
    await router.push('/campanhas')
  } catch (error) {
    deleteError.value = normalizeCampaignError(error).message
  } finally {
    isRemoving.value = false
  }
}
</script>
