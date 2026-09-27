<template>
  <span :class="['inline-flex rounded-full px-3 py-1.5 text-xs font-semibold', toneClasses[tone] || toneClasses.neutral]">
    {{ label }}
  </span>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  tone: { type: String, default: 'neutral' }
})

const toneClasses = {
  neutral: 'bg-sage-pill text-sage-muted',
  success: 'bg-success-surface text-success-text',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-bg text-danger'
}
</script>
