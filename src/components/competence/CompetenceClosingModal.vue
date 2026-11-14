<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="modalTitleId"
  >
    <div
      class="relative w-full max-w-xl rounded-[28px] border border-sage-border bg-white p-6 shadow-2xl transition sm:p-8 space-y-6"
    >
      <!-- Cabeçalho -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-3 py-1 text-xs font-bold uppercase tracking-wider text-danger-dark">
            Operação Irreversível
          </span>
          <button
            type="button"
            class="focus-ring rounded-full p-2 text-sage-muted transition hover:bg-sage-light hover:text-brand-dark"
            :disabled="isSubmitting"
            aria-label="Fechar modal"
            @click="$emit('cancel')"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <h2 :id="modalTitleId" class="text-2xl font-extrabold tracking-tight text-brand-dark">
          Fechamento Definitivo · {{ formatCompetence(competencia) }}
        </h2>
        <p class="text-sm text-sage-muted">
          Consolidação contábil final de comissões e lacre de competência corporativa.
        </p>
      </div>

      <!-- Alerta de Impacto Corporativo Global -->
      <div class="rounded-2xl border border-danger/30 bg-danger-bg p-4 text-xs sm:text-sm text-danger-dark space-y-2">
        <div class="flex items-start gap-2.5">
          <AlertTriangle class="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
          <div class="space-y-1">
            <p class="font-bold">Atenção ao impacto global em todas as campanhas:</p>
            <p class="leading-relaxed opacity-90">
              Esta ação consolida todas as vendas da empresa na competência <strong>{{ formatCompetence(competencia) }}</strong> sob as regras vigentes mais recentes.
              <strong>Todas as campanhas ativas com vigência neste mês ficarão permanentemente lacradas</strong> contra novas alterações, edições de propostas ou publicações.
            </p>
          </div>
        </div>
      </div>

      <!-- Resumo da Prévia Conferida (se disponível) -->
      <div v-if="previewTotals" class="rounded-2xl border border-sage-border bg-sage-light/60 p-4 text-xs sm:text-sm space-y-2">
        <p class="font-bold text-brand-dark">Resumo da Prévia Conferida:</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <span class="text-[11px] font-semibold text-sage-muted uppercase">Vendas</span>
            <p class="font-bold text-brand-dark">{{ previewTotals.totalVendasProcessadas ?? 0 }}</p>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-sage-muted uppercase">Calculadas</span>
            <p class="font-bold text-success-dark">{{ previewTotals.totalCalculados ?? 0 }}</p>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-sage-muted uppercase">Impedimentos</span>
            <p class="font-bold" :class="previewTotals.totalImpedimentos ? 'text-warning-dark' : 'text-sage-muted'">
              {{ previewTotals.totalImpedimentos ?? 0 }}
            </p>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-sage-muted uppercase">Total Comissões</span>
            <p class="font-extrabold text-brand-dark">{{ formatCurrency(previewTotals.valorTotalComissao) }}</p>
          </div>
        </div>
      </div>

      <!-- Identificação do Usuário e Justificativa -->
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-sage-muted">
            Responsável pela Liquidação
          </label>
          <div class="mt-1 flex items-center justify-between rounded-xl border border-sage-border bg-sage-light/30 px-3.5 py-2.5 text-sm font-semibold text-brand-dark">
            <span>{{ userIdentifier || 'Usuário não identificado' }}</span>
            <span class="text-xs text-sage-muted font-normal">Sessão ativa</span>
          </div>
          <p v-if="!userIdentifier" class="mt-1 text-xs font-semibold text-danger-dark">
            Não é possível prosseguir sem usuário identificado na sessão.
          </p>
        </div>

        <div>
          <label :for="motivoInputId" class="block text-xs font-bold uppercase tracking-wider text-brand-dark">
            Justificativa Contábil do Fechamento <span class="text-danger">*</span>
          </label>
          <textarea
            :id="motivoInputId"
            v-model="motivoText"
            rows="3"
            class="focus-ring mt-1.5 w-full rounded-xl border border-sage-border bg-white p-3 text-sm text-brand-dark placeholder:text-sage-muted"
            placeholder="Informe a justificativa oficial ou protocolo contábil (ex: Fechamento contábil mensal regular aprovado pela controladoria)."
            :disabled="isSubmitting"
          />
          <p v-if="validationError" class="mt-1 text-xs font-semibold text-danger-dark">
            {{ validationError }}
          </p>
        </div>
      </div>

      <!-- Botões de Ação -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="focus-ring rounded-full border border-sage-border px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-sage-light disabled:opacity-50"
          :disabled="isSubmitting"
          @click="$emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-danger px-6 py-3 text-sm font-bold text-white transition hover:bg-danger-dark disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isSubmitting || !userIdentifier || !motivoText.trim()"
          @click="handleSubmit"
        >
          <span v-if="isSubmitting" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>{{ isSubmitting ? 'Apurando e Lacrando…' : 'Confirmar e Lacrar Competência' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { X, AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  competencia: { type: String, default: '' },
  isSubmitting: { type: Boolean, default: false },
  currentUser: { type: [Object, String], default: null },
  previewTotals: { type: Object, default: null }
})

const emit = defineEmits(['confirm', 'cancel'])

const motivoText = ref('')
const validationError = ref('')

const modalTitleId = 'modal-fechamento-titulo'
const motivoInputId = 'modal-fechamento-motivo'

const userIdentifier = computed(() => {
  if (!props.currentUser) return ''
  if (typeof props.currentUser === 'string') return props.currentUser.trim()
  return (props.currentUser.email || props.currentUser.nome || props.currentUser.name || '').trim()
})

function formatCompetence(comp) {
  if (!comp) return ''
  const m = String(comp).match(/^(\d{4})-(\d{2})$/)
  if (m) return `${m[2]}/${m[1]}`
  return comp
}

function formatCurrency(val) {
  const num = Number(val) || 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

function handleSubmit() {
  validationError.value = ''
  const cleanMotivo = motivoText.value.trim()
  if (!cleanMotivo) {
    validationError.value = 'A justificativa contábil é obrigatória.'
    return
  }
  if (!userIdentifier.value) {
    validationError.value = 'Usuário responsável não identificado na sessão.'
    return
  }
  emit('confirm', {
    motivo: cleanMotivo,
    executadoPor: userIdentifier.value
  })
}
</script>
