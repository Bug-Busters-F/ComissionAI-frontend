import api from './api'

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
