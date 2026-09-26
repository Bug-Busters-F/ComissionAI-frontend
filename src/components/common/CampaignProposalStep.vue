<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
    <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="proposal-heading">
      <div>
        <h2 id="proposal-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Descreva sua proposta</h2>
        <p class="mt-2 text-sm text-sage-muted">Informe o incentivo, o público e as condições da campanha.</p>
      </div>

      <div class="mt-7 space-y-5">
        <div>
          <label for="campaign-title" class="campaign-label">Nome da campanha <span class="text-danger">*</span></label>
          <input id="campaign-title" :value="form.titulo" type="text" autocomplete="off" class="campaign-control" :class="errorClass('titulo')" :aria-invalid="Boolean(errors.titulo)" :aria-describedby="errors.titulo ? 'campaign-title-error' : undefined" placeholder="Ex.: Incentivo de dezembro" @input="update('titulo', $event.target.value)" />
          <p v-if="errors.titulo" id="campaign-title-error" class="campaign-error">{{ errors.titulo }}</p>
        </div>

        <div>
          <label for="campaign-original-text" class="campaign-label">Proposta em linguagem natural / descrição <span class="text-danger">*</span></label>
          <textarea id="campaign-original-text" :value="form.textoOriginal" rows="6" class="campaign-control resize-y" :class="errorClass('textoOriginal')" :aria-invalid="Boolean(errors.textoOriginal)" :aria-describedby="errors.textoOriginal ? 'campaign-original-text-error' : undefined" placeholder="Descreva o incentivo, o público e as condições..." @input="update('textoOriginal', $event.target.value)" />
          <p v-if="errors.textoOriginal" id="campaign-original-text-error" class="campaign-error">{{ errors.textoOriginal }}</p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label for="campaign-start" class="campaign-label">Início da vigência</label>
            <input id="campaign-start" :value="form.dataInicio" type="date" class="campaign-control" :class="errorClass('dataInicio')" :aria-invalid="Boolean(errors.dataInicio)" @input="update('dataInicio', $event.target.value)" />
            <p v-if="errors.dataInicio" class="campaign-error">{{ errors.dataInicio }}</p>
          </div>
          <div>
            <label for="campaign-end" class="campaign-label">Término da vigência</label>
            <input id="campaign-end" :value="form.dataFim" type="date" class="campaign-control" :class="errorClass('dataFim')" :aria-invalid="Boolean(errors.dataFim)" @input="update('dataFim', $event.target.value)" />
            <p v-if="errors.dataFim" class="campaign-error">{{ errors.dataFim }}</p>
          </div>
        </div>

        <p class="rounded-2xl bg-sage-light px-4 py-3 text-sm leading-6 text-sage-subtle">Se as datas não forem informadas, a vigência será definida automaticamente no salvamento.</p>
      </div>
    </section>

    <aside class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="proposal-sidebar-heading">
      <h2 id="proposal-sidebar-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Uma campanha, uma regra</h2>
      <div class="mt-6 space-y-5">
        <div class="flex gap-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-pill font-bold text-brand-dark" aria-hidden="true">%</span>
          <div><p class="text-sm font-bold text-brand-dark">Percentual sobre vendas</p><p class="mt-1 text-xs leading-5 text-sage-muted">A taxa revisada será vinculada à campanha.</p></div>
        </div>
        <div class="flex gap-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-pill font-bold text-brand-dark" aria-hidden="true">1</span>
          <div><p class="text-sm font-bold text-brand-dark">Uma regra vinculada</p><p class="mt-1 text-xs leading-5 text-sage-muted">Os demais blocos ficam disponíveis como demonstração visual.</p></div>
        </div>
      </div>

      <label for="campaign-budget" class="campaign-label mt-8">Orçamento mensal de comissões (R$)</label>
      <input id="campaign-budget" :value="demo.budget" type="number" min="0" step="100" class="campaign-control" @input="$emit('update-demo', 'budget', $event.target.value)" />
      <p class="mt-2 text-xs leading-5 text-sage-muted">Campo de apresentação. Não é enviado ao cadastro da campanha.</p>
      <div class="mt-6 rounded-2xl border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-6 text-warning-text">Interpretação demonstrativa: a extração automática da regra será integrada posteriormente.</div>
    </aside>
  </div>
</template>

<script setup>
const props = defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  demo: { type: Object, required: true }
})

const emit = defineEmits(['update', 'update-demo'])

function update(field, value) {
  emit('update', field, value)
}

function errorClass(field) {
  return props.errors[field] ? 'campaign-control-error' : ''
}
</script>

<style scoped>
.campaign-label { @apply mb-2 block text-sm font-bold text-brand-dark; }
.campaign-control { @apply focus-ring w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-sage-muted; }
.campaign-control-error { @apply border-danger; }
.campaign-error { @apply mt-2 text-xs font-semibold leading-5 text-danger-dark; }
</style>
