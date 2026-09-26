<template>
  <div class="space-y-7">
    <div v-if="isDemo" class="flex items-center justify-between rounded-full border border-sage-border bg-white px-4 py-2 text-xs font-bold text-sage-muted" role="status"><span>Ambiente demonstrativo</span><span class="rounded-full bg-sage-pill px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-sage-subtle">Dados fictícios para explorar o fluxo</span></div>

    <header class="flex flex-wrap items-end justify-between gap-5"><div><h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">Campanhas</h1><p class="mt-2 text-sm text-sage-muted">Crie propostas, acompanhe aprovações e apure os resultados.</p></div><RouterLink to="/campanhas/nova?etapa=proposta" class="focus-ring inline-flex rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover">+ Nova campanha</RouterLink></header>

    <div class="flex flex-col gap-3 sm:flex-row"><label class="sr-only" for="campaign-search">Buscar campanha</label><input id="campaign-search" v-model="search" type="search" placeholder="Buscar campanha" class="focus-ring min-w-0 flex-1 rounded-xl border border-sage-border-dark bg-white px-4 py-3 text-sm text-brand-dark outline-none" /><label class="sr-only" for="campaign-status-filter">Situação</label><select id="campaign-status-filter" v-model="statusFilter" class="focus-ring rounded-xl border border-sage-border-dark bg-white px-4 py-3 text-sm text-brand-dark outline-none"><option value="ALL">Todas as situações</option><option v-for="status in statuses" :key="status" :value="status">{{ formatCampaignState(status) }}</option></select></div>

    <div v-if="isLoading" class="rounded-[22px] bg-white px-6 py-14 text-center text-sm text-sage-muted" role="status">Carregando campanhas…</div>
    <section v-else-if="loadError" class="rounded-[22px] border border-danger/30 bg-danger-bg p-6" role="alert"><h2 class="text-xl font-extrabold text-danger-dark">Não foi possível consultar as campanhas</h2><p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ loadError }}</p><button type="button" class="focus-ring mt-5 rounded-full bg-danger px-5 py-3 text-sm font-bold text-white" @click="loadCampaigns">Tentar novamente</button></section>
    <section v-else-if="campaigns.length === 0" class="rounded-[22px] bg-white px-6 py-14 text-center"><p class="text-lg font-extrabold text-brand-dark">Nenhuma campanha cadastrada.</p><p class="mt-2 text-sm text-sage-muted">Crie a primeira campanha para acompanhar sua regra.</p><RouterLink to="/campanhas/nova?etapa=proposta" class="focus-ring mt-5 inline-flex rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark">Criar campanha</RouterLink></section>
    <section v-else-if="filteredCampaigns.length === 0" class="rounded-[22px] bg-white px-6 py-14 text-center"><p class="text-lg font-extrabold text-brand-dark">Nenhuma campanha corresponde à busca.</p><button type="button" class="focus-ring mt-5 rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="clearFilters">Limpar filtros</button></section>
    <section v-else class="overflow-hidden rounded-[22px] bg-white p-5 sm:p-6" aria-labelledby="campaign-table-heading"><h2 id="campaign-table-heading" class="sr-only">Campanhas cadastradas</h2><div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-sm"><caption class="sr-only">Campanhas cadastradas</caption><thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted"><tr><th class="rounded-l-xl px-4 py-3 font-semibold">Campanha</th><th class="px-4 py-3 font-semibold">Vigência</th><th class="px-4 py-3 font-semibold">Regras</th><th class="px-4 py-3 font-semibold">Situação</th><th class="rounded-r-xl px-4 py-3 text-right font-semibold">Ações</th></tr></thead><tbody class="divide-y divide-sage-border-light"><tr v-for="campaign in filteredCampaigns" :key="campaign.id" class="align-middle"><td class="px-4 py-5"><RouterLink :to="`/campanhas/${campaign.id}`" class="focus-ring rounded font-bold text-brand-dark underline decoration-transparent underline-offset-4 transition hover:decoration-current">{{ campaign.titulo }}</RouterLink><p class="mt-1 max-w-[320px] truncate text-xs text-sage-muted">{{ ruleSummary(campaign) }}</p></td><td class="px-4 py-5 text-sage-subtle">{{ formatPeriodArrow(campaign.dataInicio, campaign.dataFim) }}</td><td class="px-4 py-5 text-sage-subtle">{{ campaign.regra ? 1 : 0 }}</td><td class="px-4 py-5"><StatusBadge :label="formatCampaignState(campaign.estado)" :tone="campaignStateTone(campaign.estado)" /></td><td class="px-4 py-5"><div class="flex justify-end gap-4 text-xs font-bold"><RouterLink v-if="campaign.estado === 'DRAFT'" :to="`/campanhas/${campaign.id}/editar?etapa=proposta`" class="focus-ring rounded text-brand-dark underline underline-offset-4">Continuar</RouterLink><RouterLink v-else :to="`/campanhas/${campaign.id}`" class="focus-ring rounded text-brand-dark underline underline-offset-4">Detalhes</RouterLink><RouterLink v-if="campaign.estado !== 'DRAFT'" :to="`/campanhas/${campaign.id}/apurar`" class="focus-ring rounded text-brand-dark underline underline-offset-4">Apurar</RouterLink><button v-if="campaign.estado === 'DRAFT'" type="button" class="focus-ring rounded text-brand-dark underline underline-offset-4" @click="openRemove(campaign)">Remover</button></div></td></tr></tbody></table></div></section>

    <CampaignDeleteDialog :open="Boolean(campaignToRemove)" :campaign-title="campaignToRemove?.titulo" :is-removing="isRemoving" :error-message="removeError" @cancel="closeRemove" @confirm="removeCampaign" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import CampaignDeleteDialog from '@/components/common/CampaignDeleteDialog.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { campaignDemo, isCampaignDemoEnabled } from '@/services/campaignDemo'
import { campaignService, normalizeCampaignError } from '@/services/campaignService'
import { campaignStateTone, formatCampaignChannel, formatCampaignState, formatPeriodArrow } from '@/services/campaignMappers'
import { useNotificationStore } from '@/stores/notificationStore'

const notifications = useNotificationStore()
const campaigns = ref([])
const isLoading = ref(true)
const loadError = ref('')
const search = ref('')
const statusFilter = ref('ALL')
const campaignToRemove = ref(null)
const isRemoving = ref(false)
const removeError = ref('')
const isDemo = isCampaignDemoEnabled
const statuses = ['DRAFT', 'ATIVA', 'INATIVA', 'CONCLUIDA', 'CANCELADA']

const filteredCampaigns = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return campaigns.value.filter((campaign) => {
    const matchesQuery = !query || `${campaign.titulo} ${campaign.textoOriginal}`.toLocaleLowerCase().includes(query)
    const matchesStatus = statusFilter.value === 'ALL' || campaign.estado === statusFilter.value
    return matchesQuery && matchesStatus
  })
})

onMounted(loadCampaigns)

async function loadCampaigns() {
  isLoading.value = true
  loadError.value = ''
  try {
    campaigns.value = isDemo ? campaignDemo.list() : await campaignService.list()
  } catch (error) {
    loadError.value = normalizeCampaignError(error).message
  } finally {
    isLoading.value = false
  }
}

function clearFilters() {
  search.value = ''
  statusFilter.value = 'ALL'
}

function ruleSummary(campaign) {
  const rule = campaign.regra
  if (!rule) return 'Sem regra vinculada'
  return [formatCampaignChannel(rule.canal), rule.descrMarca, rule.descriCargo].filter(Boolean).join(' · ')
}

function openRemove(campaign) {
  campaignToRemove.value = campaign
  removeError.value = ''
}

function closeRemove() {
  if (!isRemoving.value) {
    campaignToRemove.value = null
    removeError.value = ''
  }
}

async function removeCampaign() {
  if (!campaignToRemove.value || isRemoving.value) return
  isRemoving.value = true
  removeError.value = ''
  try {
    if (isDemo) campaignDemo.remove(campaignToRemove.value.id)
    else await campaignService.remove(campaignToRemove.value.id)
    campaigns.value = campaigns.value.filter((campaign) => campaign.id !== campaignToRemove.value.id)
    notifications.success('Campanha removida', isDemo ? 'Apenas o exemplo demonstrativo foi retirado.' : 'A campanha não aparecerá mais nas consultas.')
    campaignToRemove.value = null
  } catch (error) {
    removeError.value = normalizeCampaignError(error).message
  } finally {
    isRemoving.value = false
  }
}
</script>
