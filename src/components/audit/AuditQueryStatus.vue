<template>
  <p v-if="state.loading" class="rounded-xl bg-sage-light p-5 text-sm text-sage-muted" role="status">{{ loadingText }}</p>
  <div v-else-if="state.error" class="rounded-xl border border-danger/30 bg-danger-bg p-5 text-sm text-danger-dark" role="alert"><p>{{ state.error }}</p><button type="button" class="focus-ring mt-3 font-semibold underline underline-offset-4" @click="$emit('retry')">Tentar novamente</button></div>
</template>
<script setup>
defineProps({ state: { type: Object, required: true }, loadingText: { type: String, default: 'Consultando registros…' } })
defineEmits(['retry'])
</script>
