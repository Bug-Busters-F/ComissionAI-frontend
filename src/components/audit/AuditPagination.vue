<template>
  <nav v-if="page" class="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-sage-muted" :aria-label="label">
    <p>{{ count(page.totalElements) }} registro(s) · Página {{ page.totalPages ? page.number + 1 : 0 }} de {{ page.totalPages }}</p>
    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2">Por página <select :value="page.size" :disabled="loading" class="focus-ring rounded-lg border border-sage-border bg-white px-2 py-2" @change="$emit('size', Number($event.target.value))"><option :value="20">20</option><option :value="50">50</option><option :value="100">100</option></select></label>
      <button type="button" class="focus-ring rounded-full border border-sage-border bg-white px-4 py-2 hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-40" :disabled="loading || page.number <= 0" @click="$emit('page', page.number - 1)">← Anterior</button>
      <button type="button" class="focus-ring rounded-full border border-sage-border bg-white px-4 py-2 hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-40" :disabled="loading || page.number + 1 >= page.totalPages" @click="$emit('page', page.number + 1)">Próxima →</button>
    </div>
  </nav>
</template>
<script setup>
import { auditCount as count } from '@/services/auditModel'
defineProps({ page: Object, loading: Boolean, label: { type: String, default: 'Paginação dos registros' } })
defineEmits(['page', 'size'])
</script>
