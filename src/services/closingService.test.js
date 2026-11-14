import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from './api'
import {
  normalizeCompetenceKey,
  getClosingStatus,
  listClosings,
  executeClosing,
  downloadClosingProof,
  saveClosingToSession,
  getClosingFromSession,
  mapClosedCompetences
} from './closingService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

describe('closingService', () => {
  let fakeStorageMap = new Map()

  beforeEach(() => {
    vi.clearAllMocks()
    fakeStorageMap = new Map()
    globalThis.sessionStorage = {
      getItem: vi.fn(k => fakeStorageMap.get(k) || null),
      setItem: vi.fn((k, v) => fakeStorageMap.set(k, String(v))),
      clear: vi.fn(() => fakeStorageMap.clear()),
      removeItem: vi.fn(k => fakeStorageMap.delete(k))
    }
  })

  describe('normalizeCompetenceKey', () => {
    it('normaliza YYYY-MM diretamente', () => {
      expect(normalizeCompetenceKey('2026-10')).toBe('2026-10')
    })

    it('converte formato brasileiro MM/YYYY para YYYY-MM', () => {
      expect(normalizeCompetenceKey('10/2026')).toBe('2026-10')
      expect(normalizeCompetenceKey('01/2027')).toBe('2027-01')
    })

    it('retorna vazio se nulo ou indefinido', () => {
      expect(normalizeCompetenceKey(null)).toBe('')
      expect(normalizeCompetenceKey('')).toBe('')
    })
  })

  describe('getClosingStatus', () => {
    it('consulta o status da competência com URL encodada', async () => {
      const mockStatus = {
        competencia: '2026-10',
        status: 'CONCLUIDO',
        bloqueada: true,
        protocolo: '11111111-2222-3333-4444-555555555555',
        fechadoEm: '2026-10-31T23:59:59Z',
        executadoPor: 'admin@empresa.com',
        mensagem: 'Competência com fechamento final concluído.'
      }
      api.get.mockResolvedValueOnce({ data: mockStatus })

      const res = await getClosingStatus('2026-10')
      expect(api.get).toHaveBeenCalledWith('/comissoes/fechamento/2026-10/status')
      expect(res).toEqual(mockStatus)
    })

    it('rejeita se competência não informada', async () => {
      await expect(getClosingStatus('')).rejects.toThrow('Competência é obrigatória')
    })
  })

  describe('listClosings', () => {
    it('lista fechamentos com paginação e filtro opcional', async () => {
      const mockPage = { content: [], totalElements: 0 }
      api.get.mockResolvedValueOnce({ data: mockPage })

      const res = await listClosings({ competencia: '10/2026', page: 0, size: 10 })
      expect(api.get).toHaveBeenCalledWith('/comissoes/fechamento', {
        params: { competencia: '2026-10', page: 0, size: 10 }
      })
      expect(res).toEqual(mockPage)
    })
  })

  describe('mapClosedCompetences', () => {
    it('mapeia apenas competências com status CONCLUIDO e ignora FALHOU ou PROCESSANDO', () => {
      const response = {
        content: [
          { competencia: '2026-10', status: 'CONCLUIDO', protocolo: 'p-1' },
          { competencia: '2026-09', status: 'FALHOU', motivoFalha: 'Erro' },
          { competencia: '2026-08', status: 'PROCESSANDO' },
          { competencia: '11/2026', status: 'CONCLUIDO', protocolo: 'p-2' }
        ]
      }

      const result = mapClosedCompetences(response)
      expect(Object.keys(result)).toEqual(['2026-10', '2026-11'])
      expect(result['2026-10'].protocolo).toBe('p-1')
      expect(result['2026-11'].protocolo).toBe('p-2')
      expect(result['2026-09']).toBeUndefined()
      expect(result['2026-08']).toBeUndefined()
    })

    it('retorna objeto vazio para lista vazia ou nula', () => {
      expect(mapClosedCompetences(null)).toEqual({})
      expect(mapClosedCompetences([])).toEqual({})
    })
  })

  describe('executeClosing', () => {
    it('valida competência inválida antes da chamada HTTP', async () => {
      await expect(
        executeClosing({ competencia: 'invalida', executadoPor: 'admin', motivo: 'Fechamento' })
      ).rejects.toThrow('Competência inválida')
      expect(api.post).not.toHaveBeenCalled()
    })

    it('exige justificativa contábil obrigatória', async () => {
      await expect(
        executeClosing({ competencia: '2026-10', executadoPor: 'admin', motivo: '   ' })
      ).rejects.toThrow('A justificativa contábil do fechamento é obrigatória')
      expect(api.post).not.toHaveBeenCalled()
    })

    it('exige usuário responsável identificado (sem fallback silencioso para SISTEMA)', async () => {
      await expect(
        executeClosing({ competencia: '2026-10', executadoPor: '   ', motivo: 'Fechamento' })
      ).rejects.toThrow('Identificação do usuário responsável é obrigatória')
      expect(api.post).not.toHaveBeenCalled()
    })

    it('dispara POST com timeout: 0 e dados esperados pelo backend', async () => {
      const mockResponse = {
        id: 'fechamento-1',
        protocolo: 'proto-uuid-1',
        competencia: '2026-10',
        status: 'CONCLUIDO',
        totalVendasProcessadas: 100,
        totalCalculados: 98,
        totalImpedimentos: 2,
        valorTotalVendas: 150000,
        valorTotalComissao: 7500,
        executadoPor: 'gerente@empresa.com',
        resultados: [{ idVenda: 'venda-1' }],
        impedimentos: [{ idVenda: 'venda-2', motivo: 'Sem taxa' }]
      }
      api.post.mockResolvedValueOnce({ data: mockResponse })

      const result = await executeClosing({
        competencia: '2026-10',
        executadoPor: 'gerente@empresa.com',
        motivo: 'Fechamento oficial de outubro/2026'
      })

      expect(api.post).toHaveBeenCalledWith(
        '/comissoes/fechamento',
        {
          competencia: '2026-10',
          executadoPor: 'gerente@empresa.com',
          motivo: 'Fechamento oficial de outubro/2026'
        },
        { timeout: 0 }
      )
      expect(result).toEqual(mockResponse)
    })

    it('trata resposta perdida em queda de rede consultando o status recuperado', async () => {
      const networkError = new Error('Network Error')
      networkError.response = undefined
      api.post.mockRejectedValueOnce(networkError)

      // Simula recuperação via getClosingStatus
      api.get.mockResolvedValueOnce({
        data: {
          competencia: '2026-10',
          status: 'PROCESSANDO',
          bloqueada: true,
          protocolo: 'proto-recuperado'
        }
      })

      await expect(
        executeClosing({
          competencia: '2026-10',
          executadoPor: 'gerente@empresa.com',
          motivo: 'Fechamento com instabilidade de rede'
        })
      ).rejects.toMatchObject({
        isNetworkRecovery: true,
        recoveredStatus: {
          status: 'PROCESSANDO',
          protocolo: 'proto-recuperado'
        }
      })
    })

    it('repassa erro de negócio HTTP 400 sem engolir detalhes', async () => {
      const badRequestError = new Error('Bad Request')
      badRequestError.response = {
        status: 400,
        data: {
          message: 'A competência 2026-10 já possui fechamento final concluído.'
        }
      }
      api.post.mockRejectedValueOnce(badRequestError)

      await expect(
        executeClosing({
          competencia: '2026-10',
          executadoPor: 'gerente',
          motivo: 'Tentativa duplicada'
        })
      ).rejects.toMatchObject({
        response: {
          status: 400
        }
      })
    })
  })

  describe('downloadClosingProof', () => {
    it('retorna objeto de comprovante com filename e payload estruturado', () => {
      const mockClosing = {
        competencia: '2026-10',
        protocolo: 'abc-123',
        totalCalculados: 10
      }

      const res = downloadClosingProof(mockClosing)
      expect(res.filename).toBe('comprovante-fechamento-2026-10-abc-123.json')
      expect(res.content || res.downloaded).toBeTruthy()
    })

    it('lança erro se dados de fechamento forem nulos ou sem protocolo', () => {
      expect(() => downloadClosingProof(null)).toThrow('Dados de fechamento inválidos')
      expect(() => downloadClosingProof({})).toThrow('Dados de fechamento inválidos')
    })
  })

  describe('saveClosingToSession e getClosingFromSession', () => {
    it('grava e recupera dados com sucesso', () => {
      const data = { protocolo: '123', competencia: '2026-10' }
      const saved = saveClosingToSession(data)
      expect(saved).toBe(true)
      expect(getClosingFromSession()).toEqual(data)
    })

    it('trata falha de cota excedida sem quebrar a execução', () => {
      globalThis.sessionStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const saved = saveClosingToSession({ huge: 'payload' })
      expect(saved).toBe(false)
      expect(warnSpy).toHaveBeenCalled()
    })

    it('retorna null se sessionStorage contiver JSON inválido', () => {
      fakeStorageMap.set('comissionai.fechamento.ultimo', 'invalid-json')
      expect(getClosingFromSession()).toBeNull()
    })
  })
})
