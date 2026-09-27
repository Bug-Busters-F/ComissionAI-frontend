<template>
  <div class="space-y-7">
    <PageHeader title="Editar campanha" description="Revise a campanha e a regra vinculada antes de salvar.">
      <template #action>
        <RouterLink :to="`/campanhas/${route.params.id}`" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-white">Voltar para detalhes</RouterLink>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="rounded-2xl bg-white px-5 py-10 text-center text-sm text-sage-muted" role="status">Carregando dados da campanha…</div>

    <section v-else-if="loadError" class="rounded-2xl border border-danger/30 bg-danger-bg p-6 sm:p-7" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Campanha não encontrada</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ loadError }}</p>
      <RouterLink to="/campanhas" class="focus-ring mt-5 inline-flex rounded-full bg-danger px-5 py-3 text-sm font-bold text-white">Voltar para campanhas</RouterLink>
    </section>

    <CampaignForm v-else :model-value="form" :errors="errors" :general-error="generalError" :is-submitting="isSubmitting" submit-label="Salvar alterações" @update:model-value="updateForm" @submit="submit" @cancel="cancel" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampaignForm from '@/components/common/CampaignForm.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { campaignFormToPayload, campaignResponseToForm, createEmptyCampaignForm } from '@/services/campaignMappers'
import { campaignService, mapCampaignFieldErrors, normalizeCampaignError } from '@/services/campaignService'
import { hasValidationErrors, validateCampaignForm } from '@/services/campaignValidation'

const route = useRoute()
const router = useRouter()
const notifications = useNotificationStore()
const form = ref(createEmptyCampaignForm())
const errors = ref({})
const generalError = ref('')
const loadError = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)

onMounted(loadCampaign)

async function loadCampaign() {
  try {
    const campaign = await campaignService.get(route.params.id)
    form.value = campaignResponseToForm(campaign)
  } catch (error) {
    loadError.value = normalizeCampaignError(error).message
  } finally {
    isLoading.value = false
  }
}

function updateForm(value) {
  form.value = value
}

async function submit() {
  if (isSubmitting.value) {
    return
  }

  errors.value = validateCampaignForm(form.value)
  generalError.value = ''
  if (hasValidationErrors(errors.value)) {
    return
  }

  isSubmitting.value = true
  try {
    await campaignService.update(route.params.id, campaignFormToPayload(form.value))
    notifications.success('Campanha atualizada', 'As alterações foram persistidas.')
    await router.push(`/campanhas/${route.params.id}`)
  } catch (error) {
    const normalized = normalizeCampaignError(error)
    errors.value = mapCampaignFieldErrors(normalized.fieldErrors)
    generalError.value = normalized.message
  } finally {
    isSubmitting.value = false
  }
}

function cancel() {
  router.push(`/campanhas/${route.params.id}`)
}
</script>
