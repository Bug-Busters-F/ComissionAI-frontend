<template>
  <div
    v-if="store.uploadModal.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0e0f0c]/60 p-4 backdrop-blur-sm transition-opacity"
    @click.self="store.closeUploadModal"
  >
    <div
      class="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#dfe4dd] bg-white p-5 shadow-2xl transition-all sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      <!-- HEADER DO MODAL -->
      <div class="flex items-start justify-between gap-4 border-b border-[#edf0eb] pb-5">
        <div>
          <span class="rounded-md bg-[#eef1ec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#646862]">
            Carga de Dados • Sprint 1
          </span>
          <h2 class="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#0e0f0c]">
            {{ store.uploadModal.report ? 'Resultado da Validação' : 'Importação de Base XLSX' }}
          </h2>
          <p class="mt-1 text-xs text-[#646862]">
            {{
              store.uploadModal.report
                ? 'Confira o diagnóstico estrutural e regras de negócio antes de efetivar os dados.'
                : 'Envie as planilhas de RH, Vendas ou Comissões respeitando o contrato de vigência/competência.'
            }}
          </p>
        </div>

        <button
          type="button"
          @click="store.closeUploadModal"
          class="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#646862] hover:bg-[#eef1ec] hover:text-[#0e0f0c]"
          aria-label="Fechar modal"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- CORPO 1: RELATÓRIO DE VALIDAÇÃO (SE JÁ HOUVER RESPOSTA) -->
      <div v-if="store.uploadModal.report" class="mt-6">
        <ValidationReport
          :report="store.uploadModal.report"
          @reenviar="store.resetReportParaReenvio"
          @concluir="store.concluirCarga"
        />
      </div>

      <!-- CORPO 2: FORMULÁRIO DE SELEÇÃO E ENVIO -->
      <div v-else class="mt-6 space-y-6">
        <!-- SELEÇÃO DO TIPO DE BASE (RH, VENDAS, COMISS) -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#646862]">
            1. Selecione o Tipo de Base
          </label>
          <div class="mt-3 grid grid-cols-3 gap-3">
            <button
              v-for="(info, key) in tiposBase"
              :key="key"
              type="button"
              @click="store.setTipoBase(key)"
              :class="[
                'focus-ring flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition',
                store.uploadModal.tipoBase === key
                  ? 'border-[#0e0f0c] bg-[#f1f4ef] font-bold text-[#0e0f0c] shadow-sm'
                  : 'border-[#dfe4dd] bg-white text-[#646862] hover:border-[#b0b8ac]'
              ]"
            >
              <span class="text-sm font-extrabold">{{ key }}</span>
              <span class="mt-0.5 text-[11px] leading-tight">{{ info.nome }}</span>
            </button>
          </div>
          <p class="mt-2 text-xs text-[#646862]">
            {{ store.tipoAtualConfig.descricao }}
          </p>
        </div>

        <!-- CONTEXTO CONTRATUAL: COMPETÊNCIA OU VIGÊNCIA -->
        <div class="rounded-xl border border-[#dfe4dd] bg-[#fbfcfb] p-4">
          <!-- CASO RH OU VENDAS: EXIGE COMPETÊNCIA -->
          <div v-if="store.tipoAtualConfig.precisaCompetencia">
            <label for="competenciaInput" class="block text-xs font-bold uppercase tracking-wider text-[#0e0f0c]">
              2. Competência dos dados (Mês/Ano)
            </label>
            <div class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <input
                id="competenciaInput"
                type="text"
                v-model="store.uploadModal.competencia"
                placeholder="Ex: 12/2025"
                class="focus-ring w-full sm:max-w-xs rounded-xl border border-[#dfe4dd] bg-white px-4 py-2.5 text-sm font-semibold outline-none"
              />
              <span class="text-xs text-[#646862]">Formato MM/AAAA (utilizado como data de referência no banco)</span>
            </div>
          </div>

          <!-- CASO COMISS: EXIGE VIGÊNCIA COM INÍCIO E FIM MANDATÓRIOS -->
          <div v-else>
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold uppercase tracking-wider text-[#0e0f0c]">
                2. Período de Vigência das Taxas
              </label>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#b86700]">Data fim obrigatória</span>
            </div>
            <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span class="block text-xs font-medium text-[#646862]">Início da vigência:</span>
                <input
                  type="date"
                  v-model="store.uploadModal.dataInicio"
                  class="focus-ring mt-1 w-full rounded-xl border border-[#dfe4dd] bg-white px-3 py-2.5 text-sm font-semibold outline-none"
                />
              </div>
              <div>
                <span class="block text-xs font-medium text-[#646862]">Término da vigência (Obrigatório):</span>
                <input
                  type="date"
                  v-model="store.uploadModal.dataFim"
                  class="focus-ring mt-1 w-full rounded-xl border border-[#dfe4dd] bg-white px-3 py-2.5 text-sm font-semibold outline-none"
                />
              </div>
            </div>
            <p class="mt-2 text-xs text-[#646862]">
              Taxas com vigência indeterminada não são permitidas, evitando inconsistências em simulações e cálculos.
            </p>
          </div>
        </div>

        <!-- DROPZONE / UPLOAD DE ARQUIVO XLSX -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#646862]">
            3. Selecione a Planilha (.xlsx)
          </label>

          <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
            :class="[
              'mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition',
              isDragging ? 'border-[#9fe870] bg-[#eef8e6]' : 'border-[#d0d7cd] bg-white hover:border-[#9fe870]'
            ]"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx, .xls"
              class="hidden"
              @change="onFileSelected"
            />

            <!-- Se um arquivo foi selecionado -->
            <div v-if="store.uploadModal.file" class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left w-full max-w-full">
              <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef1ec] text-[#0e0f0c]">
                <FileSpreadsheet class="h-6 w-6 text-[#2ead4b]" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="break-all text-sm font-extrabold text-[#0e0f0c]">{{ store.uploadModal.file.name }}</p>
                <p class="mt-0.5 text-xs text-[#646862]">{{ formatFileSize(store.uploadModal.file.size) }} • XLSX</p>
              </div>
              <button
                type="button"
                @click="store.setFile(null)"
                class="focus-ring rounded-lg p-2 text-[#646862] hover:bg-[#fce8e8] hover:text-[#d03238]"
                title="Remover arquivo"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <!-- Se ainda não tem arquivo -->
            <div v-else class="cursor-pointer" @click="triggerFileInput">
              <UploadCloud class="mx-auto h-10 w-10 text-[#646862]" />
              <p class="mt-2 text-sm font-extrabold text-[#0e0f0c]">
                Arraste seu arquivo XLSX aqui ou <span class="underline underline-offset-4">procure no computador</span>
              </p>
              <p class="mt-1 text-xs text-[#868685]">Formatos suportados: .xlsx, .xls</p>
            </div>
          </div>
        </div>

        <!-- MENSAGEM DE ERRO DO FORMULÁRIO (SE HOUVER) -->
        <div v-if="store.uploadModal.errorMessage" class="rounded-xl border border-[#d03238] bg-[#fce8e8] p-3 text-xs font-semibold text-[#a7000d]">
          {{ store.uploadModal.errorMessage }}
        </div>

        <!-- SELETOR DE MODO / SIMULAÇÃO (FACILITADOR PARA TESTES DA BANCA / DEV) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-[#f1f4ef] px-4 py-2.5 text-xs text-[#646862]">
          <span class="font-medium shrink-0">Modo de processamento:</span>
          <select
            v-model="store.uploadModal.cenarioTeste"
            class="w-full sm:w-auto rounded-lg border border-[#d7dcd5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0e0f0c] outline-none"
          >
            <option value="real">Conexão Real com Spring Boot</option>
            <option value="cenario_impeditivo">Simular: Erro Impeditivo (Rejeição Total)</option>
            <option value="cenario_avisos">Simular: Avisos Não Impeditivos (Permite Concluir)</option>
            <option value="cenario_sucesso">Simular: Sucesso Total (100% Válido)</option>
          </select>
        </div>

        <!-- BOTÕES DE AÇÃO -->
        <div class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
          <button
            type="button"
            @click="store.closeUploadModal"
            class="focus-ring w-full sm:w-auto rounded-full border border-[#d7dcd5] bg-white px-5 py-3 text-sm font-semibold text-[#0e0f0c] transition hover:bg-[#f1f4ef]"
          >
            Cancelar
          </button>

          <button
            type="button"
            :disabled="store.uploadModal.isLoading || !store.uploadModal.file"
            @click="store.enviarPlanilha"
            class="focus-ring flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#9fe870] px-7 py-3 text-sm font-bold text-[#0e0f0c] transition hover:bg-[#8fe25f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span v-if="store.uploadModal.isLoading" class="flex items-center gap-2">
              <RefreshCw class="h-4 w-4 animate-spin" />
              Validando estrutura...
            </span>
            <span v-else class="flex items-center gap-2">
              Validar e enviar base
              <ArrowRight class="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { X, UploadCloud, FileSpreadsheet, Trash2, ArrowRight, RefreshCw } from 'lucide-vue-next'
import { useDataStore } from '@/stores/dataStore'
import { TIPOS_BASE } from '@/services/dataService'
import ValidationReport from './ValidationReport.vue'

const store = useDataStore()
const tiposBase = TIPOS_BASE

const fileInputRef = ref(null)
const isDragging = ref(false)

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelected(e) {
  const files = e.target.files
  if (files && files.length > 0) {
    store.setFile(files[0])
  }
}

function onDrop(e) {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files && files.length > 0) {
    store.setFile(files[0])
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}
</script>
