<template>
  <div class="space-y-7">
    <PageHeader title="Campanhas" description="Crie propostas, revise regras e acompanhe a vigência das campanhas.">
      <template #action>
        <RouterLink to="/campanhas/nova" class="focus-ring inline-flex rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover">
          + Nova campanha
        </RouterLink>
      </template>
    </PageHeader>

    <section class="rounded-2xl bg-white p-6 sm:p-7" aria-labelledby="campaign-list-heading">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="campaign-list-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Campanhas cadastradas</h2>
          <p class="mt-1 text-sm text-sage-muted">Dados persistidos pelo backend, sem campanhas fictícias.</p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <label class="sr-only" for="campaign-search">Buscar campanha</label>
          <input id="campaign-search" v-model="search" placeholder="Buscar campanha" class="focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none sm:w-56" />
          <label class="sr-only" for="campaign-status-filter">Filtrar por estado</label>
          <select id="campaign-status-filter" v-model="statusFilter" class="focus-ring rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none">
            <option value="ALL">Todos os estados</option>
            <option v-for="state in statusOptions" :key="state" :value="state">{{ formatCampaignState(state) }}</option>
          </select>
        </div>
      </div>

      <div v-if="isLoading" class="mt-8 rounded-xl bg-sage-light px-5 py-8 text-center text-sm text-sage-muted" role="status">Carregando campanhas…</div>

      <div v-else-if="loadError" class="mt-8 rounded-xl border border-danger/30 bg-danger-bg px-5 py-6" role="alert">
        <p class="font-bold text-danger-dark">Não foi possível consultar as campanhas.</p>
        <p class="mt-1 text-sm leading-6 text-danger-dark/80">{{ loadError }}</p>
        <button type="button" class="focus-ring mt-4 rounded-full bg-danger px-4 py-2 text-sm font-bold text-white" @click="loadCampaigns">Tentar novamente</button>
      </div>

      <div v-else-if="campaigns.length === 0" class="mt-8 rounded-xl bg-sage-light px-5 py-8 text-center">
        <p class="font-bold text-brand-dark">Nenhuma campanha cadastrada.</p>
        <p class="mt-1 text-sm text-sage-muted">Crie a primeira campanha para começar a acompanhar suas regras.</p>
        <RouterLink to="/campanhas/nova" class="focus-ring mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-dark">Criar campanha</RouterLink>
      </div>

      <div v-else-if="filteredCampaigns.length === 0" class="mt-8 rounded-xl bg-sage-light px-5 py-8 text-center">
        <p class="font-bold text-brand-dark">Nenhuma campanha corresponde aos filtros.</p>
        <button type="button" class="focus-ring mt-4 rounded-full border border-sage-border-dark px-4 py-2 text-sm font-bold text-brand-dark" @click="clearFilters">Limpar filtros</button>
      </div>

      <div v-else class="mt-6 overflow-x-auto">
        <table class="w-full min-w-[820px] text-left text-sm">
          <caption class="sr-only">Campanhas cadastradas</caption>
          <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
            <tr>
              <th class="rounded-l-xl px-4 py-3 font-semibold">Campanha</th>
              <th class="px-4 py-3 font-semibold">Vigência</th>
              <th class="px-4 py-3 font-semibold">Regra</th>
              <th class="px-4 py-3 font-semibold">Estado</th>
              <th class="rounded-r-xl px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light">
            <tr v-for="campaign in filteredCampaigns" :key="campaign.id" class="align-top">
              <td class="px-4 py-5">
                <RouterLink :to="`/campanhas/${campaign.id}`" class="focus-ring rounded font-bold text-brand-dark underline decoration-transparent underline-offset-4 transition hover:decoration-current">{{ campaign.titulo }}</RouterLink>
                <p class="mt-1 max-w-xs truncate text-xs text-sage-muted">{{ campaign.textoOriginal }}</p>
              </td>
              <td class="px-4 py-5 text-sage-muted">{{ formatPeriod(campaign.dataInicio, campaign.dataFim) }}</td>
              <td class="px-4 py-5 text-sage-muted">{{ ruleSummary(campaign.regra) }}</td>
              <td class="px-4 py-5"><StatusBadge :label="formatCampaignState(campaign.estado)" :tone="campaignStateTone(campaign.estado)" /></td>
              <td class="px-4 py-5">
                <div class="flex justify-end gap-3 text-xs font-bold">
                  <RouterLink :to="`/campanhas/${campaign.id}`" class="focus-ring rounded text-brand-dark underline underline-offset-4">Detalhes</RouterLink>
                  <RouterLink :to="`/campanhas/${campaign.id}/editar`" class="focus-ring rounded text-brand-dark underline underline-offset-4">Editar</RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { campaignService, normalizeCampaignError } from '@/services/campaignService'
import { campaignStateTone, formatCampaignState, formatPeriod } from '@/services/campaignMappers'

const campaigns = ref([])
const isLoading = ref(true)
const loadError = ref('')
const search = ref('')
const statusFilter = ref('ALL')

const statusOptions = computed(() => [...new Set(campaigns.value.map((campaign) => campaign.estado).filter(Boolean))])

const filteredCampaigns = computed(() => {
  const normalizedSearch = search.value.trim().toLocaleLowerCase()
  return campaigns.value.filter((campaign) => {
    const matchesSearch = !normalizedSearch || campaign.titulo?.toLocaleLowerCase().includes(normalizedSearch)
    const matchesStatus = statusFilter.value === 'ALL' || campaign.estado === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

onMounted(loadCampaigns)

async function loadCampaigns() {
  isLoading.value = true
  loadError.value = ''
  try {
    campaigns.value = await campaignService.list()
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

function ruleSummary(rule) {
  if (!rule) {
    return 'Não informada'
  }

  const dimensions = [rule.canal, rule.descrMarca, rule.descriCargo, rule.matricula].filter(Boolean)
  return dimensions.length ? dimensions.join(' · ') : 'Sem dimensões'
}
</script>
