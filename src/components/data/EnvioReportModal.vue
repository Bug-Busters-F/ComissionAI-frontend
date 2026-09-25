<template>
  <div
    v-if="store.modalRelatorioEnvio.isOpen && store.modalRelatorioEnvio.envio"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
      <!-- Cabeçalho do Modal -->
      <div class="flex items-center justify-between border-b border-sage-border-light px-6 py-4">
        <div>
          <span class="rounded bg-sage-light px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sage-muted">
            Relatório de Validação de Envio
          </span>
          <h2 class="mt-1 text-xl font-extrabold tracking-[-0.03em] text-brand-dark">
            {{ store.modalRelatorioEnvio.envio.nomeArquivo }}
          </h2>
          <p class="text-xs text-sage-muted">
            Competência: <strong>{{ store.modalRelatorioEnvio.envio.competencia || 'N/A' }}</strong> •
            Enviado em: {{ formatarData(store.modalRelatorioEnvio.envio.criadoEm) }}
          </p>
        </div>
        <button
          type="button"
          @click="store.fecharRelatorioEnvio"
          class="focus-ring rounded-lg p-2 text-sage-muted hover:bg-sage-light hover:text-brand-dark transition"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Banner de Orientação Obrigatória -->
      <div class="bg-warning-bg/60 border-b border-warning-border/60 px-6 py-3 text-xs text-brand-dark flex items-center gap-2">
        <Info class="h-4 w-4 text-warning-dark shrink-0" />
        <span>
          <strong>Orientação para correção:</strong> Para corrigir apontamentos e inconsistências, altere o arquivo XLSX/CSV original e realize um novo envio pelo upload. A edição direta de registros no sistema não é permitida para garantir a rastreabilidade e integridade relacional.
        </span>
      </div>

      <!-- Conteúdo do Relatório com Scroll -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <ValidationReport
          v-if="store.modalRelatorioEnvio.envio.report"
          :report="store.modalRelatorioEnvio.envio.report"
        />
        <div v-else class="text-center py-10 text-sage-muted">
          Relatório detalhado indisponível para este envio.
        </div>
      </div>

      <!-- Rodapé -->
      <div class="flex items-center justify-between border-t border-sage-border-light px-6 py-4 bg-sage-surface">
        <span class="text-xs text-sage-muted">
          Status: <strong>{{ store.modalRelatorioEnvio.envio.status }}</strong>
        </span>
        <button
          type="button"
          @click="store.fecharRelatorioEnvio"
          class="focus-ring rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-brand-dark transition hover:bg-brand-hover"
        >
          Fechar relatório
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X, Info } from 'lucide-vue-next'
import ValidationReport from '@/components/data/ValidationReport.vue'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()

function formatarData(isoStr) {
  if (!isoStr) return '-'
  try {
    const d = new Date(isoStr)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return isoStr
  }
}
</script>
