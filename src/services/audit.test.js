import { describe, expect, it, vi } from 'vitest'
import { createAuditService } from './auditService'
import { createAuditResource } from './auditResource'
import { auditFilterParams, readAuditQuery, writeAuditQuery } from './auditFilters'
import { auditSnapshotEntries, normalizeAuditPage, visibleLogProfiles, auditDate } from './auditModel'
import { canAccess } from './accessPolicy'

const id = '11111111-1111-4111-8111-111111111111'
const page = (content = [], extra = {}) => ({ content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, ...extra })
const event = { id, sucesso: true, perfilUsuario: 'ANALISTA_NEGOCIOS', relacionamentos: null }
const batch = { reportId: 7, status: 'EXCLUIDO', totalInconsistencias: 1, totalImpeditivos: 1, nomeArquivo: 'vendas.xlsx', excluidoPor: 'gerente@teste.local' }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

describe('FRONT-12: contrato real e consultas somente para leitura', () => {
  it('envia todos os filtros, paginação e cancelamento ao endpoint de auditoria', async () => {
    const http = { get: vi.fn().mockResolvedValue({ data: page([event]) }) }, service = createAuditService(http), signal = new AbortController().signal
    const params = auditFilterParams('events', { usuario: 'analista@teste.local', perfilUsuario: 'ANALISTA_NEGOCIOS', tipoAcao: 'EDICAO_CAMPANHA', campanhaId: '3', dataInicio: '2026-11-01', dataFim: '2026-11-20', sucesso: 'false', competencia: '2025-07', busca: 'promoção' }, 2, 50)
    expect((await service.events(params, { signal })).content).toEqual([event])
    expect(http.get).toHaveBeenCalledWith('/auditoria', { params, signal, timeout: 30000 })
    expect(params).toMatchObject({ page: 2, size: 50, sucesso: false, campanhaId: '3', tipoAcao: 'EDICAO_CAMPANHA', sort: 'dataHora,desc' })
    const start = new Date(params.dataInicio), end = new Date(params.dataFim)
    expect(start.getHours()).toBe(0); expect(end.getHours()).toBe(23); expect(end.getMilliseconds()).toBe(999)
  })
  it('consulta cargas e validações excluídas sem escondê-las ou usar o histórico local', async () => {
    const http = { get: vi.fn().mockResolvedValueOnce({ data: page([batch]) }).mockResolvedValueOnce({ data: batch }).mockResolvedValueOnce({ data: page([{ id: 1, severidade: 'IMPEDITIVO', linha: 2 }]) }) }
    const service = createAuditService(http)
    const filters = auditFilterParams('imports', { status: 'EXCLUIDO', tipoBase: 'SALES', competencia: '2025-07', usuario: 'gerente', origemLote: 'IMPORTACAO_DIRETA', somenteComInconsistencias: 'true' })
    expect((await service.imports(filters)).content[0].status).toBe('EXCLUIDO')
    expect((await service.batch({ id: '7' })).excluidoPor).toBe('gerente@teste.local')
    expect((await service.validations({ id: 7, severidade: 'IMPEDITIVO', campo: 'valor', page: 1, size: 20 })).content[0].linha).toBe(2)
    expect(http.get.mock.calls.map(call => call[0])).toEqual(['/imports', '/imports/lotes/7', '/imports/lotes/7/validacoes'])
    expect(http.get.mock.calls[2][1].params).toEqual({ severidade: 'IMPEDITIVO', campo: 'valor', page: 1, size: 20 })
  })
  it('consulta detalhe do evento e rejeita respostas de outro registro', async () => {
    const http = { get: vi.fn().mockResolvedValueOnce({ data: event }).mockResolvedValueOnce({ data: { ...event, id: '22222222-2222-4222-8222-222222222222' } }).mockResolvedValueOnce({ data: { reportId: 99 } }) }, service = createAuditService(http)
    expect(await service.event({ id })).toEqual(event)
    await expect(service.event({ id })).rejects.toMatchObject({ code: 'AUDIT_CONTRACT' })
    await expect(service.batch({ id: 7 })).rejects.toMatchObject({ code: 'AUDIT_CONTRACT' })
  })
  it('não faz chamadas com identificadores inválidos', async () => {
    const http = { get: vi.fn() }, service = createAuditService(http)
    await expect(service.event({ id: '../usuarios' })).rejects.toThrow()
    await expect(service.batch({ id: -1 })).rejects.toThrow()
    await expect(service.validations({ id: '1/arquivo' })).rejects.toThrow()
    await expect(service.original({ id: 0 })).rejects.toThrow()
    expect(http.get).not.toHaveBeenCalled()
  })
  it('baixa o arquivo preservado como blob e não produz sucesso em arquivo vazio', async () => {
    const blob = new Blob(['arquivo de teste'])
    const http = { get: vi.fn().mockResolvedValueOnce({ data: blob }).mockResolvedValueOnce({ data: new Blob() }) }, service = createAuditService(http), signal = new AbortController().signal
    expect(await service.original({ id: 7 }, { signal })).toBe(blob)
    expect(http.get).toHaveBeenCalledWith('/imports/lotes/7/arquivo', { signal, timeout: 30000, responseType: 'blob' })
    await expect(service.original({ id: 7 })).rejects.toThrow()
  })
  it('rejeita contrato antigo ou malformado em vez de exibir dados sem validação', async () => {
    const http = { get: vi.fn().mockResolvedValueOnce({ data: page([{ id, sucesso: true }]) }).mockResolvedValueOnce({ data: page([{ reportId: 7 }]) }) }, service = createAuditService(http)
    await expect(service.events({})).rejects.toThrow()
    await expect(service.imports({})).rejects.toThrow()
    for (const raw of [null, {}, { content: [] }, page([], { totalElements: null }), page([], { size: 0 })]) expect(() => normalizeAuditPage(raw)).toThrow()
    expect(normalizeAuditPage(page())).toEqual(page())
    expect(normalizeAuditPage({ content: [event], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } }).content).toEqual([event])
  })
})

describe('FRONT-12: filtros e retomada da consulta', () => {
  it('mantém filtros e página na URL, preserva outras áreas e limpa detalhe ao filtrar', () => {
    const query = writeAuditQuery('events', { aba: 'atividades', a_detalhe: id, extra: 'preservar' }, 'a_', { usuario: 'ana@teste.local', sucesso: 'false', tipoAcao: 'IMPORTACAO_BASE' }, 2, 50)
    expect(query).toEqual({ aba: 'atividades', extra: 'preservar', a_usuario: 'ana@teste.local', a_sucesso: 'false', a_tipoAcao: 'IMPORTACAO_BASE', a_page: '2', a_size: '50' })
    expect(readAuditQuery('events', query, 'a_').params).toMatchObject({ usuario: 'ana@teste.local', sucesso: false, page: 2, size: 50 })
    const loads = writeAuditQuery('imports', { abaDados: 'envios', a_page: '1' }, 'envios_', { status: 'EXCLUIDO' }, 0, 20, 7)
    expect(loads).toEqual({ abaDados: 'envios', a_page: '1', envios_status: 'EXCLUIDO', envios_detalhe: '7' })
    expect(readAuditQuery('imports', loads, 'envios_').params.status).toBe('EXCLUIDO')
  })
  it.each([
    { dataInicio: '2026-11-21', dataFim: '2026-11-20' }, { dataInicio: '2026-02-30' }, { campanhaId: '-1' }, { competencia: '2025-13' }, { tipoAcao: 'DELETE' }, { perfilUsuario: 'ROOT' }, { sucesso: 'talvez' }, { usuario: 'x'.repeat(251) }
  ])('impede consulta com filtro inválido: %j', filters => expect(() => auditFilterParams('events', filters)).toThrow())
  it('rejeita paginação inválida e não aceita parâmetros arbitrários da URL como filtros', () => {
    expect(readAuditQuery('events', { a_page: '-1' }, 'a_').params).toBeNull()
    expect(readAuditQuery('events', { a_size: '999' }, 'a_').error).not.toBe('')
    expect(readAuditQuery('events', { a_admin: 'true', a_usuario: ['ana', 'outra'] }, 'a_').params).toEqual({ page: 0, size: 20, usuario: 'ana', sort: 'dataHora,desc' })
  })
})

describe('FRONT-12: permissões e apresentação histórica', () => {
  it.each([
    ['ADMINISTRADOR', 'ACESSO_COMPLETO', true], ['GERENTE_VENDAS', 'CONSULTAR_LOGS_ANALISTAS', true], ['AUDITOR', 'CONSULTAR_LOGS_AUTORIZADOS', true], ['ANALISTA_NEGOCIOS', 'EDITAR_CAMPANHAS', false], ['ANALISTA_CODIGO', 'REVISAR_CODIGO', false]
  ])('autoriza consulta somente ao perfil %s com suas permissões', (role, permission, expected) => {
    expect(canAccess(role, 'viewAudit', [permission])).toBe(expected)
    expect(canAccess(role, 'viewAudit', [])).toBe(false)
  })
  it('opções de filtro respeitam o escopo sem substituir a autorização do servidor', () => {
    expect(Object.keys(visibleLogProfiles('ADMINISTRADOR'))).toHaveLength(5)
    expect(Object.keys(visibleLogProfiles('GERENTE_VENDAS'))).toEqual(['ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO'])
    expect(Object.keys(visibleLogProfiles('AUDITOR'))).toContain('GERENTE_VENDAS')
    expect(visibleLogProfiles('ANALISTA_CODIGO')).toEqual({})
  })
  it('formata snapshots sem mostrar credenciais, SQL ou estado de conta atual no lugar do perfil registrado', () => {
    const entries = auditSnapshotEntries(JSON.stringify({ titulo: 'Campanha antiga', taxa: 0.04, completa: false, senha: 'oculta', token: 'oculto', nested: { apiKey: 'oculta', valorMinimo: 0 } }))
    expect(entries.map(entry => entry.value)).toEqual(['Campanha antiga', '0.04', 'Não', '0'])
    expect(entries.map(entry => entry.label)).toContain('Título')
    expect(auditSnapshotEntries('JDBC org.hibernate.Exception')[0].value).not.toContain('JDBC')
    expect(auditDate('data inválida')).toBe('Não informado')
  })
})

describe('FRONT-12: erros, concorrência e cancelamento', () => {
  it('não transforma falha em vazio ou sucesso, e permite tentar novamente', async () => {
    const loader = vi.fn().mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce(page([event]))
    const resource = createAuditResource(loader)
    expect(await resource.load({ page: 0 })).toBe(false)
    expect(resource.state.data).toBeNull(); expect(resource.state.error).toContain('Não foi possível carregar')
    expect(await resource.load({ page: 0 })).toBe(true)
    expect(resource.state.data.content).toEqual([event]); expect(resource.state.error).toBe('')
    resource.dispose()
  })
  it('descarta respostas de filtro anterior e mantém o novo resultado', async () => {
    const old = deferred(), latest = deferred(), loader = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const resource = createAuditResource(loader), a = resource.load({ usuario: 'antigo' }), b = resource.load({ usuario: 'novo' })
    expect(loader.mock.calls[0][1].signal.aborted).toBe(true)
    latest.resolve(page([event])); await b
    old.resolve(page([{ id: 'antigo' }])); await a
    expect(resource.state.data.content).toEqual([event])
    resource.dispose()
  })
  it('limpa registros e cancela consultas na troca de usuário, saída e desmontagem', async () => {
    const pending = deferred(), loader = vi.fn().mockReturnValue(pending.promise), resource = createAuditResource(loader)
    const running = resource.load({ id })
    resource.clear(); expect(loader.mock.calls[0][1].signal.aborted).toBe(true)
    pending.resolve(page([event])); await running
    expect(resource.state.data).toBeNull()
    resource.dispose(); expect(await resource.load({})).toBe(false)
    expect(loader).toHaveBeenCalledOnce()
  })
  it.each([[401, 'Sua sessão expirou'], [403, 'Seu perfil não permite'], [404, 'ainda não está disponível']])('trata HTTP %s sem fallback de demonstração', async (status, message) => {
    const resource = createAuditResource(() => Promise.reject({ response: { status } }))
    expect(await resource.load({})).toBe(false)
    expect(resource.state.error).toContain(message); expect(resource.state.data).toBeNull()
    resource.dispose()
  })
})
