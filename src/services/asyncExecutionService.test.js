import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ASYNC_EXECUTION_STATES,
  clearExecutionRecord,
  formatExecutionStateLabel,
  generateExecutionId,
  loadExecutionRecord,
  pollAsyncExecution,
  saveExecutionRecord
} from './asyncExecutionService'

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

describe('asyncExecutionService', () => {
  beforeEach(() => {
    globalThis.window = { sessionStorage: createStorage() }
  })

  it('generates deterministic execution IDs with prefix and clean competence', () => {
    const id = generateExecutionId('APUR', '2026-10')
    expect(id).toMatch(/^APUR-202610-[0-9A-Z]+/)
  })

  it('formats execution state labels correctly', () => {
    expect(formatExecutionStateLabel(ASYNC_EXECUTION_STATES.AGUARDANDO)).toBe('Aguardando fila')
    expect(formatExecutionStateLabel(ASYNC_EXECUTION_STATES.PROCESSANDO)).toBe('Processando')
    expect(formatExecutionStateLabel(ASYNC_EXECUTION_STATES.CONCLUIDA)).toBe('Concluída')
    expect(formatExecutionStateLabel(ASYNC_EXECUTION_STATES.FALHOU)).toBe('Falhou')
  })

  it('persists and loads execution records in sessionStorage', () => {
    const record = {
      executionId: 'APUR-202610-TEST',
      status: ASYNC_EXECUTION_STATES.PROCESSANDO,
      progress: 45,
      stage: 'Calculando comissões no servidor...'
    }

    saveExecutionRecord('calculation', 'calc-2026-10', record)
    const loaded = loadExecutionRecord('calculation', 'calc-2026-10')

    expect(loaded).toMatchObject(record)
    expect(loaded.updatedAt).toBeDefined()

    clearExecutionRecord('calculation', 'calc-2026-10')
    expect(loadExecutionRecord('calculation', 'calc-2026-10')).toBeNull()
  })

  it('tolerates transient network errors during polling without failing immediately', async () => {
    let callCount = 0
    const fetchStatus = vi.fn(async () => {
      callCount += 1
      if (callCount === 1) {
        throw new Error('Falha temporária de rede')
      }
      return { status: 'CONCLUIDA', progresso: 100, stage: 'Concluído' }
    })

    const onUpdate = vi.fn()
    const result = await pollAsyncExecution({
      executionId: 'APUR-TEST',
      fetchStatus,
      onUpdate,
      intervalMs: 10,
      maxTransientFailures: 2
    })

    expect(result.status).toBe(ASYNC_EXECUTION_STATES.CONCLUIDA)
    expect(fetchStatus).toHaveBeenCalledTimes(2)
    // Primeiro update foi o aviso de oscilação transitória
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      transientWarning: expect.stringContaining('Oscilação temporária na consulta')
    }))
  })

  it('fails after exceeding max transient failures', async () => {
    const fetchStatus = vi.fn(async () => {
      throw new Error('Serviço indisponível persistentemente')
    })

    const onUpdate = vi.fn()
    const result = await pollAsyncExecution({
      executionId: 'APUR-FAIL',
      fetchStatus,
      onUpdate,
      intervalMs: 10,
      maxTransientFailures: 2
    })

    expect(result.status).toBe(ASYNC_EXECUTION_STATES.FALHOU)
    expect(result.error).toContain('Serviço indisponível persistentemente')
  })
})
