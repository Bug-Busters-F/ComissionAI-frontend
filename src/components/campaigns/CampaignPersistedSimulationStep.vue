<template>
  <div class="space-y-6">
    <p v-for="(warning, index) in simulation.result?.avisosGerais" :key="index" class="rounded-xl bg-warning-bg p-3 text-sm text-warning-text">{{ warning }}</p>
    <p v-if="simulation.pageError" role="alert" class="rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">{{ simulation.pageError }}</p>
    <CampaignSimulationStep
      :form="form" :simulation="simulation" :server-pagination="pagination"
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
import { computed } from 'vue'
import CampaignSimulationStep from '@/components/common/CampaignSimulationStep.vue'
import { persistedSimulationPagination } from '@/services/campaignPersistedSimulation'
const props = defineProps({ form: { type: Object, required: true }, simulation: { type: Object, required: true } })
defineEmits(['select-competence', 'refresh-competences', 'run-simulation', 'accept-simulation', 'change-page', 'change-page-size', 'back-to-rules'])
const pagination = computed(() => persistedSimulationPagination(props.simulation))
</script>
