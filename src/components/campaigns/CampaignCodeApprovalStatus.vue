<template>
  <section class="mt-4 flex flex-col gap-3 rounded-xl border border-sage-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="code-approval-status">
    <div class="min-w-0 flex-1">
    <h2 id="code-approval-status" class="text-sm font-bold text-brand-dark">Aprovação do código</h2>
    <p role="status" class="mt-1 text-xs leading-5" :class="approved ? 'text-success-dark' : 'text-sage-muted'">{{ approved ? 'O código foi revisado e aprovado pelo analista de código. Você pode continuar para a simulação.' : 'O código precisa ser revisado e aprovado pelo analista de código antes de avançar para a simulação.' }}</p>
    <p v-if="!approved && needsPreparation" class="mt-1 text-xs leading-5 text-sage-muted">Valide e salve as regras atuais para disponibilizá-las para revisão.</p>
    <p v-if="error" role="alert" class="mt-1 text-xs leading-5 text-danger-dark">{{ userFacingText(error) }}</p>
    </div>
    <button v-if="canPrepare && needsPreparation" type="button" class="focus-ring shrink-0 self-start rounded-full border border-sage-border px-3 py-2 text-xs font-bold sm:self-center disabled:cursor-not-allowed disabled:opacity-50" :disabled="busy" @click="$emit('prepare')">Validar e enviar para revisão</button>
    <button v-else-if="!approved" type="button" class="focus-ring shrink-0 self-start rounded-full border border-sage-border px-3 py-2 text-xs font-bold sm:self-center disabled:opacity-50" :disabled="busy" @click="$emit('refresh')">Verificar aprovação</button>
  </section>
</template>
<script setup>
import { userFacingText } from '@/services/userFacingText'
defineProps({ error: String, approved: Boolean, needsPreparation: Boolean, canPrepare: Boolean, busy: Boolean })
defineEmits(['prepare', 'refresh'])
</script>
