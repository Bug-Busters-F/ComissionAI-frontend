<template>
  <Teleport to="body">
    <dialog ref="dialog" class="lifecycle-dialog w-[calc(100%-2rem)] max-w-xl rounded-[24px] bg-white p-6 text-brand-dark shadow-2xl sm:p-7" :aria-labelledby="titleId" @cancel.prevent="!busy && $emit('cancel')" @keydown="trapFocus">
      <h2 :id="titleId" class="text-xl font-extrabold">{{ title }}</h2>
      <div class="-mx-1 mt-4 max-h-[60dvh] overflow-y-auto px-1 py-1 text-sm leading-6"><slot /></div>
      <footer class="mt-6 flex flex-wrap justify-end gap-3">
        <button ref="cancelButton" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold disabled:opacity-50" :disabled="busy" @click="$emit('cancel')">Cancelar</button>
        <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold transition hover:bg-brand-hover disabled:opacity-50" :disabled="busy || disabled" @click="$emit('confirm')">{{ busy ? 'Aguarde…' : confirmLabel }}</button>
      </footer>
    </dialog>
  </Teleport>
</template>
<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
const props = defineProps({ open: Boolean, title: String, confirmLabel: String, busy: Boolean, disabled: Boolean })
defineEmits(['cancel', 'confirm'])
const dialog = ref(null), cancelButton = ref(null)
const titleId = 'campaign-action-' + useId()
let previousFocus = null
watch(() => props.open, async (open) => {
  await nextTick()
  if (open && !dialog.value.open) { previousFocus = document.activeElement; dialog.value.showModal(); cancelButton.value?.focus() }
  else if (!open && dialog.value.open) { dialog.value.close(); if (previousFocus?.isConnected) previousFocus.focus() }
}, { immediate: true })
function trapFocus(event) {
  if (event.key !== 'Tab') return
  const controls = [...dialog.value.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled])')]
  if (!controls.length) { event.preventDefault(); return }
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onBeforeUnmount(() => dialog.value?.close())
</script>
<style scoped>.lifecycle-dialog::backdrop { background: rgb(20 35 25 / 45%); }</style>
