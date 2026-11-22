<template>
  <section class="space-y-4 rounded-2xl border border-sage-border bg-white p-5 sm:p-7" aria-labelledby="approval-card-title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="approval-card-title" class="text-lg font-black text-brand-dark">Revisão do código</h2>
        <p class="mt-1 text-xs text-sage-muted">A aprovação considera o código completo da campanha<span v-if="program"> · Versão {{ program.versaoCampanhaNumero }} · Revisão do código {{ program.versaoPrograma }}</span>.</p>
      </div>
      <span v-if="!loading && !error && program" class="rounded-full px-3 py-1 text-xs font-bold" :class="approved ? 'bg-success-bg text-success-dark' : 'bg-warning-bg text-warning-text'">{{ label }}</span>
    </div>
    <p v-if="loading" role="status" class="text-sm text-sage-muted">Consultando revisão do código…</p>
    <div v-else-if="error" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-bg p-4 text-sm text-warning-text">
      <p>{{ error }}</p>
      <button type="button" class="focus-ring rounded-full border border-warning/40 px-4 py-2 font-bold" @click="$emit('refresh')">Tentar novamente</button>
    </div>
    <template v-else-if="program">
      <p v-if="invalidated" role="alert" class="rounded-xl bg-warning-bg p-4 text-sm text-warning-text">A aprovação anterior não é válida para os dados atuais. O analista de código precisa revisar e aprovar o código novamente na etapa 2.</p>
      <p v-else-if="rejected" class="text-sm text-sage-muted">O código foi devolvido para correção. Uma nova revisão é necessária na etapa 2.</p>
      <p v-else-if="!approved" class="text-sm text-sage-muted">Aguardando revisão e aprovação pelo analista de código na etapa 2.</p>
      <p v-else class="text-sm text-sage-muted">O código completo está aprovado para execução.</p>
      <div v-if="approved && (program.aprovadoPor || program.aprovadoEm)" class="grid gap-2 rounded-xl bg-sage-light/40 p-3 text-xs text-sage-muted sm:grid-cols-2">
        <p><strong class="text-brand-dark">Aprovado por:</strong> {{ program.aprovadoPor || 'Não informado' }}</p>
        <p><strong class="text-brand-dark">Data da aprovação:</strong> {{ formatDateTime(program.aprovadoEm) }}</p>
      </div>
      <p v-if="rejected && program.justificativa" class="text-sm text-sage-muted">Motivo: {{ userFacingText(program.justificativa) }}</p>
      <RouterLink v-if="reviewUrl && !approved" :to="reviewUrl" class="focus-ring inline-flex rounded-full border border-sage-border px-4 py-2 text-xs font-bold text-brand-dark hover:bg-sage-light">Ir para revisão na etapa 2</RouterLink>
    </template>
    <p v-else class="text-sm text-sage-muted">A revisão do código ainda não está disponível.</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { userFacingText } from '@/services/userFacingText'

const props = defineProps({
  program: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  reviewUrl: { type: String, default: '' }
})
defineEmits(['refresh'])
const approved = computed(() => props.program?.statusAprovacao === 'APROVADO' && props.program?.validoParaExecucao === true)
const rejected = computed(() => props.program?.statusAprovacao === 'REJEITADO')
const invalidated = computed(() => props.program?.statusAprovacao === 'APROVADO' && !approved.value)
const label = computed(() => approved.value ? 'Código aprovado' : rejected.value ? 'Devolvido para correção' : invalidated.value ? 'Nova revisão necessária' : 'Aguardando revisão')
function formatDateTime(value) {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : 'Não informada'
}
</script>
