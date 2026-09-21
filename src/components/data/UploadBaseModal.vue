<template>
  <div
    v-if="store.uploadModal.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0e0f0c]/60 p-4 backdrop-blur-sm transition-opacity"
    @click.self="store.closeUploadModal"
  >
    <div
      class="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#dfe4dd] bg-white p-5 shadow-2xl transition-all sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      <!-- HEADER DO MODAL -->
      <div class="flex items-start justify-between gap-4 border-b border-[#edf0eb] pb-5">
        <div>
          <span class="rounded-md bg-[#eef1ec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#646862]">
            Carga de Dados
          </span>
          <h2 class="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#0e0f0c]">
            <template v-if="store.uploadModal.report">
              Resultado da Validação
            </template>
            <template v-else-if="store.uploadModal.modo === 'CICLO'">
              Fechamento de Ciclo (RH + Vendas)
            </template>
            <template v-else>
              Importação de Taxas (COMISS)
            </template>
          </h2>
          <p class="mt-1 text-xs text-[#646862]">
            <template v-if="store.uploadModal.report">
              Confira o diagnóstico estrutural e regras de consistência relacional antes de efetivar os dados.
            </template>
            <template v-else-if="store.uploadModal.modo === 'CICLO'">
              Envie as bases de RH e Vendas conjuntamente para validar a consistência relacional e permitir o cálculo de comissões.
            </template>
            <template v-else>
              Envie a planilha de taxas e comissões respeitando o contrato mandatório de vigência com data de término.
            </template>
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
        <!-- SELEÇÃO DA MODALIDADE (CICLO VS COMISSÕES) -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#646862]">
            1. Modalidade de Carga
          </label>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              @click="store.setModo('CICLO')"
              :class="[
                'focus-ring flex items-start gap-3 rounded-xl border p-4 text-left transition',
                store.uploadModal.modo === 'CICLO'
                  ? 'border-[#0e0f0c] bg-[#f1f4ef] shadow-sm'
                  : 'border-[#dfe4dd] bg-white hover:border-[#b0b8ac]'
              ]"
            >
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white border border-[#d7dcd5]">
                <Layers class="h-5 w-5 text-[#0e0f0c]" />
              </div>
              <div>
                <p class="text-sm font-extrabold text-[#0e0f0c]">Ciclo Mensal (RH + Vendas)</p>
                <p class="mt-0.5 text-xs text-[#646862]">Envio conjunto mandatório para a competência mensal.</p>
              </div>
            </button>

            <button
              type="button"
              @click="store.setModo('COMISS')"
              :class="[
                'focus-ring flex items-start gap-3 rounded-xl border p-4 text-left transition',
                store.uploadModal.modo === 'COMISS'
                  ? 'border-[#0e0f0c] bg-[#f1f4ef] shadow-sm'
                  : 'border-[#dfe4dd] bg-white hover:border-[#b0b8ac]'
              ]"
            >
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white border border-[#d7dcd5]">
                <Percent class="h-5 w-5 text-[#0e0f0c]" />
              </div>
              <div>
                <p class="text-sm font-extrabold text-[#0e0f0c]">Taxas de Comissões</p>
                <p class="mt-0.5 text-xs text-[#646862]">Tabelas percentuais com período de vigência definido.</p>
              </div>
            </button>
          </div>
        </div>

        <!-- MODO CICLO MENSAL (RH + VENDAS JUNTOS) -->
        <template v-if="store.uploadModal.modo === 'CICLO'">
          <!-- COMPETÊNCIA -->
          <div class="rounded-xl border border-[#dfe4dd] bg-[#fbfcfb] p-4">
            <label for="competenciaInput" class="block text-xs font-bold uppercase tracking-wider text-[#0e0f0c]">
              2. Competência do Ciclo (Mês/Ano)
            </label>
            <div class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <input
                id="competenciaInput"
                type="text"
                v-model="store.uploadModal.competencia"
                placeholder="Ex: 12/2025"
                class="focus-ring w-full sm:max-w-xs rounded-xl border border-[#dfe4dd] bg-white px-4 py-2.5 text-sm font-semibold outline-none"
              />
              <span class="text-xs text-[#646862]">Formato MM/AAAA. Utilizado para cruzamento relacional e integridade.</span>
            </div>
          </div>

          <!-- DROPZONES CONJUNTOS DE RH E VENDAS -->
          <div>
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold uppercase tracking-wider text-[#646862]">
                3. Anexe as duas planilhas (.xlsx) do ciclo
              </label>
              <span class="text-[11px] font-bold text-[#b86700]">Envio conjunto obrigatório</span>
            </div>

            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- SLOT 1: BASE DE RH -->
              <div
                @dragover.prevent="isDraggingRh = true"
                @dragleave.prevent="isDraggingRh = false"
                @drop.prevent="onDropRh"
                :class="[
                  'flex flex-col justify-between rounded-2xl border-2 border-dashed p-5 text-center transition min-h-[190px]',
                  store.uploadModal.rhFile
                    ? 'border-[#2ead4b] bg-[#eef8e6]/40'
                    : isDraggingRh
                    ? 'border-[#9fe870] bg-[#eef8e6]'
                    : 'border-[#d0d7cd] bg-white hover:border-[#9fe870]'
                ]"
              >
                <input
                  ref="rhInputRef"
                  type="file"
                  accept=".xlsx, .xls"
                  class="hidden"
                  @change="onRhFileSelected"
                />

                <!-- Se arquivo de RH foi anexado -->
                <div v-if="store.uploadModal.rhFile" class="flex flex-col items-center justify-center flex-1 py-2">
                  <div class="grid h-12 w-12 place-items-center rounded-xl bg-[#eef8e6] text-[#2ead4b]">
                    <CheckCircle2 class="h-6 w-6" />
                  </div>
                  <p class="mt-2 text-xs font-bold uppercase tracking-wider text-[#2ead4b]">Base de RH Anexada</p>
                  <p class="mt-1 break-all text-xs font-extrabold text-[#0e0f0c] max-w-[220px]">
                    {{ store.uploadModal.rhFile.name }}
                  </p>
                  <p class="text-[11px] text-[#646862]">{{ formatFileSize(store.uploadModal.rhFile.size) }}</p>
                  <button
                    type="button"
                    @click="store.setRhFile(null)"
                    class="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#d03238] hover:bg-[#fce8e8]"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    <span>Substituir</span>
                  </button>
                </div>

                <!-- Se pendente RH -->
                <div v-else class="cursor-pointer flex flex-col items-center justify-center flex-1 py-3" @click="triggerRhInput">
                  <div class="grid h-11 w-11 place-items-center rounded-xl bg-[#f1f4ef] text-[#0e0f0c]">
                    <Users class="h-5 w-5" />
                  </div>
                  <p class="mt-2.5 text-xs font-extrabold text-[#0e0f0c]">1. Base de Recursos Humanos</p>
                  <p class="mt-0.5 text-[11px] text-[#646862]">Colaboradores, cargos e filiais</p>
                  <span class="mt-3 inline-block rounded-full bg-[#0e0f0c] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#282a27]">
                    Anexar RH (.xlsx)
                  </span>
                </div>
              </div>

              <!-- SLOT 2: BASE DE VENDAS -->
              <div
                @dragover.prevent="isDraggingVendas = true"
                @dragleave.prevent="isDraggingVendas = false"
                @drop.prevent="onDropVendas"
                :class="[
                  'flex flex-col justify-between rounded-2xl border-2 border-dashed p-5 text-center transition min-h-[190px]',
                  store.uploadModal.vendasFile
                    ? 'border-[#2ead4b] bg-[#eef8e6]/40'
                    : isDraggingVendas
                    ? 'border-[#9fe870] bg-[#eef8e6]'
                    : 'border-[#d0d7cd] bg-white hover:border-[#9fe870]'
                ]"
              >
                <input
                  ref="vendasInputRef"
                  type="file"
                  accept=".xlsx, .xls"
                  class="hidden"
                  @change="onVendasFileSelected"
                />

                <!-- Se arquivo de Vendas foi anexado -->
                <div v-if="store.uploadModal.vendasFile" class="flex flex-col items-center justify-center flex-1 py-2">
                  <div class="grid h-12 w-12 place-items-center rounded-xl bg-[#eef8e6] text-[#2ead4b]">
                    <CheckCircle2 class="h-6 w-6" />
                  </div>
                  <p class="mt-2 text-xs font-bold uppercase tracking-wider text-[#2ead4b]">Base de Vendas Anexada</p>
                  <p class="mt-1 break-all text-xs font-extrabold text-[#0e0f0c] max-w-[220px]">
                    {{ store.uploadModal.vendasFile.name }}
                  </p>
                  <p class="text-[11px] text-[#646862]">{{ formatFileSize(store.uploadModal.vendasFile.size) }}</p>
                  <button
                    type="button"
                    @click="store.setVendasFile(null)"
                    class="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#d03238] hover:bg-[#fce8e8]"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    <span>Substituir</span>
                  </button>
                </div>

                <!-- Se pendente Vendas -->
                <div v-else class="cursor-pointer flex flex-col items-center justify-center flex-1 py-3" @click="triggerVendasInput">
                  <div class="grid h-11 w-11 place-items-center rounded-xl bg-[#f1f4ef] text-[#0e0f0c]">
                    <TrendingUp class="h-5 w-5" />
                  </div>
                  <p class="mt-2.5 text-xs font-extrabold text-[#0e0f0c]">2. Base de Vendas</p>
                  <p class="mt-0.5 text-[11px] text-[#646862]">Transações e faturamento por vendedor</p>
                  <span class="mt-3 inline-block rounded-full bg-[#0e0f0c] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#282a27]">
                    Anexar Vendas (.xlsx)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- MODO COMISSÕES (VIGÊNCIA) -->
        <template v-else>
          <!-- VIGÊNCIA MANDATÓRIA COM DATA FIM -->
          <div class="rounded-xl border border-[#dfe4dd] bg-[#fbfcfb] p-4">
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
              Taxas sem vigência determinada geram inconsistências operacionais e sobreposição de regras.
            </p>
          </div>

          <!-- DROPZONE DE COMISSÕES -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[#646862]">
              3. Selecione a Planilha de Taxas (.xlsx)
            </label>
            <div
              @dragover.prevent="isDraggingComiss = true"
              @dragleave.prevent="isDraggingComiss = false"
              @drop.prevent="onDropComiss"
              :class="[
                'mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition',
                isDraggingComiss ? 'border-[#9fe870] bg-[#eef8e6]' : 'border-[#d0d7cd] bg-white hover:border-[#9fe870]'
              ]"
            >
              <input
                ref="comissInputRef"
                type="file"
                accept=".xlsx, .xls"
                class="hidden"
                @change="onComissFileSelected"
              />

              <div v-if="store.uploadModal.comissFile" class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left w-full max-w-full">
                <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef1ec] text-[#0e0f0c]">
                  <FileSpreadsheet class="h-6 w-6 text-[#2ead4b]" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="break-all text-sm font-extrabold text-[#0e0f0c]">{{ store.uploadModal.comissFile.name }}</p>
                  <p class="mt-0.5 text-xs text-[#646862]">{{ formatFileSize(store.uploadModal.comissFile.size) }} • XLSX</p>
                </div>
                <button
                  type="button"
                  @click="store.setComissFile(null)"
                  class="focus-ring rounded-lg p-2 text-[#646862] hover:bg-[#fce8e8] hover:text-[#d03238]"
                  title="Remover arquivo"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <div v-else class="cursor-pointer" @click="triggerComissInput">
                <UploadCloud class="mx-auto h-10 w-10 text-[#646862]" />
                <p class="mt-2 text-sm font-extrabold text-[#0e0f0c]">
                  Arraste seu arquivo XLSX aqui ou <span class="underline underline-offset-4">procure no computador</span>
                </p>
                <p class="mt-1 text-xs text-[#868685]">Formatos suportados: .xlsx, .xls</p>
              </div>
            </div>
          </div>
        </template>

        <!-- MENSAGEM DE ERRO DO FORMULÁRIO (SE HOUVER) -->
        <div v-if="store.uploadModal.errorMessage" class="rounded-xl border border-[#d03238] bg-[#fce8e8] p-3.5 text-xs font-semibold text-[#a7000d]">
          {{ store.uploadModal.errorMessage }}
        </div>

        <!-- SELETOR DE MODO / SIMULAÇÃO (FACILITADOR PARA BANCA / TESTES DE DEV) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-[#f1f4ef] px-4 py-2.5 text-xs text-[#646862]">
          <span class="font-medium shrink-0">Simulação / Conexão Backend:</span>
          <select
            v-model="store.uploadModal.cenarioTeste"
            class="w-full sm:w-auto rounded-lg border border-[#d7dcd5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0e0f0c] outline-none"
          >
            <option value="real">Conexão Real com Spring Boot (8080)</option>
            <template v-if="store.uploadModal.modo === 'CICLO'">
              <option value="cenario_cruzamento">Simular: Erro de Cruzamento (Vendedor sem cadastro no RH)</option>
              <option value="cenario_impeditivo">Simular: Erro Impeditivo (Duplicidade no RH / Venda negativa)</option>
              <option value="cenario_avisos">Simular: Avisos Não Impeditivos (Permite Concluir)</option>
              <option value="cenario_sucesso">Simular: Sucesso Total (Ciclo Fechado 100%)</option>
            </template>
            <template v-else>
              <option value="cenario_impeditivo">Simular: Erro Impeditivo de Vigência</option>
              <option value="cenario_avisos">Simular: Avisos Não Impeditivos</option>
              <option value="cenario_sucesso">Simular: Sucesso Total</option>
            </template>
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
            :disabled="store.uploadModal.isLoading || !store.podeEnviar"
            @click="store.enviarDados"
            class="focus-ring flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#9fe870] px-7 py-3 text-sm font-bold text-[#0e0f0c] transition hover:bg-[#8fe25f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span v-if="store.uploadModal.isLoading" class="flex items-center gap-2">
              <RefreshCw class="h-4 w-4 animate-spin" />
              Validando integridade...
            </span>
            <span v-else class="flex items-center gap-2">
              <span v-if="store.uploadModal.modo === 'CICLO'">Validar e fechar ciclo</span>
              <span v-else>Validar e gravar taxas</span>
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
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  ArrowRight,
  RefreshCw,
  Layers,
  Percent,
  Users,
  TrendingUp,
  CheckCircle2
} from 'lucide-vue-next'
import { useDataStore } from '@/stores/dataStore'
import ValidationReport from './ValidationReport.vue'

const store = useDataStore()

const rhInputRef = ref(null)
const vendasInputRef = ref(null)
const comissInputRef = ref(null)

const isDraggingRh = ref(false)
const isDraggingVendas = ref(false)
const isDraggingComiss = ref(false)

function triggerRhInput() {
  rhInputRef.value?.click()
}

function triggerVendasInput() {
  vendasInputRef.value?.click()
}

function triggerComissInput() {
  comissInputRef.value?.click()
}

function onRhFileSelected(e) {
  const files = e.target.files
  if (files && files.length > 0) {
    store.setRhFile(files[0])
  }
}

function onVendasFileSelected(e) {
  const files = e.target.files
  if (files && files.length > 0) {
    store.setVendasFile(files[0])
  }
}

function onComissFileSelected(e) {
  const files = e.target.files
  if (files && files.length > 0) {
    store.setComissFile(files[0])
  }
}

function onDropRh(e) {
  isDraggingRh.value = false
  const files = e.dataTransfer.files
  if (files && files.length > 0) {
    store.setRhFile(files[0])
  }
}

function onDropVendas(e) {
  isDraggingVendas.value = false
  const files = e.dataTransfer.files
  if (files && files.length > 0) {
    store.setVendasFile(files[0])
  }
}

function onDropComiss(e) {
  isDraggingComiss.value = false
  const files = e.dataTransfer.files
  if (files && files.length > 0) {
    store.setComissFile(files[0])
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}
</script>
