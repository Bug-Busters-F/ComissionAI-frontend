import { defineStore } from 'pinia'
import {
  calculationService,
  normalizeCalculationError
} from '@/services/calculationService'
import { ASYNC_EXECUTION_STATES } from '@/services/asyncExecutionService'
import { saveCalculationCache } from '@/services/calculationCache'
import { CALCULATION_OPERATION } from '@/services/calculationFlow'
import { normalizeCompetence } from '@/services/competenceUtils'
import { useNotificationStore } from './notificationStore'

const CALCULATION_STATUS = Object.freeze({
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  COMPLETED_WITH_ISSUES: 'COMPLETED_WITH_ISSUES',
  COMPLETED_EMPTY: 'COMPLETED_EMPTY',
  ERROR: 'ERROR'
})

function now() {
  return new Date().toISOString()
}

export const useCalculationStore = defineStore('calculation', {
  state: () => ({
    competencia: '',
    tipoOperacao: CALCULATION_OPERATION.NORMAL,
    status: CALCULATION_STATUS.IDLE,
    asyncStatus: ASYNC_EXECUTION_STATES.IDLE,
    executionId: '',
    progress: 0,
    stage: '',
    transientWarning: '',
    recuperadoDeSessao: false,
    resultado: null,
    mensagemErro: '',
    iniciadoEm: null,
    concluidoEm: null,
    requestController: null
  }),

  getters: {
    isProcessing: (state) =>
      state.asyncStatus === ASYNC_EXECUTION_STATES.AGUARDANDO ||
      state.asyncStatus === ASYNC_EXECUTION_STATES.PROCESSANDO ||
      state.status === CALCULATION_STATUS.PROCESSING,
    hasError: (state) =>
      state.asyncStatus === ASYNC_EXECUTION_STATES.FALHOU ||
      state.status === CALCULATION_STATUS.ERROR,
    recalculando: (state) => state.tipoOperacao === CALCULATION_OPERATION.RECALCULO
  },

  actions: {
    async execute({ competencia, recalcular = false, onViewResult = null, onViewHistory = null, signal = null } = {}) {
      const normalized = normalizeCompetence(competencia)
      const shouldRecalculate = recalcular === true

      if (!normalized) return { started: false, reason: 'COMPETENCIA_INVALIDA' }

      if (this.isProcessing) {
        const notifications = useNotificationStore()
        notifications.warning(
          'Cálculo em andamento',
          `A competência ${this.competencia} já está sendo processada. Aguarde a conclusão antes de iniciar outra operação.`
        )
        return { started: false, reason: 'OPERACAO_EM_ANDAMENTO' }
      }

      const notifications = useNotificationStore()
      this.competencia = normalized
      this.tipoOperacao = shouldRecalculate ? CALCULATION_OPERATION.RECALCULO : CALCULATION_OPERATION.NORMAL
      this.status = CALCULATION_STATUS.PROCESSING
      this.asyncStatus = ASYNC_EXECUTION_STATES.AGUARDANDO
      this.progress = 15
      this.stage = 'Aguardando fila e validação de cobertura...'
      this.transientWarning = ''
      this.recuperadoDeSessao = false
      this.resultado = null
      this.mensagemErro = ''
      this.iniciadoEm = now()
      this.concluidoEm = null

      try {
        let resultado
        if (typeof calculationService.executeAsyncCalculation === 'function') {
          resultado = await calculationService.executeAsyncCalculation(normalized, {
            recalcular: shouldRecalculate,
            signal,
            onProgress: (record) => {
              if (this.competencia === normalized) {
                this.executionId = record.executionId || this.executionId
                this.asyncStatus = record.status || this.asyncStatus
                this.progress = record.progress ?? this.progress
                this.stage = record.stage || this.stage
                this.transientWarning = record.transientWarning || ''
              }
            }
          })
        } else {
          const resp = await calculationService.calculateByCompetence(normalized, {
            recalcular: shouldRecalculate,
            signal
          })
          resultado = { ...resp, recalculoExecutado: shouldRecalculate }
        }

        const resultadoConsolidado = { ...resultado, recalculoExecutado: shouldRecalculate }
        this.resultado = resultadoConsolidado
        this.asyncStatus = ASYNC_EXECUTION_STATES.CONCLUIDA
        this.progress = 100
        this.stage = 'Apuração concluída com sucesso.'
        this.transientWarning = ''
        this.concluidoEm = now()

        saveCalculationCache({
          competencia: normalized,
          tipoOperacao: this.tipoOperacao,
          resultado: resultadoConsolidado,
          recebidoEm: this.concluidoEm
        })

        if (resultadoConsolidado.totalImpedimentos && resultadoConsolidado.totalCalculados) {
          this.status = CALCULATION_STATUS.COMPLETED_WITH_ISSUES
          notifications.warning(
            'Cálculo concluído com impedimentos',
            `${resultadoConsolidado.totalImpedimentos} venda(s) não puderam ser calculadas; os resultados anteriores foram preservados.`,
            onViewResult ? { actionLabel: 'Ver resultado', onAction: onViewResult } : {}
          )
        } else if (resultadoConsolidado.totalImpedimentos && !resultadoConsolidado.totalCalculados) {
          this.status = CALCULATION_STATUS.COMPLETED_EMPTY
          notifications.warning(
            'Nenhuma venda calculada',
            'Todas as vendas da competência ficaram impedidas. Consulte os motivos no resultado.',
            onViewResult ? { actionLabel: 'Ver resultado', onAction: onViewResult } : {}
          )
        } else {
          this.status = CALCULATION_STATUS.COMPLETED
          notifications.success(
            'Cálculo concluído',
            `A competência ${normalized} foi processada com sucesso.`,
            onViewResult ? { actionLabel: 'Ver resultado', onAction: onViewResult } : {}
          )
        }

        return { started: true, resultado: resultadoConsolidado }
      } catch (error) {
        const normalizedError = error?.kind ? error : normalizeCalculationError(error)
        this.status = CALCULATION_STATUS.ERROR
        this.asyncStatus = ASYNC_EXECUTION_STATES.FALHOU
        this.progress = 100
        this.stage = 'Falha no cálculo da competência'
        this.mensagemErro = normalizedError.message
        this.concluidoEm = now()

        notifications.error(
          'Falha no cálculo',
          normalizedError.message,
          (onViewHistory || onViewResult)
            ? { actionLabel: 'Consultar histórico', onAction: onViewHistory || onViewResult }
            : {}
        )

        return { started: true, error: normalizedError }
      }
    },

    /**
     * Recupera o acompanhamento de uma execução em andamento ou recém-concluída
     * após atualização da página (F5) ou navegação, sem duplicar a requisição no backend.
     */
    recoverExecution(competencia) {
      const normalized = normalizeCompetence(competencia)
      if (!normalized) return null

      if (typeof calculationService.recoverActiveCalculation !== 'function') return null
      const record = calculationService.recoverActiveCalculation(normalized)
      if (!record) return null

      this.competencia = normalized
      this.executionId = record.executionId || ''
      this.tipoOperacao = record.tipoOperacao === 'RECALCULO' ? CALCULATION_OPERATION.RECALCULO : CALCULATION_OPERATION.NORMAL
      this.asyncStatus = record.status || ASYNC_EXECUTION_STATES.IDLE
      this.progress = record.progress ?? 0
      this.stage = record.stage || ''
      this.transientWarning = record.transientWarning || ''
      this.recuperadoDeSessao = true

      if (record.status === ASYNC_EXECUTION_STATES.AGUARDANDO || record.status === ASYNC_EXECUTION_STATES.PROCESSANDO) {
        this.status = CALCULATION_STATUS.PROCESSING
      } else if (record.status === ASYNC_EXECUTION_STATES.CONCLUIDA) {
        this.resultado = record.result || null
        if (record.result?.totalImpedimentos && record.result?.totalCalculados) {
          this.status = CALCULATION_STATUS.COMPLETED_WITH_ISSUES
        } else if (record.result?.totalImpedimentos && !record.result?.totalCalculados) {
          this.status = CALCULATION_STATUS.COMPLETED_EMPTY
        } else {
          this.status = CALCULATION_STATUS.COMPLETED
        }
      } else if (record.status === ASYNC_EXECUTION_STATES.FALHOU) {
        this.status = CALCULATION_STATUS.ERROR
        this.mensagemErro = record.errorMessage || record.error || 'A apuração anterior falhou.'
      }

      return record
    },

    dismissExecution(competencia) {
      const normalized = normalizeCompetence(competencia)
      if (normalized) {
        if (typeof calculationService.clearActiveCalculation === 'function') {
          calculationService.clearActiveCalculation(normalized)
        }
        if (this.competencia === normalized && !this.isProcessing) {
          this.executionId = ''
          this.asyncStatus = ASYNC_EXECUTION_STATES.IDLE
          this.progress = 0
          this.stage = ''
          this.transientWarning = ''
          this.recuperadoDeSessao = false
        }
      }
    }
  }
})

export { CALCULATION_STATUS }
