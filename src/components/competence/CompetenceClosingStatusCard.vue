<template>
  <div class="rounded-[24px] border border-sage-border bg-white p-6 shadow-sm sm:p-7 space-y-6">
    <!-- Cabeçalho do Card -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="text-xs font-bold uppercase tracking-wider text-sage-muted">
            Situação Contábil · {{ formatCompetence(competencia) }}
          </span>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold uppercase"
            :class="statusBadgeClasses"
          >
            <span v-if="status === 'PROCESSANDO'" class="h-2 w-2 animate-ping rounded-full bg-warning" />
            {{ statusLabel }}
          </span>
        </div>
        <h3 class="mt-1 text-2xl font-extrabold tracking-tight text-brand-dark">
          {{ cardTitle }}
        </h3>
      </div>

      <!-- Ações rápidas de topo -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          v-if="status === 'PROCESSANDO'"
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
          :disabled="isCheckingStatus"
          @click="$emit('refreshStatus')"
        >
          <span v-if="isCheckingStatus" class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-dark border-t-transparent" />
          <span>{{ isCheckingStatus ? 'Consultando…' : 'Verificar status agora' }}</span>
        </button>

        <button
          v-if="status === 'CONCLUIDO'"
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border bg-white px-4 py-2.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-sage-light"
          @click="$emit('downloadProof')"
        >
          <Download class="h-4 w-4 text-brand-dark" aria-hidden="true" />
          <span>Baixar Comprovante (JSON)</span>
        </button>
      </div>
    </div>

    <!-- Banner de Alerta de Divergência -->
    <div
      v-if="divergenceWarning"
      class="rounded-2xl border border-warning-border bg-warning-bg p-4 text-xs sm:text-sm text-warning-dark space-y-1"
      role="alert"
    >
      <div class="flex items-start gap-2">
        <AlertTriangle class="h-4 w-4 text-warning-dark shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p class="font-bold">Divergência detectada entre a prévia e o fechamento:</p>
          <p class="opacity-90">{{ divergenceWarning }}</p>
        </div>
      </div>
    </div>

    <!-- Banner de Alerta de Resposta Perdida na Rede -->
    <div
      v-if="lostResponseWarning"
      class="rounded-2xl border border-warning-border bg-warning-bg p-4 text-xs sm:text-sm text-warning-dark space-y-1"
      role="alert"
    >
      <div class="flex items-start gap-2">
        <AlertTriangle class="h-4 w-4 text-warning-dark shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p class="font-bold">Resposta interrompida pela rede:</p>
          <p class="opacity-90">
            O fechamento foi consolidado e lacrado pelo servidor sob o protocolo oficial, mas a conexão foi interrompida antes da entrega da lista completa de vendas e impedimentos. Os totais estão preservados.
          </p>
        </div>
      </div>
    </div>

    <!-- Alerta de Download Pendente para Fechamento Concluído -->
    <div
      v-if="status === 'CONCLUIDO' && hasProof && !proofDownloaded"
      class="rounded-2xl border border-brand/30 bg-brand/10 p-4 text-xs sm:text-sm text-brand-dark space-y-2"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="font-bold">Comprovante de auditoria disponível para download:</p>
          <p class="text-xs opacity-80">
            A lista detalhada de impedimentos é retornada apenas nesta sessão e não é salva no banco. Baixe o comprovante oficial agora para seus registros.
          </p>
        </div>
        <button
          type="button"
          class="focus-ring shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-brand-hover"
          @click="$emit('downloadProof')"
        >
          Baixar agora
        </button>
      </div>
    </div>

    <!-- Conteúdo para status CONCLUIDO -->
    <div v-if="status === 'CONCLUIDO'" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-sage-border bg-sage-light/40 p-3.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-sage-muted">Protocolo de Auditoria</span>
          <p class="mt-1 font-mono text-xs font-bold text-brand-dark break-all">
            {{ statusData.protocolo || 'Não informado' }}
          </p>
        </div>
        <div class="rounded-xl border border-sage-border bg-sage-light/40 p-3.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-sage-muted">Concluído em</span>
          <p class="mt-1 text-xs font-bold text-brand-dark">
            {{ formatDateTime(statusData.fechadoEm || statusData.concluidoEm) }}
          </p>
        </div>
        <div class="rounded-xl border border-sage-border bg-sage-light/40 p-3.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-sage-muted">Responsável</span>
          <p class="mt-1 text-xs font-bold text-brand-dark truncate">
            {{ statusData.executadoPor || 'SISTEMA' }}
          </p>
        </div>
      </div>

      <!-- Resumo Financeiro Consolidado -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-sage-border bg-sage-light/20 p-4">
        <div>
          <span class="text-[11px] font-semibold text-sage-muted uppercase">Vendas Apuradas</span>
          <p class="mt-0.5 text-base font-extrabold text-brand-dark">
            {{ statusData.totalVendasProcessadas ?? '—' }}
          </p>
        </div>
        <div>
          <span class="text-[11px] font-semibold text-sage-muted uppercase">Com Sucesso</span>
          <p class="mt-0.5 text-base font-extrabold text-success-dark">
            {{ statusData.totalCalculados ?? '—' }}
          </p>
        </div>
        <div>
          <span class="text-[11px] font-semibold text-sage-muted uppercase">Impedimentos</span>
          <p
            class="mt-0.5 text-base font-extrabold"
            :class="statusData.totalImpedimentos ? 'text-warning-dark' : 'text-sage-muted'"
          >
            {{ statusData.totalImpedimentos ?? '0' }}
          </p>
        </div>
        <div>
          <span class="text-[11px] font-semibold text-sage-muted uppercase">Comissões Liquidadas</span>
          <p class="mt-0.5 text-base font-extrabold text-brand-dark">
            {{ formatCurrency(statusData.valorTotalComissao) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Conteúdo para status PROCESSANDO -->
    <div
      v-else-if="status === 'PROCESSANDO'"
      class="rounded-2xl border border-warning-border bg-warning-bg/60 p-5 text-sm text-warning-dark space-y-3"
    >
      <div class="flex items-center gap-3">
        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-warning-dark border-t-transparent" />
        <p class="font-bold">Fechamento em processamento no servidor</p>
      </div>
      <p class="text-xs leading-relaxed opacity-90">
        A competência está temporariamente bloqueada enquanto as comissões retroativas são apuradas. Você pode acompanhar nesta tela ou verificar o status a qualquer momento.
      </p>
    </div>

    <!-- Conteúdo para status FALHOU -->
    <div
      v-else-if="status === 'FALHOU'"
      class="rounded-2xl border border-danger/30 bg-danger-bg p-5 text-sm text-danger-dark space-y-3"
    >
      <div class="flex items-center gap-2.5">
        <XCircle class="h-5 w-5 text-danger shrink-0" aria-hidden="true" />
        <p class="font-bold">A última tentativa de fechamento falhou</p>
      </div>
      <p class="text-xs leading-relaxed opacity-90">
        {{ statusData.mensagem || statusData.motivoFalha || 'Ocorreu um erro durante o processamento. A competência foi liberada para nova tentativa.' }}
      </p>
      <div v-if="canExecuteClosing" class="pt-1">
        <button
          type="button"
          class="focus-ring rounded-full bg-danger px-5 py-2.5 text-xs font-bold text-white transition hover:bg-danger-dark"
          @click="$emit('openClosingModal')"
        >
          Tentar Fechamento Novamente
        </button>
      </div>
    </div>

    <!-- Conteúdo para status ABERTA -->
    <div v-else class="space-y-4">
      <p class="text-xs leading-relaxed text-sage-muted">
        A competência está aberta para apurações, manutenções e cadastros. Antes de realizar o fechamento contábil oficial, execute a prévia para conferir os totais e impedimentos.
      </p>

      <div class="flex flex-wrap items-center gap-3 pt-2">
        <button
          v-if="canExecuteClosing"
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border px-5 py-3 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
          :disabled="isRecalculating"
          @click="$emit('recalculateAndCheck')"
        >
          <span v-if="isRecalculating" class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-dark border-t-transparent" />
          <span>{{ isRecalculating ? 'Recalculando e conferindo…' : 'Recalcular e conferir prévia' }}</span>
        </button>

        <button
          v-if="canExecuteClosing"
          type="button"
          class="focus-ring rounded-full bg-danger px-5 py-3 text-xs font-bold text-white transition hover:bg-danger-dark disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!hasPreviewCalculated || isRecalculating"
          :title="!hasPreviewCalculated ? 'Execute a conferência prévia antes do fechamento definitivo' : ''"
          @click="$emit('openClosingModal')"
        >
          Executar Fechamento Definitivo
        </button>

        <p v-if="!canExecuteClosing" class="text-xs font-semibold text-sage-muted">
          Seu perfil possui permissão apenas de leitura para consulta contábil.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Download, AlertTriangle, XCircle } from 'lucide-vue-next'

const props = defineProps({
  competencia: { type: String, default: '' },
  statusData: { type: Object, default: () => ({ status: 'ABERTA', bloqueada: false }) },
  isCheckingStatus: { type: Boolean, default: false },
  isRecalculating: { type: Boolean, default: false },
  canExecuteClosing: { type: Boolean, default: false },
  hasPreviewCalculated: { type: Boolean, default: false },
  hasProof: { type: Boolean, default: false },
  proofDownloaded: { type: Boolean, default: false },
  divergenceWarning: { type: String, default: null },
  lostResponseWarning: { type: Boolean, default: false }
})

defineEmits(['refreshStatus', 'downloadProof', 'recalculateAndCheck', 'openClosingModal'])

const status = computed(() => {
  return props.statusData?.status || 'ABERTA'
})

const statusLabel = computed(() => {
  switch (status.value) {
    case 'CONCLUIDO': return 'Lacrada / Concluída'
    case 'PROCESSANDO': return 'Em Processamento'
    case 'FALHOU': return 'Falhou'
    default: return 'Aberta'
  }
})

const statusBadgeClasses = computed(() => {
  switch (status.value) {
    case 'CONCLUIDO': return 'bg-success-bg text-success-dark border border-success/30'
    case 'PROCESSANDO': return 'bg-warning-bg text-warning-dark border border-warning/40'
    case 'FALHOU': return 'bg-danger-bg text-danger-dark border border-danger/30'
    default: return 'bg-sage-light text-sage-muted border border-sage-border'
  }
})

const cardTitle = computed(() => {
  switch (status.value) {
    case 'CONCLUIDO': return 'Competência Liquidada e Bloqueada'
    case 'PROCESSANDO': return 'Fechamento Contábil em Andamento'
    case 'FALHOU': return 'Tentativa de Fechamento Não Concluída'
    default: return 'Fechamento Contábil de Competência'
  }
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

function formatDateTime(val) {
  if (!val) return 'Não informado'
  const d = new Date(val)
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
    : String(val)
}
</script>
