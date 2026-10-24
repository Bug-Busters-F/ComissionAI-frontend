<template>
  <Teleport to="body">
    <dialog ref="dialog" class="rule-review w-[calc(100%-2rem)] max-w-2xl rounded-[22px] bg-white p-0 text-brand-dark shadow-2xl" :aria-labelledby="titleId" @cancel.prevent="$emit('cancel')" @close="$emit('closed')" @keydown="trapFocus">
      <div class="max-h-[85dvh] overflow-y-auto px-5 pt-5 sm:px-7 sm:pt-7">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 :id="titleId" class="text-xl font-extrabold">Revisar regra {{ index + 1 }}</h2>
            <p class="mt-2 text-sm leading-6 text-sage-muted">{{ description }}</p>
          </div>
          <button type="button" class="focus-ring rounded-full p-2" aria-label="Cancelar revisão" @click="$emit('cancel')"><X :size="20" /></button>
        </header>
        <p v-if="demo" class="mt-4 rounded-xl bg-warning-bg p-3 text-xs font-bold text-warning-text">Demonstração — resposta fictícia, sem consulta à IA.</p>
        <label :for="titleId + '-text'" class="mt-5 block text-sm font-bold">Texto da regra</label>
        <textarea :id="titleId + '-text'" :value="state.text" class="focus-ring mt-2 w-full rounded-xl border border-sage-border p-3 text-sm" rows="3" :disabled="state.loading" @input="$emit('text', $event.target.value)" />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-sm font-bold disabled:opacity-50" :disabled="state.loading || !state.text.trim()" @click="$emit('reinterpret')">{{ state.loading ? 'Reinterpretando…' : 'Reinterpretar novamente' }}</button>
          <span v-if="state.text !== state.sentText" class="text-xs text-warning-text">Texto alterado. Reinterprete antes de confirmar.</span>
        </div>
        <div v-if="state.loading" class="mt-4 rounded-xl bg-sage-light p-4 text-sm font-semibold motion-safe:animate-pulse" role="status">Interpretando este bloco…</div>
        <p v-if="state.error" class="mt-4 rounded-xl bg-danger-bg p-3 text-sm text-danger-dark" role="alert">{{ state.error }}</p>
        <p v-if="stale" class="mt-4 rounded-xl bg-warning-bg p-3 text-sm text-warning-text" role="alert">A regra ou o contexto mudou. Cancele e abra novamente a edição.</p>
        <div v-if="state.result" class="mt-5 space-y-3" :aria-busy="state.loading">
          <slot name="before-comparison" />
          <slot name="comparison">
          <p class="text-xs font-bold uppercase tracking-wide text-sage-muted">Atual → Proposto</p>
          <div v-for="field in Object.keys(state.result.campos)" :key="field" class="rounded-xl border border-sage-border p-3">
            <label :for="titleId + '-' + field" class="block text-sm font-bold">{{ labels[field] }}</label>
            <div class="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <span class="break-words text-sm text-sage-muted">{{ displayValue(state.original.campos[field]) }}</span>
              <span aria-hidden="true" class="hidden text-sage-muted sm:block">→</span>
              <select v-if="booleanFields.includes(field)" :id="titleId + '-' + field" :value="encodeBoolean(state.proposed[field])" class="focus-ring min-w-0 rounded-lg border border-sage-border bg-white p-2 text-sm" @change="$emit('correct', field, decodeBoolean($event.target.value))">
                <option v-if="field !== 'publicoTodasVendas'" value="null">Não informado</option>
                <option value="true">Sim</option><option value="false">Não</option>
              </select>
              <input v-else :id="titleId + '-' + field" :value="state.proposed[field]" type="text" :inputmode="field === 'taxaPercentual' || field.startsWith('valor') ? 'decimal' : undefined" class="focus-ring min-w-0 rounded-lg border border-sage-border p-2 text-sm" @input="$emit('correct', field, $event.target.value)" />
            </div>
            <div class="mt-2 flex flex-wrap gap-2 text-xs">
              <span :class="state.original.campos[field] === state.proposed[field] ? 'text-sage-muted' : 'text-brand-dark'">{{ changeLabel(field) }}</span>
              <span v-if="state.original.camposManuais.includes(field)" class="font-bold text-warning-text">Valor atual editado manualmente — OK autoriza a substituição</span>
              <span v-if="state.corrected.includes(field)" class="font-bold text-brand-dark">Corrigido nesta revisão</span>
            </div>
          </div>
          </slot>
          <p v-for="item in state.result.pendencias" :key="item.id" class="rounded-xl p-3 text-sm" :class="item.severidade === 'IMPEDITIVO' ? 'bg-danger-bg text-danger-dark' : 'bg-warning-bg text-warning-text'"><strong v-if="item.severidade">{{ item.severidade === 'IMPEDITIVO' ? 'Impeditiva: ' : 'Aviso: ' }}</strong>{{ item.mensagem }}</p>
          <slot name="after-comparison" />
        </div>
        <footer class="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-sage-border bg-white py-3">
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold" @click="$emit('cancel')">Cancelar</button>
          <button type="button" class="focus-ring rounded-full bg-brand px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canApply" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { RULE_BOOLEAN_FIELDS as booleanFields, RULE_FIELD_LABELS as labels } from '@/services/ruleReinterpretation'

const props = defineProps({ open: Boolean, state: { type: Object, required: true }, index: Number, clientId: String, demo: Boolean, canApply: Boolean, stale: Boolean,
  description: { type: String, default: 'Confira os valores antes de substituir. Os demais campos serão preservados.' },
  confirmLabel: { type: String, default: 'OK' } })
defineEmits(['cancel', 'closed', 'text', 'reinterpret', 'correct', 'confirm'])
const dialog = ref(null)
const titleId = 'review-rule-' + useId()
watch(() => props.open, async (open) => {
  await nextTick()
  if (open && !dialog.value.open) {
    dialog.value.showModal()
    dialog.value.querySelector('textarea')?.focus()
  } else if (!open && dialog.value.open) dialog.value.close()
})
watch(() => props.state.loading, async (loading) => {
  if (!loading && props.open) { await nextTick(); dialog.value?.querySelector('textarea')?.focus() }
})
onBeforeUnmount(() => dialog.value?.close())
function trapFocus(event) {
  if (event.key !== 'Tab') return
  const controls = [...dialog.value.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (!first) { event.preventDefault(); return }
  if (!dialog.value.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault(); first.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus()
  }
}
function displayValue(value) { return value === '' || value == null ? 'Não informado' : typeof value === 'boolean' ? value ? 'Sim' : 'Não' : value }
function encodeBoolean(value) { return value == null ? 'null' : String(value) }
function decodeBoolean(value) { return value === 'null' ? null : value === 'true' }
function changeLabel(field) {
  const before = props.state.original.campos[field]
  const after = props.state.proposed[field]
  return before === after ? 'Sem alteração' : before === '' || before == null ? 'Novo preenchimento' : after === '' || after == null ? 'Valor removido' : 'Valor alterado'
}
</script>

<style scoped>
.rule-review::backdrop { background: rgb(0 0 0 / 45%); }
</style>
