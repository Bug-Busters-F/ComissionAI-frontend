import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCommissionReportApi,
  isCompetenceClosed,
  mergeCollaboratorReport,
  resolveFilename,
  CLOSING_STATUS,
  EXPORT_REPORT_TYPES
} from './commissionReportApi'

describe('commissionReportApi', () => {
  describe('isCompetenceClosed', () => {
    it('returns true when status is CONCLUIDO', () => {
      expect(isCompetenceClosed({ status: 'CONCLUIDO', bloqueada: false })).toBe(true)
    })

    it('returns true when status is CONCLUIDA (defensive normalization)', () => {
      expect(isCompetenceClosed({ status: 'CONCLUIDA' })).toBe(true)
    })

    it('returns true when bloqueada is true regardless of status casing', () => {
      expect(isCompetenceClosed({ status: 'qualquer', bloqueada: true })).toBe(true)
    })

    it('returns false when status is ABERTA or not closed', () => {
      expect(isCompetenceClosed({ status: 'ABERTA', bloqueada: false })).toBe(false)
      expect(isCompetenceClosed({ status: 'PROCESSANDO', bloqueada: false })).toBe(false)
      expect(isCompetenceClosed(null)).toBe(false)
      expect(isCompetenceClosed({})).toBe(false)
    })
  })

  describe('mergeCollaboratorReport', () => {
    it('unifies individual detailed report with collaborator names from summary array', () => {
      const porColaborador = [
        {
          matricula: '1001',
          codCargo: 100,
          nomeCargo: 'Vendedor Loja',
          codLoja: 14,
          nomeLoja: 'Loja Centro',
          codMarca: 10,
          nomeMarca: 'Marca Preto',
          quantidadeVendas: 10,
          valorTotalVendas: 50000,
          valorTotalComissao: 2000,
          valorTotalBonus: 500,
          valorTotalAPagar: 2500,
          taxaMediaEfetiva: 0.04
        }
      ]
      const totaisPorColaborador = [
        {
          matricula: '1001',
          nomeColaborador: 'Carlos Eduardo',
          cargo: 'Vendedor Loja',
          loja: 'Loja Centro'
        }
      ]

      const merged = mergeCollaboratorReport(porColaborador, totaisPorColaborador)
      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual({
        matricula: '1001',
        nomeColaborador: 'Carlos Eduardo',
        codCargo: 100,
        cargo: 'Vendedor Loja',
        codLoja: 14,
        loja: 'Loja Centro',
        codMarca: 10,
        marca: 'Marca Preto',
        quantidadeVendas: 10,
        valorTotalVendas: 50000,
        valorTotalComissao: 2000,
        valorTotalBonusPercentual: 0,
        valorTotalBonusFixo: 0,
        valorTotalBonus: 500,
        valorTotalAPagar: 2500,
        taxaMediaEfetiva: 0.04,
        rowKey: '1001-14-100-0'
      })
    })

    it('preserves null in valorTotalAPagar when absent without silent false fallbacks', () => {
      const porColaborador = [
        {
          matricula: '1002',
          quantidadeVendas: 5,
          valorTotalComissao: 1000,
          valorTotalAPagar: null
        }
      ]
      const merged = mergeCollaboratorReport(porColaborador, [])
      expect(merged[0].valorTotalAPagar).toBeNull()
      expect(merged[0].nomeColaborador).toBe('Colaborador 1002')
    })

    it('handles empty or non-array inputs safely', () => {
      expect(mergeCollaboratorReport(null, null)).toEqual([])
      expect(mergeCollaboratorReport([], [])).toEqual([])
    })
  })

  describe('resolveFilename', () => {
    it('extracts filename from Content-Disposition header with quotes', () => {
      const header = 'attachment; filename="relatorio_fechamento_2025-08.csv"'
      expect(resolveFilename(header, '2025-08', 'CONSOLIDADO_COLABORADOR')).toBe('relatorio_fechamento_2025-08.csv')
    })

    it('extracts filename from Content-Disposition with UTF-8 encoding prefix', () => {
      const header = "attachment; filename*=UTF-8''relatorio_equipe_2025-08.csv"
      expect(resolveFilename(header, '2025-08', 'CONSOLIDADO_EQUIPE')).toBe('relatorio_equipe_2025-08.csv')
    })

    it('uses clean fallback when header is missing or invalid', () => {
      expect(resolveFilename(null, '2025-08', EXPORT_REPORT_TYPES.CONSOLIDADO_COLABORADOR)).toBe(
        'relatorio_consolidado_colaborador_2025-08.csv'
      )
    })
  })

  describe('createCommissionReportApi endpoints', () => {
    let httpMock

    beforeEach(() => {
      httpMock = {
        get: vi.fn()
      }
    })

    it('calls GET /comissoes/fechamento/{competencia}/status successfully', async () => {
      httpMock.get.mockResolvedValueOnce({
        data: { competencia: '2025-08', status: 'CONCLUIDO', bloqueada: true }
      })
      const api = createCommissionReportApi(httpMock)

      const result = await api.getCompetenceClosingStatus('2025-08')
      expect(httpMock.get).toHaveBeenCalledWith('/comissoes/fechamento/2025-08/status')
      expect(result.status).toBe('CONCLUIDO')
    })

    it('calls GET /comissoes/fechamento/{competencia}/relatorio successfully', async () => {
      httpMock.get.mockResolvedValueOnce({
        data: {
          competencia: '2025-08',
          totaisPorRegra: [],
          porColaborador: []
        }
      })
      const api = createCommissionReportApi(httpMock)

      const result = await api.getConsolidatedReport('2025-08')
      expect(httpMock.get).toHaveBeenCalledWith('/comissoes/fechamento/2025-08/relatorio')
      expect(result.competencia).toBe('2025-08')
    })

    it('performs authenticated CSV export with responseType blob and triggers download', async () => {
      const fakeBlobData = 'matricula;nome;total\n1001;Carlos;2500'
      httpMock.get.mockResolvedValueOnce({
        data: fakeBlobData,
        headers: {
          'content-disposition': 'attachment; filename="fechamento_2025-08.csv"'
        }
      })

      const appendChildSpy = vi.fn()
      const removeChildSpy = vi.fn()
      const clickSpy = vi.fn()

      const createObjectURLMock = vi.fn(() => 'blob:http://localhost/mock-url')
      const revokeObjectURLMock = vi.fn()

      globalThis.window = {
        URL: {
          createObjectURL: createObjectURLMock,
          revokeObjectURL: revokeObjectURLMock
        }
      }

      globalThis.document = {
        createElement: vi.fn(() => ({
          href: '',
          setAttribute: vi.fn(),
          click: clickSpy
        })),
        body: {
          appendChild: appendChildSpy,
          removeChild: removeChildSpy
        }
      }

      const api = createCommissionReportApi(httpMock)
      const res = await api.exportReportCsv('2025-08', EXPORT_REPORT_TYPES.CONSOLIDADO_COLABORADOR, ';')

      expect(httpMock.get).toHaveBeenCalledWith(
        '/comissoes/fechamento/2025-08/relatorio/exportar',
        {
          params: { tipo: 'CONSOLIDADO_COLABORADOR', delimitador: ';' },
          responseType: 'blob'
        }
      )
      expect(createObjectURLMock).toHaveBeenCalled()
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/mock-url')
      expect(clickSpy).toHaveBeenCalled()
      expect(res.filename).toBe('fechamento_2025-08.csv')
      expect(res.success).toBe(true)
    })

    it('converts Blob error responses into user-facing error messages on failure', async () => {
      const errorJson = JSON.stringify({ message: 'Competência não possui fechamento realizado.' })
      const errorBlob = {
        text: vi.fn().mockResolvedValueOnce(errorJson)
      }

      httpMock.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: errorBlob
        }
      })

      // Simulate Blob check in Node test
      globalThis.Blob = class {}
      Object.setPrototypeOf(errorBlob, globalThis.Blob.prototype)

      const api = createCommissionReportApi(httpMock)
      await expect(api.exportReportCsv('2025-08')).rejects.toThrow('Competência não possui fechamento realizado.')
    })
  })
})

