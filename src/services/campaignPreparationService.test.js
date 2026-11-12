import { describe, it, expect, vi } from 'vitest'
import { createCampaignPreparationService } from './campaignPreparationService'

describe('campaignPreparationService — Correção de Bases e Aceite de Riscos ([FRONT-5], [BACK-5], [BACK-7])', () => {
  it('consulta resumo e lista linhas paginadas com filtros', async () => {
    const mockHttp = {
      get: vi.fn().mockImplementation((url, config) => {
        if (url.includes('/linhas')) {
          return Promise.resolve({
            data: {
              content: [{ numeroLinha: 1, valida: false, severidadeMaxima: 'ADVERTENCIA' }],
              totalElements: 1,
              totalPages: 1
            }
          })
        }
        return Promise.resolve({
          data: { id: 'prep-1', status: 'EM_PREPARACAO', totalLinhas: 10 }
        })
      })
    }

    const service = createCampaignPreparationService(mockHttp)
    const summary = await service.getBatchSummary(15, 'prep-1')
    expect(summary.status).toBe('EM_PREPARACAO')

    const lines = await service.listBatchLines(15, 'prep-1', { valida: false, page: 0, size: 20 })
    expect(mockHttp.get).toHaveBeenCalledWith('/campanhas/15/preparacao-bases/prep-1/linhas', {
      params: { valida: false, page: 0, size: 20 }
    })
    expect(lines.totalElements).toBe(1)
  })

  it('edita linha de preparação exigindo versão para controle de concorrência', async () => {
    const mockHttp = {
      patch: vi.fn().mockResolvedValue({
        data: { numeroLinha: 5, versao: 2, valida: true }
      })
    }

    const service = createCampaignPreparationService(mockHttp)

    await expect(
      service.editBatchLine(15, 'prep-1', 5, { motivo: 'Ajuste de cargo' })
    ).rejects.toThrow('A versão da linha é obrigatória para controle de concorrência.')

    const res = await service.editBatchLine(15, 'prep-1', 5, {
      versao: 1,
      motivo: 'Ajuste de cargo do vendedor',
      descrCargo: 'VENDEDOR'
    })

    expect(mockHttp.patch).toHaveBeenCalledWith(
      '/campanhas/15/preparacao-bases/prep-1/linhas/5',
      {
        versao: 1,
        motivo: 'Ajuste de cargo do vendedor',
        descrCargo: 'VENDEDOR'
      }
    )
    expect(res.valida).toBe(true)
  })

  it('consulta histórico de versões da linha (Antes vs. Depois)', async () => {
    const mockHttp = {
      get: vi.fn().mockResolvedValue({
        data: [
          {
            numeroLinha: 3,
            versaoAnterior: 1,
            versaoNova: 2,
            valoresAnterioresJson: '{"descrCargo":"GERENTE"}',
            valoresNovosJson: '{"descrCargo":"VENDEDOR"}',
            motivo: 'Correção de cadastro'
          }
        ]
      })
    }

    const service = createCampaignPreparationService(mockHttp)
    const hist = await service.getLineHistory(15, 'prep-1', 3)

    expect(mockHttp.get).toHaveBeenCalledWith(
      '/campanhas/15/preparacao-bases/prep-1/linhas/3/historico'
    )
    expect(hist[0].versaoNova).toBe(2)
  })

  it('consulta prévia de impacto e efetiva lote na base geral', async () => {
    const mockHttp = {
      get: vi.fn().mockResolvedValue({
        data: {
          preparacaoId: 'prep-1',
          possuiImpactos: true,
          campanhasAfetadas: [{ campanhaId: 20, titulo: 'Campanha Primavera' }]
        }
      }),
      post: vi.fn().mockResolvedValue({
        data: {
          preparacaoId: 'prep-1',
          status: 'EFETIVADO',
          reportIdGerado: 10099
        }
      })
    }

    const service = createCampaignPreparationService(mockHttp)
    const preview = await service.getImpactPreview(15, 'prep-1')
    expect(preview.possuiImpactos).toBe(true)

    const commitRes = await service.commitBatch(15, 'prep-1', {
      motivo: 'Correções auditadas e aprovadas',
      confirmarPropagacaoImpacto: true
    })

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/campanhas/15/preparacao-bases/prep-1/efetivar',
      {
        responsavel: null,
        motivo: 'Correções auditadas e aprovadas',
        confirmarPropagacaoImpacto: true
      }
    )
    expect(commitRes.status).toBe('EFETIVADO')
  })

  it('bloqueia aceite de risco para erros IMPEDITIVOS e aceita ADVERTENCIA com justificativa', async () => {
    const mockHttp = {
      post: vi.fn().mockResolvedValue({
        data: { id: 101, aceito: true, motivo: 'Aceite de divergência tolerável' }
      })
    }

    const service = createCampaignPreparationService(mockHttp)

    // Impeditivo não admite aceite
    await expect(
      service.acceptRisk(15, {
        campo: 'matricula',
        severidade: 'IMPEDITIVO',
        motivo: 'Tentativa de aceite de erro fatal'
      })
    ).rejects.toThrow('Erros impeditivos exigem correção do dado e não admitem aceite de risco.')

    // Justificativa curta lançará erro
    await expect(
      service.acceptRisk(15, {
        campo: 'descrCargo',
        severidade: 'ADVERTENCIA',
        motivo: 'abc'
      })
    ).rejects.toThrow('A justificativa do aceite é obrigatória (mínimo de 5 caracteres).')

    // Advertência válida
    const aceito = await service.acceptRisk(15, {
      campo: 'descrCargo',
      severidade: 'ADVERTENCIA',
      motivo: 'Divergência tolerável pelo fechamento'
    })

    expect(aceito.aceito).toBe(true)
  })
})
