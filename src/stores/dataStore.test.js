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
    uploadBase: vi.fn(),
    fetchCompetenciasReferencia: vi.fn(),
    excluirLote: vi.fn()
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
    dataService.fetchCompetenciasReferencia.mockResolvedValue([])
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

  it('auto-detects competence month and year when attaching RH or Vendas files', () => {
    const store = useDataStore()
    store.openCicloModal(null)
    expect(store.uploadModal.competencia).toBe('')

    store.setRhFile({ name: 'BASE RH_NOV25.xlsx' })
    expect(store.uploadModal.competencia).toBe('11/2025')
    expect(store.uploadModal.competenciaNome).toBe('Novembro')
    expect(store.nomeCompetenciaFormatada).toBe('Novembro')

    store.setVendasFile({ name: 'BASE_VENDAS_JUL25.xlsx' })
    expect(store.uploadModal.competencia).toBe('07/2025')
    expect(store.uploadModal.competenciaNome).toBe('Julho')
  })
})


describe('competências persistidas', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
  const reference = { competencia: '2025-08', totalVendas: 10, totalVendasComVinculoValido: 9, totalVendasComImpedimento: 1, possuiBaseComiss: false, totalTaxasBaseCadastradas: 0, statusReferencia: 'PARCIAL', mensagens: ['Há vendas com vínculo inválido.'] }

  it('recria o card após recarregar, usando a mesma referência da simulação', async () => {
    dataService.fetchCompetenciasReferencia.mockResolvedValue([reference])
    const first = useDataStore()
    await first.loadCompetenciasFromSales()
    const saved = JSON.parse(JSON.stringify(first.competencias))
    setActivePinia(createPinia()) // F5: nenhum estado local é reaproveitado.
    const reloaded = useDataStore()
    await reloaded.loadCompetenciasFromSales()
    expect(reloaded.competencias).toEqual(saved)
    expect(reloaded.competencias[0]).toMatchObject({ competencia: '2025-08', vendasCount: 10, cicloFechado: true, statusReferencia: 'PARCIAL', tone: 'warning' })
    expect(reloaded.competencias[0].bases[2].value).toBe('Pendente')
  })

  it('descarta card local sem vendas ou taxas confirmadas', async () => {
    dataService.fetchCompetenciasReferencia.mockResolvedValue([])
    const store = useDataStore()
    store.obterOuCriarCompetencia('08/2025').cicloFechado = true
    await store.loadCompetenciasFromSales()
    expect(store.competencias).toEqual([])
  })

  it('exibe erro de consulta em vez de substituir a referência por sucesso vazio', async () => {
    dataService.fetchCompetenciasReferencia.mockRejectedValue(new Error('Backend indisponível'))
    const store = useDataStore()
    await store.loadCompetenciasFromSales()
    expect(store.competenciasError).toBe('Backend indisponível')
    expect(store.competenciasLoading).toBe(false)
  })

  it('preserva apenas o card temporário da competência em processamento', async () => {
    dataService.fetchCompetenciasReferencia.mockResolvedValue([])
    const store = useDataStore()
    store.obterOuCriarCompetencia('08/2025')
    store.obterOuCriarCompetencia('09/2025')
    store.activeJob = { status: 'PROCESSING', competencia: '08/2025' }
    await store.loadCompetenciasFromSales()
    expect(store.competencias.map((item) => item.competencia)).toEqual(['2025-08'])
    expect(store.competencias[0].cicloFechado).toBe(false)
  })

  it('não permite concluir uma carga rejeitada por chamada direta', async () => {
    const store = useDataStore()
    store.uploadModal.report = { status: 'REJEITADO', rejeicaoIntegral: true }
    await store.concluirCarga()
    expect(store.competencias).toEqual([])
  })

  it('abre taxas para a competência selecionada, preservando o ano', () => {
    const store = useDataStore()
    store.openComissModal('08/2025')
    expect(store.uploadModal.dataInicio).toBe('2025-08-01')
    expect(store.uploadModal.dataFim).toBe('2025-08-31')
  })
})


describe('exclusão de lotes da dev', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
  it('preserva o histórico quando o backend rejeita a remoção', async () => {
    dataService.excluirLote.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Lote em uso.' } } })
    const store = useDataStore()
    store.enviosHistorico = [{ id: 'env', reportId: 3 }, { id: 'other', reportId: 4 }]
    store.modalExclusao = { tipo: 'ENVIO', item: store.enviosHistorico[0], loading: false }
    await store.confirmarExclusao()
    expect(store.enviosHistorico).toHaveLength(2)
  })
  it('não exclui apenas localmente envios sem ID persistido', async () => {
    const store = useDataStore()
    store.enviosHistorico = [{ id: 'env' }]
    store.modalExclusao = { tipo: 'ENVIO', item: store.enviosHistorico[0], loading: false }
    await store.confirmarExclusao()
    expect(store.enviosHistorico).toHaveLength(1)
    expect(dataService.excluirLote).not.toHaveBeenCalled()
  })
})
