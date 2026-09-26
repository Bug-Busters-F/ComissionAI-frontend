<template>
  <div class="space-y-7">
    <PageHeader title="Nova campanha" description="Cadastre uma campanha e sua única regra vinculada.">
      <template #action>
        <RouterLink to="/campanhas" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-white">Voltar para campanhas</RouterLink>
      </template>
    </PageHeader>

    <CampaignForm :model-value="form" :errors="errors" :general-error="generalError" :is-submitting="isSubmitting" @update:model-value="updateForm" @submit="submit" @cancel="cancel" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CampaignForm from '@/components/common/CampaignForm.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { campaignFormToPayload, createEmptyCampaignForm } from '@/services/campaignMappers'
import { campaignService, mapCampaignFieldErrors, normalizeCampaignError } from '@/services/campaignService'
import { hasValidationErrors, validateCampaignForm } from '@/services/campaignValidation'

const router = useRouter()
const notifications = useNotificationStore()
const form = ref(createEmptyCampaignForm())
const errors = ref({})
const generalError = ref('')
const isSubmitting = ref(false)

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
    const campaign = await campaignService.create(campaignFormToPayload(form.value))
    notifications.success('Campanha criada', 'A campanha foi salva como rascunho.')
    await router.push(`/campanhas/${campaign.id}`)
  } catch (error) {
    const normalized = normalizeCampaignError(error)
    errors.value = mapCampaignFieldErrors(normalized.fieldErrors)
    generalError.value = normalized.message
  } finally {
    isSubmitting.value = false
  }
}

function cancel() {
  router.push('/campanhas')
}
</script>
