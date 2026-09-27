import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { campaignService, mapCampaignFieldErrors, normalizeCampaignError } from './campaignService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('campaignService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses only the campaign CRUD endpoints', async () => {
    api.get.mockResolvedValueOnce({ data: [{ id: 1 }] })
    api.get.mockResolvedValueOnce({ data: { id: 1 } })
    api.post.mockResolvedValueOnce({ data: { id: 1 } })
    api.put.mockResolvedValueOnce({ data: { id: 1 } })
    api.patch.mockResolvedValueOnce({ data: { id: 1, estado: 'ATIVA' } })
    api.delete.mockResolvedValueOnce({ status: 204 })

    await campaignService.list()
    await campaignService.get(1)
    await campaignService.create({ titulo: 'Campanha' })
    await campaignService.update(1, { titulo: 'Atualizada' })
    await campaignService.updateStatus(1, 'ATIVA')
    await campaignService.remove(1)

    expect(api.get).toHaveBeenNthCalledWith(1, '/campanhas')
    expect(api.get).toHaveBeenNthCalledWith(2, '/campanhas/1')
    expect(api.post).toHaveBeenCalledWith('/campanhas', { titulo: 'Campanha' })
    expect(api.put).toHaveBeenCalledWith('/campanhas/1', { titulo: 'Atualizada' })
    expect(api.patch).toHaveBeenCalledWith('/campanhas/1/estado', { estado: 'ATIVA' })
    expect(api.delete).toHaveBeenCalledWith('/campanhas/1')
  })

  it('maps backend validation fields to the form', () => {
    expect(mapCampaignFieldErrors({ titulo: 'Obrigatório', taxa: 'Positiva' })).toEqual({
      titulo: 'Obrigatório',
      taxaPercentual: 'Positiva'
    })
  })

  it('normalizes unavailable and validation errors without retrying', () => {
    const error = { response: { status: 400, data: { message: 'Dados inválidos.', validacoes: [{ campo: 'taxa', motivo: 'Positiva' }] } } }
    expect(normalizeCampaignError(error)).toEqual({
      status: 400,
      fieldErrors: { taxa: 'Positiva' },
      message: 'Dados inválidos.'
    })
    expect(normalizeCampaignError(new Error('offline')).message).toContain('conectar')
  })
})
