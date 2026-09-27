import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { calculationService } from '@/services/calculationService'
import { saveCalculationCache } from '@/services/calculationCache'
import { CALCULATION_OPERATION } from '@/services/calculationFlow'
import { CALCULATION_STATUS, useCalculationStore } from './calculationStore'

const notificationMock = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/services/calculationService', () => ({
  calculationService: {
    calculateByCompetence: vi.fn()
  },
  normalizeCalculationError: vi.fn((error) => ({
    kind: error?.code === 'ECONNABORTED' ? 'timeout' : 'network',
    message: error?.code === 'ECONNABORTED'
      ? 'Não foi possível confirmar a conclusão. O servidor pode ter continuado processando; consulte os resultados antes de tentar novamente.'
      : error?.message || 'Falha de rede'
  }))
}))

vi.mock('@/services/calculationCache', () => ({
  saveCalculationCache: vi.fn()
}))

vi.mock('./notificationStore', () => ({
  useNotificationStore: () => notificationMock
}))

function successfulResponse(overrides = {}) {
  return {
    competencia: '2025-07',
    totalVendasProcessadas: 2,
    totalCalculados: 2,
    totalImpedimentos: 0,
    valorTotalVendas: 1000,
    valorTotalComissao: 25,
    resultados: [],
    impedimentos: [],
    ...overrides
  }
}

describe('calculationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  })

  it('mantém a execução global e envia o modo normal como booleano', async () => {
    calculationService.calculateByCompetence.mockResolvedValueOnce(successfulResponse())
    const store = useCalculationStore()
    const onViewResult = vi.fn()

    const execution = await store.execute({ competencia: '07/2025', onViewResult })

    expect(calculationService.calculateByCompetence).toHaveBeenCalledWith('2025-07', {
      recalcular: false,
      signal: expect.any(AbortSignal)
    })
    expect(execution.started).toBe(true)
    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
    expect(store.tipoOperacao).toBe(CALCULATION_OPERATION.NORMAL)
    expect(store.resultado.recalculoExecutado).toBe(false)
    expect(saveCalculationCache).toHaveBeenCalledWith(expect.objectContaining({
      competencia: '2025-07',
      tipoOperacao: CALCULATION_OPERATION.NORMAL
    }))
    expect(notificationMock.success).toHaveBeenCalledWith(
      'Cálculo concluído',
      expect.any(String),
      expect.objectContaining({ actionLabel: 'Ver resultado', onAction: onViewResult })
    )
  })

  it('preserva o recálculo e bloqueia uma segunda competência durante o processamento', async () => {
    let resolveRequest
    calculationService.calculateByCompetence.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRequest = resolve
    }))

    const store = useCalculationStore()
    const pendingExecution = store.execute({ competencia: '2025-07', recalcular: true })

    expect(store.isProcessing).toBe(true)
    expect(store.recalculando).toBe(true)
    expect(calculationService.calculateByCompetence).toHaveBeenCalledTimes(1)

    const blockedExecution = await store.execute({ competencia: '2025-08' })
    expect(blockedExecution).toEqual({ started: false, reason: 'OPERACAO_EM_ANDAMENTO' })
    expect(notificationMock.warning).toHaveBeenCalledWith('Cálculo em andamento', expect.any(String))

    resolveRequest(successfulResponse())
    await pendingExecution

    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
    expect(store.tipoOperacao).toBe(CALCULATION_OPERATION.RECALCULO)
    expect(store.resultado.recalculoExecutado).toBe(true)
    expect(calculationService.calculateByCompetence).toHaveBeenCalledWith('2025-07', {
      recalcular: true,
      signal: expect.any(AbortSignal)
    })
  })

  it.each([
    [CALCULATION_STATUS.COMPLETED_WITH_ISSUES, { totalCalculados: 1, totalImpedimentos: 1 }, 'Cálculo concluído com impedimentos'],
    [CALCULATION_STATUS.COMPLETED_EMPTY, { totalCalculados: 0, totalImpedimentos: 2 }, 'Nenhuma venda calculada']
  ])('distingue respostas com impedimentos (%s)', async (expectedStatus, response, title) => {
    calculationService.calculateByCompetence.mockResolvedValueOnce(successfulResponse(response))
    const store = useCalculationStore()

    await store.execute({ competencia: '2025-07' })

    expect(store.status).toBe(expectedStatus)
    expect(notificationMock.warning).toHaveBeenCalledWith(title, expect.any(String), expect.any(Object))
  })

  it('mantém o erro sem repetir a requisição e orienta consultar o histórico', async () => {
    calculationService.calculateByCompetence.mockRejectedValueOnce({ code: 'ECONNABORTED' })
    const store = useCalculationStore()
    const onViewHistory = vi.fn()

    const execution = await store.execute({ competencia: '2025-07', onViewHistory })

    expect(execution.error.kind).toBe('timeout')
    expect(store.status).toBe(CALCULATION_STATUS.ERROR)
    expect(store.mensagemErro).toContain('O servidor pode ter continuado processando')
    expect(notificationMock.error).toHaveBeenCalledWith(
      'Falha no cálculo',
      expect.stringContaining('O servidor pode ter continuado processando'),
      expect.objectContaining({ actionLabel: 'Consultar histórico', onAction: onViewHistory })
    )
    expect(calculationService.calculateByCompetence).toHaveBeenCalledTimes(1)
  })

  it('mantém o modo do recálculo para uma nova tentativa explícita', async () => {
    calculationService.calculateByCompetence
      .mockRejectedValueOnce({ message: 'serviço indisponível' })
      .mockResolvedValueOnce(successfulResponse())
    const store = useCalculationStore()

    await store.execute({ competencia: '2025-07', recalcular: true })

    expect(store.status).toBe(CALCULATION_STATUS.ERROR)
    expect(store.tipoOperacao).toBe(CALCULATION_OPERATION.RECALCULO)
    expect(store.recalculando).toBe(true)

    await store.execute({ competencia: '2025-07', recalcular: true })

    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
    expect(calculationService.calculateByCompetence).toHaveBeenNthCalledWith(2, '2025-07', {
      recalcular: true,
      signal: expect.any(AbortSignal)
    })
  })

  it('registra o aviso de saída somente enquanto há processamento', async () => {
    let resolveRequest
    calculationService.calculateByCompetence.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRequest = resolve
    }))
    const store = useCalculationStore()
    const pendingExecution = store.execute({ competencia: '2025-07' })
    const beforeUnloadHandler = window.addEventListener.mock.calls[0][1]
    const event = { preventDefault: vi.fn(), returnValue: undefined }

    beforeUnloadHandler(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.returnValue).toBe('')

    resolveRequest(successfulResponse())
    await pendingExecution

    expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', beforeUnloadHandler)
  })
})
