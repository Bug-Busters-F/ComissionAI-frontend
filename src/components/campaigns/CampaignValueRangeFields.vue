<template>
  <fieldset class="rounded-2xl border border-sage-border p-4">
    <legend class="px-1 text-sm font-bold text-brand-dark">Valor de uma venda individual</legend>
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <div class="mb-2 flex items-center gap-1">
          <label :for="idFor('valorMinimo')" class="campaign-label !mb-0">Valor mínimo (R$)</label>
          <CampaignFieldOriginHelp field-label="Valor mínimo (R$)" />
        </div>
        <input :id="idFor('valorMinimo')" :value="fields.valorMinimo" type="text" inputmode="decimal" autocomplete="off" class="campaign-control" :class="errorClass('valorMinimo')" placeholder="Ex.: 1000,00" :aria-invalid="Boolean(errorFor('valorMinimo'))" :aria-describedby="errorFor('valorMinimo') ? idFor('valorMinimo') + '-error' : undefined" @input="update('valorMinimo', $event.target.value)" />
        <p v-if="errorFor('valorMinimo')" :id="idFor('valorMinimo') + '-error'" class="campaign-error">{{ errorFor('valorMinimo') }}</p>
        <div class="mb-2 flex items-center gap-1 mt-3">
          <label :for="idFor('minimoInclusivo')" class="campaign-label !mb-0">Operador do mínimo</label>
          <CampaignFieldOriginHelp field-label="Operador do mínimo" />
        </div>
        <select :id="idFor('minimoInclusivo')" :value="selectValue(fields.minimoInclusivo)" class="campaign-control" :disabled="fields.valorMinimo === ''" :aria-invalid="Boolean(errorFor('minimoInclusivo'))" :aria-describedby="errorFor('minimoInclusivo') ? idFor('minimoInclusivo') + '-error' : undefined" @change="update('minimoInclusivo', parseOperator($event.target.value))">
          <option value="">Selecione</option>
          <option value="inclusive">A partir de (inclui)</option>
          <option value="exclusive">Acima de (não inclui)</option>
        </select>
        <p v-if="errorFor('minimoInclusivo')" :id="idFor('minimoInclusivo') + '-error'" class="campaign-error">{{ errorFor('minimoInclusivo') }}</p>
      </div>

      <div>
        <div class="mb-2 flex items-center gap-1">
          <label :for="idFor('valorMaximo')" class="campaign-label !mb-0">Valor máximo (R$)</label>
          <CampaignFieldOriginHelp field-label="Valor máximo (R$)" />
        </div>
        <input :id="idFor('valorMaximo')" :value="fields.valorMaximo" type="text" inputmode="decimal" autocomplete="off" class="campaign-control" :class="errorClass('valorMaximo')" placeholder="Ex.: 5000,00" :aria-invalid="Boolean(errorFor('valorMaximo'))" :aria-describedby="errorFor('valorMaximo') ? idFor('valorMaximo') + '-error' : undefined" @input="update('valorMaximo', $event.target.value)" />
        <p v-if="errorFor('valorMaximo')" :id="idFor('valorMaximo') + '-error'" class="campaign-error">{{ errorFor('valorMaximo') }}</p>
        <div class="mb-2 flex items-center gap-1 mt-3">
          <label :for="idFor('maximoInclusivo')" class="campaign-label !mb-0">Operador do máximo</label>
          <CampaignFieldOriginHelp field-label="Operador do máximo" />
        </div>
        <select :id="idFor('maximoInclusivo')" :value="selectValue(fields.maximoInclusivo)" class="campaign-control" :disabled="fields.valorMaximo === ''" :aria-invalid="Boolean(errorFor('maximoInclusivo'))" :aria-describedby="errorFor('maximoInclusivo') ? idFor('maximoInclusivo') + '-error' : undefined" @change="update('maximoInclusivo', parseOperator($event.target.value))">
          <option value="">Selecione</option>
          <option value="inclusive">Até (inclui)</option>
          <option value="exclusive">Abaixo de (não inclui)</option>
        </select>
        <p v-if="errorFor('maximoInclusivo')" :id="idFor('maximoInclusivo') + '-error'" class="campaign-error">{{ errorFor('maximoInclusivo') }}</p>
      </div>
    </div>
    <p class="mt-4 rounded-xl bg-sage-light px-3 py-2 text-sm leading-5 text-brand-dark" aria-live="polite">{{ rangeSummary }}</p>
    <p class="mt-2 text-xs leading-5 text-sage-muted">Digite sem separador de milhar, por exemplo 1000,00. Os limites vazios significam que não há restrição naquele lado.</p>
  </fieldset>
</template>

<script setup>
import { computed } from 'vue'
import CampaignFieldOriginHelp from './CampaignFieldOriginHelp.vue'
import { parseDecimalToMinor } from '@/services/campaignProposalValidation'

const props = defineProps({
  fields: { type: Object, required: true },
  clientId: { type: String, required: true },
  pendencias: { type: Array, default: () => [] }
})
const emit = defineEmits(['update'])

function idFor(field) {
  return 'proposal-field-' + encodeURIComponent(props.clientId) + '-' + field
}
function update(field, value) {
  emit('update', field, value)
}
function parseOperator(value) {
  if (value === 'inclusive') return true
  if (value === 'exclusive') return false
  return null
}
function selectValue(value) {
  return value === true ? 'inclusive' : value === false ? 'exclusive' : ''
}
function errorFor(field) {
  return props.pendencias.find((item) => item.severidade === 'IMPEDITIVO' && item.campo === field)?.mensagem || ''
}
function errorClass(field) {
  return errorFor(field) ? 'campaign-control-error' : ''
}
function formatCurrency(minor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minor / 100)
}

const rangeSummary = computed(() => {
  const minText = String(props.fields.valorMinimo ?? '').trim()
  const maxText = String(props.fields.valorMaximo ?? '').trim()
  const min = minText ? parseDecimalToMinor(minText, 2) : null
  const max = maxText ? parseDecimalToMinor(maxText, 2) : null
  if ((minText && !Number.isFinite(min)) || (maxText && !Number.isFinite(max))) return 'Revise os valores digitados para conferir a faixa.'
  if (min === null && max === null) return 'Sem restrição por valor da venda.'
  if (min !== null && props.fields.minimoInclusivo === null) return 'Escolha se o valor mínimo inclui ou exclui o limite.'
  if (max !== null && props.fields.maximoInclusivo === null) return 'Escolha se o valor máximo inclui ou exclui o limite.'
  if (min !== null && max !== null) {
    return formatCurrency(min) + (props.fields.minimoInclusivo ? ' ≤ ' : ' < ') + 'valor da venda' + (props.fields.maximoInclusivo ? ' ≤ ' : ' < ') + formatCurrency(max)
  }
  if (min !== null) return (props.fields.minimoInclusivo ? 'Venda a partir de ' : 'Venda acima de ') + formatCurrency(min)
  return (props.fields.maximoInclusivo ? 'Venda até ' : 'Venda abaixo de ') + formatCurrency(max)
})
</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted disabled:cursor-not-allowed disabled:bg-sage-light disabled:text-sage-muted; }
.campaign-control-error { @apply border-danger; }
.campaign-error { @apply mt-2 text-xs font-semibold leading-5 text-danger-dark; }
</style>
