import { File } from 'node:buffer'
import { describe, it, expect, vi } from 'vitest'
import { createImportBatchService } from './importBatchService'

const file = () => new File(['test'], 'vendas.xlsx')
const report = (status, extra = {}) => ({ reportId: 42, nomeArquivo: 'vendas.xlsx', tipoBase: 'SALES', status, totalLinhas: status === 'CONCLUIDO' ? 8 : null, mensagem: null, ...extra })
const setup = (options = {}) => {
  const http = { post: vi.fn(), get: vi.fn() }
  const client = createImportBatchService(http, { wait: async () => {}, ...options })
  return { http, client }
}

describe('importação confirmada pelo backend', () => {
  it('envia competência normalizada e acompanha HTTP 202 até concluir', async () => {
    const { http, client } = setup()
    http.post.mockResolvedValue({ status: 202, data: report('PENDENTE') })
    http.get.mockResolvedValueOnce({ data: report('PROCESSANDO') }).mockResolvedValueOnce({ data: report('CONCLUIDO') })
    const onStatus = vi.fn()
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '08/2025', onStatus })).resolves.toMatchObject({ reportId: 42, status: 'CONCLUIDO', totalLinhas: 8 })
    const [, form, config] = http.post.mock.calls[0]
    expect(form.has('competencia')).toBe(false)
    expect(form.has('importType')).toBe(false)
    expect(config.params).toEqual({ importType: 'SALES', competencia: '2025-08' })
    expect(http.get).toHaveBeenCalledTimes(2)
    expect(onStatus.mock.calls.map(([value]) => value.status)).toEqual(['PENDENTE', 'PROCESSANDO', 'CONCLUIDO'])
  })

  it('não considera uma falha assíncrona como sucesso e preserva o relatório', async () => {
    const { http, client } = setup()
    http.post.mockResolvedValue({ data: report('PENDENTE') })
    http.get.mockResolvedValue({ data: report('FALHOU', { mensagem: 'Venda fora da competência.' }) })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).rejects.toMatchObject({ reportId: 42, message: 'Venda fora da competência. (Relatório 42)' })
  })

  it.each(['SALES', 'COMISSIONS'])('evita rejeição do Spring por competência duplicada em %s', async (importType) => {
    const { http, client } = setup()
    // Reproduz o binding observado no servidor real: query e multipart
    // fornecem valores para o mesmo @RequestParam, mesmo quando são iguais.
    http.post.mockImplementation(async (url, form, config) => {
      const query = new URL(url, 'http://localhost').searchParams
      const values = [...query.getAll('competencia'), ...form.getAll('competencia')]
      if (config.params?.competencia != null) values.push(config.params.competencia)
      if (values.join(',') !== '2025-07') {
        throw { response: { status: 400, data: { message: "Parâmetro 'competencia' é obrigatório no formato YYYY-MM." } } }
      }
      return { data: report('CONCLUIDO', { tipoBase: importType }) }
    })
    await expect(client.upload({ file: file(), importType, competencia: '07/2025' })).resolves.toMatchObject({ status: 'CONCLUIDO' })
  })

  it('propaga rejeições HTTP sem fabricar contagens ou repetir o POST', async () => {
    const { http, client } = setup()
    http.post.mockRejectedValue({ response: { status: 400, data: { message: 'Arquivo inválido.' } } })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).rejects.toThrow('Arquivo inválido.')
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.get).not.toHaveBeenCalled()
  })

  it('reutiliza somente o ID confirmado pelo conflito de arquivo idêntico', async () => {
    const { http, client } = setup()
    http.post.mockRejectedValue({ response: { status: 409, data: { message: 'Já existe um lote ativo (reportId=42, status: CONCLUIDO) para este mesmo arquivo e competência.' } } })
    http.get.mockResolvedValue({ data: report('CONCLUIDO') })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).resolves.toMatchObject({ reused: true, reportId: 42 })
    expect(http.get).toHaveBeenCalledWith('/imports/42', expect.any(Object))
  })

  it.each(['Outro conflito.', 'Já existe um lote ativo (idLote=abc, status: CONCLUIDO) para este mesmo arquivo e competência.'])('não tenta adivinhar lote em conflitos sem reportId: %s', async (message) => {
    const { http, client } = setup()
    http.post.mockRejectedValue({ response: { status: 409, data: { message } } })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).rejects.toThrow(message)
    expect(http.get).not.toHaveBeenCalled()
  })

  it.each([
    { reportId: null }, { status: 'SUCESSO' }, { nomeArquivo: 'outro.xlsx' },
    { tipoBase: 'HR' }, { totalLinhas: null }, { totalLinhas: -1 }
  ])('rejeita recibo inválido: %j', async (extra) => {
    const { http, client } = setup()
    http.post.mockResolvedValue({ data: report('CONCLUIDO', extra) })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).rejects.toThrow()
  })

  it('rejeita troca de ID durante acompanhamento', async () => {
    const { http, client } = setup()
    http.post.mockResolvedValue({ data: report('PENDENTE') })
    http.get.mockResolvedValue({ data: report('CONCLUIDO', { reportId: 43 }) })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).rejects.toThrow('relatório de importação inválido')
  })

  it('mantém contagem zero sem estimar linhas pelo tamanho do arquivo', async () => {
    const { http, client } = setup()
    http.post.mockResolvedValue({ data: report('CONCLUIDO', { totalLinhas: 0 }) })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).resolves.toMatchObject({ totalLinhas: 0 })
  })

  it('não envia arquivo com competência inválida', async () => {
    const { http, client } = setup()
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '13/2025' })).rejects.toThrow('competência válida')
    expect(http.post).not.toHaveBeenCalled()
  })

  it('não exige competência para RH', async () => {
    const { http, client } = setup()
    http.post.mockResolvedValue({ data: report('CONCLUIDO', { tipoBase: 'HR' }) })
    await client.upload({ file: file(), importType: 'HR' })
    const [url, form, config] = http.post.mock.calls[0]
    expect(url).toBe('/imports/upload')
    expect(form.has('importType')).toBe(false)
    expect(form.has('competencia')).toBe(false)
    expect(config.params).toEqual({ importType: 'HR' })
  })

  it('interrompe acompanhamento por cancelamento sem declarar rollback', async () => {
    const abort = new AbortController()
    const { http, client } = setup({ wait: async () => abort.abort() })
    http.post.mockResolvedValue({ data: report('PENDENTE') })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08', signal: abort.signal })).rejects.toMatchObject({ code: 'ERR_CANCELED', reportId: 42 })
    expect(http.get).not.toHaveBeenCalled()
  })

  it('limita a espera por processamento sem reenviar o arquivo', async () => {
    let time = 0
    const { http, client } = setup({ timeoutMs: 10, now: () => time, wait: async () => { time = 11 } })
    http.post.mockResolvedValue({ data: report('PROCESSANDO') })
    await expect(client.upload({ file: file(), importType: 'SALES', competencia: '2025-08' })).rejects.toMatchObject({ reportId: 42, message: expect.stringContaining('não foi confirmada') })
    expect(http.post).toHaveBeenCalledTimes(1)
    expect(http.get).not.toHaveBeenCalled()
  })
})
