<template>
  <div class="space-y-6">
    <p v-for="(warning, index) in visibleWarnings" :key="index" class="rounded-xl bg-warning-bg p-3 text-sm text-warning-text">{{ userFacingText(warning) }}</p>
    <p v-if="simulation.pageError" role="alert" class="rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">{{ userFacingText(simulation.pageError) }}</p>
    <CampaignSimulationStep
      :form="form" :simulation="simulation" :server-pagination="pagination" :show-decision-actions="false"
      @select-competence="$emit('select-competence', $event)"
      @refresh-competences="$emit('refresh-competences')"
      @run-simulation="$emit('run-simulation')"
      @accept-simulation="$emit('accept-simulation')"
      @change-page="$emit('change-page', $event)"
      @change-page-size="$emit('change-page-size', $event)"
      @back-to-rules="$emit('back-to-rules')"
    />
  </div>
</template>

<script setup>
import { userFacingText } from '@/services/userFacingText'
import { computed } from 'vue'
import { isInformationalSimulationNotice } from '@/services/userFacingText'
import CampaignSimulationStep from '@/components/common/CampaignSimulationStep.vue'
import { persistedSimulationPagination } from '@/services/campaignPersistedSimulation'
const props = defineProps({ form: { type: Object, required: true }, simulation: { type: Object, required: true } })
defineEmits(['select-competence', 'refresh-competences', 'run-simulation', 'accept-simulation', 'change-page', 'change-page-size', 'back-to-rules'])
const visibleWarnings = computed(() => (props.simulation.result?.avisosGerais || []).filter((warning) => !isInformationalSimulationNotice(warning)))
const pagination = computed(() => persistedSimulationPagination(props.simulation))
</script>
