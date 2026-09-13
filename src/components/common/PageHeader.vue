<template>
  <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">{{ title }}</h1>
      <p v-if="description" class="mt-2 text-sm text-[#646862]">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="shrink-0">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
})
</script>
