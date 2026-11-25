<template>
  <section class="rounded-[22px] border border-sage-border bg-white p-6 sm:p-7" aria-labelledby="accepted-simulation-title">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="accepted-simulation-title" class="text-xl font-extrabold">Simulação da campanha</h2>
        <p class="mt-2 text-sm text-sage-muted">Projeção aceita para {{ campaign.versaoVigente != null ? `a versão ${campaign.versaoVigente}` : 'esta campanha' }}. A apuração apresenta os resultados das vendas reais.</p>
      </div>
      <span v-if="simulation" class="rounded-full bg-success-bg px-3 py-1 text-xs font-bold text-success-dark">Simulação aceita</span>
    </div>
    <p v-if="loading" class="mt-5 text-sm text-sage-muted" role="status">Carregando simulação…</p>
    <div v-else-if="error" class="mt-5 rounded-xl bg-warning-bg p-4 text-sm text-warning-text" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="focus-ring mt-3 rounded-full border border-sage-border px-4 py-2 font-bold" @click="load">Tentar novamente</button>
    </div>
    <CampaignSimulationSummary v-else-if="simulation" :simulation="simulation" />
    <p v-else class="mt-5 text-sm text-sage-muted">Esta campanha ainda não possui uma simulação aceita.</p>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { createCampaignLifecycleApi } from '@/services/campaignLifecycleApi'
import CampaignSimulationSummary from './CampaignSimulationSummary.vue'

const props = defineProps({ campaign: { type: Object, required: true } })
const simulation = ref(null)
const loading = ref(false)
const error = ref('')
let revision = 0

async function load() {
  const request = ++revision
  const { id, simulacaoAceitaId } = props.campaign
  simulation.value = null
  error.value = ''
  loading.value = Boolean(simulacaoAceitaId)
  if (!simulacaoAceitaId) return
  try {
    const result = await createCampaignLifecycleApi().simulation(simulacaoAceitaId)
    if (request !== revision) return
    if (String(result?.id) !== String(simulacaoAceitaId) || String(result?.campanhaId) !== String(id) || !result?.cenario100) throw new Error('Simulação incompatível')
    simulation.value = result
  } catch {
    if (request === revision) error.value = 'Não foi possível consultar a simulação aceita. Tente novamente.'
  } finally {
    if (request === revision) loading.value = false
  }
}
watch(() => [props.campaign.id, props.campaign.simulacaoAceitaId], load, { immediate: true })
</script>
