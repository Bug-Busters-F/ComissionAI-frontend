<template>
  <component :is="campaign || expanded ? 'section' : 'details'" class="min-w-0 rounded-2xl border" :class="campaign ? 'border-brand-dark bg-brand-dark p-3 text-brand sm:p-4' : 'mt-5 border-sage-border bg-sage-light p-4 sm:p-5'">
    <div v-if="campaign" class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-base font-extrabold text-brand">Código da campanha</h3>
      <span class="rounded-full border border-sage-muted bg-brand-dark-hover px-3 py-1 text-xs font-semibold text-brand">Exemplo demonstrativo</span>
    </div>
    <h4 v-else-if="expanded" class="text-sm font-bold text-brand-dark">Python da regra</h4>
    <summary v-else class="focus-ring cursor-pointer rounded text-sm font-bold text-brand-dark">Visualizar Python</summary>
    <p class="mt-4 rounded-xl px-3 py-2 text-xs font-bold leading-5" :class="campaign ? 'border border-sage-muted bg-brand-dark-hover text-sage-light' : 'bg-warning-bg text-warning-text'">{{ campaign ? 'Código demonstrativo — não representa os valores desta campanha' : 'Código demonstrativo — não representa os valores desta regra' }}</p>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <span class="text-xs" :class="campaign ? 'text-sage-border' : 'text-sage-muted'">{{ languageLabel }} · {{ campaign && selectedLanguage === 'portugol' ? 'leitura simplificada · ' : '' }}exemplo fixo para apresentação</span>
      <button type="button" class="focus-ring inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-50" :class="campaign ? 'border-brand bg-brand text-brand-dark hover:border-brand-hover hover:bg-brand-hover' : 'border-sage-border-dark bg-white text-brand-dark'" :disabled="copying" @click="copyCode"><Copy :size="14" aria-hidden="true" />{{ campaign ? 'Copiar código da campanha' : 'Copiar código' }}</button>
    </div>
    <pre ref="codePanel" tabindex="0" :aria-label="campaign ? 'Exemplo demonstrativo de ' + languageLabel + ' da campanha' : 'Exemplo demonstrativo de Python da regra ' + ruleNumber" class="focus-ring mt-3 max-w-full rounded-xl border" :class="campaign ? 'max-h-80 overflow-auto border-sage-muted bg-brand-dark-hover p-3 text-[11px] leading-5 text-brand' : 'overflow-x-auto border-sage-border bg-white p-4 text-xs leading-6 text-brand-dark'"><code>{{ code }}</code></pre>
    <fieldset v-if="campaign" class="relative mx-auto mt-4 grid w-48 max-w-full grid-cols-2 rounded-full border border-sage-muted bg-brand-dark-hover p-1">
      <legend class="sr-only">Formato do código da campanha</legend>
      <span aria-hidden="true" class="language-highlight pointer-events-none rounded-full bg-brand transition-transform duration-300 ease-in-out motion-reduce:transition-none" :class="selectedLanguage === 'portugol' ? 'translate-x-full' : 'translate-x-0'" />
      <label v-for="option in languageOptions" :key="option.value" class="relative z-10 min-w-0 rounded-full px-3 py-2 text-center text-xs font-bold transition-colors duration-200 motion-reduce:transition-none" :class="[selectedLanguage === option.value ? 'text-brand-dark' : 'text-sage-border hover:text-brand', copying ? 'cursor-wait opacity-60' : 'cursor-pointer']">
        <input v-model="selectedLanguage" class="language-option sr-only outline-none" type="radio" :name="languageGroup" :value="option.value" :disabled="copying" />
        <span>{{ option.label }}</span>
      </label>
    </fieldset>
    <p v-if="campaign" class="sr-only" role="status" aria-live="polite">Formato exibido: {{ languageLabel }}</p>
    <p v-if="copyMessage" class="mt-3 text-xs leading-5" :class="campaign ? 'text-sage-light' : copyFailed ? 'text-danger-dark' : 'text-success-dark'" role="status" aria-live="polite">{{ copyMessage }}</p>
  </component>
</template>

<script setup>
import { computed, ref, useId, watch } from 'vue'
import { Copy } from 'lucide-vue-next'

const props = defineProps({ ruleNumber: { type: Number, default: null }, expanded: Boolean, campaign: Boolean })
const exampleCode = `# EXEMPLO FIXO — não representa a regra da campanha.
# Apenas ilustra uma condição e o cálculo percentual.
# Não é executado pelo sistema.
from decimal import Decimal, ROUND_HALF_UP

def exemplo_comissao(valor_venda, marca):
    if marca != "EXEMPLO":
        return None  # O motor deve consultar outras regras ou a base.

    taxa = Decimal("0.03")
    return (Decimal(str(valor_venda)) * taxa).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )`
const campaignExampleCode = `# EXEMPLO FIXO — não representa os valores da campanha.
# Ilustra duas regras em um script único; não é executado pelo sistema.
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

INICIO_EXEMPLO = date(2025, 8, 1)
FIM_EXEMPLO = date(2025, 8, 31)

def exemplo_campanha(venda):
    if not INICIO_EXEMPLO <= venda["data"] <= FIM_EXEMPLO:
        return None  # Consultar outras campanhas ou a taxa base.

    candidatas = []

    # Regra 1 — público e percentual fictícios.
    if venda["marca"] == "VERMELHO" and venda["cargo"] == "VENDEDOR":
        candidatas.append(Decimal("0.03"))

    # Regra 2 — público e percentual fictícios.
    if venda["marca"] == "PRETO" and venda["cargo"] == "VENDEDOR":
        candidatas.append(Decimal("0.035"))

    if not candidatas:
        return None  # O motor deve consultar outras regras ou a base.
    if len(candidatas) > 1:
        raise ValueError("Conflito no exemplo: mais de uma regra aplicável")

    # Exemplo simplificado; a precedência real pertence ao motor.
    return (Decimal(str(venda["valor"])) * candidatas[0]).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )`
const campaignPortugolExample = `// EXEMPLO FIXO — não representa os valores da campanha.
// Leitura simplificada; não é executada pelo sistema.
INÍCIO
    início_da_campanha ← 01/08/2025
    fim_da_campanha ← 31/08/2025

    SE data_da_venda < início_da_campanha OU
       data_da_venda > fim_da_campanha ENTÃO
        RETORNAR SEM_REGRA
        // O motor deve consultar outras campanhas ou a taxa base.
    FIM_SE

    taxas_candidatas ← LISTA_VAZIA

    // Regra 1 — público e percentual fictícios.
    SE marca = "VERMELHO" E cargo = "VENDEDOR" ENTÃO
        ADICIONAR 3% ÀS taxas_candidatas
    FIM_SE

    // Regra 2 — público e percentual fictícios.
    SE marca = "PRETO" E cargo = "VENDEDOR" ENTÃO
        ADICIONAR 3,5% ÀS taxas_candidatas
    FIM_SE

    SE QUANTIDADE(taxas_candidatas) = 0 ENTÃO
        RETORNAR SEM_REGRA
        // O motor deve consultar outras regras ou a base.
    FIM_SE

    SE QUANTIDADE(taxas_candidatas) > 1 ENTÃO
        INFORMAR "Conflito: mais de uma regra aplicável"
        INTERROMPER O CÁLCULO
    FIM_SE

    // Exemplo simplificado; a precedência real pertence ao motor.
    comissão ← valor_da_venda × PRIMEIRA_TAXA(taxas_candidatas)
    RETORNAR comissão ARREDONDADA PARA CENTAVOS
    // Quando a terceira casa for 5 ou maior, elevar o centavo.
FIM`
const languageOptions = [{ value: 'python', label: 'Python' }, { value: 'portugol', label: 'Portugol' }]
const selectedLanguage = ref('python')
const languageGroup = 'campaign-code-language-' + useId()
const languageLabel = computed(() => props.campaign && selectedLanguage.value === 'portugol' ? 'Portugol' : 'Python')
const code = computed(() => !props.campaign ? exampleCode : selectedLanguage.value === 'portugol' ? campaignPortugolExample : campaignExampleCode)
const codePanel = ref(null)
const copying = ref(false)
const copyMessage = ref('')
const copyFailed = ref(false)
watch(selectedLanguage, () => {
  copyMessage.value = ''
  copyFailed.value = false
  if (codePanel.value) { codePanel.value.scrollTop = 0; codePanel.value.scrollLeft = 0 }
})
async function copyCode() {
  copying.value = true
  copyMessage.value = ''
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(code.value)
    copyFailed.value = false
    copyMessage.value = 'Código em ' + languageLabel.value + ' copiado.'
  } catch {
    copyFailed.value = true
    copyMessage.value = 'Não foi possível copiar automaticamente. Selecione o código e copie manualmente.'
  } finally { copying.value = false }
}
</script>

<style scoped>
.language-highlight {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / 2);
}
.language-option:focus-visible + span {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 2px;
}
</style>
