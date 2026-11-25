<template>
  <section
    :class="compact ? 'mt-5 space-y-4' : 'rounded-[24px] border border-sage-border-light bg-white p-6 shadow-sm sm:p-7 space-y-6'"
    :aria-label="compact ? 'Bases da competência' : undefined" :aria-labelledby="compact ? undefined : 'campaign-bases-heading'"
  >
    <p v-if="pageError" role="alert" class="rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">{{ pageError }} <button v-if="compact" type="button" class="rounded font-bold underline" :disabled="actionBusy || basesLoading" @click="carregarAnexos">Atualizar arquivos</button></p>
    <div v-if="!compact" class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="campaign-bases-heading" class="text-lg font-extrabold text-brand-dark">Bases da campanha</h2>
      <p v-if="!autoSelectCompetence" class="text-xs text-sage-muted">Competência: <strong>{{ selectedCompetenciaFormatada }}</strong></p>
      <label v-else for="bases-competence-select" class="flex items-center gap-2 text-xs font-bold text-sage-muted">Competência
        <select id="bases-competence-select" :value="selectedCompetencia" class="focus-ring rounded-xl border border-sage-border bg-white px-3 py-2 text-brand-dark" @change="onCompetenceChange($event.target.value)">
          <option value="">Selecione</option>
          <option v-for="c in competenceOptions" :key="c.competencia" :value="c.competencia">{{ c.competencia }}</option>
        </select>
      </label>
    </div>
    <p v-if="basesLoading" role="status" class="text-xs text-sage-muted">Consultando arquivos cadastrados…</p>
    <div v-if="compact && !basesLoading" class="space-y-3">
      <p class="text-xs text-sage-muted">Confira as três bases da competência antes de apurar.</p>
      <div v-for="group in baseGroups" :key="group.type" class="rounded-xl border border-sage-border bg-sage-light/30 p-3">
        <div class="flex items-center justify-between gap-2"><p class="text-sm font-bold text-brand-dark">{{ group.label }}</p><span v-if="group.attached.length" class="text-xs font-semibold text-success-dark">Vinculada</span></div>
        <template v-if="group.attached.length">
          <p v-for="item in group.attached" :key="item.reportId" class="mt-1 break-words text-xs text-sage-muted">{{ item.nomeArquivoOriginal || item.nomeArquivo || 'Arquivo cadastrado' }}</p>
        </template>
        <label v-else-if="group.available.length" class="mt-2 block text-xs text-sage-muted">{{ group.available.length > 1 ? 'Escolha o arquivo que deseja usar' : 'Arquivo selecionado automaticamente' }}
          <select v-model="selectedReports[group.type]" class="focus-ring mt-1 w-full rounded-lg border border-sage-border bg-white px-3 py-2 text-xs text-brand-dark" :disabled="!authStore.canModifyBases || actionBusy">
            <option value="">Selecione</option>
            <option v-for="item in group.available" :key="item.reportId" :value="item.reportId">{{ item.nomeArquivoOriginal || item.nomeArquivo || 'Arquivo ' + item.reportId }}</option>
          </select>
        </label>
        <p v-else class="mt-1 text-xs text-warning-text">Nenhum arquivo cadastrado para esta competência. Cadastre a base abaixo.</p>
      </div>
      <p v-if="!authStore.canModifyBases" class="text-xs text-sage-muted">Somente gerente ou administrador pode enviar e vincular bases.</p>
      <p v-else-if="completeSelection && !pendingSelectedReports.length && !pageError" class="text-xs font-semibold text-success-dark">Os três tipos de base já estão vinculados. A apuração também verificará as pendências dos arquivos.</p>
      <button type="button" class="focus-ring rounded text-xs font-bold text-brand-dark underline" :disabled="actionBusy" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? 'Ocultar cadastro e correções' : 'Cadastrar ou corrigir bases' }}</button>
    </div>
    <details v-if="!compact" class="rounded-xl border border-sage-border-light px-4 py-3 text-sm">
      <summary class="focus-ring w-fit cursor-pointer rounded font-semibold text-brand-dark">Usar bases já cadastradas</summary>
      <p class="mt-3 text-xs text-sage-muted">{{ selectedCompetencia ? 'Vincule os arquivos desta competência sem reenviá-los.' : 'Selecione uma competência na simulação para consultar os arquivos disponíveis.' }}</p>
      <p v-if="jaAnexadoNaCampanha" class="mt-2 text-xs text-success-dark">Já existem bases vinculadas à campanha nesta competência.</p>
      <div v-if="authStore.canModifyBases" class="mt-3 flex flex-wrap gap-3">
          <button
            v-for="lote in lotesDisponiveis" :key="lote.reportId"
            type="button"
            :disabled="!authStore.canModifyBases || isAssociating"
            @click="associarBaseExistente(lote)"
            class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            title="Associa a base já cadastrada à campanha sem novo upload"
          >
            <RefreshCw v-if="isAssociating" class="h-3.5 w-3.5 animate-spin" />
            <LinkIcon v-else class="h-3.5 w-3.5" />
            <span>{{ isAssociating ? 'Associando...' : `Associar ${campaignBaseLabel(lote.tipoBase)}: ${lote.nomeArquivoOriginal || 'Lote ' + lote.reportId}` }}</span>
          </button>
        <p v-if="selectedCompetencia && !basesLoading && !pageError && !lotesDisponiveis.length" class="text-xs text-sage-muted">Nenhum arquivo disponível para vincular nesta competência.</p>
      </div>
    </details>

    <template v-if="!compact || showAdvanced">
    <!-- 3. Anexos de Base Ativos da Campanha (BACK-6) & Correção de Inconsistências (FRONT-5) -->
    <div v-if="displayedAttachments.length > 0" class="rounded-2xl border border-sage-border-light bg-sage-light/30 p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold uppercase tracking-wider text-sage-muted flex items-center gap-1.5">
          <Paperclip class="h-4 w-4 text-brand-dark" />
          Bases Anexadas a esta Campanha
        </h4>
        <span class="text-xs font-bold text-brand-dark">{{ displayedAttachments.length }} anexo(s) ativo(s)</span>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="anexo in displayedAttachments"
          :key="anexo.id || anexo.reportId"
          class="rounded-xl border border-sage-border bg-white p-3.5 shadow-sm flex flex-col justify-between gap-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-bold text-brand-dark truncate" :title="anexo.nomeArquivoOriginal">
                {{ anexo.nomeArquivoOriginal || `Lote #${anexo.reportId}` }}
              </p>
              <p class="text-[11px] text-sage-muted">
                Tipo: <strong>{{ campaignBaseLabel(anexo.tipoBase) }}</strong> · Comp: <strong>{{ anexo.competencia || 'Global' }}</strong> · {{ anexo.linhasValidas }} linhas válidas
              </p>
              <p v-if="anexo.totalInconsistencias > 0" class="text-[11px] font-bold text-warning-text mt-0.5">
                {{ anexo.totalInconsistencias }} inconsistência(s) registrada(s)
              </p>
            </div>

            <button
              v-if="authStore.canModifyBases"
              type="button"
              @click="desanexarBase(anexo.id)"
              :disabled="!authStore.canModifyBases || actionBusy"
              class="focus-ring text-sage-muted hover:text-danger p-1 rounded-lg transition"
              title="Desanexar este lote da campanha"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Ação: Abrir Correção e Preparação do Lote -->
          <div class="pt-2 border-t border-sage-border-light flex items-center justify-between">
            <button
              type="button"
              @click="abrirPreparacaoLote(anexo.reportId)"
              :disabled="!authStore.canModifyBases || actionBusy"
              class="focus-ring inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-dark hover:underline"
            >
              <RefreshCw v-if="abrindoLote === anexo.reportId" class="h-3.5 w-3.5 animate-spin text-brand" />
              <SlidersHorizontal v-else class="h-3.5 w-3.5 text-brand" />
              <span>{{ abrindoLote === anexo.reportId ? 'Abrindo preparação...' : 'Auditar e Corrigir Linhas' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Área de Correção de Bases em Preparação (FRONT-5 / BACK-5) -->
    <CampaignPreparationTable
      v-if="lotePreparacaoAtivo"
      :campanha-id="campanhaId"
      :preparacao-id="lotePreparacaoAtivo.id"
      :batch="lotePreparacaoAtivo"
      @batch-committed="onBatchCommitted"
      @batch-discarded="lotePreparacaoAtivo = null"
      @batch-updated="handleBatchUpdated"
    />

    <!-- 5. Área de Upload Conjunto de RH e Vendas com Diagnóstico por Arquivo -->
    <div class="rounded-2xl border border-sage-border-light bg-white p-5 space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-extrabold text-brand-dark flex items-center gap-2">
            <UploadCloud class="h-5 w-5 text-brand" />
            Envio Conjunto de Bases (RH + Vendas)
          </h3>

        </div>


      </div>

      <!-- Bloqueio de Acesso para Não-Gerentes / Não-Admins -->
      <div v-if="!authStore.canUploadBases" class="rounded-xl bg-warning-bg p-4 border border-warning-border">
        <div class="flex items-start gap-2.5 text-xs text-warning-text leading-5">
          <Lock class="h-4 w-4 mt-0.5 shrink-0 text-warning-dark" />
          <div>
            Somente gerente ou administrador pode enviar e vincular bases.
          </div>
        </div>
      </div>

      <!-- Formulário de Seleção de Arquivos -->
      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Input Arquivo RH -->
        <div class="rounded-xl border border-dashed border-sage-border-dark p-4 bg-sage-light/20 flex flex-col justify-between">
          <div>
            <label for="campaign-bases-rh-file" class="block text-xs font-bold uppercase tracking-wider text-sage-muted">
              1. Planilha de RH / Colaboradores (.xlsx)
            </label>
            <input
              id="campaign-bases-rh-file"
              type="file"
              accept=".xlsx,.xls"
              :disabled="!authStore.canUploadBases || isUploading"
              @change="onRhFileSelect"
              class="focus-ring rounded-full mt-2.5 block w-full text-xs text-sage-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand file:text-brand-dark hover:file:bg-brand-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <p v-if="rhFile" class="mt-2 text-xs font-semibold text-brand-dark truncate">
            Selecionado: {{ rhFile.name }} ({{ formatFileSize(rhFile.size) }})
          </p>
        </div>

        <!-- Input Arquivo Vendas -->
        <div class="rounded-xl border border-dashed border-sage-border-dark p-4 bg-sage-light/20 flex flex-col justify-between">
          <div>
            <label for="campaign-bases-sales-file" class="block text-xs font-bold uppercase tracking-wider text-sage-muted">
              2. Planilha de Vendas (.xlsx)
            </label>
            <input
              id="campaign-bases-sales-file"
              type="file"
              accept=".xlsx,.xls"
              :disabled="!authStore.canUploadBases || isUploading"
              @change="onVendasFileSelect"
              class="focus-ring rounded-full mt-2.5 block w-full text-xs text-sage-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand file:text-brand-dark hover:file:bg-brand-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <p v-if="vendasFile" class="mt-2 text-xs font-semibold text-brand-dark truncate">
            Selecionado: {{ vendasFile.name }} ({{ formatFileSize(vendasFile.size) }})
          </p>
        </div>
      </div>

      <!-- Sinalização de Competência Detectada a partir dos Arquivos -->
      <div
        v-if="competenciaDetectadaNosArquivos"
        class="rounded-xl border border-brand/30 bg-brand-light/40 p-3.5 flex items-center justify-between gap-3 text-xs text-brand-dark"
      >
        <div class="flex items-center gap-2.5">
          <Info class="h-4 w-4 text-brand-dark shrink-0" />
          <span>
            Competência identificada nas planilhas: <strong>{{ formatCompetenceLabel(competenciaDetectadaNosArquivos) }} ({{ formatCompetenceCode(competenciaDetectadaNosArquivos) }})</strong>.
            O envio será processado para este ciclo mensal.
          </span>
        </div>
        <span class="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-black uppercase text-brand-dark">
          Auto-alinhado
        </span>
      </div>

      <!-- Barra de Progresso com Etapas em Tempo Real -->
      <div v-if="isUploading" class="rounded-xl border border-brand/30 bg-brand-light/40 p-4 space-y-2">
        <div class="flex items-center justify-between text-xs font-extrabold text-brand-dark">
          <span class="flex items-center gap-2">
            <RefreshCw class="h-4 w-4 animate-spin text-brand-dark" />
            Processando Ciclo: {{ uploadStageMessage }}
          </span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-sage-border">
          <div class="h-full bg-brand transition-all duration-300" :style="{ width: `${uploadProgress}%` }" />
        </div>
      </div>

      <p v-if="authStore.canUploadBases && (rhFile || vendasFile)" role="status" class="rounded-xl border border-warning-border bg-warning-bg p-3 text-xs leading-5 text-warning-text">
        As bases de {{ formatCompetenceCode(competenciaDetectadaNosArquivos || selectedCompetencia) || 'esta competência' }} são compartilhadas. Este envio pode afetar outras campanhas.
        <span v-if="impactAnalysis.totalOutrasAfetadas">{{ impactAnalysis.totalOutrasAfetadas }} outra(s) campanha(s) utiliza(m) esta competência.</span>
      </p>
      <!-- Botão de Disparo do Envio -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          :disabled="!authStore.canUploadBases || !rhFile || !vendasFile || actionBusy"
          @click="executarUploadCiclo"
          class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-brand-dark shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw v-if="isUploading" class="h-4 w-4 animate-spin" />
          <UploadCloud v-else class="h-4 w-4" />
          <span>{{ isUploading ? 'Processando envio...' : 'Enviar Bases (RH + Vendas)' }}</span>
        </button>
      </div>

      <!-- Alerta de Falha de Associação com Botão de Recuperação (Crítico 4 do Review) -->
      <div v-if="pendenteAssociacaoLoteId.length" class="rounded-xl border border-warning-border bg-warning-bg p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="max-w-xl">
          <p class="text-xs font-bold text-warning-text">Arquivos importados. Falta associar os lotes {{ pendenteAssociacaoLoteId.join(', ') }} à campanha.</p>
          <p v-if="mensagemFalhaAssociacao" class="text-[11px] text-danger font-semibold mt-0.5">
            Motivo: {{ mensagemFalhaAssociacao }}
          </p>
          <p class="text-[11px] text-sage-muted mt-0.5">Clique para tentar associar este lote à campanha agora sem reenviar os arquivos.</p>
        </div>
        <button
          type="button"
          @click="tentarAssociarLotePendente"
          :disabled="isAssociating"
          class="focus-ring rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-dark hover:bg-brand-hover shrink-0"
        >
          {{ isAssociating ? 'Associando...' : 'Associar Lote à Campanha' }}
        </button>
      </div>

      <!-- Diagnóstico Detalhado Individual por Arquivo -->
      <div v-if="diagnosticoEnvio" class="pt-4 border-t border-sage-border-light space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-sage-muted flex items-center gap-1.5">
            <FileSpreadsheet class="h-4 w-4 text-brand-dark" />
            Diagnóstico do Processamento por Arquivo
          </h4>

          <button
            v-if="diagnosticoEnvio.reportId && authStore.canModifyBases"
            type="button"
            @click="abrirPreparacaoLote(diagnosticoEnvio.reportId)"
            class="text-xs font-bold text-brand-dark hover:underline flex items-center gap-1"
          >
            <SlidersHorizontal class="h-3.5 w-3.5 text-brand" />
            <span>Abrir preparação e corrigir inconsistências</span>
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Card Diagnóstico RH -->
          <div
            class="rounded-xl border p-4 shadow-sm"
            :class="diagnosticoEnvio.rh?.status === 'CONCLUIDO' || diagnosticoEnvio.status === 'SUCESSO' ? 'border-success/40 bg-success-surface/30' : 'border-danger/40 bg-danger-bg/40'"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-brand-dark">Arquivo RH / Matrículas</span>
              <span
                class="rounded px-2 py-0.5 text-[10px] font-black uppercase"
                :class="diagnosticoEnvio.rh?.status === 'CONCLUIDO' || diagnosticoEnvio.status === 'SUCESSO' ? 'bg-success text-white' : 'bg-danger text-white'"
              >
                {{ diagnosticoEnvio.rh?.status || (diagnosticoEnvio.status === 'SUCESSO' ? 'CONCLUÍDO' : 'FALHOU') }}
              </span>
            </div>
            <p class="mt-2 text-xs font-bold text-brand-dark truncate">{{ rhFile?.name || diagnosticoEnvio.rh?.nomeArquivo || 'Base RH' }}</p>
            <div class="mt-2 text-xs text-sage-muted space-y-1">
              <p>Linhas processadas: <strong>{{ diagnosticoEnvio.rh?.totalLinhas || diagnosticoEnvio.totalLinhas || '—' }}</strong></p>
              <p v-if="diagnosticoEnvio.rh?.linhasValidas != null">Registros válidos: <strong>{{ diagnosticoEnvio.rh.linhasValidas }}</strong></p>
            </div>
          </div>

          <!-- Card Diagnóstico Vendas -->
          <div
            class="rounded-xl border p-4 shadow-sm"
            :class="diagnosticoEnvio.status === 'SUCESSO' ? 'border-success/40 bg-success-surface/30' : 'border-danger/40 bg-danger-bg/40'"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-brand-dark">Arquivo Vendas</span>
              <span
                class="rounded px-2 py-0.5 text-[10px] font-black uppercase"
                :class="diagnosticoEnvio.status === 'SUCESSO' ? 'bg-success text-white' : 'bg-danger text-white'"
              >
                {{ diagnosticoEnvio.status === 'SUCESSO' ? 'CONCLUÍDO' : 'FALHOU' }}
              </span>
            </div>
            <p class="mt-2 text-xs font-bold text-brand-dark truncate">{{ vendasFile?.name || diagnosticoEnvio.nomeArquivo || 'Base Vendas' }}</p>
            <div class="mt-2 text-xs text-sage-muted space-y-1">
              <p>Linhas processadas: <strong>{{ diagnosticoEnvio.totalLinhas || '—' }}</strong></p>
              <p v-if="diagnosticoEnvio.linhasValidas != null">Registros válidos: <strong>{{ diagnosticoEnvio.linhasValidas }}</strong></p>
              <p v-if="diagnosticoEnvio.inconsistencias?.length" class="text-danger font-semibold">
                {{ diagnosticoEnvio.inconsistencias.length }} inconsistência(s) encontrada(s)
              </p>
            </div>
          </div>
        </div>

        <!-- Inconsistências / Avisos Estruturais -->
        <div v-if="diagnosticoEnvio.inconsistencias?.length" class="rounded-xl border border-danger/30 bg-danger-bg/50 p-4">
          <p class="text-xs font-extrabold text-danger-dark mb-2">Inconsistências Relacionais Detectadas:</p>
          <ul class="list-disc pl-4 text-xs text-danger-dark space-y-1">
            <li v-for="(inc, i) in diagnosticoEnvio.inconsistencias" :key="i">
              {{ inc.motivo || inc.mensagem || inc }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-if="compact && authStore.canUploadBases" class="space-y-3 rounded-xl border border-sage-border p-4">
      <label class="block text-sm font-bold text-brand-dark">Taxas de comissão (.xlsx)
        <input type="file" accept=".xlsx" class="focus-ring mt-2 block w-full text-xs" :disabled="actionBusy" @change="commissionFile = $event.target.files?.[0] || null" />
      </label>
      <p class="text-xs text-sage-muted">Envio para {{ selectedCompetenciaFormatada }}. As taxas desta competência são compartilhadas entre as campanhas.</p>
      <button type="button" class="focus-ring rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-dark disabled:opacity-50" :disabled="!commissionFile || actionBusy" @click="uploadCommissions">{{ uploadingCommissions ? 'Enviando taxas…' : 'Enviar taxas de comissão' }}</button>
    </div>
    </template>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, getCurrentInstance } from 'vue'
import {
  Info,
  Link as LinkIcon,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  ShieldAlert,
  Paperclip,
  SlidersHorizontal
} from 'lucide-vue-next'
import { useSafeAuthStore } from '@/stores/authStore'
import { dataService } from '@/services/dataService'
import api from '@/services/api'
import { userFacingText } from '@/services/userFacingText'
import { associateReports, availableImportedLots, competenceBaseGroups, campaignBaseLabel, uploadReportIds } from '@/services/campaignBaseAssociation'
import { campaignCoverageService } from '@/services/campaignCoverageService'
import { campaignPreparationService } from '@/services/campaignPreparationService'
import { findAffectedCampaigns } from '@/services/campaignBasesImpactService'
import {
  normalizeCompetence,
  formatCompetenceCode,
  extractCompetenceFromFileName,
  formatCompetenceLabel
} from '@/services/competenceUtils'
import CampaignPreparationTable from './CampaignPreparationTable.vue'


const props = defineProps({
  compact: { type: Boolean, default: false },
  campanhaId: { type: [Number, String], default: null },
  competencia: { type: String, default: '' },
  autoSelectCompetence: { type: Boolean, default: true },
  campaignsList: { type: Array, default: () => [] }
})

const emit = defineEmits(['competence-selected', 'base-associated', 'base-uploaded', 'base-effective', 'busy-change', 'selection-ready'])

const authStore = useSafeAuthStore()
const pageError = ref('')
const showAdvanced = ref(false)
const commissionFile = ref(null)
const uploadingCommissions = ref(false)
const selectedReports = reactive({})
const arquivosCadastrados = ref([])
const basesLoading = ref(Boolean(props.compact))
const lotesDisponiveis = computed(() => availableImportedLots(arquivosCadastrados.value, selectedCompetencia.value, anexosAtivos.value))
function showError(error) { pageError.value = userFacingText(error.response?.data?.message || error.message || 'Não foi possível concluir a operação.') }

const selectedCompetencia = ref(props.competencia || '')
const competenceOptions = ref([])
const campaigns = ref(props.campaignsList || [])
const anexosAtivos = ref([])

// Arquivos de Upload
const rhFile = ref(null)
const vendasFile = ref(null)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadStageMessage = ref('')
const diagnosticoEnvio = ref(null)
const pendenteAssociacaoLoteId = ref([])
const mensagemFalhaAssociacao = ref('')

const isAssociating = ref(false)
const isDetaching = ref(null)
const actionBusy = computed(() => isUploading.value || isAssociating.value || isDetaching.value != null || uploadingCommissions.value || abrindoLote.value != null)
const displayedAttachments = computed(() => props.compact ? anexosAtivos.value.filter(item => item.competencia === selectedCompetencia.value || (item.tipoBase === 'HR' && !item.competencia)) : anexosAtivos.value)
const baseGroups = computed(() => competenceBaseGroups(arquivosCadastrados.value, selectedCompetencia.value, anexosAtivos.value))
const completeSelection = computed(() => Boolean(selectedCompetencia.value) && baseGroups.value.every(group => group.attached.length || group.available.some(item => String(item.reportId) === String(selectedReports[group.type]))))
const pendingSelectedReports = computed(() => baseGroups.value.filter(group => !group.attached.length).flatMap(group => group.available.filter(item => String(item.reportId) === String(selectedReports[group.type])).map(item => item.reportId)))
watch(baseGroups, groups => {
  for (const group of groups) {
    if (group.attached.length) selectedReports[group.type] = ''
    else if (!group.available.some(item => String(item.reportId) === String(selectedReports[group.type]))) selectedReports[group.type] = group.available.length === 1 ? group.available[0].reportId : ''
  }
}, { immediate: true })

async function associarCompetencia() {
  if (!authStore.canModifyBases || !completeSelection.value || actionBusy.value || basesLoading.value || pageError.value) return
  const ids = [...pendingSelectedReports.value]
  isAssociating.value = true
  let failure = ''
  try { await associateReports(campaignCoverageService, props.campanhaId, ids) }
  catch (err) { failure = userFacingText(err.response?.data?.message || err.message || 'Não foi possível vincular todas as bases. Confira o conjunto e tente novamente.') }
  finally {
    await carregarAnexos()
    if (failure) pageError.value = failure
    isAssociating.value = false
    emit('base-associated', { competencia: selectedCompetencia.value, partial: Boolean(failure) })
  }
}

async function uploadCommissions() {
  if (!authStore.canUploadBases || !commissionFile.value || actionBusy.value || !selectedCompetencia.value) return
  uploadingCommissions.value = true
  pageError.value = ''
  let imported = false
  let failure = ''
  try {
    const result = await dataService.uploadBase({ tipoBase: 'COMISSIONS', file: commissionFile.value, competencia: selectedCompetencia.value })
    if (result.status !== 'SUCESSO' || !Number.isSafeInteger(result.reportId) || result.reportId <= 0) throw new Error(result.inconsistencias?.[0]?.motivo || 'O envio das taxas não foi confirmado.')
    imported = true
    await campaignCoverageService.attachBase(props.campanhaId, { reportId: result.reportId })
    commissionFile.value = null
  } catch (err) { failure = (imported ? 'Taxas importadas, mas o vínculo não foi confirmado. Selecione o arquivo cadastrado acima. ' : '') + userFacingText(err.response?.data?.message || err.message) }
  finally {
    await carregarAnexos()
    if (failure) pageError.value = failure
    uploadingCommissions.value = false
    emit('base-uploaded')
  }
}

// Auto-detecção de competência com base nas planilhas selecionadas
const competenciaDetectadaNosArquivos = computed(() => {
  const compVendas = vendasFile.value ? normalizeCompetence(extractCompetenceFromFileName(vendasFile.value.name)) : null
  const compRh = rhFile.value ? normalizeCompetence(extractCompetenceFromFileName(rhFile.value.name)) : null
  return compVendas || compRh || null
})

function verificarEAtualizarCompetenciaDetectada(file) {
  if (!file?.name) return
  const raw = extractCompetenceFromFileName(file.name)
  const norm = normalizeCompetence(raw)
  if (norm) {
    if (props.compact && norm !== props.competencia) { pageError.value = 'O arquivo indica outra competência. Selecione o mês correspondente antes de enviar.'; return }
    if (!competenceOptions.value.some((c) => c.competencia === norm)) {
      competenceOptions.value.push({
        competencia: norm,
        label: formatCompetenceLabel(norm)
      })
    }
    selectedCompetencia.value = norm
    emit('competence-selected', norm)
  }
}

function onRhFileSelect(event) {
  const file = event.target.files?.[0] || null
  rhFile.value = file
  verificarEAtualizarCompetenciaDetectada(file)
}

function onVendasFileSelect(event) {
  const file = event.target.files?.[0] || null
  vendasFile.value = file
  verificarEAtualizarCompetenciaDetectada(file)
}

// FRONT-5: Lote em Preparação Ativo
const lotePreparacaoAtivo = ref(null)
const abrindoLote = ref(null)
watch(actionBusy, busy => emit('busy-change', busy))
watch(() => completeSelection.value && !basesLoading.value && !pageError.value && !actionBusy.value, ready => emit('selection-ready', ready), { immediate: true })
async function confirmSelection() {
  if (basesLoading.value || actionBusy.value || pageError.value || !completeSelection.value) return false
  if (pendingSelectedReports.value.length) {
    if (!authStore.canModifyBases) return false
    await associarCompetencia()
  }
  return completeSelection.value && !pageError.value
}
defineExpose({ confirmSelection, refresh: carregarAnexos })

async function carregarCompetencias() {
  try {
    const list = await dataService.fetchCompetenciasReferencia()
    competenceOptions.value = list || []
    if (props.autoSelectCompetence && !selectedCompetencia.value && competenceOptions.value.length > 0) {
      selectedCompetencia.value = competenceOptions.value[0].competencia
      emit('competence-selected', selectedCompetencia.value)
    }
  } catch (err) {
    showError(err)
    console.warn('Erro ao carregar competências de referência:', err)
  }
}

async function carregarCampanhas() {
  if (campaigns.value.length > 0) return
  try {
    const { data: response } = await api.get('/campanhas')
    if (Array.isArray(response)) campaigns.value = response
  } catch (err) {
    showError(err)
    console.warn('Não foi possível carregar lista global de campanhas:', err)
  }
}

async function handleBatchUpdated() {
  await carregarAnexos()
  emit('base-associated', { updated: true, competencia: selectedCompetencia.value })
}

let basesRequest = 0
onBeforeUnmount(() => { basesRequest++ })
async function carregarAnexos() {
  const request = ++basesRequest
  const campaignId = props.campanhaId
  if (!campaignId) { arquivosCadastrados.value = []; anexosAtivos.value = []; basesLoading.value = false; return }
  basesLoading.value = true
  pageError.value = ''
  arquivosCadastrados.value = []
  try {
    const [anexos, arquivos] = await Promise.all([
      campaignCoverageService.listAttachments(campaignId),
      campaignCoverageService.listImportedBases()
    ])
    if (request !== basesRequest || campaignId !== props.campanhaId) return
    anexosAtivos.value = anexos
    arquivosCadastrados.value = arquivos
  } catch (err) {
    if (request !== basesRequest || campaignId !== props.campanhaId) return
    showError(err)
    console.warn('Erro ao carregar anexos ativos:', err)
  } finally { if (request === basesRequest) basesLoading.value = false }
}

const selectedCompetenciaFormatada = computed(() => {
  return formatCompetenceCode(selectedCompetencia.value) || selectedCompetencia.value || '—'
})

const baseExistente = computed(() => {
  if (!selectedCompetencia.value) return null
  const norm = normalizeCompetence(selectedCompetencia.value)
  return competenceOptions.value.find((c) => normalizeCompetence(c.competencia) === norm) || null
})

const jaAnexadoNaCampanha = computed(() => {
  if (!selectedCompetencia.value || !anexosAtivos.value.length) return false
  const norm = normalizeCompetence(selectedCompetencia.value)
  return anexosAtivos.value.some((a) => normalizeCompetence(a.competencia) === norm)
})

const impactAnalysis = computed(() => {
  return findAffectedCampaigns(competenciaDetectadaNosArquivos.value || selectedCompetencia.value, campaigns.value, props.campanhaId)
})

function onCompetenceChange(comp) {
  selectedCompetencia.value = comp
  emit('competence-selected', comp)
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

async function associarBaseExistente(lote) {
  if (!authStore.canModifyBases || !lotesDisponiveis.value.some(item => item.reportId === lote?.reportId) || !props.campanhaId || actionBusy.value) return
  isAssociating.value = true
  try {
    const reportId = lote.reportId
    await campaignCoverageService.attachBase(props.campanhaId, { reportId })
    await carregarAnexos()
    emit('base-associated', { reportId, competencia: selectedCompetencia.value })
  } catch (err) {
    showError(err)
    console.error('Falha ao associar base existente:', err)
  } finally {
    isAssociating.value = false
  }
}

async function tentarAssociarLotePendente() {
  if (!authStore.canModifyBases || !pendenteAssociacaoLoteId.value.length || !props.campanhaId) return
  isAssociating.value = true
  const ids = [...pendenteAssociacaoLoteId.value]
  try {
    await associateReports(campaignCoverageService, props.campanhaId, ids)
    pendenteAssociacaoLoteId.value = []
    mensagemFalhaAssociacao.value = ''
    await carregarAnexos()
    emit('base-associated', { reportIds: ids, competencia: selectedCompetencia.value })
  } catch (err) {
    pendenteAssociacaoLoteId.value = err.pendingReportIds || ids
    mensagemFalhaAssociacao.value = err.message
    showError(err)
  } finally { isAssociating.value = false }
}

async function desanexarBase(anexoId) {
  if (!authStore.canModifyBases || !props.campanhaId || !anexoId || actionBusy.value) return
  isDetaching.value = anexoId
  try {
    await campaignCoverageService.detachBase(props.campanhaId, anexoId)
    await carregarAnexos()
    emit('base-associated', { removed: true, competencia: selectedCompetencia.value })
  } catch (err) {
    showError(err)
    console.error('Falha ao desanexar base:', err)
  } finally {
    isDetaching.value = null
  }
}

// FRONT-5: Abertura de lote em preparação para edição de linhas
async function abrirPreparacaoLote(reportId) {
  if (!authStore.canModifyBases || !props.campanhaId || !reportId || actionBusy.value) return
  abrindoLote.value = reportId
  try {
    const lote = await campaignPreparationService.openFromBatch(props.campanhaId, reportId)
    lotePreparacaoAtivo.value = lote
  } catch (err) {
    showError(err)
    console.error('Falha ao abrir lote em preparação:', err)
  } finally {
    abrindoLote.value = null
  }
}

function onBatchCommitted() {
  lotePreparacaoAtivo.value = null
  carregarAnexos()
  carregarCompetencias()
  emit('base-uploaded')
  emit('base-effective')
}

async function executarUploadCiclo() {
  if (!authStore.canUploadBases || !rhFile.value || !vendasFile.value || actionBusy.value) return

  const targetCompetencia = competenciaDetectadaNosArquivos.value || selectedCompetencia.value
  if (props.compact && targetCompetencia !== props.competencia) { pageError.value = 'Os arquivos devem corresponder à competência selecionada para apuração.'; return }
  selectedCompetencia.value = targetCompetencia

  isUploading.value = true
  uploadProgress.value = 10
  uploadStageMessage.value = 'Iniciando validação...'
  diagnosticoEnvio.value = null
  pendenteAssociacaoLoteId.value = []
  mensagemFalhaAssociacao.value = ''

  try {
    const res = await dataService.uploadCicloSequencial({
      rhFile: rhFile.value,
      vendasFile: vendasFile.value,
      competencia: targetCompetencia,
      onProgress: (p) => {
        uploadStageMessage.value = p.message || p.stage
        uploadProgress.value = p.progress || 50
      }
    })

    uploadProgress.value = 100
    diagnosticoEnvio.value = res

    if (res.status !== 'SUCESSO') throw new Error(res.mensagem || res.mensagens?.join(' ') || 'O envio contém pendências. Verifique o diagnóstico dos arquivos.')
    uploadStageMessage.value = 'Arquivos importados. Associando à campanha…'
    if (props.campanhaId) {
      const ids = uploadReportIds(res)
      pendenteAssociacaoLoteId.value = ids
      await tentarAssociarLotePendente()
    }

    uploadStageMessage.value = pendenteAssociacaoLoteId.value.length ? 'Arquivos importados; associação pendente.' : 'Envio e associação concluídos.'
    await carregarCompetencias()
    emit('base-uploaded', res)
  } catch (err) {
    showError(err)
    console.error('Erro no upload sequencial de bases:', err)
    diagnosticoEnvio.value = diagnosticoEnvio.value || {
      status: 'FALHOU',
      mensagem: err.message || 'Falha durante o envio de bases.',
      inconsistencias: [{ motivo: err.message || 'Erro inesperado no servidor.' }]
    }
  } finally {
    isUploading.value = false
  }
}

watch(
  () => props.competencia,
  (newComp) => {
    if (newComp && newComp !== selectedCompetencia.value) {
      selectedCompetencia.value = newComp
      if (props.compact) { rhFile.value = null; vendasFile.value = null; commissionFile.value = null; pageError.value = ''; diagnosticoEnvio.value = null; lotePreparacaoAtivo.value = null; void carregarAnexos() }
    }
  }
)

watch(
  () => props.campanhaId,
  (newId) => {
    carregarAnexos()
  }
)

onMounted(async () => {
  try { await authStore.refreshSession() } catch (err) { showError(err) }
  await carregarCompetencias()
  await carregarCampanhas()
  if (props.campanhaId) {
    await carregarAnexos()
  }
})
</script>
