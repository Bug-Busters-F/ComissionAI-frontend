<template>
  <div class="space-y-6">
    <header>
      <button type="button" class="focus-ring rounded font-semibold text-brand-dark" @click="router.push(`/campanhas/${route.params.id}`)">← Campanha</button>
      <div class="mt-7 flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">Apurar campanha</h1><p class="mt-2 text-sm text-sage-muted">{{ campaign?.titulo || 'Campanha' }} · painel demonstrativo</p></div><span class="rounded-full bg-warning-light px-3 py-1.5 text-xs font-bold text-warning-dark">Demonstração</span></div>
    </header>

    <div v-if="isLoading" class="rounded-[22px] bg-white px-6 py-14 text-center text-sm text-sage-muted" role="status">Carregando painel…</div>
    <section v-else-if="loadError" class="rounded-[22px] border border-danger/30 bg-danger-bg p-6" role="alert"><h2 class="text-xl font-extrabold text-danger-dark">Não foi possível abrir o painel</h2><p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ loadError }}</p></section>
    <CampaignDemoApuration v-else :campaign-title="campaign?.titulo" @memory="isMemoryOpen = true" />

    <CampaignMemoryDialog :open="isMemoryOpen" @close="isMemoryOpen = false" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignDemoApuration from '@/components/common/CampaignDemoApuration.vue'
import CampaignMemoryDialog from '@/components/common/CampaignMemoryDialog.vue'
import { campaignDemo, isCampaignDemoEnabled } from '@/services/campaignDemo'
import { campaignService, normalizeCampaignError } from '@/services/campaignService'

const route = useRoute()
const router = useRouter()
const campaign = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const isMemoryOpen = ref(false)

onMounted(async () => {
  try {
    campaign.value = isCampaignDemoEnabled ? campaignDemo.get(route.params.id) : await campaignService.get(route.params.id)
    if (!campaign.value) {
      loadError.value = 'Campanha não encontrada.'
    }
  } catch (error) {
    loadError.value = normalizeCampaignError(error).message
  } finally {
    isLoading.value = false
  }
})
</script>
