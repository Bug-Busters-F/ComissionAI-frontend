import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { calculationService } from '@/services/calculationService'
import { saveCalculationCache } from '@/services/calculationCache'
import { ASYNC_EXECUTION_STATES } from '@/services/asyncExecutionService'
import { CALCULATION_OPERATION } from '@/services/calculationFlow'
import { CALCULATION_STATUS, useCalculationStore } from './calculationStore'

const notificationMock = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}))

vi.mock('@/services/calculationService', () => ({
  calculationService: {
    calculateByCompetence: vi.fn(),
    executeAsyncCalculation: vi.fn(),
    recoverActiveCalculation: vi.fn(),
    clearActiveCalculation: vi.fn()
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

  it('mantém a execução global e emite estados assíncronos', async () => {
    calculationService.executeAsyncCalculation.mockImplementationOnce(async (comp, { onProgress }) => {
      onProgress({
        executionId: 'APUR-202507-ABC12',
        status: ASYNC_EXECUTION_STATES.AGUARDANDO,
        progress: 15,
        stage: 'Aguardando fila e validação de cobertura...'
      })
      onProgress({
        executionId: 'APUR-202507-ABC12',
        status: ASYNC_EXECUTION_STATES.PROCESSANDO,
        progress: 50,
        stage: 'Calculando comissões no servidor...'
      })
      return successfulResponse()
    })

    const store = useCalculationStore()
    const onViewResult = vi.fn()

    const execution = await store.execute({ competencia: '07/2025', onViewResult })

    expect(calculationService.executeAsyncCalculation).toHaveBeenCalledWith('2025-07', {
      recalcular: false,
      signal: null,
      onProgress: expect.any(Function)
    })
    expect(execution.started).toBe(true)
    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
    expect(store.asyncStatus).toBe(ASYNC_EXECUTION_STATES.CONCLUIDA)
    expect(store.executionId).toBe('APUR-202507-ABC12')
    expect(store.progress).toBe(100)
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
    calculationService.executeAsyncCalculation.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRequest = resolve
    }))

    const store = useCalculationStore()
    const pendingExecution = store.execute({ competencia: '2025-07', recalcular: true })

    expect(store.isProcessing).toBe(true)
    expect(store.recalculando).toBe(true)
    expect(calculationService.executeAsyncCalculation).toHaveBeenCalledTimes(1)

    const blockedExecution = await store.execute({ competencia: '2025-08' })
    expect(blockedExecution).toEqual({ started: false, reason: 'OPERACAO_EM_ANDAMENTO' })
    expect(notificationMock.warning).toHaveBeenCalledWith('Cálculo em andamento', expect.any(String))

    resolveRequest(successfulResponse())
    await pendingExecution

    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
    expect(store.asyncStatus).toBe(ASYNC_EXECUTION_STATES.CONCLUIDA)
    expect(store.tipoOperacao).toBe(CALCULATION_OPERATION.RECALCULO)
    expect(store.resultado.recalculoExecutado).toBe(true)
    expect(calculationService.executeAsyncCalculation).toHaveBeenCalledWith('2025-07', {
      recalcular: true,
      signal: null,
      onProgress: expect.any(Function)
    })
  })

  it.each([
    [CALCULATION_STATUS.COMPLETED_WITH_ISSUES, { totalCalculados: 1, totalImpedimentos: 1 }, 'Cálculo concluído com impedimentos'],
    [CALCULATION_STATUS.COMPLETED_EMPTY, { totalCalculados: 0, totalImpedimentos: 2 }, 'Nenhuma venda calculada']
  ])('distingue respostas com impedimentos (%s)', async (expectedStatus, response, title) => {
    calculationService.executeAsyncCalculation.mockResolvedValueOnce(successfulResponse(response))
    const store = useCalculationStore()

    await store.execute({ competencia: '2025-07' })

    expect(store.status).toBe(expectedStatus)
    expect(store.asyncStatus).toBe(ASYNC_EXECUTION_STATES.CONCLUIDA)
    expect(notificationMock.warning).toHaveBeenCalledWith(title, expect.any(String), expect.any(Object))
  })

  it('mantém o erro sem repetir a requisição e orienta consultar o histórico', async () => {
    calculationService.executeAsyncCalculation.mockRejectedValueOnce({ code: 'ECONNABORTED' })
    const store = useCalculationStore()
    const onViewHistory = vi.fn()

    const execution = await store.execute({ competencia: '2025-07', onViewHistory })

    expect(execution.error.kind).toBe('timeout')
    expect(store.status).toBe(CALCULATION_STATUS.ERROR)
    expect(store.asyncStatus).toBe(ASYNC_EXECUTION_STATES.FALHOU)
    expect(store.mensagemErro).toContain('O servidor pode ter continuado processando')
    expect(notificationMock.error).toHaveBeenCalledWith(
      'Falha no cálculo',
      expect.stringContaining('O servidor pode ter continuado processando'),
      expect.objectContaining({ actionLabel: 'Consultar histórico', onAction: onViewHistory })
    )
    expect(calculationService.executeAsyncCalculation).toHaveBeenCalledTimes(1)
  })

  it('mantém o modo do recálculo para uma nova tentativa explícita', async () => {
    calculationService.executeAsyncCalculation
      .mockRejectedValueOnce({ message: 'serviço indisponível' })
      .mockResolvedValueOnce(successfulResponse())
    const store = useCalculationStore()

    await store.execute({ competencia: '2025-07', recalcular: true })

    expect(store.status).toBe(CALCULATION_STATUS.ERROR)
    expect(store.tipoOperacao).toBe(CALCULATION_OPERATION.RECALCULO)
    expect(store.recalculando).toBe(true)

    await store.execute({ competencia: '2025-07', recalcular: true })

    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
    expect(calculationService.executeAsyncCalculation).toHaveBeenNthCalledWith(2, '2025-07', {
      recalcular: true,
      signal: null,
      onProgress: expect.any(Function)
    })
  })

  it('recupera acompanhamento após atualização de página (F5) sem duplicar a requisição', () => {
    calculationService.recoverActiveCalculation.mockReturnValueOnce({
      executionId: 'APUR-202507-REC01',
      competencia: '2025-07',
      tipoOperacao: 'CALCULO',
      status: ASYNC_EXECUTION_STATES.PROCESSANDO,
      progress: 60,
      stage: 'Processando comissões no servidor...',
      transientWarning: ''
    })

    const store = useCalculationStore()
    const recovered = store.recoverExecution('2025-07')

    expect(recovered).not.toBeNull()
    expect(store.executionId).toBe('APUR-202507-REC01')
    expect(store.competencia).toBe('2025-07')
    expect(store.isProcessing).toBe(true)
    expect(store.asyncStatus).toBe(ASYNC_EXECUTION_STATES.PROCESSANDO)
    expect(store.progress).toBe(60)
    expect(store.recuperadoDeSessao).toBe(true)
    // Garante que não executou chamada HTTP duplicada
    expect(calculationService.executeAsyncCalculation).not.toHaveBeenCalled()
  })

  it('permite saída e navegação segura da tela sem listener bloqueante de beforeunload', async () => {
    let resolveRequest
    calculationService.executeAsyncCalculation.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRequest = resolve
    }))
    const store = useCalculationStore()
    const pendingExecution = store.execute({ competencia: '2025-07' })

    // FRONT-11: Beforeunload bloqueante foi removido para permitir navegação livre
    expect(window.addEventListener).not.toHaveBeenCalledWith('beforeunload', expect.any(Function))

    resolveRequest(successfulResponse())
    await pendingExecution

    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
  })
})
