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
    clearActiveCalculation: vi.fn(),
    resumeAsyncCalculation: vi.fn()
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
    vi.resetAllMocks()
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
    await Promise.resolve()
    expect(calculationService.executeAsyncCalculation).toHaveBeenCalledTimes(1)

    const blockedExecution = await store.execute({ competencia: '2025-08' })
    expect(blockedExecution).toEqual({ started: false, reason: 'OPERACAO_EM_ANDAMENTO' })
    expect(notificationMock.warning).toHaveBeenCalledWith('Apuração em acompanhamento', expect.any(String))

    await Promise.resolve()
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
      'Não foi possível concluir a apuração',
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

  it('recovers after F5 by querying the saved execution, without starting another job', async () => {
    const record = { executionId: '11111111-1111-4111-8111-111111111111', competencia: '2025-07', recalcular: false, status: ASYNC_EXECUTION_STATES.PROCESSANDO, progress: 60 }
    calculationService.recoverActiveCalculation.mockReturnValue(record)
    calculationService.resumeAsyncCalculation.mockResolvedValueOnce(successfulResponse())
    const store = useCalculationStore()
    expect(store.recoverExecution('2025-07')).toEqual(record)
    await store.monitoringPromise
    expect(calculationService.resumeAsyncCalculation).toHaveBeenCalledOnce()
    expect(calculationService.executeAsyncCalculation).not.toHaveBeenCalled()
    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
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

    await Promise.resolve()
    resolveRequest(successfulResponse())
    await pendingExecution

    expect(store.status).toBe(CALCULATION_STATUS.COMPLETED)
  })
})

it('does not replace an ongoing July calculation when navigating to cached August results', async () => {
  setActivePinia(createPinia()); vi.resetAllMocks()
  let finish
  calculationService.executeAsyncCalculation.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  calculationService.recoverActiveCalculation.mockImplementation((competencia) => competencia === '2025-08' ? { competencia: '2025-08', status: ASYNC_EXECUTION_STATES.CONCLUIDA, result: successfulResponse({ competencia: '2025-08' }) } : null)
  const store = useCalculationStore()
  const execution = store.execute({ competencia: '2025-07' })
  await Promise.resolve()
  store.recoverExecution('2025-08')
  expect(store.competencia).toBe('2025-07')
  expect(store.isProcessing).toBe(true)
  finish(successfulResponse())
  await execution
  expect(store.resultado.competencia).toBe(store.competencia)
  expect(store.competencia).toBe('2025-07')
})

it('does not create two monitors when the topbar and view recover the same job', async () => {
  setActivePinia(createPinia()); vi.resetAllMocks()
  const record = { competencia: '2025-07', recalcular: false, executionId: 'uuid', status: ASYNC_EXECUTION_STATES.PROCESSANDO }
  calculationService.recoverActiveCalculation.mockReturnValue(record)
  let finish
  calculationService.resumeAsyncCalculation.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const store = useCalculationStore()
  store.recoverExecution(); store.recoverExecution('2025-07')
  await Promise.resolve()
  expect(calculationService.resumeAsyncCalculation).toHaveBeenCalledOnce()
  finish(successfulResponse()); await store.monitoringPromise
  expect(calculationService.executeAsyncCalculation).not.toHaveBeenCalled()
})

it('keeps an unconfirmed job blocked and resumes tracking without starting a second calculation', async () => {
  setActivePinia(createPinia()); vi.resetAllMocks()
  calculationService.executeAsyncCalculation.mockImplementationOnce(async (_c, { onProgress }) => {
    onProgress({ executionId: 'uuid', status: ASYNC_EXECUTION_STATES.PROCESSANDO, progress: 50, stage: 'Calculando.' })
    throw { kind: 'monitoring', message: 'Consulta indisponível.' }
  })
  const store = useCalculationStore()
  await store.execute({ competencia: '2025-07' })
  expect(store.asyncStatus).toBe(ASYNC_EXECUTION_STATES.ACOMPANHAMENTO_PAUSADO)
  expect(store.progress).toBe(50)
  expect(store.hasError).toBe(false)
  expect(store.isProcessing).toBe(true)
  expect(notificationMock.success).not.toHaveBeenCalled()
  expect(notificationMock.error).not.toHaveBeenCalled()
  expect((await store.execute({ competencia: '2025-08' })).started).toBe(false)
  calculationService.resumeAsyncCalculation.mockResolvedValueOnce(successfulResponse())
  await store.resumeExecution()
  expect(calculationService.executeAsyncCalculation).toHaveBeenCalledOnce()
  expect(calculationService.resumeAsyncCalculation).toHaveBeenCalledOnce()
  expect(store.resultado.competencia).toBe('2025-07')
})

it('ignores old progress after a new execution has started', async () => {
  setActivePinia(createPinia()); vi.resetAllMocks()
  let oldProgress, finish
  calculationService.executeAsyncCalculation.mockImplementationOnce(async (_c, { onProgress }) => { oldProgress = onProgress; return successfulResponse() })
  const store = useCalculationStore()
  await store.execute({ competencia: '2025-07' })
  calculationService.executeAsyncCalculation.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const second = store.execute({ competencia: '2025-08' })
  await Promise.resolve()
  oldProgress({ executionId: 'old-uuid', status: ASYNC_EXECUTION_STATES.PROCESSANDO, progress: 90, stage: 'Resposta antiga.' })
  expect(store.executionId).toBe('')
  expect(store.progress).toBeNull()
  expect(store.competencia).toBe('2025-08')
  finish(successfulResponse({ competencia: '2025-08' })); await second
})

it('never caches or reports a result belonging to another competence', async () => {
  setActivePinia(createPinia()); vi.resetAllMocks()
  calculationService.executeAsyncCalculation.mockResolvedValueOnce(successfulResponse({ competencia: '2025-08' }))
  const store = useCalculationStore()
  const outcome = await store.execute({ competencia: '2025-07' })
  expect(outcome.error.kind).toBe('monitoring')
  expect(store.resultado).toBeNull()
  expect(saveCalculationCache).not.toHaveBeenCalled()
  expect(notificationMock.success).not.toHaveBeenCalled()
})
