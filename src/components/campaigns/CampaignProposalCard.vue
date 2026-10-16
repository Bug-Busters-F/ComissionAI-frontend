<template>
  <article :id="'proposal-card-' + encodeURIComponent(proposal.clientId)" tabindex="-1" class="rounded-[22px] border border-sage-border bg-white p-5 outline-none sm:p-6">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-sage-border-light pb-4">
      <div>
        <h3 class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Regra {{ index + 1 }}</h3>
        <span class="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold" :class="statusTone">{{ statusLabel }}</span>
        <span v-if="proposal.origem === 'demonstracao'" class="ml-2 inline-flex rounded-full bg-warning-bg px-3 py-1 text-xs font-bold text-warning-text">Demonstração — dados fictícios</span>
      </div>
      <button type="button" class="focus-ring rounded-full border border-danger/30 px-4 py-2 text-sm font-bold text-danger-dark" :aria-label="'Remover regra ' + (index + 1)" @click="$emit('request-remove', proposal.clientId)">Remover regra</button>
    </header>

    <slot name="rule-text" />

    <details v-if="proposal.trechoOriginal" class="mt-4 text-xs leading-5 text-sage-muted">
      <summary class="focus-ring cursor-pointer rounded">Ver trecho original</summary>
      <p class="mt-2 whitespace-pre-wrap break-words">{{ proposal.trechoOriginal }}</p>
    </details>
    <p v-if="proposal.camposManuais.length" class="mt-3 text-xs text-sage-muted">Campos editados manualmente: {{ proposal.camposManuais.map((field) => fieldLabels[field]).join(', ') }}.</p>

    <div class="mt-5">
      <h4 class="text-sm font-extrabold text-brand-dark">Público e taxa</h4>
      <div class="mt-3 grid gap-4 sm:grid-cols-2">
        <div v-for="field in textFields" :key="field.key">
          <label :for="idFor(field.key)" class="campaign-label">{{ field.label }}</label>
          <input :id="idFor(field.key)" :value="proposal.campos[field.key]" type="text" :inputmode="field.numeric ? 'numeric' : 'text'" autocomplete="off" class="campaign-control" :class="errorClass(field.key)" :aria-invalid="Boolean(errorFor(field.key))" :aria-describedby="errorFor(field.key) ? idFor(field.key) + '-error' : undefined" :placeholder="field.placeholder" @input="$emit('update-proposal', proposal.clientId, field.key, $event.target.value)" />
          <p v-if="errorFor(field.key)" :id="idFor(field.key) + '-error'" class="campaign-error">{{ errorFor(field.key) }}</p>
        </div>
        <div>
          <label :for="idFor('taxaPercentual')" class="campaign-label">Taxa percentual final <span class="text-danger">*</span></label>
          <div class="flex items-center gap-2">
            <input :id="idFor('taxaPercentual')" :value="proposal.campos.taxaPercentual" type="text" inputmode="decimal" autocomplete="off" class="campaign-control" :class="errorClass('taxaPercentual')" :aria-invalid="Boolean(errorFor('taxaPercentual'))" :aria-describedby="errorFor('taxaPercentual') ? idFor('taxaPercentual') + '-error' : undefined" placeholder="Ex.: 5,5" @input="$emit('update-proposal', proposal.clientId, 'taxaPercentual', $event.target.value)" />
            <span class="font-bold text-brand-dark" aria-hidden="true">%</span>
          </div>
          <p v-if="errorFor('taxaPercentual')" :id="idFor('taxaPercentual') + '-error'" class="campaign-error">{{ errorFor('taxaPercentual') }}</p>
          <p class="mt-1 text-xs text-sage-muted">5 significa 5%. A taxa fica sem valor até ser informada.</p>
        </div>
      </div>

      <div v-if="!hasAudienceFilters" class="mt-5">
        <label class="flex items-start gap-3 rounded-xl border border-sage-border px-4 py-3">
          <input class="mt-1 h-4 w-4 accent-brand" type="checkbox" :checked="proposal.campos.publicoTodasVendas" @change="requestAllSales($event.target.checked)" />
          <span>
            <span class="block text-sm font-bold text-brand-dark">Aplicar a todas as vendas</span>
            <span class="mt-1 block text-xs leading-5 text-sage-muted">Use quando esta regra não tiver filtros de público.</span>
          </span>
        </label>
      </div>
    </div>

    <CampaignValueRangeFields class="mt-5" :fields="proposal.campos" :client-id="proposal.clientId" :pendencias="pendencias" @update="(field, value) => $emit('update-proposal', proposal.clientId, field, value)" />

    <div v-if="pendencias.length" class="mt-5 space-y-2">
      <p class="text-sm font-bold text-brand-dark">Pendências deste bloco</p>
      <p v-for="item in pendencias" :key="item.id" class="rounded-xl px-3 py-2 text-sm leading-5" :class="item.severidade === 'IMPEDITIVO' ? 'bg-danger-bg text-danger-dark' : 'bg-warning-bg text-warning-text'">
        <strong>{{ item.severidade === 'IMPEDITIVO' ? 'Impeditiva:' : 'Aviso:' }}</strong> {{ item.mensagem }}
      </p>
    </div>
    <p v-if="proposal.artefatosDesatualizados && hasReceivedArtifacts" class="mt-4 rounded-xl bg-warning-bg px-3 py-2 text-xs leading-5 text-warning-text">Dados de referência recebidos estão desatualizados após a edição. Eles não foram usados para substituir seus campos.</p>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { RULE_FIELD_LABELS as fieldLabels } from '@/services/ruleReinterpretation'
import CampaignValueRangeFields from './CampaignValueRangeFields.vue'

const props = defineProps({
  proposal: { type: Object, required: true },
  campaign: { type: Object, required: true },
  index: { type: Number, required: true },
  pendencias: { type: Array, default: () => [] }
})
const emit = defineEmits(['update-proposal', 'request-remove', 'set-all-sales'])

const audienceFields = ['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula']
const textFields = [
  { key: 'codMarca', label: 'Código da marca', placeholder: 'Ex.: 10', numeric: true },
  { key: 'descrMarca', label: 'Descrição da marca', placeholder: 'Ex.: PRETO', numeric: false },
  { key: 'codCargo', label: 'Código do cargo', placeholder: 'Ex.: 100', numeric: true },
  { key: 'descriCargo', label: 'Descrição do cargo', placeholder: 'Ex.: VENDEDOR LOJA', numeric: false },
  { key: 'codLoja', label: 'Código da loja', placeholder: 'Ex.: 75', numeric: true },
  { key: 'canal', label: 'Canal', placeholder: 'Informe o canal, se aplicável', numeric: false },
  { key: 'matricula', label: 'Matrícula', placeholder: 'Ex.: 001234', numeric: false }
]
const blockers = computed(() => props.pendencias.filter((item) => item.severidade === 'IMPEDITIVO'))
const warnings = computed(() => props.pendencias.filter((item) => item.severidade === 'AVISO'))
const statusLabel = computed(() => blockers.value.length ? 'Com pendências' : warnings.value.length ? 'Com avisos' : 'Campos preenchidos')
const statusTone = computed(() => blockers.value.length ? 'bg-danger-bg text-danger-dark' : warnings.value.length ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-dark')
const hasReceivedArtifacts = computed(() => Object.keys(props.proposal.metadadosRecebidos || {}).some((key) => key !== 'demonstrativo'))
const hasAudienceFilters = computed(() => audienceFields.some((field) => String(props.proposal.campos[field] || '').trim()))

function idFor(field) {
  return 'proposal-field-' + encodeURIComponent(props.proposal.clientId) + '-' + field
}
function errorFor(field) {
  return blockers.value.find((item) => item.campo === field)?.mensagem || ''
}
function errorClass(field) {
  return errorFor(field) ? 'campaign-control-error' : ''
}
function requestAllSales(next) {
  emit('set-all-sales', props.proposal.clientId, Boolean(next))
}
function emitUpdate(field, value) {
  // The only supported card update is a named field tied to this stable client ID.
  emit('update-proposal', props.proposal.clientId, field, value)
}
</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted; }
.campaign-control-error { @apply border-danger; }
.campaign-error { @apply mt-2 text-xs font-semibold leading-5 text-danger-dark; }
</style>
