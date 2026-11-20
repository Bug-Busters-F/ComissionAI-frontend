<template>
  <form class="rounded-2xl border border-sage-border bg-white p-5" @submit.prevent="$emit('apply')">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <label v-for="field in fields" :key="field.key" :for="`${prefix}${field.key}`" class="block text-xs font-semibold text-brand-dark">
        {{ field.label }}
        <select v-if="field.options" :id="`${prefix}${field.key}`" :value="modelValue[field.key]" class="audit-control" @change="update(field.key, $event.target.value)"><option value="">{{ field.empty || 'Todos' }}</option><option v-for="(label, value) in field.options" :key="value" :value="value">{{ label }}</option></select>
        <input v-else :id="`${prefix}${field.key}`" :value="modelValue[field.key]" :type="field.type || 'text'" :placeholder="field.placeholder" :maxlength="250" :min="field.type === 'number' ? 1 : undefined" class="audit-control" @input="update(field.key, $event.target.value)" />
      </label>
    </div>
    <p v-if="error" class="mt-4 text-sm text-danger-dark" role="alert">{{ error }}</p>
    <div class="mt-5 flex flex-wrap gap-3"><button type="submit" class="focus-ring rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:opacity-50" :disabled="loading">Aplicar filtros</button><button type="button" class="focus-ring rounded-full border border-sage-border px-5 py-2.5 text-sm font-semibold hover:bg-sage-light disabled:opacity-50" :disabled="loading" @click="$emit('reset')">Limpar filtros</button></div>
  </form>
</template>
<script setup>
const props = defineProps({ modelValue: { type: Object, required: true }, fields: { type: Array, required: true }, prefix: { type: String, required: true }, error: String, loading: Boolean })
const emit = defineEmits(['update:modelValue', 'apply', 'reset'])
const update = (key, value) => emit('update:modelValue', { ...props.modelValue, [key]: value })
</script>
<style scoped>
.audit-control { @apply focus-ring mt-2 w-full min-w-0 rounded-xl border border-sage-border bg-white px-3 py-2.5 text-sm font-normal text-brand-dark; }
</style>
