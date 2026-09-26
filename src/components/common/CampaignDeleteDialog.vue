<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-brand-dark/50 px-5 py-8" role="presentation" @click.self="cancel">
      <section ref="dialog" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" @keydown.esc="cancel" @keydown="trapFocus">
        <h2 id="delete-dialog-title" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Remover campanha?</h2>
        <p id="delete-dialog-description" class="mt-3 text-sm leading-6 text-sage-muted">
          A campanha <strong class="text-brand-dark">{{ campaignTitle }}</strong> deixará de aparecer nas consultas. O histórico operacional será preservado.
        </p>

        <p v-if="errorMessage" class="mt-4 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm leading-6 text-danger-dark" role="alert">{{ errorMessage }}</p>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref="cancelButton" type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-sage-light" :disabled="isRemoving" @click="cancel">Cancelar</button>
          <button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white transition hover:bg-danger-dark disabled:cursor-not-allowed disabled:opacity-60" :disabled="isRemoving" @click="emit('confirm')">
            {{ isRemoving ? 'Removendo…' : 'Remover campanha' }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  campaignTitle: { type: String, default: '' },
  isRemoving: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['cancel', 'confirm'])
const dialog = ref(null)
const cancelButton = ref(null)
let previouslyFocused = null

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement
      await nextTick()
      cancelButton.value?.focus()
    } else {
      await nextTick()
      previouslyFocused?.focus?.()
    }
  }
)

function cancel() {
  if (!props.isRemoving) {
    emit('cancel')
  }
}

function trapFocus(event) {
  if (event.key !== 'Tab') {
    return
  }

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
