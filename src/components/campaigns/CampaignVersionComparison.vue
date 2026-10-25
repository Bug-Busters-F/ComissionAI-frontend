<template>
  <section v-if="comparison" class="rounded-2xl border border-sage-border bg-white p-5 sm:p-7" aria-labelledby="version-comparison-title">
    <h2 id="version-comparison-title" class="text-xl font-extrabold">Revisão das alterações</h2>
    <p class="mt-2 text-sm text-sage-muted">Versão vigente {{ published.numero }} → Proposta {{ proposedNumber }} · Baseada na versão {{ sourceNumber ?? published.numero }}.</p>
    <p class="mt-3 rounded-xl bg-warning-bg p-3 text-sm text-warning-text">Ao publicar, a nova versão valerá para todo o período da campanha. A versão vigente permanece preservada até a confirmação.</p>
    <div v-if="comparison.fields.length" class="mt-5 space-y-3">
      <article v-for="item in comparison.fields" :key="item.field" class="rounded-xl bg-sage-light p-4">
        <h3 class="text-sm font-bold">{{ item.label }}</h3>
        <div class="mt-2 grid gap-3 text-sm sm:grid-cols-2"><p class="whitespace-pre-wrap break-words"><span class="font-bold">Vigente:</span> {{ displayVersionValue(item.field, item.before) }}</p><p class="whitespace-pre-wrap break-words"><span class="font-bold">Proposta:</span> {{ displayVersionValue(item.field, item.after) }}</p></div>
      </article>
    </div>
    <article v-for="rule in comparison.rules" :key="rule.id" class="mt-4 rounded-xl border border-sage-border p-4">
      <h3 class="font-bold">{{ rule.label }} · {{ rule.status }}</h3>
      <dl class="mt-3 space-y-3 text-sm"><div v-for="item in rule.fields" :key="item.field"><dt class="font-semibold">{{ item.label }}</dt><dd class="mt-1 grid gap-2 sm:grid-cols-2"><span class="whitespace-pre-wrap break-words">Vigente: {{ displayVersionValue(item.field, item.before) }}</span><span class="whitespace-pre-wrap break-words">Proposta: {{ displayVersionValue(item.field, item.after) }}</span></dd></div></dl>
    </article>
    <p v-if="!comparison.fields.length && !comparison.rules.length" class="mt-4 text-sm text-sage-muted">Nenhuma alteração nos dados da campanha ou nas condições das regras.</p>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import { compareCampaignVersion, displayVersionValue } from '@/services/campaignVersionComparison'
const props = defineProps({ published: Object, campaign: { type: Object, required: true }, proposedNumber: Number, sourceNumber: Number })
const comparison = computed(() => compareCampaignVersion(props.published, props.campaign))
</script>
