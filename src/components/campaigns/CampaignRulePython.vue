<template>
  <section class="mt-5 min-w-0 rounded-2xl border border-brand-dark bg-brand-dark p-4 text-brand sm:p-5" :aria-label="'Python da regra ' + ruleNumber">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h4 class="text-base font-extrabold">Python da regra {{ ruleNumber }}</h4>
      <button v-if="code && current" type="button" class="focus-ring inline-flex items-center gap-2 rounded-full border border-brand bg-brand px-4 py-2 text-xs font-bold text-brand-dark hover:bg-brand-hover disabled:opacity-50" :disabled="copying" @click="copyCode"><Copy :size="14" aria-hidden="true" />Copiar código</button>
    </div>
    <p class="mt-3 text-xs leading-5 text-sage-border">{{ historical ? 'Código preservado na publicação desta versão. Disponível somente para consulta e cópia.' : 'Código equivalente recebido para conferência. Este código representa a regra atual para conferência.' }}</p>
    <p v-if="!current" class="mt-3 rounded-xl border border-sage-muted bg-brand-dark-hover p-3 text-sm text-sage-light">Código indisponível para os campos atuais. Valide a regra antes de revisar; o código anterior foi ocultado.</p>
    <pre v-else-if="code" tabindex="0" class="focus-ring mt-3 max-h-80 max-w-full overflow-auto rounded-xl border border-sage-muted bg-brand-dark-hover p-3 text-[11px] leading-5 text-brand"><code>{{ code }}</code></pre>
    <p v-else class="mt-3 text-sm text-sage-light">O serviço não retornou Python equivalente para esta regra.</p>
    <p v-if="copyMessage" role="status" aria-live="polite" class="mt-3 text-xs text-sage-light">{{ copyMessage }}</p>
  </section>
</template>
<script setup>
import { ref, watch } from 'vue'
import { Copy } from 'lucide-vue-next'
const props = defineProps({ ruleNumber: Number, code: { type: String, default: '' }, current: Boolean, historical: Boolean })
const copying = ref(false)
const copyMessage = ref('')
watch(() => [props.code, props.current], () => { copyMessage.value = '' })
async function copyCode() {
  if (!props.current || !props.code) return
  copying.value = true
  try {
    await navigator.clipboard.writeText(props.code)
    copyMessage.value = 'Código Python copiado.'
  } catch { copyMessage.value = 'Não foi possível copiar automaticamente. Selecione o código e copie manualmente.' }
  finally { copying.value = false }
}
</script>
