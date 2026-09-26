import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  campaignInterpretationService,
  INTERPRETATION_TIMEOUT,
  normalizeInterpretationError
} from './campaignInterpretationService'

vi.mock('./api', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('campaignInterpretationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends only the interpretation request through Spring with its own timeout and signal', async () => {
    const signal = new AbortController().signal
    api.post.mockResolvedValueOnce({ data: { taxa: 0.05, pendencias: [] } })

    await campaignInterpretationService.interpret({
      texto: '  Comissão de 5%  ',
      contexto: { ano_referencia: 2026 }
    }, { signal })

    expect(api.post).toHaveBeenCalledWith('/interpretador/extrair-regra', {
      texto: '  Comissão de 5%  ',
      contexto: { ano_referencia: 2026 }
    }, { signal, timeout: INTERPRETATION_TIMEOUT })
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('classifies backend, timeout and network errors without inventing provider details', () => {
    expect(normalizeInterpretationError({ response: { status: 503 } }).message).toContain('indisponível')
    expect(normalizeInterpretationError({ response: { status: 504 } }).message).toContain('tempo')
    expect(normalizeInterpretationError({ code: 'ECONNABORTED' }).kind).toBe('timeout')
    expect(normalizeInterpretationError(new Error('offline')).message).toContain('conectar')
  })
})
