import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { dataService } from './dataService'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
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
      .mockResolvedValueOnce({ data: { reportId: 1, nomeArquivo: 'BASE RH_JUL25.xlsx', tipoBase: 'HR', status: 'CONCLUIDO', totalLinhas: 300 } })
      .mockResolvedValueOnce({ data: { reportId: 2, nomeArquivo: 'BASE_VENDAS_JUL25.xlsx', tipoBase: 'SALES', status: 'CONCLUIDO', totalLinhas: 4500 } })

    const result = await dataService.uploadCicloSequencial({
      rhFile,
      vendasFile,
      competencia: '07/2025'
    })

    expect(result.status).toBe('SUCESSO')
    expect(api.post).toHaveBeenNthCalledWith(1, '/imports/upload', expect.any(FormData), expect.objectContaining({
      params: { importType: 'HR' },
      signal: null
    }))
    expect(api.post).toHaveBeenNthCalledWith(2, '/imports/upload', expect.any(FormData), expect.objectContaining({
      params: { importType: 'SALES', competencia: '2025-07' },
      signal: null
    }))
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
    api.get.mockResolvedValueOnce({ data: { reportId: 1, nomeArquivo: 'BASE RH_JUL25.xlsx', tipoBase: 'HR', status: 'CONCLUIDO', totalLinhas: 322 } })
    api.post.mockResolvedValueOnce({ data: { reportId: 2, nomeArquivo: 'BASE_VENDAS_JUL25.xlsx', tipoBase: 'SALES', status: 'CONCLUIDO', totalLinhas: 5000 } })

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



describe('integração da dev com confirmação real', () => {
  beforeEach(() => vi.resetAllMocks())
  const files = () => ({ rhFile: new File(['rh'], 'rh.xlsx'), vendasFile: new File(['v'], 'vendas.xlsx'), competencia: '07/2025' })
  const report = (type, status = 'CONCLUIDO') => ({ reportId: type === 'HR' ? 1 : 2, nomeArquivo: type === 'HR' ? 'rh.xlsx' : 'vendas.xlsx', tipoBase: type, status, totalLinhas: status === 'CONCLUIDO' ? 10 : 0, mensagem: status === 'FALHOU' ? 'Venda fora do mês.' : null })

  it('mantém o relatório da dev e informa RH confirmado se vendas forem rejeitadas', async () => {
    api.post.mockResolvedValueOnce({ data: report('HR') }).mockResolvedValueOnce({ data: report('SALES', 'FALHOU') })
    const result = await dataService.uploadCicloSequencial(files())
    expect(result).toMatchObject({ status: 'REJEITADO', rejeicaoIntegral: false, rh: { status: 'SUCESSO', reportId: 1 }, vendas: { status: 'REJEITADO', reportId: 2 } })
  })

  it('não envia vendas após rejeição do RH', async () => {
    api.post.mockResolvedValueOnce({ data: report('HR', 'FALHOU') })
    const result = await dataService.uploadCicloSequencial(files())
    expect(result.status).toBe('REJEITADO'); expect(api.post).toHaveBeenCalledOnce()
  })

  it('preserva metadados e não duplica competência entre query e multipart', async () => {
    api.post.mockResolvedValueOnce({ data: report('HR') }).mockResolvedValueOnce({ data: report('SALES') })
    const result = await dataService.uploadCicloSequencial(files())
    expect(result).toMatchObject({ status: 'SUCESSO', reportIds: [1, 2] })
    const [, body, config] = api.post.mock.calls[1]
    expect(body.has('competencia')).toBe(false)
    expect(config.params.competencia).toBe('2025-07')
  })

  it('não envia vendas nem simula sucesso após erro de rede no RH', async () => {
    api.post.mockRejectedValueOnce(new Error('Sem conexão'))
    await expect(dataService.uploadCicloSequencial(files())).rejects.toThrow('Sem conexão')
    expect(api.post).toHaveBeenCalledOnce()
  })

  it('interrompe substituição de taxas se o backend bloquear a remoção do lote', async () => {
    api.get.mockResolvedValueOnce({ data: { content: [{ reportId: 8 }] } })
    api.delete.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Lote em uso por campanha ativa.' } } })
    await expect(dataService.uploadBase({ tipoBase: 'COMISS', file: files().rhFile, competencia: '07/2025', substituirBase: true })).rejects.toThrow('Lote em uso por campanha ativa')
    expect(api.post).not.toHaveBeenCalled()
  })

  it.each([['deleteMatricula', 'a', '/matriculas/a'], ['deleteVenda', 'b', '/vendas/b'], ['deleteComissao', 'c', '/bases-comissao/c'], ['deleteTodasMatriculas', undefined, '/matriculas/todas'], ['deleteTodasVendas', undefined, '/vendas/todas'], ['deleteTodasComissoes', undefined, '/bases-comissao/todas'], ['deleteVendasPorCompetencia', '07/2025', '/vendas/competencia/7/2025']])('preserva a rota da dev e propaga rejeição em %s', async (method, id, path) => {
    const error = { response: { status: 409, data: { message: 'Dependências ativas.' } } }
    api.delete.mockRejectedValueOnce(error)
    await expect(dataService[method](id)).rejects.toBe(error)
    expect(api.delete).toHaveBeenCalledWith(path)
  })

  it('não preenche taxas fictícias se o backend retornar uma base vazia', async () => {
    api.get.mockResolvedValueOnce({ data: { content: [], totalElements: 0 } })
    await expect(dataService.fetchComissoes()).resolves.toMatchObject({ content: [], totalElements: 0 })
    expect(api.get).toHaveBeenCalledWith('/bases-comissao', { params: { page: 0, size: 20 } })
  })

  it('adapta o contrato plano de comissão para a tabela da dev', async () => {
    api.get.mockResolvedValueOnce({ data: { content: [{ id: 'rate', codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR', percentual: '0.025', mesReferencia: '2025-07-01' }], totalElements: 1 } })
    const result = await dataService.fetchComissoes()
    expect(result.content[0]).toMatchObject({ cargo: 'VENDEDOR', marca: 'PRETO', percentual: '0.025', vigenciaInicio: '2025-07-01', vigenciaFim: '2025-07-31' })
  })
})
