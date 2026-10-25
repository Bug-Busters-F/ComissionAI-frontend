<template>
  <section class="rounded-2xl border border-sage-border bg-white p-5 sm:p-7">
    <h2 class="text-xl font-extrabold">Histórico de versões</h2>
    <p class="mt-2 text-sm text-sage-muted">Versões publicadas disponíveis somente para leitura, com suas explicações e código preservados.</p>
    <p v-if="loading" role="status" class="mt-4 text-sm">Carregando histórico…</p>
    <p v-if="error" role="alert" class="mt-4 text-sm text-danger-dark">{{ userFacingText(error) }} <button class="focus-ring rounded font-bold underline" @click="load">Tentar novamente</button></p>
    <p v-if="!loading && !error && !versions.length" class="mt-4 text-sm text-sage-muted">Esta campanha ainda não possui versões publicadas.</p>
    <label v-if="versions.length" class="mt-4 block text-sm font-bold">Versão publicada
      <select :value="selected" class="focus-ring mt-2 block w-full rounded-xl border border-sage-border bg-white p-3 sm:max-w-md" @change="select($event.target.value)">
        <option value="">Selecione uma versão</option>
        <option v-for="version in versions" :key="version.numero" :value="version.numero">Versão {{ version.numero }}{{ version.numero === currentVersion ? ' · Atual' : '' }} · {{ version.responsavel || 'Responsável não informado' }}</option>
      </select>
    </label>
    <p v-if="detailLoading" role="status" class="mt-4 text-sm">Carregando a versão selecionada…</p>
    <div v-if="snapshot && !detailLoading" class="mt-5">
      <p class="mb-4 text-sm text-sage-muted">Versão {{ detail.numero }}{{ detail.numero === currentVersion ? ' · Atual' : '' }} · Publicada em {{ formatDateTime(detail.publicadoEm) }} · {{ detail.responsavel || 'Responsável não informado' }}</p>
      <CampaignProposalReviewSummary :campaign="snapshot" :validation="validation" :show-python="true" hide-impact historical />
    </div>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import CampaignProposalReviewSummary from './CampaignProposalReviewSummary.vue'
import { createCampaignLifecycleApi } from '@/services/campaignLifecycleApi'
import { versionToCampaign } from '@/services/campaignVersionComparison'
import { validateCampaignProposalSet } from '@/services/campaignProposalValidation'
import { normalizeCampaignError } from '@/services/campaignService'
import { userFacingText } from '@/services/userFacingText'
const props = defineProps({ campaignId: { type: [String, Number], required: true }, currentVersion: { type: Number, default: null } })
const api = createCampaignLifecycleApi()
const versions = ref([]), selected = ref(''), snapshot = ref(null), detail = ref(null), loading = ref(false), detailLoading = ref(false), error = ref('')
let sequence = 0
const validation = computed(() => validateCampaignProposalSet(snapshot.value || { propostas: [] }))
function formatDateTime(value) { return value ? new Date(value).toLocaleString('pt-BR') : 'Data não informada' }
async function load() {
  const request = ++sequence
  loading.value = true; versions.value = []; error.value = ''; snapshot.value = null; selected.value = ''; detailLoading.value = false
  try {
    const result = await api.history(props.campaignId)
    if (request !== sequence) return
    versions.value = result
    loading.value = false
    const current = result.find((version) => version.numero === props.currentVersion)
    if (current) await select(current.numero)
  }
  catch (e) { if (request === sequence) error.value = normalizeCampaignError(e).message }
  finally { if (request === sequence) loading.value = false }
}
async function select(number) {
  const request = ++sequence
  selected.value = number; snapshot.value = null; error.value = ''; detailLoading.value = Boolean(number)
  if (!number) return
  try {
    const result = await api.version(props.campaignId, number)
    if (request !== sequence) return
    if (String(result.campanhaId) !== String(props.campaignId) || String(result.numero) !== String(number)) throw new Error('Versão retornada não corresponde à seleção.')
    detail.value = result; snapshot.value = versionToCampaign(result)
  } catch (e) { if (request === sequence) error.value = e.response ? normalizeCampaignError(e).message : e.message }
  finally { if (request === sequence) detailLoading.value = false }
}
watch(() => [props.campaignId, props.currentVersion], load, { immediate: true })
</script>
