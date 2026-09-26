<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-brand-dark/50 px-5 py-8" role="presentation" @click.self="continueEditing">
      <section ref="dialog" class="w-full max-w-md rounded-[22px] bg-white p-6 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="discard-dialog-title" aria-describedby="discard-dialog-description" @keydown.esc="continueEditing" @keydown="trapFocus">
        <h2 id="discard-dialog-title" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">{{ isNew ? 'Descartar nova campanha?' : 'Descartar alterações?' }}</h2>
        <p id="discard-dialog-description" class="mt-3 text-sm leading-6 text-sage-muted">
          {{ isNew ? 'Tudo que você preencheu será perdido. A campanha ainda não foi salva.' : 'As alterações não salvas serão perdidas. A campanha continuará com os últimos dados salvos.' }}
        </p>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref="continueButton" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-sage-light" @click="continueEditing">Continuar preenchendo</button>
          <button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white transition hover:bg-danger-dark" @click="$emit('discard')">Descartar e sair</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  isNew: { type: Boolean, default: true }
})

const emit = defineEmits(['continue', 'discard'])
const dialog = ref(null)
const continueButton = ref(null)
let previouslyFocused = null

watch(() => props.open, async (open) => {
  if (open) {
    previouslyFocused = document.activeElement
    await nextTick()
    continueButton.value?.focus()
  } else {
    await nextTick()
    previouslyFocused?.focus?.()
  }
})

function continueEditing() {
  emit('continue')
}

function trapFocus(event) {
  if (event.key !== 'Tab') return
  const focusable = [...dialog.value.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
  if (!focusable.length) {
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>
