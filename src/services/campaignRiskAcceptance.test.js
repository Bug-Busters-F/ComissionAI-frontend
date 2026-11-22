import { describe, expect, it, vi } from 'vitest'
import { riskSeverity, findImportRisk } from './campaignRiskAcceptance'
import { createCampaignPreparationService } from './campaignPreparationService'
const inconsistency = { inconsistenciaId: 501, reportId: 9, linha: 20, campo:'matricula', motivo:'Matrícula divergente', severidade:'ADVERTENCIA' }
const input = { reportId:9, linha:20, campo:'matricula', tipoBase:'SALES', competencia:'2025-11' }
describe('aceite de risco no contrato real',()=>{
 it('converte advertência em AVISO e bloqueia ambas as grafias de impedimento',()=>{
  expect(riskSeverity('ADVERTENCIA')).toBe('AVISO');expect(riskSeverity('AVISO')).toBe('AVISO')
  for(const type of ['IMPEDITIVO','IMPEDIMENTO','',null,'DESCONHECIDO'])expect(()=>riskSeverity(type)).toThrow()
 })
 it('busca a identidade real da inconsistência no lote correto, inclusive nas próximas páginas',async()=>{
  const service={listPendencies:vi.fn().mockResolvedValueOnce({content:[{...inconsistency,reportId:8}],totalPages:2}).mockResolvedValueOnce({content:[inconsistency],totalPages:2})}
  expect(await findImportRisk(service,12,input)).toEqual(inconsistency)
  expect(service.listPendencies.mock.calls[1][1].page).toBe(1)
 })
 it('não inventa identidade para pendência ausente ou ambígua nem aceita impeditivo',async()=>{
  const service={listPendencies:vi.fn(async()=>({content:[],totalPages:1}))}
  await expect(findImportRisk(service,12,input)).rejects.toThrow('Não foi possível localizar')
  service.listPendencies.mockResolvedValue({content:[inconsistency,{...inconsistency,inconsistenciaId:502}],totalPages:1})
  await expect(findImportRisk(service,12,input)).rejects.toThrow('Não foi possível localizar')
  service.listPendencies.mockResolvedValue({content:[{...inconsistency,severidade:'IMPEDITIVO'}],totalPages:1})
  await expect(findImportRisk(service,12,input)).rejects.toThrow('Erros impeditivos')
 })
 it('envia AVISO, identidade e justificativa; só aceita confirmação efetiva',async()=>{
  const http={post:vi.fn(async(_url,body)=>({data:{id:80,campanhaId:12,status:'ACEITA',pendenciaIdentificador:body.pendenciaIdentificador}}))}
  const service=createCampaignPreparationService(http)
  await service.acceptRisk(12,{pendenciaIdentificador:'inconsistencia:501',inconsistenciaImportacaoId:501,codigo:'INCONSISTENCIA_IMPORTACAO',campo:'matricula',mensagem:'Matrícula divergente',severidade:'ADVERTENCIA',motivo:'Conferido e justificado'})
  expect(http.post).toHaveBeenCalledWith('/campanhas/12/pendencias/aceite',expect.objectContaining({severidade:'AVISO',inconsistenciaImportacaoId:501,pendenciaIdentificador:'inconsistencia:501'}))
  http.post.mockResolvedValue({data:{id:81,status:'ACEITA',campanhaId:99}})
  await expect(service.acceptRisk(12,{pendenciaIdentificador:'inconsistencia:501',severidade:'AVISO',motivo:'Conferido e justificado'})).rejects.toThrow('não foi confirmado')
 })
})
