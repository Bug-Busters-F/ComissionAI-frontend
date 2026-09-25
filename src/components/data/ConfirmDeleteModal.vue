<template>
  <div
    v-if="store.modalExclusao.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
    >
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div
            class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-danger-bg text-danger"
          >
            <AlertTriangle class="h-6 w-6" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-extrabold tracking-[-0.03em] text-brand-dark">
              {{ store.modalExclusao.titulo || 'Confirmar Exclusão' }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-sage-muted">
              {{ store.modalExclusao.mensagem }}
            </p>
            <div
              v-if="store.modalExclusao.detalhes"
              class="mt-3 rounded-xl bg-sage-light p-3 text-xs font-semibold text-brand-dark"
            >
              {{ store.modalExclusao.detalhes }}
            </div>
            <p class="mt-3 text-[11px] font-semibold text-danger">
              Esta ação removerá o registro do sistema e não poderá ser desfeita.
            </p>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-sage-border-light">
          <button
            type="button"
            @click="store.fecharModalExclusao"
            :disabled="store.modalExclusao.loading"
            class="focus-ring rounded-xl border border-sage-border px-4 py-2.5 text-xs font-bold text-sage-muted hover:bg-sage-light hover:text-brand-dark transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="store.confirmarExclusao"
            :disabled="store.modalExclusao.loading"
            class="focus-ring flex items-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-xs font-bold text-white hover:bg-danger-dark transition disabled:opacity-50"
          >
            <Loader2 v-if="store.modalExclusao.loading" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ store.modalExclusao.loading ? 'Excluindo...' : 'Confirmar exclusão' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { AlertTriangle, Loader2 } from 'lucide-vue-next'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()
</script>
