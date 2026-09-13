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
  neutral: 'bg-[#eef1ec] text-[#646862]',
  success: 'bg-[#e3f6d8] text-[#47872b]',
  warning: 'bg-[#fff0bb] text-[#8c6e1e]'
}
</script>
