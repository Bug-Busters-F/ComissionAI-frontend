<template>
  <form class="space-y-6" novalidate @submit.prevent="emit('submit')">
    <section class="rounded-2xl bg-white p-6 sm:p-7" aria-labelledby="campaign-data-heading">
      <div>
        <h2 id="campaign-data-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Campanha</h2>
        <p class="mt-1 text-sm text-sage-muted">Identifique a proposta e preserve o texto que originou a regra.</p>
      </div>

      <div class="mt-6 grid gap-5">
        <div>
          <label for="campaign-title" class="field-label">Título <span class="required-mark">*</span></label>
          <input id="campaign-title" :value="modelValue.titulo" type="text" autocomplete="off" autofocus class="form-control" :class="{ 'form-control-error': fieldError('titulo') }" :aria-invalid="Boolean(fieldError('titulo'))" :aria-describedby="fieldError('titulo') ? 'campaign-title-error' : undefined" @input="updateField('titulo', $event.target.value)" />
          <p v-if="fieldError('titulo')" id="campaign-title-error" class="field-error">{{ fieldError('titulo') }}</p>
        </div>

        <div>
          <label for="campaign-original-text" class="field-label">Texto original <span class="required-mark">*</span></label>
          <textarea id="campaign-original-text" :value="modelValue.textoOriginal" rows="5" class="form-control resize-y" :class="{ 'form-control-error': fieldError('textoOriginal') }" :aria-invalid="Boolean(fieldError('textoOriginal'))" :aria-describedby="fieldError('textoOriginal') ? 'campaign-original-text-error' : undefined" @input="updateField('textoOriginal', $event.target.value)" />
          <p v-if="fieldError('textoOriginal')" id="campaign-original-text-error" class="field-error">{{ fieldError('textoOriginal') }}</p>
          <p class="field-help">Esse conteúdo fica separado dos valores interpretados e não é substituído automaticamente.</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl bg-white p-6 sm:p-7" aria-labelledby="campaign-period-heading">
      <div>
        <h2 id="campaign-period-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Vigência</h2>
        <p class="mt-1 text-sm text-sage-muted">As datas são enviadas como datas locais, sem conversão de fuso horário.</p>
      </div>

      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label for="campaign-start" class="field-label">Data inicial <span class="optional-mark">opcional</span></label>
          <input id="campaign-start" :value="modelValue.dataInicio" type="date" class="form-control" :class="{ 'form-control-error': fieldError('dataInicio') }" :aria-invalid="Boolean(fieldError('dataInicio'))" :aria-describedby="fieldError('dataInicio') ? 'campaign-start-error' : undefined" @input="updateField('dataInicio', $event.target.value)" />
          <p v-if="fieldError('dataInicio')" id="campaign-start-error" class="field-error">{{ fieldError('dataInicio') }}</p>
        </div>

        <div>
          <label for="campaign-end" class="field-label">Data final <span class="optional-mark">opcional</span></label>
          <input id="campaign-end" :value="modelValue.dataFim" type="date" class="form-control" :class="{ 'form-control-error': fieldError('dataFim') }" :aria-invalid="Boolean(fieldError('dataFim'))" :aria-describedby="fieldError('dataFim') ? 'campaign-end-error' : undefined" @input="updateField('dataFim', $event.target.value)" />
          <p v-if="fieldError('dataFim')" id="campaign-end-error" class="field-error">{{ fieldError('dataFim') }}</p>
        </div>
      </div>

      <p v-if="datesHaveDefaults" class="mt-4 rounded-xl bg-sage-light px-4 py-3 text-sm leading-6 text-sage-subtle" role="status">
        Se a data inicial ficar vazia, o backend usará a data atual. Se a data final ficar vazia, ele usará o início mais 30 dias.
      </p>
    </section>

    <section class="rounded-2xl bg-white p-6 sm:p-7" aria-labelledby="campaign-rule-heading">
      <div>
        <h2 id="campaign-rule-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Regra vinculada</h2>
        <p class="mt-1 text-sm text-sage-muted">Todos os campos desta seção são opcionais, exceto a taxa positiva.</p>
      </div>

      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label for="campaign-rate" class="field-label">Taxa positiva (%) <span class="required-mark">*</span></label>
          <input id="campaign-rate" :value="modelValue.taxaPercentual" type="text" inputmode="decimal" placeholder="Ex.: 5 ou 0,75" class="form-control" :class="{ 'form-control-error': fieldError('taxaPercentual') }" :aria-invalid="Boolean(fieldError('taxaPercentual'))" :aria-describedby="fieldError('taxaPercentual') ? 'campaign-rate-error' : 'campaign-rate-help'" @input="updateField('taxaPercentual', $event.target.value)" />
          <p v-if="fieldError('taxaPercentual')" id="campaign-rate-error" class="field-error">{{ fieldError('taxaPercentual') }}</p>
          <p v-else id="campaign-rate-help" class="field-help">Ex.: 5 corresponde a 0,05 enviado à API.</p>
        </div>

        <div>
          <label for="campaign-brand-code" class="field-label">Código da marca <span class="optional-mark">opcional</span></label>
          <input id="campaign-brand-code" :value="modelValue.codMarca" type="text" inputmode="numeric" class="form-control" @input="updateField('codMarca', $event.target.value)" />
          <p v-if="fieldError('codMarca')" class="field-error">{{ fieldError('codMarca') }}</p>
        </div>

        <div>
          <label for="campaign-brand-description" class="field-label">Descrição da marca <span class="optional-mark">opcional</span></label>
          <input id="campaign-brand-description" :value="modelValue.descrMarca" type="text" class="form-control" @input="updateField('descrMarca', $event.target.value)" />
        </div>

        <div>
          <label for="campaign-store-code" class="field-label">Código da loja <span class="optional-mark">opcional</span></label>
          <input id="campaign-store-code" :value="modelValue.codLoja" type="text" inputmode="numeric" class="form-control" @input="updateField('codLoja', $event.target.value)" />
          <p v-if="fieldError('codLoja')" class="field-error">{{ fieldError('codLoja') }}</p>
        </div>

        <div>
          <label for="campaign-job-code" class="field-label">Código do cargo <span class="optional-mark">opcional</span></label>
          <input id="campaign-job-code" :value="modelValue.codCargo" type="text" inputmode="numeric" class="form-control" @input="updateField('codCargo', $event.target.value)" />
          <p v-if="fieldError('codCargo')" class="field-error">{{ fieldError('codCargo') }}</p>
        </div>

        <div>
          <label for="campaign-job-description" class="field-label">Descrição do cargo <span class="optional-mark">opcional</span></label>
          <input id="campaign-job-description" :value="modelValue.descriCargo" type="text" class="form-control" @input="updateField('descriCargo', $event.target.value)" />
        </div>

        <div>
          <label for="campaign-registration" class="field-label">Matrícula <span class="optional-mark">opcional</span></label>
          <input id="campaign-registration" :value="modelValue.matricula" type="text" class="form-control" @input="updateField('matricula', $event.target.value)" />
        </div>
      </div>
    </section>

    <p v-if="generalError" class="rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger-dark" role="alert">{{ generalError }}</p>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-white" :disabled="isSubmitting" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="focus-ring inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSubmitting">
        <span v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-brand-dark/30 border-t-brand-dark" aria-hidden="true"></span>
        {{ isSubmitting ? 'Salvando…' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  generalError: { type: String, default: '' },
  isSubmitting: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Salvar campanha' }
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])
const datesHaveDefaults = computed(() => !props.modelValue.dataInicio || !props.modelValue.dataFim)

function updateField(field, value) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function fieldError(field) {
  return props.errors[field] || ''
}
</script>

<style scoped>
.field-label {
  @apply mb-2 block text-sm font-bold text-brand-dark;
}

.required-mark {
  @apply text-danger;
}

.optional-mark {
  @apply ml-1 text-xs font-medium text-sage-muted;
}

.form-control {
  @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted;
}

.form-control-error {
  @apply border-danger;
}

.field-help {
  @apply mt-2 text-xs leading-5 text-sage-muted;
}

.field-error {
  @apply mt-2 text-xs font-semibold leading-5 text-danger-dark;
}
</style>
