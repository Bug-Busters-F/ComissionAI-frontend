<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-dark/60 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="conflict-modal-title"
  >
    <div
      class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-sage-border bg-white p-6 shadow-2xl transition-all sm:p-8 flex flex-col justify-between"
    >
      <!-- HEADER -->
      <div>
        <div class="flex items-start justify-between gap-4 border-b border-sage-border-light pb-4">
          <div class="flex items-center gap-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-warning-bg text-warning-dark border border-warning-border">
              <AlertTriangle class="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span class="rounded-md bg-warning-light px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-warning-dark">
                Higienização de Dados • Conflito de Taxas
              </span>
              <h3 id="conflict-modal-title" class="mt-1 text-xl font-extrabold tracking-[-0.03em] text-brand-dark">
                Resolução de Duplicidades na Planilha
              </h3>
            </div>
          </div>
          <button
            type="button"
            class="focus-ring grid h-8 w-8 place-items-center rounded-full text-sage-muted hover:bg-sage-pill hover:text-brand-dark"
            aria-label="Cancelar"
            @click="$emit('cancel')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <p class="mt-3 text-xs leading-5 text-sage-muted">
          A planilha possui linhas com os mesmos códigos de <strong>Marca</strong> e <strong>Cargo</strong>, porém com <strong>taxas divergentes</strong>.
          Selecione qual taxa deve prevalecer para garantir a integridade do cálculo.
        </p>

        <!-- AVISO DE DUPLICATAS IDÊNTICAS RESOLVIDAS AUTOMATICAMENTE -->
        <div
          v-if="identicalCount > 0"
          class="mt-3 flex items-center gap-2 rounded-xl bg-success-surface/60 px-3.5 py-2 text-xs font-semibold text-success-dark border border-success/20"
        >
          <CheckCircle2 class="h-4 w-4 shrink-0 text-success" />
          <span>{{ identicalCount }} linha(s) com dados 100% idênticos foram deduplicadas automaticamente.</span>
        </div>

        <!-- LISTA DE CONFLITOS -->
        <div class="mt-5 space-y-4 max-h-[48vh] overflow-y-auto pr-1">
          <div
            v-for="conflict in conflicts"
            :key="conflict.id"
            class="rounded-2xl border border-sage-border-light bg-sage-light/40 p-4 transition hover:border-sage-border"
          >
            <div class="flex items-center justify-between gap-2 border-b border-sage-border-light pb-2">
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-brand-dark shadow-sm">
                  Marca {{ conflict.brandDesc || conflict.brandCode }}
                </span>
                <span class="text-xs font-bold text-sage-muted">
                  Código Cargo: {{ conflict.posCode }}
                </span>
              </div>
              <span class="text-[11px] font-semibold text-warning-dark">
                Conflito entre {{ conflict.options.length }} taxas
              </span>
            </div>

            <!-- OPÇÕES DE TAXA -->
            <div class="mt-3 grid gap-2.5 sm:grid-cols-2">
              <button
                v-for="(opt, optIdx) in conflict.options"
                :key="opt.id"
                type="button"
                class="focus-ring flex flex-col justify-between rounded-xl border p-3 text-left transition"
                :class="[
                  selectedResolutions[conflict.id] === optIdx
                    ? 'border-brand bg-white shadow-sm ring-2 ring-brand/40'
                    : 'border-sage-border-light bg-white/70 hover:bg-white hover:border-sage-border'
                ]"
                @click="selectOption(conflict.id, optIdx)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-brand-dark">
                      {{ opt.description }}
                    </p>
                    <p class="text-[10px] text-sage-muted">Linha {{ opt.line }} da planilha</p>
                  </div>
                  <span
                    class="h-4 w-4 shrink-0 rounded-full border flex items-center justify-center transition"
                    :class="[
                      selectedResolutions[conflict.id] === optIdx
                        ? 'border-brand-dark bg-brand text-brand-dark'
                        : 'border-sage-border bg-white'
                    ]"
                  >
                    <Check v-if="selectedResolutions[conflict.id] === optIdx" class="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                </div>

                <div class="mt-2 flex items-baseline justify-between border-t border-sage-border-light pt-1.5">
                  <span class="text-[11px] text-sage-muted">Taxa contratual:</span>
                  <span class="text-sm font-black text-brand-dark">{{ opt.rateFormatted }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER / BOTÕES DE DECISÃO -->
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-sage-border-light pt-4">
        <button
          type="button"
          class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
          @click="$emit('cancel')"
        >
          Cancelar envio
        </button>

        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-xs font-black text-brand-dark shadow-sm transition hover:bg-brand-hover hover:scale-[1.02] active:scale-[0.98]"
          @click="confirm"
        >
          <span>Higienizar Planilha e Continuar Envio →</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { AlertTriangle, Check, CheckCircle2, X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  conflicts: { type: Array, default: () => [] },
  identicalCount: { type: Number, default: 0 }
})

const emit = defineEmits(['cancel', 'resolve'])

const selectedResolutions = ref({})

// Inicializa as opções pré-selecionadas (padrão: primeira opção de cada conflito)
watch(
  () => props.conflicts,
  (newConflicts) => {
    const initial = {}
    ;(newConflicts || []).forEach((c) => {
      initial[c.id] = c.selectedOptionIndex ?? 0
    })
    selectedResolutions.value = initial
  },
  { immediate: true }
)

function selectOption(conflictId, optionIndex) {
  selectedResolutions.value = {
    ...selectedResolutions.value,
    [conflictId]: optionIndex
  }
}

function confirm() {
  emit('resolve', selectedResolutions.value)
}
</script>
