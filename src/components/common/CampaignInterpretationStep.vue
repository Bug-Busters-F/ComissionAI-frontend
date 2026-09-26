<template>
  <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="interpretation-heading">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="interpretation-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Confira a interpretação</h2>
        <p class="mt-2 text-sm text-sage-muted">Revise os parâmetros da única regra vinculada antes de continuar.</p>
      </div>
      <span class="rounded-full px-3 py-1.5 text-xs font-bold" :class="interpretation.isProcessing ? 'bg-sage-light text-brand-dark' : interpretation.status === 'error' ? 'bg-danger-bg text-danger-dark' : 'bg-success-surface text-success-text'">{{ sourceLabel }}</span>
    </div>

    <div class="mt-6 rounded-2xl bg-sage-light px-4 py-3 text-sm leading-6 text-sage-subtle">
      {{ interpretation.isProcessing ? 'Interpretando proposta… aguarde o retorno do Spring.' : stale ? 'O texto ou o contexto mudou desde a última interpretação. Interprete novamente para atualizar as sugestões.' : sourceMessage }}
    </div>

    <div v-if="interpretation.isProcessing" class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-white px-4 py-3 text-sm text-brand-dark" role="status" aria-live="polite">
      <span>Interpretando proposta…</span>
      <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-3 py-2 text-xs font-bold" @click="$emit('cancel-interpretation')">Cancelar</button>
    </div>
    <div v-if="interpretation.error" class="mt-4 rounded-2xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger-dark" role="alert">{{ interpretation.error }}</div>

    <div v-if="interpretation.pending?.length" class="mt-4 rounded-2xl border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-6 text-warning-text" role="status">
      <p class="font-bold">Pendências para revisão</p>
      <ul class="mt-2 list-disc space-y-1 pl-5"><li v-for="pending in interpretation.pending" :key="pending">{{ pending }}</li></ul>
    </div>
    <p v-if="interpretation.confidence !== null && interpretation.confidence !== undefined && interpretation.confidence !== 0" class="mt-3 text-xs text-sage-muted">Confiança técnica recebida: {{ formatConfidence(interpretation.confidence) }}</p>

    <dl class="mt-6 grid gap-x-8 sm:grid-cols-2">
      <div class="flex items-center justify-between border-b border-sage-border-light py-3 text-sm"><dt class="text-sage-muted">Vigência</dt><dd class="font-bold text-brand-dark">{{ period }}</dd></div>
    </dl>

    <div class="mt-6 rounded-2xl border border-sage-border-light">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-sage-border-light px-4 py-4">
        <div><p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">01 · Regra de comissão</p><h3 class="mt-1 text-lg font-extrabold text-brand-dark">Percentual sobre vendas</h3></div>
        <span class="rounded-full bg-success-surface px-3 py-1.5 text-xs font-bold text-success-text">Regra real</span>
      </div>

      <div class="grid gap-5 p-4 sm:grid-cols-2">
        <div>
          <label for="campaign-channel" class="campaign-label">Canal da regra</label>
          <select id="campaign-channel" :value="form.canal" class="campaign-control" @change="$emit('update', 'canal', $event.target.value)">
            <option v-for="option in channelOptions" :key="option.value || 'none'" :value="option.value">{{ option.value ? option.label : 'Sem restrição de canal' }}</option>
          </select>
          <p class="campaign-help">A seleção manual será usada como contexto somente em uma nova interpretação.</p>
        </div>
        <div>
          <label for="campaign-rate" class="campaign-label">Taxa de comissão (%) <span class="text-danger">*</span></label>
          <input id="campaign-rate" :value="form.taxaPercentual" type="text" inputmode="decimal" class="campaign-control" :class="errors.taxaPercentual ? 'campaign-control-error' : ''" :aria-invalid="Boolean(errors.taxaPercentual)" :aria-describedby="errors.taxaPercentual ? 'campaign-rate-error' : 'campaign-rate-help'" placeholder="Ex.: 5 ou 0,75" @input="$emit('update', 'taxaPercentual', $event.target.value)" />
          <p v-if="errors.taxaPercentual" id="campaign-rate-error" class="campaign-error">{{ errors.taxaPercentual }}</p>
          <p v-else id="campaign-rate-help" class="campaign-help">Informe a taxa em percentual, como 5 para cinco por cento.</p>
        </div>
        <div>
          <label for="campaign-brand-code" class="campaign-label">Código da marca</label>
          <input id="campaign-brand-code" :value="form.codMarca" type="text" inputmode="numeric" class="campaign-control" :class="errors.codMarca ? 'campaign-control-error' : ''" @input="$emit('update', 'codMarca', $event.target.value)" />
          <p v-if="errors.codMarca" class="campaign-error">{{ errors.codMarca }}</p>
        </div>
        <div>
          <label for="campaign-brand-description" class="campaign-label">Marca</label>
          <input id="campaign-brand-description" :value="form.descrMarca" type="text" class="campaign-control" @input="$emit('update', 'descrMarca', $event.target.value)" />
        </div>
        <div>
          <label for="campaign-store-code" class="campaign-label">Código da loja</label>
          <input id="campaign-store-code" :value="form.codLoja" type="text" inputmode="numeric" class="campaign-control" :class="errors.codLoja ? 'campaign-control-error' : ''" @input="$emit('update', 'codLoja', $event.target.value)" />
          <p v-if="errors.codLoja" class="campaign-error">{{ errors.codLoja }}</p>
        </div>
        <div>
          <label for="campaign-job-code" class="campaign-label">Código do cargo</label>
          <input id="campaign-job-code" :value="form.codCargo" type="text" inputmode="numeric" class="campaign-control" :class="errors.codCargo ? 'campaign-control-error' : ''" @input="$emit('update', 'codCargo', $event.target.value)" />
          <p v-if="errors.codCargo" class="campaign-error">{{ errors.codCargo }}</p>
        </div>
        <div>
          <label for="campaign-job-description" class="campaign-label">Cargo</label>
          <input id="campaign-job-description" :value="form.descriCargo" type="text" class="campaign-control" @input="$emit('update', 'descriCargo', $event.target.value)" />
        </div>
        <div>
          <label for="campaign-registration" class="campaign-label">Matrícula</label>
          <input id="campaign-registration" :value="form.matricula" type="text" class="campaign-control" @input="$emit('update', 'matricula', $event.target.value)" />
        </div>
        <div>
          <label for="campaign-start" class="campaign-label">Início da vigência</label>
          <input id="campaign-start" :value="form.dataInicio" type="date" class="campaign-control" @input="$emit('update', 'dataInicio', $event.target.value)" />
        </div>
        <div>
          <label for="campaign-end" class="campaign-label">Fim da vigência</label>
          <input id="campaign-end" :value="form.dataFim" type="date" class="campaign-control" :class="errors.dataFim ? 'campaign-control-error' : ''" @input="$emit('update', 'dataFim', $event.target.value)" />
          <p v-if="errors.dataFim" class="campaign-error">{{ errors.dataFim }}</p>
        </div>
      </div>
    </div>

  </section>
</template>

<script setup>
import { computed } from 'vue'
import { CAMPAIGN_CHANNEL_OPTIONS, formatPeriodArrow } from '@/services/campaignMappers'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  interpretation: { type: Object, required: true },
  stale: { type: Boolean, default: false }
})

defineEmits(['update', 'cancel-interpretation'])
const channelOptions = CAMPAIGN_CHANNEL_OPTIONS
const sourceLabel = computed(() => ({ real: 'Interpretação recebida', demo: 'Interpretação demonstrativa', exemplo: 'Exemplo demonstrativo', manual: 'Preenchimento manual' }[props.interpretation.source] || (props.interpretation.status === 'error' ? 'Falha na interpretação' : 'Preenchimento manual')))
const sourceMessage = computed(() => ({ real: 'A interpretação recebida está pronta para revisão manual.', demo: 'Esta é uma interpretação demonstrativa editável.', exemplo: 'Esta é uma interpretação demonstrativa editável.', manual: 'Preencha os campos manualmente ou solicite uma interpretação do texto original.' }[props.interpretation.source] || 'Preencha os campos manualmente ou solicite uma interpretação do texto original.'))
const period = computed(() => formatPeriodArrow(props.form.dataInicio, props.form.dataFim))

function formatConfidence(value) {
  return `${new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(value)}`
}
</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted; }
.campaign-control-error { @apply border-danger; }
.campaign-help { @apply mt-2 text-xs leading-5 text-sage-muted; }
.campaign-error { @apply mt-2 text-xs font-semibold leading-5 text-danger-dark; }
</style>
