<template>
  <section class="rounded-2xl border border-sage-border bg-white p-5 sm:p-7 space-y-4" aria-labelledby="approval-card-title">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-sage-border-light pb-4">
      <div class="flex items-center gap-3">
        <component :is="statusConfig.icon" class="h-6 w-6" :class="statusConfig.iconClass" aria-hidden="true" />
        <div>
          <h2 id="approval-card-title" class="text-lg font-black text-brand-dark flex items-center gap-2">
            Governança de Código Python (HITL)
          </h2>
          <p class="text-xs text-sage-muted">
            Conferência técnica obrigatória das regras e do código gerado para a versão {{ approval?.versaoNumero || 'atual' }}.
          </p>
        </div>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-black" :class="statusConfig.badgeClass">
        {{ statusConfig.label }}
      </span>
    </div>

    <!-- Alerta de alteração após aprovação ou invalidação -->
    <div
      v-if="isInvalidated || hasRuleChanged"
      class="rounded-xl border border-warning/40 bg-warning-bg p-4 flex items-start gap-3 text-xs leading-5 text-warning-text"
      role="alert"
    >
      <AlertTriangle class="h-5 w-5 shrink-0 text-warning-text mt-0.5" />
      <div>
        <p class="font-bold">Artefatos alterados após aprovação técnica!</p>
        <p class="mt-1">
          Regras, taxas ou parâmetros da campanha foram modificados desde a última aprovação. Uma nova conferência do código Python é necessária antes da publicação gerencial.
        </p>
      </div>
    </div>

    <!-- Metadados de Aprovação -->
    <div v-if="approval?.codigoAprovadoEm || approval?.codigoAprovadoPor" class="grid gap-2 text-xs text-sage-muted sm:grid-cols-2 bg-sage-light/40 p-3 rounded-xl border border-sage-border">
      <p>
        <span class="font-bold text-brand-dark">Aprovado por:</span>
        {{ approval.codigoAprovadoPor || 'Não informado' }}
      </p>
      <p>
        <span class="font-bold text-brand-dark">Data da aprovação:</span>
        {{ formatDateTime(approval.codigoAprovadoEm) }}
      </p>
    </div>

    <!-- Detalhamento de regras e hash -->
    <div v-if="approval?.regras?.length" class="space-y-2">
      <details class="text-xs group">
        <summary class="cursor-pointer font-bold text-sage-dark flex items-center gap-1.5 hover:text-brand-dark">
          <FileCode class="h-4 w-4" />
          Conferir regras avaliadas ({{ approval.regras.length }})
        </summary>
        <ul class="mt-3 space-y-2 pl-2">
          <li
            v-for="r in approval.regras"
            :key="r.regraId"
            class="flex items-center justify-between gap-2 p-2 rounded-lg bg-sage-light/30 border border-sage-border"
          >
            <span class="font-semibold text-brand-dark">{{ r.nome || 'Regra #' + r.regraId }}</span>
            <span
              class="rounded px-2 py-0.5 text-[10px] font-bold"
              :class="r.statusAprovacaoCodigo === 'APROVADO' ? 'bg-success-bg text-success-dark' : 'bg-warning-bg text-warning-text'"
            >
              {{ r.statusAprovacaoCodigo || 'PENDENTE' }}
            </span>
          </li>
        </ul>
      </details>
    </div>

    <!-- Ações e Restrições de Perfil -->
    <div class="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-sage-border-light">
      <p v-if="!canApprove" class="text-xs text-sage-muted italic">
        Aprovação de responsabilidade exclusiva do Analista de Código ou Administrador. Seu perfil atual permite apenas consulta.
      </p>
      <div v-else class="flex flex-wrap items-center gap-2 ml-auto">
        <button
          type="button"
          :disabled="loading || isApprovedAndClean"
          class="focus-ring rounded-full border border-danger/40 bg-white px-4 py-2 text-xs font-bold text-danger-dark transition hover:bg-danger-bg disabled:opacity-50"
          @click="$emit('reject')"
        >
          Rejeitar Código
        </button>
        <button
          type="button"
          :disabled="loading || isApprovedAndClean"
          class="focus-ring rounded-full bg-brand px-5 py-2 text-xs font-bold text-brand-dark transition hover:bg-brand-hover disabled:opacity-50"
          @click="$emit('approve')"
        >
          {{ isApprovedAndClean ? 'Código Aprovado' : 'Aprovar Código Python' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileCode
} from 'lucide-vue-next'

const props = defineProps({
  approval: {
    type: Object,
    default: null
  },
  canApprove: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['approve', 'reject', 'refresh'])

const status = computed(() => props.approval?.statusAprovacaoCodigo || 'PENDENTE')

const hasRuleChanged = computed(() => {
  return props.approval?.regras?.some((r) => r.statusAprovacaoCodigo === 'INVALIDADO') === true
})

const isInvalidated = computed(() => status.value === 'INVALIDADO')

const isApprovedAndClean = computed(() => {
  return status.value === 'APROVADO' && !hasRuleChanged.value
})

const statusConfig = computed(() => {
  if (isInvalidated.value || hasRuleChanged.value) {
    return {
      label: 'Artefatos Invalidados',
      icon: AlertTriangle,
      iconClass: 'text-warning-text',
      badgeClass: 'bg-warning-bg text-warning-text'
    }
  }
  switch (status.value) {
    case 'APROVADO':
      return {
        label: 'Código Aprovado',
        icon: CheckCircle2,
        iconClass: 'text-success-dark',
        badgeClass: 'bg-success-bg text-success-dark'
      }
    case 'REJEITADO':
      return {
        label: 'Código Rejeitado',
        icon: XCircle,
        iconClass: 'text-danger-dark',
        badgeClass: 'bg-danger-bg text-danger-dark'
      }
    case 'PENDENTE':
    default:
      return {
        label: 'Aprovação Pendente',
        icon: Clock,
        iconClass: 'text-sage-muted',
        badgeClass: 'bg-sage-pill text-sage-muted'
      }
  }
})

function formatDateTime(val) {
  if (!val) return 'Não informada'
  try {
    return new Date(val).toLocaleString('pt-BR')
  } catch {
    return String(val)
  }
}
</script>
