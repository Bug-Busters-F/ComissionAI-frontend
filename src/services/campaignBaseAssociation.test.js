import { describe, it, expect, vi } from 'vitest'
import { associateReports, availableCoverageLots, campaignBaseLabel, uploadReportIds } from './campaignBaseAssociation'
describe('real base identities', () => {
  it('uses RH and Sales lots from coverage, not aggregate competence IDs', () => {
    const lot = { reportId: 5, tipoBase: 'HR' }
    expect(availableCoverageLots({ competencias: [{ competencia: '2025-07', rh: { lotesDisponiveisNaoAnexados: [lot] }, vendas: { lotesDisponiveisNaoAnexados: [{ reportId: 8 }] } }] }, '2025-07').map(l => l.reportId)).toEqual([5, 8])
    expect(availableCoverageLots(null, '2025-07')).toEqual([])
  })
  it('oferece taxas de comissão do mês correto para associação sem duplicar lotes', () => {
    const coverage = { competencias: [{competencia:'2025-11',rh:{lotesDisponiveisNaoAnexados:[{reportId:9,tipoBase:'HR'}]},taxasBase:{lotesDisponiveisNaoAnexados:[{reportId:11,tipoBase:'COMISSIONS'},{reportId:11,tipoBase:'COMISSIONS'}]}},{competencia:'2025-08',taxasBase:{lotesDisponiveisNaoAnexados:[{reportId:5,tipoBase:'COMISSIONS'}]}}] }
    expect(availableCoverageLots(coverage,'2025-11').map(l=>l.reportId)).toEqual([9,11])
    expect(campaignBaseLabel('COMISSIONS')).toBe('Taxas de comissão')
    expect(campaignBaseLabel('SALES')).toBe('Vendas')
  })
  it('extracts both confirmed upload identities and rejects incomplete responses', () => {
    expect(uploadReportIds({ reportIds: [5, 8] })).toEqual([5, 8])
    expect(uploadReportIds({ rh: { reportId: 5 }, vendas: { reportId: 8 } })).toEqual([5, 8])
    expect(() => uploadReportIds({ reportId: 10042 })).toThrow()
  })
  it('retries only failed/unattempted associations after a partial success', async () => {
    const service = { attachBase: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({}) }
    let pending
    try { await associateReports(service, 2, [5, 8]) } catch (error) { pending = error.pendingReportIds }
    expect(pending).toEqual([8])
    await associateReports(service, 2, pending)
    expect(service.attachBase.mock.calls).toEqual([[2, { reportId: 5 }], [2, { reportId: 8 }], [2, { reportId: 8 }]])
  })
})

describe('arquivos cadastrados para rascunhos e referência histórica', () => {
  it('oferece mês selecionado e RH global, sem depender de uma versão publicada', async () => {
    const { availableImportedLots } = await import('./campaignBaseAssociation')
    const lot = (reportId, tipoBase, competencia, extra = {}) => ({ reportId, tipoBase, competencia, status: 'CONCLUIDO', nomeArquivo: `arquivo-${reportId}.xlsx`, totalLinhas: 10, ...extra })
    const imports = [lot(1,'HR',null),lot(2,'SALES','2025-07'),lot(3,'SALES','2025-08'),lot(4,'COMISSIONS','2025-08'),lot(5,'SALES','2025-08',{status:'FALHOU'}),lot(6,'SALES','2025-08',{excluidoEm:'2026-01-01'}),lot(7,'SALES','2025-08',{rejeicaoIntegral:true}),lot(3,'SALES','2025-08')]
    expect(availableImportedLots(imports,'2025-08',[{reportId:4}]).map(item=>item.reportId)).toEqual([1,3])
    expect(availableImportedLots(imports,'2025-08')[1].nomeArquivoOriginal).toBe('arquivo-3.xlsx')
    expect(availableImportedLots(imports,'')).toEqual([])
  })
})

describe('conjunto de bases por competência', () => {
  it('reúne RH global, vendas e taxas do mês sem misturar outras competências', async () => {
    const { competenceBaseGroups } = await import('./campaignBaseAssociation')
    const imports = [
      {reportId:1,tipoBase:'HR',competencia:null,status:'CONCLUIDO'},
      {reportId:2,tipoBase:'SALES',competencia:'2025-12',status:'CONCLUIDO'},
      {reportId:3,tipoBase:'COMISSIONS',competencia:'2025-12',status:'CONCLUIDO'},
      {reportId:4,tipoBase:'SALES',competencia:'2025-11',status:'CONCLUIDO'}
    ]
    const groups = competenceBaseGroups(imports, '2025-12', [{reportId:1,tipoBase:'HR',competencia:null}])
    expect(groups.map(group => group.type)).toEqual(['HR','SALES','COMISSIONS'])
    expect(groups[0].attached.map(item => item.reportId)).toEqual([1])
    expect(groups.flatMap(group => group.available.map(item => item.reportId))).toEqual([2,3])
  })
  it('mantém opções ambíguas para escolha explícita e não considera anexo de outro mês', async () => {
    const { competenceBaseGroups } = await import('./campaignBaseAssociation')
    const imports = [2,3].map(reportId => ({reportId,tipoBase:'SALES',competencia:'2025-12',status:'CONCLUIDO'}))
    const groups = competenceBaseGroups(imports, '2025-12', [{reportId:4,tipoBase:'SALES',competencia:'2025-11'}])
    expect(groups[1].attached).toEqual([])
    expect(groups[1].available).toHaveLength(2)
    expect(groups[2].available).toEqual([])
  })
})
