import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { dataService } from './dataService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

describe('dataService sales pagination', () => {
  beforeEach(() => vi.clearAllMocks())

  it('walks every sales page before grouping competencies', async () => {
    api.get
      .mockResolvedValueOnce({ data: { content: [{ id: '1' }], totalPages: 2 } })
      .mockResolvedValueOnce({ data: { content: [{ id: '2' }], totalPages: 2 } })

    await expect(dataService.listAllSales({ size: 1 })).resolves.toEqual([{ id: '1' }, { id: '2' }])
    expect(api.get).toHaveBeenNthCalledWith(1, '/vendas', { params: { page: 0, size: 1 }, signal: undefined })
    expect(api.get).toHaveBeenNthCalledWith(2, '/vendas', { params: { page: 1, size: 1 }, signal: undefined })
  })
})

describe('dataService uploadCicloSequencial', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normalizes competencia to YYYY-MM and passes it to sales upload', async () => {
    const rhFile = new File(['rh'], 'BASE RH_JUL25.xlsx')
    const vendasFile = new File(['vendas'], 'BASE_VENDAS_JUL25.xlsx')

    api.post
      .mockResolvedValueOnce({ data: { reportId: 1, status: 'CONCLUIDO', totalLinhas: 300 } })
      .mockResolvedValueOnce({ data: { reportId: 2, status: 'CONCLUIDO', totalLinhas: 4500 } })

    const result = await dataService.uploadCicloSequencial({
      rhFile,
      vendasFile,
      competencia: '07/2025'
    })

    expect(result.status).toBe('SUCESSO')
    expect(api.post).toHaveBeenNthCalledWith(1, '/imports/upload', expect.any(FormData), {
      params: { importType: 'HR' },
      signal: null
    })
    expect(api.post).toHaveBeenNthCalledWith(2, '/imports/upload', expect.any(FormData), {
      params: { importType: 'SALES', competencia: '2025-07' },
      signal: null
    })
  })

  it('handles 409 conflict gracefully when RH was already imported in a previous attempt', async () => {
    const rhFile = new File(['rh'], 'BASE RH_JUL25.xlsx')
    const vendasFile = new File(['vendas'], 'BASE_VENDAS_JUL25.xlsx')

    const conflictErr = new Error('Conflict')
    conflictErr.response = {
      status: 409,
      data: { message: 'Já existe um lote ativo (reportId=1, status: CONCLUIDO) para este mesmo arquivo e competência.' }
    }

    api.post.mockRejectedValueOnce(conflictErr)
    api.get.mockResolvedValueOnce({ data: { reportId: 1, status: 'CONCLUIDO', totalLinhas: 322 } })
    api.post.mockResolvedValueOnce({ data: { reportId: 2, status: 'CONCLUIDO', totalLinhas: 5000 } })

    const result = await dataService.uploadCicloSequencial({
      rhFile,
      vendasFile,
      competencia: '07/2025'
    })

    expect(result.status).toBe('SUCESSO')
    expect(result.rh.totalLinhas).toBe(322)
    expect(result.vendas.totalLinhas).toBe(5000)
  })
})

