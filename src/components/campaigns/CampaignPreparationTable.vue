<template>
  <div class="space-y-5 rounded-2xl border border-sage-border-light bg-white p-6 shadow-sm">
    <!-- Header: Título do Lote, Status e Ações Globais -->
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-sage-border-light pb-4">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-lg font-black text-brand-dark flex items-center gap-2">
            <SlidersHorizontal class="h-5 w-5 text-brand" />
            Correção de Base em Preparação: {{ batch?.tipoBase }} ({{ batch?.competencia || 'Global' }})
          </h3>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-bold"
            :class="batch?.status === 'EM_PREPARACAO' ? 'bg-warning-bg text-warning-text' : 'bg-success-surface text-success-dark'"
          >
            {{ batch?.status }}
          </span>
        </div>
        <p class="mt-1 text-xs text-sage-muted">
          Lote: <strong>#{{ batch?.id?.slice(0, 8) }}</strong> · Linhas válidas: <strong>{{ batch?.linhasValidas ?? '—' }}</strong> de <strong>{{ batch?.totalLinhas ?? '—' }}</strong> · Origem: <strong>{{ batch?.origem || 'MANUAL' }}</strong>
        </p>
      </div>

      <!-- Ações do Lote (Revalidar, Efetivar, Descartar) -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          :disabled="carregando || revalidando || !authStore.canModifyBases"
          @click="revalidarTudo"
          class="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-sage-border-dark px-3.5 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-50"
          title="Revalidar todas as linhas do lote"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': revalidando }" />
          <span>{{ revalidando ? 'Revalidando...' : 'Revalidar Lote' }}</span>
        </button>

        <button
          type="button"
          :disabled="carregando || !authStore.canModifyBases"
          @click="abrirPreviaImpacto"
          class="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          title="Verificar impacto global corporativo e efetivar correções na base geral"
        >
          <Globe2 class="h-3.5 w-3.5" />
          <span>Efetivar na Base Geral</span>
        </button>

        <button
          type="button"
          :disabled="carregando || !authStore.canModifyBases"
          @click="descartar"
          class="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-danger/30 px-3.5 py-2 text-xs font-bold text-danger-dark transition hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50"
          title="Descartar este lote de preparação"
        >
          <Trash2 class="h-3.5 w-3.5" />
          <span>Descartar</span>
        </button>
      </div>
    </div>

    <!-- Barra de Filtros e Busca -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-sage-light/30 p-3 rounded-xl border border-sage-border-light text-xs">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Toggle: Apenas Inválidas -->
        <label class="flex items-center gap-1.5 font-bold text-brand-dark cursor-pointer">
          <input
            type="checkbox"
            v-model="filtroApenasErros"
            @change="aplicarFiltros"
            class="h-4 w-4 rounded border-sage-border-dark text-brand focus:ring-brand"
          />
          <span>Exibir apenas linhas com erro</span>
        </label>

        <!-- Filtro Severidade -->
        <div class="flex items-center gap-1.5">
          <label class="text-sage-muted font-bold">Severidade:</label>
          <select
            v-model="filtroSeveridade"
            @change="aplicarFiltros"
            class="focus-ring rounded-lg border border-sage-border-dark bg-white px-2 py-1 font-bold text-brand-dark"
          >
            <option value="">Todas</option>
            <option value="IMPEDITIVO">Impeditivo (Bloqueia)</option>
            <option value="ADVERTENCIA">Advertência (Aceitável)</option>
          </select>
        </div>

        <!-- Busca por Matrícula -->
        <div class="flex items-center gap-1.5">
          <input
            type="text"
            v-model="filtroMatricula"
            @keyup.enter="aplicarFiltros"
            placeholder="Buscar matrícula..."
            class="focus-ring rounded-lg border border-sage-border-dark bg-white px-2.5 py-1 text-xs font-bold text-brand-dark"
          />
          <button
            type="button"
            @click="aplicarFiltros"
            class="rounded-lg bg-sage-light px-2 py-1 text-brand-dark font-bold hover:bg-sage-border"
          >
            Filtrar
          </button>
        </div>
      </div>

      <div class="text-sage-muted font-semibold">
        Total: <strong>{{ totalElements }}</strong> linha(s) encontrada(s)
      </div>
    </div>

    <!-- Tabela Paginada de Linhas e Erros -->
    <div class="overflow-x-auto rounded-xl border border-sage-border bg-white shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="bg-sage-light text-sage-muted uppercase tracking-wider text-[11px] font-extrabold">
          <tr>
            <th class="p-3"># Linha</th>
            <th class="p-3">Status</th>
            <th class="p-3">Data</th>
            <th class="p-3">Matrícula</th>
            <th class="p-3">Cargo</th>
            <th class="p-3">Loja / Marca</th>
            <th class="p-3 text-right" v-if="batch?.tipoBase !== 'HR'">Valor (R$)</th>
            <th class="p-3">Inconsistências / Diagnóstico</th>
            <th class="p-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sage-border-light">
          <tr v-if="carregando">
            <td :colspan="batch?.tipoBase !== 'HR' ? 9 : 8" class="p-8 text-center text-sage-muted">
              Carregando linhas do lote...
            </td>
          </tr>
          <tr v-else-if="!linhas.length">
            <td :colspan="batch?.tipoBase !== 'HR' ? 9 : 8" class="p-8 text-center text-sage-muted">
              Nenhuma linha corresponde aos filtros aplicados.
            </td>
          </tr>
          <tr
            v-for="line in linhas"
            :key="line.id || line.numeroLinha"
            class="hover:bg-sage-light/30 transition"
            :class="{ 'bg-danger-bg/20': !line.valida && !line.ignorarNaEfetivacao, 'opacity-60 bg-sage-light/50': line.ignorarNaEfetivacao }"
          >
            <td class="p-3 font-mono font-bold text-brand-dark">
              #{{ line.numeroLinha }}
              <span v-if="line.editada" class="ml-1 text-[10px] text-brand-dark font-bold bg-brand-light px-1 rounded">Editada</span>
            </td>
            <td class="p-3">
              <span
                v-if="line.ignorarNaEfetivacao"
                class="rounded px-2 py-0.5 text-[10px] font-bold bg-sage-border text-sage-muted uppercase"
              >
                Ignorada
              </span>
              <span
                v-else-if="line.riscoAceito"
                class="rounded px-2 py-0.5 text-[10px] font-bold bg-success-surface text-success-dark border border-success/30 uppercase"
              >
                Risco Aceito
              </span>
              <span
                v-else-if="line.valida"
                class="rounded px-2 py-0.5 text-[10px] font-bold bg-success-surface text-success-dark uppercase"
              >
                Válida
              </span>
              <span
                v-else
                class="rounded px-2 py-0.5 text-[10px] font-bold bg-danger-bg text-danger-dark uppercase"
              >
                Erro ({{ line.severidadeMaxima || 'Inválida' }})
              </span>
            </td>
            <td class="p-3 text-sage-muted font-medium">
              {{ line.dadosInterpretados?.dataReferencia || line.dadosInterpretados?.dataVenda || line.dadosInterpretados?.dataAdmissao || line.dataVenda || '—' }}
            </td>
            <td class="p-3 font-mono font-bold text-brand-dark">
              {{ line.dadosInterpretados?.matricula || line.matricula || '—' }}
            </td>
            <td class="p-3 text-brand-dark font-semibold">
              {{ line.dadosInterpretados?.descrCargo || line.descrCargo || '—' }}
            </td>
            <td class="p-3 text-sage-muted">
              {{ line.dadosInterpretados?.codLoja ? `Loja ${line.dadosInterpretados.codLoja}` : 'Matriz' }} · {{ line.dadosInterpretados?.descrMarca || 'Geral' }}
            </td>
            <td class="p-3 text-right font-mono font-bold text-brand-dark" v-if="batch?.tipoBase !== 'HR'">
              {{ formatCurrencyPtBr(line.dadosInterpretados?.valorVenda ?? line.valorVenda) }}
            </td>
            <td class="p-3">
              <div v-if="!(line.erros?.length || line.inconsistencias?.length)" class="text-success font-semibold text-[11px]">
                Sem inconsistências
              </div>
              <div v-else class="space-y-1">
                <div
                  v-for="(err, i) in (line.erros || line.inconsistencias)"
                  :key="i"
                  class="flex items-center gap-1.5 text-[11px]"
                >
                  <span
                    class="rounded px-1.5 py-0.2 text-[9px] font-black uppercase"
                    :class="err.severidade === 'IMPEDITIVO' ? 'bg-danger text-white' : 'bg-warning-light text-warning-dark'"
                  >
                    {{ err.severidade }}
                  </span>
                  <span class="font-bold text-brand-dark">{{ err.campo }}:</span>
                  <span class="text-danger-dark truncate max-w-xs" :title="err.mensagem">{{ err.mensagem }}</span>
                </div>
              </div>
            </td>
            <td class="p-3 text-center">
              <div class="flex flex-wrap items-center justify-center gap-2">
                <!-- Botão Editar Linha -->
                <button
                  type="button"
                  @click="abrirEdicao(line)"
                  :disabled="!authStore.canModifyBases"
                  class="focus-ring inline-flex items-center gap-1 rounded-lg border border-sage-border bg-white px-2.5 py-1 text-xs font-bold text-brand-dark hover:bg-sage-light disabled:opacity-40 shadow-xs"
                  title="Editar dados da linha"
                >
                  <Edit3 class="h-3.5 w-3.5 text-brand" />
                  <span>Editar</span>
                </button>

                <!-- Botão Aceitar Risco -->
                <button
                  v-if="temInconsistencia(line) && !line.riscoAceito"
                  type="button"
                  @click="abrirAceiteRisco(line)"
                  :disabled="!authStore.canModifyBases"
                  class="focus-ring inline-flex items-center gap-1 rounded-lg border border-warning-border bg-warning-bg px-2.5 py-1 text-xs font-extrabold text-warning-text hover:bg-warning-light disabled:opacity-40 shadow-xs transition"
                  title="Registrar aceite formal de risco para esta inconsistência"
                >
                  <ShieldCheck class="h-3.5 w-3.5 text-warning-dark" />
                  <span>Aceitar Risco</span>
                </button>

                <span
                  v-else-if="line.riscoAceito"
                  class="inline-flex items-center gap-1 rounded-full bg-success-surface px-2.5 py-0.5 text-[11px] font-bold text-success-dark border border-success/30"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  Risco Aceito
                </span>

                <!-- Botão Ver Histórico -->
                <button
                  type="button"
                  @click="abrirHistorico(line)"
                  class="focus-ring inline-flex items-center gap-1 rounded-lg border border-sage-border bg-white px-2 py-1 text-xs font-bold text-sage-muted hover:text-brand-dark hover:bg-sage-light disabled:opacity-40 shadow-xs"
                  title="Ver histórico de edições (Antes vs. Depois)"
                >
                  <History class="h-3.5 w-3.5" />
                  <span>Histórico</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginação da Tabela -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-sage-muted">
      <div>
        Página <strong>{{ paginaAtual + 1 }}</strong> de <strong>{{ totalPaginas || 1 }}</strong>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="paginaAtual <= 0 || carregando"
          @click="mudarPagina(paginaAtual - 1)"
          class="focus-ring rounded-lg border border-sage-border px-3 py-1 font-bold text-brand-dark hover:bg-sage-light disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          :disabled="paginaAtual >= totalPaginas - 1 || carregando"
          @click="mudarPagina(paginaAtual + 1)"
          class="focus-ring rounded-lg border border-sage-border px-3 py-1 font-bold text-brand-dark hover:bg-sage-light disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>

    <p v-if="operationError" role="alert" class="rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">{{ operationError }}</p>
    <!-- Modais de Suporte do FRONT-5 -->
    <CampaignLineEditModal
      ref="editModalRef"
      :open="modalEdicaoAberto"
      :line="linhaSelecionada"
      :tipo-base="batch?.tipoBase || 'SALES'"
      :salvando="salvandoLinha"
      @save="salvarEdicaoLinha"
      @cancel="modalEdicaoAberto = false"
    />

    <CampaignLineHistoryModal
      :open="modalHistoricoAberto"
      :numero-linha="linhaSelecionada?.numeroLinha"
      :historico="historicoLinha"
      :carregando="carregandoHistorico"
      @close="modalHistoricoAberto = false"
    />

    <CampaignImpactPreviewModal
      :open="modalImpactoAberto"
      :preview="previaImpacto"
      :carregando="carregandoPrevia"
      :efetivando="efetivandoLote"
      :erro-efetivacao="erroEfetivacao"
      @confirm="efetivarLoteConfirmado"
      @cancel="modalImpactoAberto = false"
    />

    <CampaignRiskAcceptModal
      :open="modalRiscoAberto"
      :pendencia="pendenciaSelecionada"
      :processando="processandoRisco"
      @confirm-accept="confirmarAceiteRisco"
      @cancel="modalRiscoAberto = false"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import {
  SlidersHorizontal,
  RefreshCw,
  Globe2,
  Trash2,
  Edit3,
  History,
  ShieldCheck,
  CheckCircle2
} from 'lucide-vue-next'
import { userFacingText } from '@/services/userFacingText'
import { useSafeAuthStore } from '@/stores/authStore'
import { campaignPreparationService } from '@/services/campaignPreparationService'
import { formatCurrencyPtBr } from '@/services/currencyUtils'
import CampaignLineEditModal from './CampaignLineEditModal.vue'
import CampaignLineHistoryModal from './CampaignLineHistoryModal.vue'
import CampaignImpactPreviewModal from './CampaignImpactPreviewModal.vue'
import CampaignRiskAcceptModal from './CampaignRiskAcceptModal.vue'

const props = defineProps({
  campanhaId: { type: [Number, String], required: true },
  preparacaoId: { type: String, required: true },
  batch: { type: Object, default: null }
})

const emit = defineEmits(['batch-committed', 'batch-discarded', 'batch-updated'])

const authStore = useSafeAuthStore()
const operationError = ref('')
function showError(error) { operationError.value = userFacingText(error.response?.data?.message || error.message || 'Não foi possível concluir a operação.') }

const linhas = ref([])
const totalElements = ref(0)
const totalPaginas = ref(0)
const paginaAtual = ref(0)
const tamanhoPagina = ref(20)
const carregando = ref(false)
const revalidando = ref(false)

// Filtros
const filtroApenasErros = ref(true)
const filtroSeveridade = ref('')
const filtroMatricula = ref('')

// Estados de Modais
const editModalRef = ref(null)
const modalEdicaoAberto = ref(false)
const linhaSelecionada = ref(null)
const salvandoLinha = ref(false)

const modalHistoricoAberto = ref(false)
const historicoLinha = ref([])
const carregandoHistorico = ref(false)

const modalImpactoAberto = ref(false)
const previaImpacto = ref(null)
const carregandoPrevia = ref(false)
const efetivandoLote = ref(false)
const erroEfetivacao = ref('')

const modalRiscoAberto = ref(false)
const pendenciaSelecionada = ref(null)
const processandoRisco = ref(false)

async function carregarLinhas() {
  if (!props.campanhaId || !props.preparacaoId) return
  carregando.value = true
  try {
    const res = await campaignPreparationService.listBatchLines(props.campanhaId, props.preparacaoId, {
      valida: filtroApenasErros.value ? false : null,
      severidade: filtroSeveridade.value || null,
      matricula: filtroMatricula.value.trim() || null,
      page: paginaAtual.value,
      size: tamanhoPagina.value
    })
    linhas.value = res.content || []
    totalElements.value = res.totalElements || 0
    totalPaginas.value = res.totalPages || 0
  } catch (err) {
    showError(err)
    console.error('Falha ao carregar linhas de preparação:', err)
  } finally {
    carregando.value = false
  }
}

function aplicarFiltros() {
  paginaAtual.value = 0
  carregarLinhas()
}

function mudarPagina(novaPagina) {
  paginaAtual.value = novaPagina
  carregarLinhas()
}

function abrirEdicao(line) {
  linhaSelecionada.value = line
  modalEdicaoAberto.value = true
}

async function salvarEdicaoLinha({ numeroLinha, payload }) {
  if (!authStore.canModifyBases) return
  operationError.value = ''
  salvandoLinha.value = true
  try {
    const atualizada = await campaignPreparationService.editBatchLine(
      props.campanhaId,
      props.preparacaoId,
      numeroLinha,
      {
        ...payload,
        responsavel: authStore.currentUser?.email
      }
    )
    modalEdicaoAberto.value = false
    await carregarLinhas()
    emit('batch-updated')
  } catch (err) {
    showError(err)
    if (err.response?.status === 409) {
      // Conflito de concorrência detectado
      editModalRef.value?.registrarConflito(null)
      try {
        const current = await campaignPreparationService.getBatchLine(props.campanhaId, props.preparacaoId, numeroLinha)
        editModalRef.value?.registrarConflito(current)
      } catch (refreshError) { showError(refreshError) }
    } else {
      console.error('Erro ao salvar linha:', err)
    }
  } finally {
    salvandoLinha.value = false
  }
}

async function abrirHistorico(line) {
  linhaSelecionada.value = line
  modalHistoricoAberto.value = true
  carregandoHistorico.value = true
  try {
    historicoLinha.value = await campaignPreparationService.getLineHistory(
      props.campanhaId,
      props.preparacaoId,
      line.numeroLinha
    )
  } catch (err) {
    showError(err)
    console.error('Falha ao obter histórico da linha:', err)
  } finally {
    carregandoHistorico.value = false
  }
}

function temInconsistencia(line) {
  const erros = line.erros || line.inconsistencias || []
  return erros.length > 0
}

function abrirAceiteRisco(line) {
  const erros = line.erros || line.inconsistencias || []
  const primeiroErro = erros.find(item => !['ADVERTENCIA', 'AVISO'].includes(String(item.severidade).toUpperCase())) || erros[0]
  pendenciaSelecionada.value = {
    linha: line.numeroLinha,
    campo: primeiroErro?.campo || 'geral',
    motivo: primeiroErro?.mensagem || 'Inconsistência identificada no registro',
    severidade: primeiroErro?.severidade || 'ADVERTENCIA'
  }
  modalRiscoAberto.value = true
}

async function confirmarAceiteRisco({ pendencia, motivo }) {
  if (!authStore.canModifyBases) return
  operationError.value = ''
  processandoRisco.value = true
  try {
    await campaignPreparationService.acceptRisk(props.campanhaId, {
      pendenciaIdentificador: `linha-${pendencia.linha}-${pendencia.campo}`,
      campo: pendencia.campo,
      mensagem: pendencia.motivo,
      severidade: pendencia.severidade,
      motivo,
      aceitoPor: authStore.currentUser?.email
    })
    modalRiscoAberto.value = false
    await carregarLinhas()
  } catch (err) {
    showError(err)
    console.error('Falha ao registrar aceite de risco:', err)
  } finally {
    processandoRisco.value = false
  }
}

async function revalidarTudo() {
  if (!authStore.canModifyBases) return
  operationError.value = ''
  revalidando.value = true
  try {
    await campaignPreparationService.revalidateBatch(
      props.campanhaId,
      props.preparacaoId,
      authStore.currentUser?.email
    )
    await carregarLinhas()
    emit('batch-updated')
  } catch (err) {
    showError(err)
    console.error('Falha ao revalidar lote:', err)
  } finally {
    revalidando.value = false
  }
}

async function abrirPreviaImpacto() {
  previaImpacto.value = null
  modalImpactoAberto.value = true
  carregandoPrevia.value = true
  erroEfetivacao.value = ''
  try {
    previaImpacto.value = await campaignPreparationService.getImpactPreview(
      props.campanhaId,
      props.preparacaoId
    )
  } catch (err) {
    showError(err)
    erroEfetivacao.value = err.response?.data?.message || err.message || 'Erro ao calcular prévia de impacto.'
  } finally {
    carregandoPrevia.value = false
  }
}

async function efetivarLoteConfirmado({ motivo, confirmarPropagacaoImpacto }) {
  if (!authStore.canModifyBases || !previaImpacto.value || carregandoPrevia.value) return
  operationError.value = ''
  efetivandoLote.value = true
  erroEfetivacao.value = ''
  try {
    const res = await campaignPreparationService.commitBatch(props.campanhaId, props.preparacaoId, {
      responsavel: authStore.currentUser?.email,
      motivo,
      confirmarPropagacaoImpacto
    })
    modalImpactoAberto.value = false
    emit('batch-committed', res)
  } catch (err) {
    showError(err)
    erroEfetivacao.value = err.response?.data?.message || err.message || 'Falha ao efetivar lote na base geral.'
  } finally {
    efetivandoLote.value = false
  }
}

async function descartar() {
  if (!authStore.canModifyBases) return
  operationError.value = ''
  if (!confirm('Deseja realmente descartar este lote de preparação? Todas as alterações não salvas serão perdidas.')) {
    return
  }
  try {
    await campaignPreparationService.discardBatch(props.campanhaId, props.preparacaoId, {
      motivo: 'Descartado pelo usuário',
      responsavel: authStore.currentUser?.email
    })
    emit('batch-discarded')
  } catch (err) {
    showError(err)
    console.error('Falha ao descartar lote:', err)
  }
}

watch(() => props.preparacaoId, carregarLinhas)

onMounted(async () => {
  try { await authStore.refreshSession() } catch (error) { showError(error) }
  await carregarLinhas()
})
</script>
