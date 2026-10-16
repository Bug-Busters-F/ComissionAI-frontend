<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
    <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="common-fields-heading">
      <div>
        <h2 id="common-fields-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Dados da campanha</h2>
        <p class="mt-2 text-sm leading-6 text-sage-muted">Descreva os públicos, percentuais e condições. Você pode criar várias regras.</p>
      </div>

      <div class="mt-7 space-y-5">
        <div>
          <label for="campaign-title" class="campaign-label">Título da campanha <span class="text-danger">*</span></label>
          <input id="campaign-title" :value="campaign.titulo" type="text" autocomplete="off" class="campaign-control" :class="errorClass('titulo')" :aria-invalid="Boolean(errors.titulo)" :aria-describedby="errors.titulo ? 'campaign-title-error' : undefined" placeholder="Ex.: Incentivo de outubro" @input="update('titulo', $event.target.value)" />
          <p v-if="errors.titulo" id="campaign-title-error" class="campaign-error">{{ errors.titulo }}</p>
        </div>

        <div>
          <label for="campaign-textoOriginal" class="campaign-label">Descrição da campanha <span class="text-danger">*</span></label>
          <textarea id="campaign-textoOriginal" :value="campaign.textoOriginal" rows="6" class="campaign-control resize-y" :class="errorClass('textoOriginal')" :aria-invalid="Boolean(errors.textoOriginal)" :aria-describedby="errors.textoOriginal ? 'campaign-text-error' : undefined" placeholder="Descreva os públicos, percentuais e condições..." @input="update('textoOriginal', $event.target.value)" />
          <p v-if="errors.textoOriginal" id="campaign-text-error" class="campaign-error">{{ errors.textoOriginal }}</p>
        </div>

        <div v-if="descriptionNeedsConfirmation && campaign.propostas.length" class="rounded-2xl border border-warning-border bg-warning-bg p-4" role="alert">
          <p class="text-sm font-bold text-warning-text">A descrição mudou depois que as regras foram adicionadas.</p>
          <p class="mt-1 text-sm leading-5 text-warning-text">As regras atuais continuam preservadas. Confirme se deseja mantê-las com a nova descrição.</p>
          <button type="button" class="focus-ring mt-3 rounded-full border border-warning-border bg-white px-4 py-2 text-sm font-bold text-brand-dark" @click="$emit('confirm-retain')">Manter regras atuais</button>
        </div>
      </div>
    </section>

    <aside class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="campaign-rules-heading">
      <h2 id="campaign-rules-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Uma campanha, várias regras</h2>
      <p class="mt-2 text-sm leading-6 text-sage-muted">Cada regra fica vinculada a esta campanha.</p>

      <div class="mt-6 space-y-4">
        <div class="flex items-start gap-3 rounded-2xl p-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-extrabold text-brand-dark" aria-hidden="true">%</span>
          <div>
            <h3 class="text-sm font-extrabold text-brand-dark">Percentual sobre vendas</h3>
            <p class="mt-1 text-sm leading-5 text-sage-muted">A taxa informada será vinculada à regra e ao público definido nela.</p>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-2xl p-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-extrabold text-brand-dark" aria-hidden="true">1</span>
          <div>
            <h3 class="text-sm font-extrabold text-brand-dark">Regras independentes</h3>
            <p class="mt-1 text-sm leading-5 text-sage-muted">Cada bloco terá seu próprio público, percentual e condições.</p>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
const props = defineProps({
  campaign: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  descriptionNeedsConfirmation: { type: Boolean, default: false }
})

const emit = defineEmits(['update-campaign', 'confirm-retain'])

function update(field, value) {
  emit('update-campaign', field, value)
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
