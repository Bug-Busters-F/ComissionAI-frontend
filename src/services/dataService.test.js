import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { dataService } from './dataService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn()
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

