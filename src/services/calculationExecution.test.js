import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCalculationExecutionClient } from './calculationExecution'
import { ASYNC_EXECUTION_STATES as S } from './asyncExecutionService'

const id = '11111111-1111-4111-8111-111111111111'
const raw = (overrides = {}) => ({ id, competencia: '2025-07', recalcular: false, status: 'SOLICITADA', totalItens: 2,
  itensProcessados: 0, percentual: 0, resultado: null, falha: null, ...overrides })
const done = (overrides = {}) => raw({ status: 'CONCLUIDA', itensProcessados: 2, percentual: 100, resultado: 'vendas=2,sucessos=1,impedimentos=1', ...overrides })
function storage() { const values = new Map(); return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) } }
function setup(options = {}) {
  const http = { post: vi.fn(async () => ({ data: raw() })), get: vi.fn(async () => ({ data: done() })) }
  const config = { delay: vi.fn(async () => {}), maxAttempts: 4, maxTransientFailures: 1, ...options }
  return { http, client: createCalculationExecutionClient(http, config), config }
}
beforeEach(() => { globalThis.window = { sessionStorage: storage() } })
describe('real asynchronous calculation contract', () => {
  it('submits once, preserves the UUID and uses only real percentages and counts', async () => {
    const { http, client } = setup()
    http.get.mockResolvedValueOnce({ data: raw({ status: 'PROCESSANDO', percentual: 50, itensProcessados: 1 }) }).mockResolvedValueOnce({ data: done() })
    const updates = []
    const result = await client.start('07/2025', { onProgress: (r) => updates.push(r) })
    expect(http.post).toHaveBeenCalledOnce()
    expect(http.post).toHaveBeenCalledWith('/execucoes/calculo', expect.objectContaining({ competencia: '2025-07', recalcular: false, chaveIdempotencia: expect.any(String) }), expect.objectContaining({ headers: { 'Idempotency-Key': expect.any(String) }, timeout: 30000 }))
    expect(http.post.mock.calls[0][1].chaveIdempotencia).toBe(http.post.mock.calls[0][2].headers['Idempotency-Key'])
    expect(http.get.mock.calls.every(([path]) => path === `/execucoes/calculo/${id}`)).toBe(true)
    expect(updates.map((r) => r.progress)).toEqual([null, 0, 50, 100])
    expect(result).toMatchObject({ totalVendasProcessadas: 2, totalCalculados: 1, totalImpedimentos: 1, valorTotalComissao: null, valorTotalVendas: null, resumoExecucao: true, execucaoId: id })
    expect(client.recover()).toBeNull()
    expect(client.recover('2025-07').status).toBe(S.CONCLUIDA)
  })
  it('recovers after F5 using GET, without inspecting logs or starting another calculation', async () => {
    const { client, http, config } = setup({ maxTransientFailures: 0 })
    http.get.mockRejectedValueOnce(new Error('offline'))
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
    const refreshed = createCalculationExecutionClient(http, config)
    expect(refreshed.recover().executionId).toBe(id)
    const result = await refreshed.resume('2025-07')
    expect(result.totalCalculados).toBe(1)
    expect(http.post).toHaveBeenCalledOnce()
    expect(http.get).toHaveBeenLastCalledWith(`/execucoes/calculo/${id}`, expect.any(Object))
  })
  it('recovers a lost submission response by reusing its exact idempotency key', async () => {
    const { client, http, config } = setup()
    http.post.mockRejectedValueOnce(Object.assign(new Error('response lost'), { code: 'ECONNABORTED' })).mockResolvedValueOnce({ data: done() })
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
    const saved = client.recover('2025-07')
    expect(saved.executionId).toBe('')
    await createCalculationExecutionClient(http, config).resume('2025-07')
    expect(http.post.mock.calls[0][1]).toEqual(http.post.mock.calls[1][1])
    expect(http.post.mock.calls[0][2].headers).toEqual(http.post.mock.calls[1][2].headers)
  })
  it('tolerates transient GET errors without replacing known progress or the execution ID', async () => {
    const { client, http } = setup()
    http.get.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: done() })
    const updates = []
    await client.start('2025-07', { onProgress: (r) => updates.push(r) })
    const warning = updates.find((r) => r.transientWarning)
    expect(warning).toMatchObject({ executionId: id, progress: 0, status: S.AGUARDANDO })
    expect(http.post).toHaveBeenCalledOnce()
  })
  it('pauses on polling timeout, keeps the lock and permits later GET recovery', async () => {
    const { client, http } = setup({ maxAttempts: 1 })
    http.get.mockResolvedValue({ data: raw({ status: 'PROCESSANDO', percentual: 50, itensProcessados: 1 }) })
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
    expect(client.recover()).toMatchObject({ status: S.ACOMPANHAMENTO_PAUSADO, progress: 50, executionId: id })
    http.get.mockResolvedValueOnce({ data: done() })
    await client.resume('2025-07')
    expect(http.post).toHaveBeenCalledOnce()
  })
  it('keeps a real failure distinct from a connection error and retries only on explicit start', async () => {
    const { client, http } = setup()
    http.post.mockResolvedValueOnce({ data: raw({ status: 'FALHOU', falha: 'Período fechado.' }) })
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'execution', message: 'Período fechado.' })
    expect(client.recover('2025-07').status).toBe(S.FALHOU)
    expect(http.get).not.toHaveBeenCalled()
    http.post.mockResolvedValueOnce({ data: raw() })
    await client.start('2025-07')
    expect(http.post.mock.calls[1][0]).toBe(`/execucoes/calculo/${id}/retomar`)
    expect(http.post.mock.calls.filter(([p]) => p === '/execucoes/calculo')).toHaveLength(1)
  })
  it('does not repeat a failed-job retry after its response is lost', async () => {
    const { client, http } = setup()
    http.post.mockResolvedValueOnce({ data: raw({ status: 'FALHOU', falha: 'Fila indisponível.' }) })
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'execution' })
    http.post.mockRejectedValueOnce(new Error('retry response lost'))
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
    await client.resume('2025-07')
    expect(http.post).toHaveBeenCalledTimes(2)
  })
  it.each([400, 409])('preserves a definitive HTTP %s rejection without inventing an execution', async (status) => {
    const { client, http } = setup()
    http.post.mockRejectedValueOnce({ response: { status, data: { message: 'Solicitação rejeitada.' } } })
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'rejected', message: 'Solicitação rejeitada.' })
    expect(client.recover()).toBeNull()
    expect(client.recover('2025-07')).toBeNull()
    expect(http.get).not.toHaveBeenCalled()
  })
  it.each([
    { competencia: '2025-08' }, { recalcular: true }, { status: 'INVALID' }, { id: 'not-a-uuid' }, { percentual: 105 }, { itensProcessados: 3 }
  ])('rejects an incompatible execution response %j', async (bad) => {
    const { client, http } = setup()
    http.post.mockResolvedValueOnce({ data: raw(bad) })
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
    expect(client.recover().result).toBeNull()
    expect(client.recover().status).toBe(S.ACOMPANHAMENTO_PAUSADO)
  })
  it.each(['', 'vendas=2,sucessos=2,impedimentos=1', 'vendas=3,sucessos=2,impedimentos=1', 'not a result'])('never fabricates a result for invalid completion summary %s', async (resultado) => {
    const { client, http } = setup()
    http.post.mockResolvedValueOnce({ data: done({ resultado }) })
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
    expect(client.recover().status).not.toBe(S.CONCLUIDA)
  })
  it('accepts the actual completed zero-sales contract without inventing money', async () => {
    const { client, http } = setup()
    http.post.mockResolvedValueOnce({ data: done({ totalItens: 0, itensProcessados: 0, resultado: 'vendas=0,sucessos=0,impedimentos=0' }) })
    expect(await client.start('2025-07')).toMatchObject({ totalCalculados: 0, totalVendasProcessadas: 0, valorTotalComissao: null })
  })
  it('never submits another competence while one is unconfirmed', async () => {
    const { client, http } = setup()
    http.post.mockRejectedValueOnce(new Error('offline'))
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
    await expect(client.start('2025-08')).rejects.toMatchObject({ kind: 'rejected' })
    expect(http.post).toHaveBeenCalledOnce()
  })
  it('does not submit if the tracking record cannot be stored', async () => {
    globalThis.window.sessionStorage.setItem = () => { throw new Error('storage denied') }
    const { client, http } = setup()
    await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'rejected' })
    expect(http.post).not.toHaveBeenCalled()
  })
  it('does not submit after cancellation and keeps the request key recoverable', async () => {
    const { client, http } = setup()
    const controller = new AbortController(); controller.abort()
    await expect(client.start('2025-07', { signal: controller.signal })).rejects.toMatchObject({ kind: 'monitoring' })
    expect(http.post).not.toHaveBeenCalled()
    expect(client.recover().idempotencyKey).toBeTruthy()
  })
})

it('rejects a different valid UUID returned while following an execution', async () => {
  const { client, http } = setup()
  http.get.mockResolvedValueOnce({ data: done({ id: '22222222-2222-4222-8222-222222222222' }) })
  await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'monitoring' })
  expect(client.recover().executionId).toBe(id)
  expect(client.recover().result).toBeNull()
})

it('shows the current rejection reason if a failed execution cannot be retried after closing', async () => {
  const { client, http } = setup()
  const failed = raw({ status: 'FALHOU', falha: 'Falha anterior na fila.' })
  http.post.mockResolvedValueOnce({ data: failed })
  await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'execution' })
  http.post.mockRejectedValueOnce({ response: { status: 400, data: { message: 'Competência fechada.' } } })
  http.get.mockResolvedValueOnce({ data: failed })
  await expect(client.start('2025-07')).rejects.toMatchObject({ kind: 'execution', message: 'Competência fechada.' })
  expect(client.recover()).toBeNull()
  expect(client.recover('2025-07').status).toBe(S.FALHOU)
})
