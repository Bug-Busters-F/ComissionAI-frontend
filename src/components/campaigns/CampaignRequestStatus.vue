<template>
  <div class="flex flex-col gap-3 rounded-xl border border-sage-border bg-sage-light px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status" aria-live="polite">
    <div class="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-brand-dark">
      <LoaderCircle :size="18" class="shrink-0 motion-safe:animate-spin" aria-hidden="true" />
      <span>{{ userFacingText(message) }}</span>
    </div>
    <button type="button" class="focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-danger/30 bg-white px-4 py-2 text-sm font-bold text-danger-dark transition-colors hover:border-danger hover:bg-danger-bg sm:self-auto" @click="$emit('cancel')">
      <X :size="16" aria-hidden="true" />
      Cancelar solicitação
    </button>
  </div>
</template>

<script setup>
import { userFacingText } from '@/services/userFacingText'
import { LoaderCircle, X } from 'lucide-vue-next'

defineProps({ message: { type: String, required: true } })
defineEmits(['cancel'])
</script>
