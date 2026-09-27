import { beforeEach, describe, expect, it } from 'vitest'
import {
  CALCULATION_CACHE_PREFIX,
  clearCalculationCache,
  invalidateCalculationCache,
  readCalculationCache,
  saveCalculationCache
} from './calculationCache'

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

describe('calculationCache', () => {
  beforeEach(() => {
    globalThis.window = { sessionStorage: createStorage() }
  })

  it('stores competence, operation and receipt time with the result', () => {
    saveCalculationCache({
      competencia: '07/2025',
      tipoOperacao: 'RECALCULO',
      recebidoEm: '2026-09-27T05:12:00.000Z',
      resultado: { totalCalculados: 4 }
    })

    expect(readCalculationCache('2025-07')).toEqual({
      competencia: '2025-07',
      tipoOperacao: 'RECALCULO',
      recebidoEm: '2026-09-27T05:12:00.000Z',
      resultado: { totalCalculados: 4 }
    })
  })

  it('invalidates only affected competences when they are known', () => {
    saveCalculationCache({ competencia: '2025-07', tipoOperacao: 'CALCULO', resultado: { totalCalculados: 1 } })
    saveCalculationCache({ competencia: '2025-08', tipoOperacao: 'CALCULO', resultado: { totalCalculados: 2 } })

    expect(invalidateCalculationCache(['07/2025'])).toBe(1)
    expect(readCalculationCache('2025-07')).toBeNull()
    expect(readCalculationCache('2025-08')).not.toBeNull()
  })

  it('clears every calculation cache when the affected competences are unknown', () => {
    saveCalculationCache({ competencia: '2025-07', tipoOperacao: 'CALCULO', resultado: { totalCalculados: 1 } })
    saveCalculationCache({ competencia: '2025-08', tipoOperacao: 'CALCULO', resultado: { totalCalculados: 2 } })

    expect(clearCalculationCache()).toBe(2)
    expect(window.sessionStorage.getItem(`${CALCULATION_CACHE_PREFIX}2025-07`)).toBeNull()
    expect(window.sessionStorage.getItem(`${CALCULATION_CACHE_PREFIX}2025-08`)).toBeNull()
  })
})
