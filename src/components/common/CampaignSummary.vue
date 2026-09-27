<template>
  <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="campaign-summary-title">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="campaign-summary-title" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">{{ title }}</h2>
        <p v-if="subtitle" class="mt-1 text-sm text-sage-muted">{{ subtitle }}</p>
      </div>
      <span v-if="badge" class="rounded-full bg-success-surface px-3 py-1.5 text-xs font-bold text-success-text">{{ badge }}</span>
    </div>

    <dl class="mt-7 grid gap-x-8 sm:grid-cols-2">
      <div v-for="item in summaryItems" :key="item.label" class="flex items-start justify-between gap-4 border-b border-sage-border-light py-3 text-sm first:pt-0 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
        <dt class="text-sage-muted">{{ item.label }}</dt>
        <dd class="text-right font-bold text-brand-dark">{{ item.value || 'Não informado' }}</dd>
      </div>
    </dl>

    <div class="mt-6 rounded-2xl bg-sage-light p-4">
      <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Texto original</p>
      <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-sage-subtle">{{ originalText || 'Não informado' }}</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  badge: { type: String, default: '' },
  summaryItems: { type: Array, default: () => [] },
  originalText: { type: String, default: '' }
})
</script>
