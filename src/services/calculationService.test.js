import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  calculationService,
  CALCULATION_TIMEOUT,
  normalizeCalculationError,
  normalizeCalculationResult
} from './calculationService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

describe('calculationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends one competence calculation request with the normalized backend contract', async () => {
    const signal = new AbortController().signal
    api.post.mockResolvedValueOnce({ data: { competencia: '2025-10', resultados: [] } })

    await calculationService.calculateByCompetence('2025-10', { signal })

    expect(api.post).toHaveBeenCalledWith('/comissoes/calcular-competencia', { competencia: '2025-10', recalcular: false }, {
      signal,
      timeout: CALCULATION_TIMEOUT
    })
  })

  it('sends recalcular=true when explicitly requested', async () => {
    api.post.mockResolvedValueOnce({ data: { competencia: '2025-07', resultados: [] } })

    await calculationService.calculateByCompetence('2025-07', { recalcular: true })

    expect(api.post).toHaveBeenCalledWith('/comissoes/calcular-competencia', { competencia: '2025-07', recalcular: true }, {
      signal: undefined,
      timeout: CALCULATION_TIMEOUT
    })
  })

  it('never sends a non-boolean recalcular value', async () => {
    api.post.mockResolvedValueOnce({ data: { competencia: '2025-07', resultados: [] } })

    await calculationService.calculateByCompetence('2025-07', { recalcular: 'true' })

    expect(api.post).toHaveBeenCalledWith('/comissoes/calcular-competencia', { competencia: '2025-07', recalcular: false }, {
      signal: undefined,
      timeout: CALCULATION_TIMEOUT
    })
  })

  it('normalizes totals and keeps partial impediments from a successful response', () => {
    expect(normalizeCalculationResult({
      totalVendasProcessadas: 3,
      totalCalculados: 2,
      totalImpedimentos: 1,
      resultados: [{ idVenda: '1' }],
      impedimentos: [{ idVenda: '2', motivo: 'Sem taxa' }]
    })).toMatchObject({
      totalVendasProcessadas: 3,
      totalCalculados: 2,
      totalImpedimentos: 1,
      resultados: [{ idVenda: '1' }],
      impedimentos: [{ idVenda: '2', motivo: 'Sem taxa' }]
    })
  })

  it('loads logs by date range without triggering a calculation', async () => {
    api.get.mockResolvedValueOnce({ data: { content: [], number: 0, totalPages: 0 } })

    await calculationService.listLogs({ dataInicio: '2025-10-01', dataFim: '2025-10-31' })

    expect(api.get).toHaveBeenCalledWith('/logs-calculo', {
      params: { dataInicio: '2025-10-01', dataFim: '2025-10-31', page: 0, size: 10 },
      signal: undefined
    })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('explains timeout and network failures without retrying', () => {
    expect(normalizeCalculationError({ code: 'ECONNABORTED' }).kind).toBe('timeout')
    expect(normalizeCalculationError(new Error('offline')).kind).toBe('network')
  })
})
