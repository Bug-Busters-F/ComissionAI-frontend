import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readCalculationCache, saveCalculationCache } from '@/services/calculationCache'
import { dataService } from '@/services/dataService'
import { useDataStore } from './dataStore'

vi.mock('@/services/dataService', () => ({
  TIPOS_BASE: {
    CICLO: { label: 'Ciclo' },
    COMISS: { label: 'Comissões' }
  },
  dataService: {
    uploadCicloSequencial: vi.fn(),
    uploadBase: vi.fn()
  }
}))

vi.mock('./notificationStore', () => ({
  useNotificationStore: () => ({
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  })
}))

describe('dataStore calculation cache invalidation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    globalThis.window = {
      sessionStorage: (() => {
        const values = new Map()
        return {
          get length() { return values.size },
          getItem(key) { return values.has(key) ? values.get(key) : null },
          setItem(key, value) { values.set(key, String(value)) },
          removeItem(key) { values.delete(key) },
          key(index) { return [...values.keys()][index] || null }
        }
      })()
    }
    vi.clearAllMocks()
  })

  it('invalidates the competence before a cycle upload, including partial failures', async () => {
    saveCalculationCache({ competencia: '2025-07', tipoOperacao: 'CALCULO', resultado: { totalCalculados: 10 } })
    dataService.uploadCicloSequencial.mockRejectedValueOnce(new Error('falha após persistência do RH'))

    const store = useDataStore()
    store.uploadModal.rhFile = { name: 'rh.xlsx' }
    store.uploadModal.vendasFile = { name: 'vendas.xlsx' }
    store.uploadModal.competencia = '07/2025'
    store.uploadModal.cenarioTeste = 'real'

    await store.enviarDados()

    expect(readCalculationCache('2025-07')).toBeNull()
  })

  it('clears all calculation caches before a commission-rate upload', async () => {
    saveCalculationCache({ competencia: '2025-07', tipoOperacao: 'CALCULO', resultado: { totalCalculados: 10 } })
    saveCalculationCache({ competencia: '2025-08', tipoOperacao: 'CALCULO', resultado: { totalCalculados: 12 } })
    dataService.uploadBase.mockResolvedValueOnce({ status: 'SUCESSO', totalLinhas: 1 })

    const store = useDataStore()
    store.uploadModal.modo = 'COMISS'
    store.uploadModal.comissFile = { name: 'taxas.xlsx' }
    store.uploadModal.dataInicio = '2025-07-01'
    store.uploadModal.dataFim = '2025-07-31'
    store.uploadModal.cenarioTeste = 'real'

    await store.enviarDados()

    expect(readCalculationCache('2025-07')).toBeNull()
    expect(readCalculationCache('2025-08')).toBeNull()
  })
})
