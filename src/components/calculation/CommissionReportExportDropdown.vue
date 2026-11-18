<template>
  <div class="relative inline-block text-left" ref="dropdownRoot">
    <button
      type="button"
      class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border bg-white px-4 py-2.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="isDisabled"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="toggleDropdown"
    >
      <span v-if="isExportingState" class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-dark border-t-transparent" />
      <Download v-else class="h-4 w-4 text-brand-dark" aria-hidden="true" />
      <span>{{ isExportingState ? 'Exportando…' : 'Exportar Relatório (.csv)' }}</span>
      <ChevronDown class="h-3.5 w-3.5 opacity-70 transition-transform" :class="{ 'rotate-180': isOpen }" aria-hidden="true" />
    </button>

    <!-- Menu Dropdown -->
    <div
      v-if="isOpen"
      class="absolute right-0 z-30 mt-2 w-64 origin-top-right rounded-2xl border border-sage-border bg-white p-2 shadow-xl focus:outline-none"
      role="menu"
      aria-orientation="vertical"
    >
      <div class="px-3 py-2 border-b border-sage-border-light mb-1">
        <p class="text-[10px] font-bold uppercase tracking-wider text-sage-muted">Tipos de Consolidação Oficial</p>
        <p class="text-[11px] text-sage-subtle">Exportação delimitada por ponto e vírgula (;)</p>
      </div>

      <button
        v-for="opt in exportOptions"
        :key="opt.tipo"
        type="button"
        class="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-brand-dark transition hover:bg-sage-light"
        role="menuitem"
        @click="triggerExport(opt.tipo)"
      >
        <FileSpreadsheet class="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
        <span>{{ opt.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Download, ChevronDown, FileSpreadsheet } from 'lucide-vue-next'
import { commissionReportApi, EXPORT_REPORT_TYPES } from '@/services/commissionReportApi'

const props = defineProps({
  competencia: {
    type: String,
    default: ''
  },
  isClosed: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['export', 'export-success', 'export-error'])

const isOpen = ref(false)
const isInternalExporting = ref(false)
const dropdownRoot = ref(null)

const isExportingState = computed(() => props.loading || isInternalExporting.value)
const isDisabled = computed(() => props.disabled || !props.isClosed || isExportingState.value)

const exportOptions = [
  { tipo: EXPORT_REPORT_TYPES.CONSOLIDADO_COLABORADOR, label: 'Consolidado por Colaborador' },
  { tipo: EXPORT_REPORT_TYPES.CONSOLIDADO_EQUIPE, label: 'Consolidado por Equipe / Loja' },
  { tipo: EXPORT_REPORT_TYPES.CONSOLIDADO_CANAL, label: 'Consolidado por Canal' },
  { tipo: EXPORT_REPORT_TYPES.DETALHADO, label: 'Extrato Detalhado de Vendas' },
  { tipo: EXPORT_REPORT_TYPES.COMPLETO, label: 'Relatório Completo Auditado' }
]

function toggleDropdown() {
  if (isDisabled.value) return
  isOpen.value = !isOpen.value
}

async function triggerExport(tipo) {
  isOpen.value = false
  emit('export', tipo)

  if (props.competencia) {
    isInternalExporting.value = true
    try {
      const result = await commissionReportApi.exportReportCsv(props.competencia, tipo, ';')
      emit('export-success', result)
    } catch (error) {
      emit('export-error', error?.message || 'Falha ao exportar relatório CSV.')
    } finally {
      isInternalExporting.value = false
    }
  }
}

function handleClickOutside(event) {
  if (dropdownRoot.value && !dropdownRoot.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>
