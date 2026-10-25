import api from './api'
import {
  ASYNC_EXECUTION_STATES,
  clearExecutionRecord,
  generateExecutionId,
  loadExecutionRecord,
  pollAsyncExecution,
  saveExecutionRecord
} from './asyncExecutionService'
import { normalizeCompetence } from './competenceUtils'

// Competências grandes podem levar alguns minutos para recalcular no backend.
// Mantemos esse prazo específico maior sem alongar o timeout das demais chamadas.
export const CALCULATION_TIMEOUT = 900000

export const calculationService = {
  async calculateByCompetence(competencia, { recalcular = false, signal } = {}) {
    const shouldRecalculate = recalcular === true
    const response = await api.post('/comissoes/calcular-competencia', { competencia, recalcular: shouldRecalculate }, {
      signal,
      timeout: CALCULATION_TIMEOUT
    })
    return normalizeCalculationResult(response.data)
  },

  async executeAsyncCalculation(competencia, { recalcular = false, onProgress, signal } = {}) {
    const compNorm = normalizeCompetence(competencia)
    if (!compNorm) throw new Error('Competência inválida para apuração.')
    const shouldRecalculate = recalcular === true
    const executionId = generateExecutionId('APUR', compNorm)
    const contextKey = `calc-${compNorm}`

    const updateProgress = (status, progress, stage, extra = {}) => {
      const record = {
        executionId,
        competencia: compNorm,
        tipoOperacao: shouldRecalculate ? 'RECALCULO' : 'CALCULO',
        status,
        progress,
        stage,
        updatedAt: new Date().toISOString(),
        ...extra
      }
      saveExecutionRecord('calculation', contextKey, record)
      onProgress?.(record)
      return record
    }

    // 1. Estado inicial: AGUARDANDO
    updateProgress(
      ASYNC_EXECUTION_STATES.AGUARDANDO,
      15,
      'Aguardando fila e validação de cobertura...'
    )

    // 2. Estado em processamento: PROCESSANDO
    updateProgress(
      ASYNC_EXECUTION_STATES.PROCESSANDO,
      45,
      shouldRecalculate ? 'Recalculando comissões no servidor...' : 'Calculando comissões no servidor...'
    )

    let currentProgress = 45
    const progressTimer = setInterval(() => {
      if (currentProgress < 85) {
        currentProgress += 5
        let msg = 'Processando comissões no servidor...'
        if (currentProgress >= 60 && currentProgress < 75) {
          msg = 'Cruzando vínculos de colaboradores e aplicando regras vigentes...'
        } else if (currentProgress >= 75) {
          msg = 'Consolidando memória de cálculo e preparando histórico imutável...'
        }
        updateProgress(ASYNC_EXECUTION_STATES.PROCESSANDO, currentProgress, msg)
      }
    }, 2500)

    try {
      const response = await api.post(
        '/comissoes/calcular-competencia',
        { competencia: compNorm, recalcular: shouldRecalculate },
        { signal, timeout: CALCULATION_TIMEOUT }
      )

      const data = response?.data || {}

      // Caso o backend já suporte acompanhamento assíncrono via identificador de job
      if (data?.id && data?.estado && data.estado !== 'CONCLUIDA' && data.estado !== 'CONCLUIDO') {
        const asyncOutcome = await pollAsyncExecution({
          executionId: data.id,
          fetchStatus: async (id, opts) => {
            const res = await api.get(`/comissoes/status/${encodeURIComponent(id)}`, opts)
            return res.data
          },
          onUpdate: (st) => {
            updateProgress(st.status, st.progress, st.stage, {
              transientWarning: st.transientWarning || ''
            })
          },
          signal
        })

        if (asyncOutcome.status === ASYNC_EXECUTION_STATES.FALHOU) {
          const err = new Error(asyncOutcome.error || 'Falha no processamento assíncrono da apuração.')
          throw err
        }

        const normalizedResult = normalizeCalculationResult(asyncOutcome.result || data)
        const resultadoFinal = { ...normalizedResult, recalculoExecutado: shouldRecalculate }
        updateProgress(ASYNC_EXECUTION_STATES.CONCLUIDA, 100, 'Apuração concluída com sucesso.', {
          result: resultadoFinal
        })
        return resultadoFinal
      }

      // Backend síncrono padrão com fechamento atômico
      updateProgress(
        ASYNC_EXECUTION_STATES.PROCESSANDO,
        90,
        'Consolidando totais e gerando histórico imutável...'
      )

      const normalizedResult = normalizeCalculationResult(data)
      const resultadoFinal = { ...normalizedResult, recalculoExecutado: shouldRecalculate }

      updateProgress(ASYNC_EXECUTION_STATES.CONCLUIDA, 100, 'Apuração concluída com sucesso.', {
        result: resultadoFinal
      })

      return resultadoFinal
    } catch (error) {
      const normalizedError = normalizeCalculationError(error)
      updateProgress(ASYNC_EXECUTION_STATES.FALHOU, 100, 'Falha no cálculo da competência', {
        errorMessage: normalizedError.message,
        errorKind: normalizedError.kind
      })
      throw normalizedError
    } finally {
      clearInterval(progressTimer)
    }
  },

  recoverActiveCalculation(competencia) {
    const compNorm = normalizeCompetence(competencia)
    if (!compNorm) return null
    return loadExecutionRecord('calculation', `calc-${compNorm}`)
  },

  clearActiveCalculation(competencia) {
    const compNorm = normalizeCompetence(competencia)
    if (!compNorm) return
    clearExecutionRecord('calculation', `calc-${compNorm}`)
  },

  async listLogs({ dataInicio, dataFim, matricula, idRegra, page = 0, size = 10, signal } = {}) {
    const params = { dataInicio, dataFim, page, size }
    if (matricula) params.matricula = matricula
    if (idRegra) params.idRegra = idRegra

    const response = await api.get('/logs-calculo', { params, signal })
    return normalizePage(response.data)
  }
}

export function normalizeCalculationResult(data = {}) {
  return {
    competencia: data.competencia || '',
    totalVendasProcessadas: Number(data.totalVendasProcessadas || 0),
    totalCalculados: Number(data.totalCalculados || 0),
    totalImpedimentos: Number(data.totalImpedimentos || 0),
    valorTotalVendas: data.valorTotalVendas ?? 0,
    valorTotalComissao: data.valorTotalComissao ?? 0,
    recalculoExecutado: Boolean(data.recalculoExecutado),
    resultados: Array.isArray(data.resultados) ? data.resultados : [],
    impedimentos: Array.isArray(data.impedimentos) ? data.impedimentos : []
  }
}

export function normalizePage(data = {}) {
  return {
    content: Array.isArray(data.content) ? data.content : [],
    number: Number(data.number || 0),
    size: Number(data.size || 10),
    totalElements: Number(data.totalElements || 0),
    totalPages: Number(data.totalPages || 0),
    first: data.first !== false,
    last: data.last !== false
  }
}

export function normalizeCalculationError(error) {
  const status = error?.response?.status || null
  const timeout = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT'

  return {
    status,
    kind: timeout ? 'timeout' : status ? 'backend' : 'network',
    message: timeout
      ? 'Não foi possível confirmar a conclusão. O servidor pode ter continuado processando; consulte os resultados antes de tentar novamente.'
      : error?.response?.data?.message || (status
        ? `Não foi possível calcular a competência (erro ${status}).`
        : 'Não foi possível conectar ao serviço de cálculo.')
  }
}
