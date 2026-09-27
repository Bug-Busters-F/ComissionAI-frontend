<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-brand-dark/50 px-5 py-8" role="presentation" @click.self="$emit('close')">
      <section ref="dialog" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="memory-dialog-title" @keydown.esc="$emit('close')" @keydown="trapFocus">
        <div class="flex items-start justify-between gap-4"><div><h2 id="memory-dialog-title" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Memória do cálculo</h2><p class="mt-2 text-sm text-sage-muted">Exemplo demonstrativo · cenário de referência</p></div><button ref="closeButton" type="button" class="focus-ring grid h-10 w-10 place-items-center rounded-full bg-sage-pill text-xl font-bold text-brand-dark" aria-label="Fechar" @click="$emit('close')">×</button></div>
        <p class="mt-6 text-sm font-bold text-brand-dark">Ana Martins · matrícula 1001</p><p class="mt-1 text-sm text-sage-muted">Loja física · Varejo. Regra da campanha aplicável.</p>
        <dl class="mt-7"> <div v-for="item in items" :key="item.label" class="flex items-center justify-between gap-4 border-b border-sage-border-light py-3 text-sm"><dt class="text-sage-muted">{{ item.label }}</dt><dd class="text-right font-bold text-brand-dark">{{ item.value }}</dd></div></dl>
        <p class="mt-6 rounded-2xl bg-sage-light px-4 py-4 text-sm leading-6 text-sage-subtle">Ana recebeu um valor demonstrativo pela aplicação da taxa e do bônus. Este resultado não é calculado nem enviado ao sistema.</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])
const dialog = ref(null)
const closeButton = ref(null)
let previouslyFocused = null
const items = [
  { label: 'Vendas consideradas / base de cálculo', value: 'R$ 50.000,00' },
  { label: 'Taxa aplicada ao canal', value: '2,5%' },
  { label: 'Comissão percentual', value: 'R$ 1.250,00' },
  { label: 'Proporcionalidade', value: '100% · sem ocorrências' },
  { label: 'Bônus demonstrativo', value: 'R$ 100,00' },
  { label: 'Total demonstrativo', value: 'R$ 1.350,00' }
]

watch(() => props.open, async (open) => {
  if (open) {
    previouslyFocused = document.activeElement
    await nextTick()
    closeButton.value?.focus()
  } else {
    await nextTick()
    previouslyFocused?.focus?.()
  }
})

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
