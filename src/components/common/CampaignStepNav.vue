<template>
  <nav class="rounded-[22px] bg-[#dde3d8] p-1.5" aria-label="Etapas da campanha">
    <ol class="grid gap-1 sm:grid-cols-4">
      <li v-for="step in steps" :key="step.key">
        <button
          type="button"
          class="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition sm:px-4"
          :class="step.key === currentStep ? 'bg-white text-brand-dark shadow-sm' : step.number <= currentStepNumber ? 'text-brand-dark hover:bg-white/70' : 'text-sage-muted hover:bg-white/50'"
          :aria-current="step.key === currentStep ? 'step' : undefined"
          @click="$emit('select', step.key)"
        >
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs" :class="step.number <= currentStepNumber ? 'bg-brand text-brand-dark' : 'bg-white/70 text-sage-muted'">{{ step.number }}</span>
          <span>{{ step.label }}</span>
        </button>
      </li>
    </ol>
  </nav>
</template>

<script setup>
defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: String, required: true },
  currentStepNumber: { type: Number, required: true }
})

defineEmits(['select'])
</script>
