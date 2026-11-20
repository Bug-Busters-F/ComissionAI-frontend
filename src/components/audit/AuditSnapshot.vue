<template>
  <section class="min-w-0 rounded-xl border border-sage-border p-4">
    <h3 class="text-sm font-bold">{{ title }}</h3>
    <p v-if="!entries.length" class="mt-3 text-xs text-sage-muted">Não há dados disponíveis para esta etapa do registro.</p>
    <dl v-else class="mt-3 max-h-80 space-y-3 overflow-y-auto text-xs"><div v-for="(entry, index) in entries" :key="index"><dt class="font-semibold text-sage-muted">{{ entry.label }}</dt><dd class="mt-1 whitespace-pre-wrap break-words text-brand-dark">{{ entry.value }}</dd></div></dl>
    <p v-if="entries.length >= 100" class="mt-3 text-xs text-sage-muted">Exibindo até 100 campos deste registro.</p>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import { auditSnapshotEntries } from '@/services/auditModel'
const props = defineProps({ title: { type: String, required: true }, value: [String, Object, Array] })
const entries = computed(() => auditSnapshotEntries(props.value))
</script>
