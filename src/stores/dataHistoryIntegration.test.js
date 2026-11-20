import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDataStore } from './dataStore'
import { useNotificationStore } from './notificationStore'
import { dataService } from '@/services/dataService'
vi.mock('../services/dataService', () => ({ dataService: { excluirLote: vi.fn() } }))
beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers(); vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks() })
describe('FRONT-12: remoção existente em Dados preserva o histórico', () => {
  it('atualiza a consulta permanente somente depois da confirmação real', async () => {
    const store = useDataStore(), notifications = useNotificationStore()
    store.loadCompetenciasFromSales = vi.fn().mockResolvedValue(); store.carregarDadosEfetivados = vi.fn().mockResolvedValue()
    store.abrirModalExclusaoEnvio({ reportId: 7, nomeArquivo: 'julho.xlsx' })
    expect(store.modalExclusao.mensagem).toContain('serão preservados')
    let resolve
    dataService.excluirLote.mockReturnValue(new Promise(done => { resolve = done }))
    const running = store.confirmarExclusao()
    expect(store.historicoRevisao).toBe(0); expect(notifications.notifications).toHaveLength(0)
    resolve({ status: 'EXCLUIDO' }); await running
    expect(dataService.excluirLote).toHaveBeenCalledWith(7, 'Exclusão solicitada pelo usuário')
    expect(store.historicoRevisao).toBe(1)
    expect(notifications.notifications[0].message).toContain('permanecem disponíveis no histórico')
  })
  it('rejeição por dependência não atualiza a lista como excluída nem mostra sucesso', async () => {
    const store = useDataStore(), notifications = useNotificationStore()
    store.abrirModalExclusaoEnvio({ reportId: 7, nomeArquivo: 'julho.xlsx' })
    dataService.excluirLote.mockRejectedValue({ response: { status: 409, data: { message: 'Há cálculos relacionados.' } } })
    await store.confirmarExclusao()
    expect(store.historicoRevisao).toBe(0)
    expect(store.modalExclusao.isOpen).toBe(true)
    expect(notifications.notifications[0]).toMatchObject({ type: 'danger', message: 'Há cálculos relacionados.' })
  })
})
