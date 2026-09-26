<template>
  <div class="space-y-6">
    <header>
      <button type="button" class="focus-ring rounded font-semibold text-brand-dark" @click="router.push('/campanhas')">← Campanhas</button>
      <div v-if="isLoading" class="mt-7 rounded-[22px] bg-white px-6 py-12 text-sm text-sage-muted" role="status">Carregando detalhes…</div>
      <section v-else-if="loadError" class="mt-7 rounded-[22px] border border-danger/30 bg-danger-bg p-6" role="alert"><h1 class="text-xl font-extrabold text-danger-dark">Não foi possível abrir a campanha</h1><p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ loadError }}</p><div class="mt-5 flex flex-wrap gap-3"><button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white" @click="loadCampaign">Tentar novamente</button><RouterLink to="/campanhas" class="focus-ring rounded-full border border-danger/30 px-5 py-3 text-sm font-bold text-danger-dark">Voltar para campanhas</RouterLink></div></section>
      <template v-else-if="campaign">
        <div class="mt-7 flex flex-wrap items-end justify-between gap-5"><div><h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">{{ campaign.titulo }}</h1><p class="mt-2 text-sm text-sage-muted">{{ formatPeriodArrow(campaign.dataInicio, campaign.dataFim) }}</p></div><div class="flex flex-wrap items-center gap-3"><StatusBadge :label="formatCampaignState(campaign.estado)" :tone="campaignStateTone(campaign.estado)" /><RouterLink :to="`/campanhas/${campaign.id}/editar?etapa=proposta`" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover">Editar</RouterLink><button type="button" class="focus-ring rounded-full border border-danger/30 px-5 py-3 text-sm font-bold text-danger-dark" @click="isDeleteOpen = true">Remover</button></div></div>
      </template>
    </header>

    <template v-if="campaign && !loadError">
      <div v-if="isDemo" class="rounded-[22px] border border-success/20 bg-success-bg p-5"><p class="font-bold text-success-dark">Campanha pronta para consulta</p><p class="mt-1 text-sm leading-6 text-success-dark/80">Confira os dados da proposta e da regra vinculada.</p></div>
      <div v-else class="rounded-[22px] border border-success/20 bg-success-bg p-5"><p class="font-bold text-success-dark">Campanha salva como {{ formatCampaignState(campaign.estado).toLocaleLowerCase() }}</p><p class="mt-1 text-sm leading-6 text-success-dark/80">Texto original, vigência e regra abaixo são os dados persistidos.</p></div>

      <CampaignSummary :title="'Revisão consolidada'" :subtitle="isDemo ? 'Proposta e regra vinculada.' : 'Dados persistidos da proposta e da regra vinculada.'" :badge="formatCampaignState(campaign.estado)" :summary-items="summaryItems" :original-text="campaign.textoOriginal" />

      <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="history-heading"><div class="flex items-center justify-between gap-4"><div><h2 id="history-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Histórico e decisões</h2><p class="mt-1 text-sm text-sage-muted">Acompanhe as versões e decisões da campanha.</p></div></div><div class="mt-5 overflow-x-auto"><table class="w-full min-w-[620px] text-left text-sm"><thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted"><tr><th class="rounded-l-xl px-3 py-3">Versão</th><th class="px-3 py-3">Canal / taxa</th><th class="px-3 py-3">Validade</th><th class="rounded-r-xl px-3 py-3">Origem</th></tr></thead><tbody><tr><td class="px-3 py-4 font-bold">v1<span class="block text-xs font-normal text-sage-muted">Versão atual</span></td><td class="px-3 py-4">{{ formatCampaignChannel(campaign.regra?.canal) }} · {{ formatRate(campaign.regra?.taxa) }}</td><td class="px-3 py-4">{{ formatPeriodArrow(campaign.dataInicio, campaign.dataFim) }}</td><td class="px-3 py-4 text-sage-muted">Registro atual</td></tr></tbody></table></div></section>

    </template>

    <CampaignDeleteDialog :open="isDeleteOpen" :campaign-title="campaign?.titulo" :is-removing="isRemoving" :error-message="deleteError" @cancel="closeDelete" @confirm="removeCampaign" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignDeleteDialog from '@/components/common/CampaignDeleteDialog.vue'
import CampaignSummary from '@/components/common/CampaignSummary.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { campaignDemo, isCampaignDemoEnabled } from '@/services/campaignDemo'
import { campaignService, normalizeCampaignError } from '@/services/campaignService'
import { campaignStateTone, formatCampaignChannel, formatCampaignState, formatPeriodArrow } from '@/services/campaignMappers'
import { useNotificationStore } from '@/stores/notificationStore'

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

onMounted(loadCampaign)

async function loadCampaign() {
  try {
    campaign.value = isDemo ? campaignDemo.get(route.params.id) : await campaignService.get(route.params.id)
    if (!campaign.value) loadError.value = 'A campanha não foi encontrada ou já foi removida.'
  } catch (error) {
    loadError.value = normalizeCampaignError(error).message
  } finally {
    isLoading.value = false
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
  if (!campaign.value || isRemoving.value) return
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
