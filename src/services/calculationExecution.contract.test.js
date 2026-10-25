import axios from 'axios'
import { expect, it, vi } from 'vitest'
import { createCalculationExecutionClient } from './calculationExecution'

// Opt-in only: point this at a disposable backend/database, never a user's competence.
it.skipIf(!process.env.CALCULATION_CONTRACT_URL)('submits to a real backend and recovers the UUID after losing the page', async () => {
  const values = new Map()
  globalThis.window = { sessionStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) } }
  const http = axios.create({ baseURL: process.env.CALCULATION_CONTRACT_URL })
  const post = vi.spyOn(http, 'post')
  const get = vi.spyOn(http, 'get')
  const controller = new AbortController()
  const client = createCalculationExecutionClient(http, { intervalMs: 50, maxAttempts: 100 })
  await expect(client.start('2098-01', { signal: controller.signal, onProgress: (record) => {
    if (record.executionId) controller.abort()
  } })).rejects.toMatchObject({ kind: 'monitoring' })
  const saved = client.recover('2098-01')
  expect(saved.executionId).toMatch(/^[\da-f-]{36}$/i)
  const refreshed = createCalculationExecutionClient(http, { intervalMs: 50, maxAttempts: 100 })
  const result = await refreshed.resume('2098-01')
  expect(result).toMatchObject({ competencia: '2098-01', totalVendasProcessadas: 0, totalCalculados: 0, totalImpedimentos: 0, execucaoId: saved.executionId, valorTotalComissao: null })
  expect(post).toHaveBeenCalledOnce()
  expect(post.mock.calls[0][0]).toBe('/execucoes/calculo')
  expect(get.mock.calls.every(([path]) => path === `/execucoes/calculo/${saved.executionId}`)).toBe(true)
}, 30000)
