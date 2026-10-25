<template>
  <Teleport to="body">
    <dialog ref="dialog" class="campaign-reinterpret-confirm w-[calc(100%-2rem)] max-w-md rounded-[22px] bg-white p-6 text-brand-dark shadow-2xl sm:p-7" :aria-labelledby="titleId" :aria-describedby="titleId + '-description'" @cancel.prevent="$emit('cancel')">
      <h2 :id="titleId" class="text-xl font-extrabold">Reinterpretar toda a campanha?</h2>
      <p :id="titleId + '-description'" class="mt-3 text-sm leading-6 text-sage-muted">O texto completo será interpretado novamente. Todas as regras atuais, inclusive os ajustes manuais, e a vigência serão substituídos pelo novo resultado. O título e o texto informado serão mantidos.</p>
      <p class="mt-4 rounded-xl bg-sage-light p-3 text-sm leading-6 text-brand-dark">Para alterações pontuais, use o lápis no bloco da regra que deseja modificar.</p>
      <p class="mt-3 text-xs leading-5 text-sage-muted">Se a solicitação falhar, os dados atuais serão preservados.</p>
      <footer class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button ref="cancelButton" type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-3 text-sm font-bold" @click="$emit('cancel')">Cancelar</button>
        <button type="button" class="focus-ring rounded-full bg-brand px-4 py-3 text-sm font-bold transition-colors hover:bg-brand-hover" @click="$emit('confirm')">Reinterpretar campanha</button>
      </footer>
    </dialog>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = defineProps({ open: Boolean })
defineEmits(['cancel', 'confirm'])
const dialog = ref(null)
const cancelButton = ref(null)
const titleId = 'campaign-reinterpret-confirm-' + useId()
let previousFocus = null
watch(() => props.open, async (open) => {
  if (open) previousFocus = document.activeElement
  await nextTick()
  if (open && dialog.value && !dialog.value.open) {
    dialog.value.showModal()
    cancelButton.value?.focus()
  } else if (!open && dialog.value?.open) {
    dialog.value.close()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
})
onBeforeUnmount(() => dialog.value?.close())
</script>

<style scoped>
.campaign-reinterpret-confirm::backdrop { background: rgb(0 0 0 / 45%); }
</style>
