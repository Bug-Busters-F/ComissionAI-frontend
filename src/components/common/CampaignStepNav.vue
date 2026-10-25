<template>
  <nav class="rounded-[22px] border border-sage-border bg-sage-light p-2" aria-label="Etapas da campanha">
    <ol class="grid gap-2 sm:grid-cols-4">
      <li v-for="step in steps" :key="step.key">
        <button type="button" class="focus-ring flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition sm:px-4"
          :class="step.key === currentStep ? 'border-white bg-white text-brand-dark shadow-sm' : step.number < reached ? 'border-brand/40 bg-white text-brand-dark hover:bg-brand/10' : 'border-sage-border bg-white/40 text-sage-muted disabled:cursor-not-allowed disabled:opacity-50'"
          :disabled="step.number > reached && step.key !== currentStep"
          :aria-current="step.key === currentStep ? 'step' : undefined" @click="$emit('select', step.key)">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold" :class="step.key === currentStep ? 'bg-brand text-brand-dark' : step.number < reached ? 'bg-brand/20 text-brand-dark' : 'border border-sage-border bg-white'">
            <Check v-if="step.number < reached && step.key !== currentStep" :size="17" aria-hidden="true" /><template v-else>{{ step.number }}</template>
          </span>
          <span class="text-sm font-extrabold">{{ step.label }}</span>
        </button>
      </li>
    </ol>
  </nav>
</template>
<script setup>
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
const props = defineProps({ steps: { type: Array, required: true }, currentStep: { type: String, required: true },
  currentStepNumber: { type: Number, required: true }, reachedStep: { type: Number, default: null } })
const reached = computed(() => props.reachedStep ?? props.currentStepNumber)
defineEmits(['select'])
</script>
