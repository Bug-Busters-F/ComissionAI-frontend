<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-brand-dark/50 px-5 py-8" role="presentation" @click.self="$emit('cancel')">
      <section ref="dialog" class="w-full max-w-md rounded-[22px] bg-white p-6 shadow-2xl sm:p-7" role="alertdialog" aria-modal="true" aria-labelledby="remove-proposal-title" aria-describedby="remove-proposal-description" @keydown.esc="$emit('cancel')" @keydown="trapFocus">
        <h2 id="remove-proposal-title" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Remover regra {{ index }}?</h2>
        <p id="remove-proposal-description" class="mt-3 text-sm leading-6 text-sage-muted">Este bloco será removido desta campanha. As outras regras serão mantidas.</p>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref="cancelButton" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="$emit('cancel')">Manter regra</button>
          <button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white" @click="$emit('confirm')">Remover regra</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  index: { type: Number, default: 1 }
})
defineEmits(['cancel', 'confirm'])
const dialog = ref(null)
const cancelButton = ref(null)
let previouslyFocused = null

watch(() => props.open, async (open) => {
  if (open) {
    previouslyFocused = document.activeElement
    await nextTick()
    cancelButton.value?.focus()
  } else {
    await nextTick()
    previouslyFocused?.focus?.()
  }
})

function trapFocus(event) {
  if (event.key !== 'Tab') return
  const focusable = [...dialog.value.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first) {
    event.preventDefault()
    return
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>
