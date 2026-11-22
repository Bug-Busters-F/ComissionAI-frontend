import { describe, it, expect, vi } from 'vitest'
import { createCampaignCoverageService } from './campaignCoverageService'

describe('campaignCoverageService — Cobertura e Anexos de Base ([FRONT-4], [BACK-6])', () => {
  it('consulta diagnóstico de cobertura de fechamento', async () => {
    const mockHttp = {
      get: vi.fn().mockResolvedValue({
        data: {
          campanhaId: 15,
          tituloCampanha: 'Campanha Verão',
          prontaParaFechamento: true,
          competenciasCobertas: 1,
          totalCompetencias: 1,
          anexosAtivos: []
        }
      })
    }

    const service = createCampaignCoverageService(mockHttp)
    const result = await service.getCoverage(15)

    expect(mockHttp.get).toHaveBeenCalledWith('/campanhas/15/cobertura-fechamento')
    expect(result.prontaParaFechamento).toBe(true)
  })

  it('valida prontidão de fechamento', async () => {
    const mockHttp = {
      post: vi.fn().mockResolvedValue({ data: { prontaParaFechamento: true } })
    }

    const service = createCampaignCoverageService(mockHttp)
    const res = await service.validateCoverage(15)

    expect(mockHttp.post).toHaveBeenCalledWith('/campanhas/15/cobertura-fechamento/validar')
    expect(res.prontaParaFechamento).toBe(true)
  })

  it('associa lote de base existente à campanha (deduplicação)', async () => {
    const mockHttp = {
      post: vi.fn().mockResolvedValue({
        data: {
          id: 'anexo-uuid-1',
          campanhaId: 15,
          reportId: 10042,
          tipoBase: 'SALES',
          competencia: '2026-08'
        }
      })
    }

    const service = createCampaignCoverageService(mockHttp)
    const res = await service.attachBase(15, { reportId: 10042, responsavel: 'gerente@teste.com' })

    expect(mockHttp.post).toHaveBeenCalledWith('/campanhas/15/anexos-base', {
      reportId: 10042,
      responsavel: 'gerente@teste.com'
    })
    expect(res.reportId).toBe(10042)
  })

  it('desanexa lote da campanha', async () => {
    const mockHttp = {
      delete: vi.fn().mockResolvedValue({ status: 204 })
    }

    const service = createCampaignCoverageService(mockHttp)
    const ok = await service.detachBase(15, 'anexo-uuid-1', 'admin@teste.com')

    expect(mockHttp.delete).toHaveBeenCalledWith('/campanhas/15/anexos-base/anexo-uuid-1', {
      params: { responsavel: 'admin@teste.com' }
    })
    expect(ok).toBe(true)
  })

  it('lista pendências de cobertura com filtros paginados', async () => {
    const mockHttp = {
      get: vi.fn().mockResolvedValue({
        data: {
          content: [{ codigoErro: 'MATRICULA_INEXISTENTE', total: 2 }],
          totalElements: 1
        }
      })
    }

    const service = createCampaignCoverageService(mockHttp)
    const res = await service.listPendencies(15, { competencia: '2026-08', page: 0, size: 10 })

    expect(mockHttp.get).toHaveBeenCalledWith('/campanhas/15/cobertura-fechamento/pendencias', {
      params: { competencia: '2026-08', page: 0, size: 10 }
    })
    expect(res.totalElements).toBe(1)
  })
})

describe('consulta de arquivos independente da cobertura de fechamento', () => {
  it('carrega todas as páginas do histórico concluído', async () => {
    const http = { get: vi.fn().mockResolvedValueOnce({data:{content:[{reportId:4}],number:0,size:1,totalElements:2,totalPages:2}}).mockResolvedValueOnce({data:{content:[{reportId:5}],number:1,size:1,totalElements:2,totalPages:2}}) }
    expect(await createCampaignCoverageService(http).listImportedBases()).toEqual([{reportId:4},{reportId:5}])
    expect(http.get.mock.calls.map(([url,config])=>[url,config.params])).toEqual([
      ['/imports',{status:'CONCLUIDO',page:0,size:100}],['/imports',{status:'CONCLUIDO',page:1,size:100}]
    ])
  })
  it('não apresenta lista vazia como sucesso após falha ou resposta inválida', async () => {
    const http = { get: vi.fn().mockRejectedValueOnce(Error('indisponível')).mockResolvedValueOnce({data:{content:[]}}) }
    const service = createCampaignCoverageService(http)
    await expect(service.listImportedBases()).rejects.toThrow('indisponível')
    await expect(service.listImportedBases()).rejects.toThrow()
  })
})
