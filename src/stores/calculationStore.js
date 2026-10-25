import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { calculationService, normalizeCalculationError } from '@/services/calculationService'
import { ASYNC_EXECUTION_STATES as S } from '@/services/asyncExecutionService'
import { saveCalculationCache } from '@/services/calculationCache'
import { CALCULATION_OPERATION } from '@/services/calculationFlow'
import { normalizeCompetence } from '@/services/competenceUtils'
import { useNotificationStore } from './notificationStore'

const CALCULATION_STATUS = Object.freeze({ IDLE: 'IDLE', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED',
  COMPLETED_WITH_ISSUES: 'COMPLETED_WITH_ISSUES', COMPLETED_EMPTY: 'COMPLETED_EMPTY', ERROR: 'ERROR' })
const now = () => new Date().toISOString()
const pending = (record) => record && ![S.CONCLUIDA, S.FALHOU].includes(record.status)

export const useCalculationStore = defineStore('calculation', {
  state: () => ({ competencia: '', tipoOperacao: CALCULATION_OPERATION.NORMAL, status: CALCULATION_STATUS.IDLE,
    asyncStatus: S.IDLE, executionId: '', progress: null, stage: '', transientWarning: '', recuperadoDeSessao: false,
    resultado: null, mensagemErro: '', iniciadoEm: null, concluidoEm: null, monitoringPromise: null, operationRevision: 0 }),
  getters: {
    isProcessing: (state) => [S.AGUARDANDO, S.PROCESSANDO, S.ACOMPANHAMENTO_PAUSADO].includes(state.asyncStatus) || state.status === CALCULATION_STATUS.PROCESSING,
    hasError: (state) => state.asyncStatus === S.FALHOU || state.status === CALCULATION_STATUS.ERROR,
    recalculando: (state) => state.tipoOperacao === CALCULATION_OPERATION.RECALCULO
  },
  actions: {
    execute({ competencia, recalcular = false, onViewResult = null, onViewHistory = null, signal = null } = {}) {
      const normalized = normalizeCompetence(competencia)
      if (!normalized) return Promise.resolve({ started: false, reason: 'COMPETENCIA_INVALIDA' })
      if (this.isProcessing || this.monitoringPromise) {
        useNotificationStore().warning('Apuração em acompanhamento', `Retome ou aguarde a conclusão de ${this.competencia} antes de iniciar outra operação.`)
        return Promise.resolve({ started: false, reason: 'OPERACAO_EM_ANDAMENTO' })
      }
      if (pending(calculationService.recoverActiveCalculation())) {
        this.recoverExecution(normalized)
        return Promise.resolve({ started: false, reason: 'OPERACAO_EM_ANDAMENTO' })
      }
      return this.runTask(normalized, recalcular === true, calculationService.executeAsyncCalculation, { signal, onViewResult, onViewHistory })
    },
    runTask(competencia, recalcular, action, { signal, onViewResult, onViewHistory, recovered = false, notify = true } = {}) {
      const revision = ++this.operationRevision
      const matches = () => this.operationRevision === revision && this.competencia === competencia
      this.competencia = competencia
      this.tipoOperacao = recalcular ? CALCULATION_OPERATION.RECALCULO : CALCULATION_OPERATION.NORMAL
      this.status = CALCULATION_STATUS.PROCESSING; this.asyncStatus = S.AGUARDANDO
      this.progress = null; this.stage = recovered ? 'Consultando a execução salva.' : 'Solicitando apuração.'
      this.transientWarning = ''; this.mensagemErro = ''; this.recuperadoDeSessao = recovered
      if (!recovered) this.executionId = ''
      this.resultado = null; this.iniciadoEm = now(); this.concluidoEm = null
      const operation = (async () => {
        await Promise.resolve()
        try {
          const result = await action(competencia, { recalcular, signal, onProgress: (record) => {
            if (!matches()) return
            this.executionId = record.executionId || this.executionId
            this.asyncStatus = record.status
            this.progress = record.progress
            this.stage = record.stage
            this.transientWarning = record.transientWarning || ''
          } })
          if (!matches()) return { started: true, ignored: true }
          if (result?.competencia !== competencia) throw Object.assign(new Error('O resultado não corresponde à competência em acompanhamento.'), { kind: 'monitoring' })
          this.resultado = { ...result, recalculoExecutado: recalcular }
          this.asyncStatus = S.CONCLUIDA; this.progress = 100; this.stage = 'Apuração concluída.'
          this.transientWarning = ''; this.concluidoEm = now()
          saveCalculationCache({ competencia, tipoOperacao: this.tipoOperacao, resultado: this.resultado, recebidoEm: this.concluidoEm })
          const notifications = useNotificationStore()
          const actionOptions = onViewResult ? { actionLabel: 'Ver resultado', onAction: onViewResult } : {}
          if (result.totalImpedimentos) {
            this.status = result.totalCalculados ? CALCULATION_STATUS.COMPLETED_WITH_ISSUES : CALCULATION_STATUS.COMPLETED_EMPTY
            if (notify) notifications.warning(result.totalCalculados ? 'Cálculo concluído com impedimentos' : 'Nenhuma venda calculada', `${result.totalImpedimentos} venda(s) com impedimentos. Consulte o histórico para conferir.`, actionOptions)
          } else {
            this.status = CALCULATION_STATUS.COMPLETED
            if (notify) notifications.success('Cálculo concluído', `A competência ${competencia} foi processada.`, actionOptions)
          }
          return { started: true, resultado: this.resultado }
        } catch (error) {
          if (!matches()) return { started: true, ignored: true }
          const normalized = error?.kind ? error : normalizeCalculationError(error)
          if (normalized.kind === 'monitoring') {
            this.status = CALCULATION_STATUS.PROCESSING; this.asyncStatus = S.ACOMPANHAMENTO_PAUSADO
            this.stage = 'Acompanhamento pausado.'; this.transientWarning = normalized.message
          } else {
            this.status = CALCULATION_STATUS.ERROR; this.asyncStatus = S.FALHOU
            this.stage = normalized.kind === 'rejected' ? 'Solicitação não aceita.' : 'A apuração falhou.'
            this.mensagemErro = normalized.message; this.concluidoEm = now()
            if (notify) useNotificationStore().error('Não foi possível concluir a apuração', normalized.message,
              onViewHistory || onViewResult ? { actionLabel: 'Consultar histórico', onAction: onViewHistory || onViewResult } : {})
          }
          return { started: true, error: normalized }
        } finally {
          if (matches()) this.monitoringPromise = null
        }
      })()
      this.monitoringPromise = markRaw(operation)
      return operation
    },
    recoverExecution(competencia) {
      // Navigating to a cached month must never relabel an execution still being observed.
      if (this.isProcessing || this.monitoringPromise) return calculationService.recoverActiveCalculation(this.competencia)
      const running = calculationService.recoverActiveCalculation()
      const record = pending(running) ? running : calculationService.recoverActiveCalculation(normalizeCompetence(competencia))
      if (!record || !normalizeCompetence(record.competencia)) return null
      this.executionId = record.executionId || ''
      void this.runTask(record.competencia, record.recalcular === true, calculationService.resumeAsyncCalculation, { recovered: true, notify: pending(record) })
      return record
    },
    resumeExecution() {
      if (this.monitoringPromise || this.asyncStatus !== S.ACOMPANHAMENTO_PAUSADO) return Promise.resolve({ started: false })
      return this.runTask(this.competencia, this.recalculando, calculationService.resumeAsyncCalculation, { recovered: true })
    },
    dismissExecution(competencia) {
      const normalized = normalizeCompetence(competencia)
      if (!normalized || this.isProcessing || this.monitoringPromise) return
      calculationService.clearActiveCalculation(normalized)
      if (this.competencia === normalized) { this.executionId = ''; this.asyncStatus = S.IDLE; this.progress = null; this.stage = ''; this.transientWarning = '' }
    }
  }
})
export { CALCULATION_STATUS }
