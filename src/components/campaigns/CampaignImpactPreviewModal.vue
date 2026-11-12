<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="impact-preview-title"
    @keydown.esc="$emit('cancel')"
  >
    <div class="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
      <div class="flex items-start justify-between border-b border-sage-border-light pb-4">
        <div>
          <h3 id="impact-preview-title" class="text-lg font-black text-brand-dark flex items-center gap-2">
            <Globe2 class="h-5 w-5 text-brand" />
            Prévia de Impacto Global e Efetivação
          </h3>
          <p class="text-xs text-sage-muted">
            Avalie o impacto das alterações na base geral corporativa antes de confirmar a gravação definitiva.
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

      <!-- Carregando prévia -->
      <div v-if="carregando" class="py-12 text-center text-xs text-sage-muted" role="status">
        Calculando prévia de propagação de impacto nas campanhas...
      </div>

      <div v-else class="space-y-5 text-xs">
        <!-- Resumo de Registros Alterados -->
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-xl border border-sage-border-light bg-sage-light/50 p-3 text-center">
            <p class="text-[10px] font-bold uppercase text-sage-muted">Novos Registros</p>
            <p class="text-lg font-black text-brand-dark">
              {{ preview?.resumoAlteracoesBase?.registrosNovos ?? 0 }}
            </p>
          </div>
          <div class="rounded-xl border border-brand/30 bg-brand-light/30 p-3 text-center">
            <p class="text-[10px] font-bold uppercase text-sage-muted">Atualizados</p>
            <p class="text-lg font-black text-brand-dark">
              {{ preview?.resumoAlteracoesBase?.registrosAtualizados ?? 0 }}
            </p>
          </div>
          <div class="rounded-xl border border-sage-border-light bg-white p-3 text-center">
            <p class="text-[10px] font-bold uppercase text-sage-muted">Inalterados</p>
            <p class="text-lg font-black text-sage-muted">
              {{ preview?.resumoAlteracoesBase?.registrosInalterados ?? 0 }}
            </p>
          </div>
        </div>

        <!-- Alerta de Bloqueios Impeditivos -->
        <div v-if="preview?.possuiBloqueioFechamento" class="rounded-xl border border-danger/40 bg-danger-bg p-4 space-y-1">
          <p class="font-extrabold text-danger-dark flex items-center gap-1.5">
            <AlertOctagon class="h-4 w-4" />
            Bloqueios Impeditivos de Fechamento Detectados
          </p>
          <ul class="list-disc pl-4 text-danger-dark space-y-0.5">
            <li v-for="(b, i) in preview.bloqueiosFechamento" :key="i">{{ b }}</li>
          </ul>
        </div>

        <!-- Campanhas Afetadas -->
        <div>
          <h4 class="font-bold uppercase tracking-wider text-sage-muted mb-2 flex items-center justify-between">
            <span>Campanhas que Utilizam Esta Base ({{ preview?.campanhasAfetadas?.length || 0 }})</span>
            <span v-if="preview?.possuiImpactos" class="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-bold text-warning-text">
              Impacto Multi-Campanhas
            </span>
          </h4>

          <div v-if="!preview?.campanhasAfetadas?.length" class="rounded-xl border border-sage-border bg-sage-light/20 p-3 text-sage-muted">
            Nenhuma outra campanha cadastrada será afetada diretamente por este lote.
          </div>

          <div v-else class="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-sage-border p-2 bg-white">
            <div
              v-for="c in preview.campanhasAfetadas"
              :key="c.campanhaId"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-sage-light/40 border-b border-sage-border-light last:border-b-0"
            >
              <div>
                <p class="font-bold text-brand-dark">
                  {{ c.titulo }} <span class="text-sage-muted">#{{ c.campanhaId }}</span>
                </p>
                <p class="text-[11px] text-sage-muted">
                  Estado: <strong>{{ c.estado }}</strong> · Versão: <strong>{{ c.versaoNumero || 1 }}</strong>
                </p>
              </div>

              <div class="flex flex-col items-end gap-1">
                <span
                  v-if="c.simulacaoAceitaInvalidada"
                  class="rounded bg-danger-bg px-2 py-0.5 text-[10px] font-bold text-danger-dark"
                >
                  Simulação Aceita Invalidada
                </span>
                <span
                  v-if="c.regrasAtingidas?.length"
                  class="text-[10px] font-semibold text-sage-muted"
                >
                  {{ c.regrasAtingidas.length }} regra(s) atingida(s)
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Justificativa da Efetivação (Obrigatória) -->
        <div>
          <label class="block font-bold text-sage-muted uppercase tracking-wider">
            Justificativa da Efetivação <span class="text-danger">*</span>
          </label>
          <textarea
            v-model="motivo"
            rows="2"
            class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark p-3 font-semibold text-brand-dark"
            placeholder="Descreva a razão da efetivação deste lote na base geral corporativa..."
          ></textarea>
        </div>

        <!-- Confirmação Explícita Obrigatória -->
        <div class="rounded-xl border border-warning-border bg-warning-bg/40 p-3.5 flex items-start gap-3">
          <input
            id="confirm-impact-checkbox"
            type="checkbox"
            v-model="confirmado"
            class="mt-0.5 h-4 w-4 rounded border-sage-border-dark text-brand focus:ring-brand"
          />
          <label for="confirm-impact-checkbox" class="text-xs font-semibold text-brand-dark cursor-pointer">
            Estou ciente de que a efetivação destas correções atualizará a base geral corporativa e propagará as alterações para todas as campanhas em vigência na competência.
          </label>
        </div>

        <p v-if="erroEfetivacao" class="text-danger font-bold text-xs" role="alert">
          {{ erroEfetivacao }}
        </p>

        <!-- Botões de Ação -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-sage-border-light">
          <button
            type="button"
            @click="$emit('cancel')"
            :disabled="efetivando"
            class="focus-ring rounded-xl border border-sage-border px-4 py-2 text-xs font-bold text-sage-muted hover:text-brand-dark"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="efetivar"
            :disabled="efetivando || !podeEfetivar"
            class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw v-if="efetivando" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ efetivando ? 'Efetivando na Base Geral...' : 'Confirmar e Efetivar Lote' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Globe2, X, AlertOctagon, RefreshCw } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  preview: { type: Object, default: null },
  carregando: { type: Boolean, default: false },
  efetivando: { type: Boolean, default: false },
  erroEfetivacao: { type: String, default: '' }
})

const emit = defineEmits(['confirm', 'cancel'])

const motivo = ref('')
const confirmado = ref(false)

const podeEfetivar = computed(() => {
  return confirmado.value && motivo.value.trim().length >= 5
})

function efetivar() {
  if (!podeEfetivar.value) return
  emit('confirm', {
    motivo: motivo.value.trim(),
    confirmarPropagacaoImpacto: true
  })
}
</script>
