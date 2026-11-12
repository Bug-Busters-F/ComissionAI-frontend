<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="history-modal-title"
    @keydown.esc="$emit('close')"
  >
    <div class="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
      <div class="flex items-start justify-between border-b border-sage-border-light pb-4">
        <div>
          <h3 id="history-modal-title" class="text-lg font-black text-brand-dark flex items-center gap-2">
            <History class="h-5 w-5 text-brand" />
            Histórico de Alterações — Linha #{{ numeroLinha }}
          </h3>
          <p class="text-xs text-sage-muted">
            Auditoria completa de edições com comparação de valores e resolução de inconsistências (Antes vs. Depois).
          </p>
        </div>
        <button
          type="button"
          @click="$emit('close')"
          class="focus-ring rounded-lg p-1 text-sage-muted hover:text-brand-dark"
          aria-label="Fechar modal"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Carregando histórico -->
      <div v-if="carregando" class="py-12 text-center text-xs text-sage-muted" role="status">
        Carregando histórico de versões da linha...
      </div>

      <!-- Nenhum histórico registrado -->
      <div v-else-if="!historico.length" class="py-8 text-center text-xs text-sage-muted">
        Nenhuma alteração manual registrada nesta linha até o momento.
      </div>

      <!-- Lista de Revisões Históricas -->
      <div v-else class="space-y-6">
        <article
          v-for="(rev, idx) in historico"
          :key="rev.id || idx"
          class="rounded-xl border border-sage-border-light bg-sage-light/30 p-4 space-y-3 text-xs"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-sage-border-light pb-2">
            <div>
              <span class="rounded bg-brand px-2 py-0.5 font-black text-brand-dark">
                Versão {{ rev.versaoAnterior }} &rarr; {{ rev.versaoNova }}
              </span>
              <span class="ml-2 font-bold text-brand-dark">Por: {{ rev.editadoPor || 'Sistema' }}</span>
            </div>
            <span class="text-sage-muted">{{ formatDataHora(rev.editadoEm) }}</span>
          </div>

          <div v-if="rev.motivo" class="rounded-lg bg-white p-2.5 border border-sage-border text-brand-dark">
            <strong>Motivo registrado:</strong> {{ rev.motivo }}
          </div>

          <!-- Comparação Lado a Lado de Campos Alterados -->
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-sage-light text-sage-muted uppercase tracking-wider text-[10px]">
                <tr>
                  <th class="p-2">Campo</th>
                  <th class="p-2 text-danger-dark">Valor Anterior (Antes)</th>
                  <th class="p-2 text-success-dark">Valor Novo (Depois)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-sage-border-light bg-white">
                <tr v-for="(item, i) in extrairDiffValores(rev)" :key="i">
                  <td class="p-2 font-bold text-brand-dark">{{ item.campo }}</td>
                  <td class="p-2 text-danger-dark bg-danger-bg/20 font-mono">{{ item.anterior || '—' }}</td>
                  <td class="p-2 text-success-dark bg-success-surface/30 font-mono font-bold">{{ item.novo || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Comparação de Erros Antes vs. Depois -->
          <div class="grid gap-3 sm:grid-cols-2 pt-1">
            <div class="rounded-lg bg-white p-2.5 border border-danger/30">
              <p class="font-extrabold text-danger-dark mb-1">Inconsistências Antes:</p>
              <p v-if="!extrairErros(rev.errosAntesJson).length" class="text-sage-muted">Nenhum erro.</p>
              <ul v-else class="list-disc pl-4 space-y-0.5 text-danger-dark">
                <li v-for="(e, i) in extrairErros(rev.errosAntesJson)" :key="i">
                  {{ e.campo || 'Geral' }}: {{ e.mensagem }}
                </li>
              </ul>
            </div>

            <div class="rounded-lg bg-white p-2.5 border border-success/40">
              <p class="font-extrabold text-success-dark mb-1">Inconsistências Depois:</p>
              <p v-if="!extrairErros(rev.errosDepoisJson).length" class="text-success font-bold">Todas as inconsistências foram sanadas!</p>
              <ul v-else class="list-disc pl-4 space-y-0.5 text-warning-text">
                <li v-for="(e, i) in extrairErros(rev.errosDepoisJson)" :key="i">
                  {{ e.campo || 'Geral' }}: {{ e.mensagem }}
                </li>
              </ul>
            </div>
          </div>
        </article>
      </div>

      <div class="flex justify-end pt-3 border-t border-sage-border-light">
        <button
          type="button"
          @click="$emit('close')"
          class="focus-ring rounded-xl bg-sage-light px-5 py-2 text-xs font-bold text-brand-dark hover:bg-sage-border"
        >
          Fechar Histórico
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { History, X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  numeroLinha: { type: [Number, String], default: null },
  historico: { type: Array, default: () => [] },
  carregando: { type: Boolean, default: false }
})

defineEmits(['close'])

function formatDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-BR') : iso
}

function parseJsonSafe(str) {
  if (!str) return {}
  try {
    return JSON.parse(str)
  } catch {
    return {}
  }
}

function extrairDiffValores(rev) {
  const antes = parseJsonSafe(rev.valoresAnterioresJson)
  const depois = parseJsonSafe(rev.valoresNovosJson)
  const chaves = Array.from(new Set([...Object.keys(antes), ...Object.keys(depois)]))

  return chaves.map((campo) => ({
    campo,
    anterior: antes[campo] != null ? String(antes[campo]) : '',
    novo: depois[campo] != null ? String(depois[campo]) : ''
  }))
}

function extrairErros(json) {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
</script>
