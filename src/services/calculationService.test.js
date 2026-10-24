import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  calculationService,
  CALCULATION_TIMEOUT,
  normalizeCalculationError,
  normalizeCalculationResult
} from './calculationService'
import { ASYNC_EXECUTION_STATES } from './asyncExecutionService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

function createStorage() {
  const values = new Map()
  return {
    get length() { return values.size },
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) },
    key(index) { return [...values.keys()][index] || null }
  }
}

describe('calculationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.window = { sessionStorage: createStorage() }
  })

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

  it('executes async calculation emitting AGUARDANDO, PROCESSANDO and CONCLUIDA with executionId APUR', async () => {
    const onProgress = vi.fn()
    api.post.mockResolvedValueOnce({
      data: {
        competencia: '2026-10',
        totalVendasProcessadas: 5,
        totalCalculados: 5,
        totalImpedimentos: 0,
        resultados: []
      }
    })

    const result = await calculationService.executeAsyncCalculation('10/2026', {
      recalcular: true,
      onProgress
    })

    expect(result.competencia).toBe('2026-10')
    expect(result.recalculoExecutado).toBe(true)
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      executionId: expect.stringMatching(/^APUR-202610-/),
      status: ASYNC_EXECUTION_STATES.AGUARDANDO
    }))
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      status: ASYNC_EXECUTION_STATES.PROCESSANDO
    }))
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      status: ASYNC_EXECUTION_STATES.CONCLUIDA,
      progress: 100
    }))

    // Recuperação de sessão pós-F5
    const recovered = calculationService.recoverActiveCalculation('2026-10')
    expect(recovered).toMatchObject({
      competencia: '2026-10',
      status: ASYNC_EXECUTION_STATES.CONCLUIDA
    })

    calculationService.clearActiveCalculation('2026-10')
    expect(calculationService.recoverActiveCalculation('2026-10')).toBeNull()
  })

  it('emits FALHOU and persists error in session storage when calculation fails', async () => {
    const onProgress = vi.fn()
    api.post.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Erro na apuração' } }
    })

    await expect(calculationService.executeAsyncCalculation('2026-10', { onProgress }))
      .rejects
      .toMatchObject({ message: 'Erro na apuração' })

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      status: ASYNC_EXECUTION_STATES.FALHOU,
      progress: 100
    }))
  })
})
