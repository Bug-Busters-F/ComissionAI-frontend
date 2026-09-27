import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { calculationService, normalizeCalculationError } from '@/services/calculationService'
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
    resultado: null,
    mensagemErro: '',
    iniciadoEm: null,
    concluidoEm: null,
    requestController: null
  }),

  getters: {
    isProcessing: (state) => state.status === CALCULATION_STATUS.PROCESSING,
    hasError: (state) => state.status === CALCULATION_STATUS.ERROR,
    recalculando: (state) => state.tipoOperacao === CALCULATION_OPERATION.RECALCULO
  },

  actions: {
    async execute({ competencia, recalcular = false, onViewResult = null, onViewHistory = null } = {}) {
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
      this.resultado = null
      this.mensagemErro = ''
      this.iniciadoEm = now()
      this.concluidoEm = null
      this.requestController = typeof AbortController !== 'undefined' ? markRaw(new AbortController()) : null

      this.registerBeforeUnload()

      try {
        const response = await calculationService.calculateByCompetence(normalized, {
          recalcular: shouldRecalculate,
          signal: this.requestController?.signal
        })
        const resultado = { ...response, recalculoExecutado: shouldRecalculate }

        this.resultado = resultado
        this.concluidoEm = now()
        saveCalculationCache({
          competencia: normalized,
          tipoOperacao: this.tipoOperacao,
          resultado,
          recebidoEm: this.concluidoEm
        })

        if (resultado.totalImpedimentos && resultado.totalCalculados) {
          this.status = CALCULATION_STATUS.COMPLETED_WITH_ISSUES
          notifications.warning(
            'Cálculo concluído com impedimentos',
            `${resultado.totalImpedimentos} venda(s) não puderam ser calculadas; os resultados anteriores foram preservados.`,
            onViewResult ? { actionLabel: 'Ver resultado', onAction: onViewResult } : {}
          )
        } else if (resultado.totalImpedimentos && !resultado.totalCalculados) {
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

        return { started: true, resultado }
      } catch (error) {
        const normalizedError = normalizeCalculationError(error)
        this.status = CALCULATION_STATUS.ERROR
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
      } finally {
        this.requestController = null
        this.removeBeforeUnload()
      }
    },

    registerBeforeUnload() {
      if (typeof window === 'undefined') return
      window.addEventListener('beforeunload', this.handleBeforeUnload)
    },

    removeBeforeUnload() {
      if (typeof window === 'undefined') return
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
    },

    handleBeforeUnload(event) {
      if (!this.isProcessing) return
      event.preventDefault()
      event.returnValue = ''
    }
  }
})

export { CALCULATION_STATUS }
