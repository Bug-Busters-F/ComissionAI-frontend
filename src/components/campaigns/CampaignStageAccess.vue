<template>
  <section class="rounded-2xl border border-sage-border bg-white p-5 text-sm" aria-label="Responsabilidade da etapa">
    <div class="flex flex-wrap items-center justify-between gap-3"><p class="font-bold">Etapa {{ responsibility.number }} · {{ responsibility.label }}</p><span class="rounded-full px-3 py-1 text-xs font-semibold" :class="editable ? 'bg-success-bg text-success-dark' : 'bg-sage-pill text-sage-subtle'">{{ editable ? 'Disponível para seu perfil' : 'Somente consulta' }}</span></div>
    <p class="mt-2 text-sage-muted">Responsável esperado: <strong class="text-brand-dark">{{ responsibility.owner }}</strong></p>
    <p v-if="!editable" class="mt-3 leading-6 text-sage-subtle">{{ access.stepMessage(step) }}</p>
    <p v-if="reason" class="mt-3 rounded-xl border border-warning-border bg-warning-bg p-3 leading-6 text-warning-text"><strong>Motivo da devolução:</strong> {{ reason }}</p>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import { STEP_RESPONSIBILITIES } from '@/services/accessPolicy'
import { useAccessPolicy } from '@/services/useAccessPolicy'
const props = defineProps({ step: String, reason: String, available: { type: Boolean, default: true } })
const access = useAccessPolicy()
const responsibility = computed(() => STEP_RESPONSIBILITIES.find(s => s.key === props.step) || STEP_RESPONSIBILITIES[0])
const editable = computed(() => props.available && access.editStep(props.step))
</script>
