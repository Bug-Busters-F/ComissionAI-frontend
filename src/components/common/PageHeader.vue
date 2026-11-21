<template>
  <!-- Título e ações lado a lado só a partir de lg: com a sidebar aberta (md), sm/md espremiam o título e empurravam os botões para fora da tela. -->
  <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    <div class="min-w-0">
      <h1 class="text-4xl font-extrabold tracking-[-0.05em] sm:text-[42px]">{{ title }}</h1>
      <p v-if="description" class="mt-2 text-sm text-sage-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="max-w-full lg:shrink-0">
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
