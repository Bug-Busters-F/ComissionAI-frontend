<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="risk-accept-title"
    @keydown.esc="$emit('cancel')"
  >
    <div class="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-5">
      <div class="flex items-start justify-between border-b border-sage-border-light pb-4">
        <div>
          <h3 id="risk-accept-title" class="text-lg font-black text-brand-dark flex items-center gap-2">
            <ShieldCheck v-if="!isRevogacao" class="h-5 w-5 text-brand" />
            <ShieldAlert v-else class="h-5 w-5 text-danger" />
            {{ isRevogacao ? 'Revogar Aceite de Risco' : 'Aceite Formal de Risco / Pendência' }}
          </h3>
          <p class="text-xs text-sage-muted">
            {{ isRevogacao ? 'Cancele a autorização prévia e torne a pendência bloqueante novamente.' : 'Registre a assunção de risco formal para permitir o prosseguimento da campanha.' }}
          </p>
        </div>
        <button
          type="button"
          @click="$emit('cancel')"
          class="focus-ring rounded-lg p-1 text-sage-muted hover:text-brand-dark"
          aria-label="Fechar modal"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Detalhes da Pendência -->
      <div class="rounded-xl border border-sage-border-light bg-sage-light/30 p-4 space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold text-brand-dark">Linha #{{ pendencia?.linha ?? '—' }} · Campo: {{ pendencia?.campo }}</span>
          <span
            class="rounded px-2 py-0.5 text-[10px] font-black uppercase"
            :class="isImpeditivo ? 'bg-danger text-white' : 'bg-warning-light text-warning-dark'"
          >
            {{ pendencia?.severidade || 'ADVERTENCIA' }}
          </span>
        </div>
        <p class="text-brand-dark font-medium leading-5">
          {{ pendencia?.motivo || pendencia?.mensagem }}
        </p>
      </div>

      <!-- Bloqueio Estrito para IMPEDITIVO -->
      <div v-if="isImpeditivo && !isRevogacao" class="rounded-xl border border-danger/40 bg-danger-bg p-4 space-y-2 text-xs">
        <p class="font-extrabold text-danger-dark flex items-center gap-1.5">
          <AlertOctagon class="h-4 w-4" />
          Operação Não Permitida
        </p>
        <p class="text-danger-dark leading-5">
          Erros de severidade <strong>IMPEDITIVO</strong> violam a integridade dos dados e não admitem aceite de risco. Corrija o valor do campo através da edição da linha antes de prosseguir.
        </p>
      </div>

      <!-- Formulário de Aceite / Revogação -->
      <div v-else class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-sage-muted uppercase tracking-wider">
            Responsável pelo Aceite
          </label>
          <p class="mt-1 font-bold text-brand-dark">
            {{ authStore.currentUser?.nome }} ({{ authStore.currentUser?.email }}) — {{ authStore.currentUser?.nomePerfil }}
          </p>
        </div>

        <div>
          <label class="block font-bold text-sage-muted uppercase tracking-wider">
            Justificativa Formal <span class="text-danger">*</span>
          </label>
          <textarea
            v-model="motivo"
            rows="3"
            class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark p-3 font-semibold text-brand-dark"
            :placeholder="isRevogacao ? 'Descreva a razão da revogação do aceite...' : 'Justifique detalhadamente por que este risco é aceitável para o fechamento da campanha...'"
          ></textarea>
          <p class="mt-1 text-[11px] text-sage-muted">Mínimo de 5 caracteres.</p>
        </div>

        <p v-if="erroMsg" class="text-danger font-bold">{{ erroMsg }}</p>

        <!-- Botões de Ação -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-sage-border-light">
          <button
            type="button"
            @click="$emit('cancel')"
            :disabled="processando"
            class="focus-ring rounded-xl border border-sage-border px-4 py-2 text-xs font-bold text-sage-muted hover:text-brand-dark"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="confirmar"
            :disabled="processando || !podeConfirmar"
            class="focus-ring inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
            :class="isRevogacao ? 'bg-danger text-white hover:bg-danger/90' : 'bg-brand text-brand-dark hover:bg-brand-hover'"
          >
            <RefreshCw v-if="processando" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ isRevogacao ? 'Confirmar Revogação' : 'Registrar Aceite Formal' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ShieldCheck, ShieldAlert, X, AlertOctagon, RefreshCw } from 'lucide-vue-next'
import { useSafeAuthStore } from '@/stores/authStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  pendencia: { type: Object, default: null },
  isRevogacao: { type: Boolean, default: false },
  processando: { type: Boolean, default: false },
  erroMsg: { type: String, default: '' }
})

const emit = defineEmits(['confirm-accept', 'confirm-revoke', 'cancel'])

const authStore = useSafeAuthStore()
const motivo = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) motivo.value = ''
  }
)

const isImpeditivo = computed(() => {
  return String(props.pendencia?.severidade || '').toUpperCase() === 'IMPEDITIVO'
})

const podeConfirmar = computed(() => {
  if (isImpeditivo.value && !props.isRevogacao) return false
  return motivo.value.trim().length >= 5
})

function confirmar() {
  if (!podeConfirmar.value) return
  if (props.isRevogacao) {
    emit('confirm-revoke', {
      aceiteId: props.pendencia?.aceiteId || props.pendencia?.id,
      motivo: motivo.value.trim()
    })
  } else {
    emit('confirm-accept', {
      pendencia: props.pendencia,
      motivo: motivo.value.trim()
    })
  }
}
</script>
