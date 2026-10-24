<template>
  <section v-if="pendencias.length" class="rounded-[22px] border border-sage-border bg-white p-5 sm:p-6" aria-labelledby="proposal-pending-heading">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="proposal-pending-heading" class="text-lg font-extrabold text-brand-dark">Pendências da campanha</h2>
        <p class="mt-1 text-sm text-sage-muted">{{ blockers.length }} impeditivas · {{ warnings.length }} avisos</p>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-bold" :class="blockers.length ? 'bg-danger-bg text-danger-dark' : 'bg-warning-bg text-warning-text'">{{ blockers.length ? 'Correções necessárias' : 'Avisos' }}</span>
    </div>

    <ul class="mt-4 space-y-2">
      <li v-for="item in pendencias" :key="item.id" class="flex flex-wrap items-start justify-between gap-3 rounded-xl px-3 py-3" :class="item.severidade === 'IMPEDITIVO' ? 'bg-danger-bg/60' : 'bg-warning-bg/70'">
        <div>
          <p class="text-xs font-bold" :class="item.severidade === 'IMPEDITIVO' ? 'text-danger-dark' : 'text-warning-text'">{{ item.severidade === 'IMPEDITIVO' ? 'Impeditiva' : 'Aviso' }}</p>
          <p class="mt-1 text-sm leading-5 text-brand-dark">{{ proposalLabel(item) }}{{ item.mensagem }}</p>
        </div>
        <button v-if="item.clientId || item.campo" type="button" class="focus-ring rounded-full border border-sage-border-dark bg-white px-3 py-2 text-xs font-bold text-brand-dark" @click="$emit('focus-pending', { clientId: item.clientId, campo: item.campo })">Ir para correção</button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pendencias: { type: Array, default: () => [] },
  proposals: { type: Array, default: () => [] }
})
defineEmits(['focus-pending'])

const blockers = computed(() => props.pendencias.filter((item) => item.severidade === 'IMPEDITIVO'))
const warnings = computed(() => props.pendencias.filter((item) => item.severidade === 'AVISO'))

function proposalLabel(item) {
  if (!item.clientId) return ''
  const index = props.proposals.findIndex((proposal) => proposal.clientId === item.clientId)
  return index >= 0 ? 'Regra ' + (index + 1) + ' — ' : 'Regra — '
}
</script>
