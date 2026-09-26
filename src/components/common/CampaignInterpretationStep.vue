<template>
  <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="interpretation-heading">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="interpretation-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Confira a interpretação</h2>
        <p class="mt-2 text-sm text-sage-muted">Revise os parâmetros da única regra vinculada antes de continuar.</p>
      </div>
      <span class="rounded-full bg-success-surface px-3 py-1.5 text-xs font-bold text-success-text">{{ sourceLabel }}</span>
    </div>

    <div class="mt-6 rounded-2xl bg-sage-light px-4 py-3 text-sm leading-6 text-sage-subtle">
      {{ stale ? 'O texto da proposta mudou desde a última interpretação. Reaplique a demonstração ou revise os campos manualmente.' : sourceMessage }}
    </div>

    <div v-if="interpretation.pending?.length" class="mt-4 rounded-2xl border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-6 text-warning-text" role="status">
      <p class="font-bold">Pendências para revisão</p>
      <ul class="mt-2 list-disc space-y-1 pl-5"><li v-for="pending in interpretation.pending" :key="pending">{{ pending }}</li></ul>
    </div>
    <p v-if="interpretation.confidence !== null && interpretation.confidence !== undefined" class="mt-3 text-xs text-sage-muted">Confiança técnica recebida: {{ interpretation.confidence }}</p>

    <dl class="mt-6 grid gap-x-8 sm:grid-cols-2">
      <div class="flex items-center justify-between border-b border-sage-border-light py-3 text-sm"><dt class="text-sage-muted">Público</dt><dd class="font-bold text-brand-dark">{{ audience }}</dd></div>
      <div class="flex items-center justify-between border-b border-sage-border-light py-3 text-sm"><dt class="text-sage-muted">Vigência</dt><dd class="font-bold text-brand-dark">{{ period }}</dd></div>
    </dl>

    <div class="mt-6 rounded-2xl border border-sage-border-light">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-sage-border-light px-4 py-4">
        <div><p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">01 · Regra de comissão</p><h3 class="mt-1 text-lg font-extrabold text-brand-dark">Percentual sobre vendas</h3></div>
        <span class="rounded-full bg-success-surface px-3 py-1.5 text-xs font-bold text-success-text">Regra real</span>
      </div>

      <div class="grid gap-5 p-4 sm:grid-cols-2">
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

    <div class="mt-5 rounded-2xl border border-sage-border-light p-4">
      <div class="flex items-center justify-between gap-4">
        <div><p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">02 · Bônus condicionado</p><h3 class="mt-1 text-base font-extrabold text-brand-dark">Bloco futuro demonstrativo</h3></div>
        <span class="text-sm font-bold text-sage-muted">Não persistido</span>
      </div>
      <p class="mt-3 text-sm leading-6 text-sage-muted">Os campos de bônus e faixa aparecem como referência visual, mas não fazem parte do contrato desta entrega.</p>
    </div>

    <details class="mt-5 rounded-2xl border border-sage-border-light">
      <summary class="focus-ring cursor-pointer list-none px-4 py-4 text-sm font-bold text-brand-dark">Histórico de versões da regra <span class="ml-2 text-xs font-normal text-sage-muted">Demonstração</span></summary>
      <div class="overflow-x-auto border-t border-sage-border-light p-4">
        <table class="w-full min-w-[620px] text-left text-sm">
          <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted"><tr><th class="rounded-l-xl px-3 py-3">Versão</th><th class="px-3 py-3">Canal / taxa</th><th class="px-3 py-3">Validade</th><th class="rounded-r-xl px-3 py-3">Origem</th></tr></thead>
          <tbody><tr class="border-b border-sage-border-light"><td class="px-3 py-4 font-bold">v1 <span class="block text-xs font-normal text-sage-muted">Exemplo inicial</span></td><td class="px-3 py-4">{{ audience }}<span class="block text-xs text-sage-muted">{{ form.taxaPercentual || '—' }}%</span></td><td class="px-3 py-4">{{ period }}</td><td class="px-3 py-4 text-sage-muted">Demonstração</td></tr></tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatPeriodArrow } from '@/services/campaignMappers'

const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  interpretation: { type: Object, required: true },
  stale: { type: Boolean, default: false }
})

defineEmits(['update', 'apply-example'])
const sourceLabel = computed(() => ({ real: 'Interpretação recebida', exemplo: 'Exemplo demonstrativo', manual: 'Preenchimento manual' }[props.interpretation.source] || 'Preenchimento manual'))
const sourceMessage = computed(() => ({ real: 'A interpretação recebida está pronta para revisão manual.', exemplo: 'Esta é uma interpretação demonstrativa editável. A extração automática será integrada posteriormente.', manual: 'Preencha ou revise os campos manualmente. A extração automática será integrada posteriormente.' }[props.interpretation.source] || 'Preencha ou revise os campos manualmente. A extração automática será integrada posteriormente.'))
const audience = computed(() => props.form.descriCargo || 'Público não informado')
const period = computed(() => formatPeriodArrow(props.form.dataInicio, props.form.dataFim))
</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted; }
.campaign-control-error { @apply border-danger; }
.campaign-help { @apply mt-2 text-xs leading-5 text-sage-muted; }
.campaign-error { @apply mt-2 text-xs font-semibold leading-5 text-danger-dark; }
</style>
