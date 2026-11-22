import { describe, it, expect, vi } from 'vitest'
import { apurationPeriods, apurationCoverageIssues, validateApuration, createCampaignApuration } from './campaignApuration'
import { createCampaignApurationService } from './campaignApurationService'
import { canAccess } from './accessPolicy'

const campaign = () => ({ id: 7, versaoVigente: 1, dataInicio: '2025-07-15', dataFim: '2025-08-10' })
const result = (extra = {}) => ({ apuracaoId: 'ap-1', protocolo: 'proto-1', campanhaId: 7, versaoCampanhaNumero: 1, competencia: '2025-07', dataInicio: '2025-07-15', dataFim: '2025-07-31', totalVendasProcessadas: 2, totalCalculados: 1, totalImpedimentos: 1, valorTotalVendas: '1000.00', valorTotalComissao: '35.00', valorTotalBonus: '0.00', status: 'CONCLUIDO', executadoEm: '2026-11-22T10:00:00Z', itens: [{ id: 1, matricula: '001234', valorComissao: '35.00' }], impedimentos: [{ matricula: '001235', motivo: 'Vínculo de RH ausente' }], ...extra })
function setup(overrides = {}, options = {}) {
  const api = {
    history: vi.fn(async () => []), detail: vi.fn(async () => result()), execute: vi.fn(async () => result()),
    campaign: vi.fn(async () => campaign()), version: vi.fn(async () => ({...campaign(), campanhaId: 7, numero: 1})),
    program: vi.fn(async () => ({campanhaId:7,versaoCampanhaNumero:1,statusAprovacao:'APROVADO',validoParaExecucao:true})),
    coverage: vi.fn(async () => ({ campanhaId:7, versaoVigenteNumero:1, competencias:[{competencia:'2025-07',coberta:true},{competencia:'2025-08',coberta:true}] })),
    closing: vi.fn(async month => ({competencia:month,status:'ABERTA',bloqueada:false})), ...overrides
  }
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key,v) => data.set(key,v), removeItem: key => data.delete(key) }
  const notify = vi.fn()
  const flow = createCampaignApuration({ campaign, api, canView:()=>true, canExecute:()=>true, userId:10, storage, notify, ...options })
  return {flow,api,storage,notify,data}
}

describe('apuração da campanha usando os contratos disponíveis', () => {
  it('mostra os motivos do diagnóstico sem transformar falta de anexo em bloqueio genérico', () => {
    const issues=apurationCoverageIssues({rh:{coberto:true},vendas:{coberto:false,mensagem:'Duas pendências sem aceite.'},taxasBase:{coberto:false,mensagem:'Falta anexo de taxas.',referenciasFaltantes:[{codMarca:10,codCargo:100}]}})
    expect(issues).toHaveLength(2)
    expect(issues[0]).toMatchObject({area:'Vendas',message:'Duas pendências sem aceite.'})
    expect(issues[1]).toMatchObject({area:'Taxas de comissão',message:'Falta anexo de taxas.',references:['Marca 10 · Cargo 100']})
    expect(apurationCoverageIssues(null)[0].message).toContain('Não foi possível')
  })
  it('recorta a vigência em meses, incluindo ano novo e fevereiro bissexto', () => {
    expect(apurationPeriods('2025-07-15','2025-08-10')).toEqual([{competencia:'2025-07',dataInicio:'2025-07-15',dataFim:'2025-07-31'},{competencia:'2025-08',dataInicio:'2025-08-01',dataFim:'2025-08-10'}])
    expect(apurationPeriods('2023-12-31','2024-02-29').at(-1).dataFim).toBe('2024-02-29')
    expect(apurationPeriods('2025-02-30','2025-03-01')).toEqual([])
    expect(apurationPeriods('2025-08-10','2025-07-15')).toEqual([])
  })
  it('executa somente após conferência e envia período mensal, versão explícita e nenhuma autorização de força', async () => {
    const {flow,api,notify}=setup()
    expect(await flow.execute()).toBe(false)
    await flow.init()
    expect(flow.canRun.value).toBe(true)
    expect(await flow.execute(' Fechamento julho ')).toBe(true)
    expect(api.execute).toHaveBeenCalledExactlyOnceWith(7,1,{competencia:'2025-07',dataInicio:'2025-07-15',dataFim:'2025-07-31',observacoes:'Fechamento julho',forcarRecalculo:false})
    expect(flow.state.detail.itens[0].matricula).toBe('001234')
    expect(notify).toHaveBeenCalledWith('warning',expect.any(String),expect.any(String))
    expect(flow.canRun.value).toBe(false)
  })
  it('confirma resultado sem impedimentos sem criar taxas ou totais locais',async()=>{
    const raw=result({totalVendasProcessadas:1,totalCalculados:1,totalImpedimentos:0,impedimentos:[]})
    const {flow,notify}=setup({execute:vi.fn(async()=>raw)})
    await flow.init();expect(await flow.execute()).toBe(true)
    expect(flow.state.detail.valorTotalComissao).toBe('35.00')
    expect(notify).toHaveBeenCalledWith('success','Apuração concluída',expect.any(String))
  })
  it('não envia operação financeira se não puder guardar seu acompanhamento',async()=>{
    const {flow,api}=setup({}, {storage:{getItem:()=>null,setItem:()=>{throw new Error('Armazenamento indisponível')},removeItem:()=>{}}})
    await flow.init();expect(await flow.execute()).toBe(false)
    expect(api.execute).not.toHaveBeenCalled()
  })
  it('seleciona mês sem apurar e não mantém resultado anterior como se fosse do novo mês', async () => {
    const {flow,api}=setup({history:vi.fn(async()=>[result()])})
    await flow.init();expect(flow.state.detail.apuracaoId).toBe('ap-1')
    await flow.changeMonth('2025-08')
    expect(flow.state.detail).toBe(null)
    expect(flow.period.value).toEqual({competencia:'2025-08',dataInicio:'2025-08-01',dataFim:'2025-08-10'})
    expect(api.execute).not.toHaveBeenCalled()
    await flow.changeMonth('2025-09');expect(flow.canRun.value).toBe(false)
  })
  it.each([
    ['código pendente',{program:vi.fn(async()=>({campanhaId:7,versaoCampanhaNumero:1,statusAprovacao:'PENDENTE_REVISAO',validoParaExecucao:false}))}],
    ['competência fechada',{closing:vi.fn(async()=>({competencia:'2025-07',status:'CONCLUIDO',bloqueada:true}))}],
    ['bases sem cobertura',{coverage:vi.fn(async()=>({campanhaId:7,versaoVigenteNumero:1,competencias:[{competencia:'2025-07',coberta:false}]}))}],
    ['versão concorrente',{campaign:vi.fn(async()=>({...campaign(),versaoVigente:2}))}],
    ['histórico indisponível',{history:vi.fn(async()=>{throw new Error('Network Error')})}],
    ['fechamento não confirmado',{closing:vi.fn(async()=>({}))}]
  ])('bloqueia execução quando há %s',async (_name,overrides)=>{
    const {flow,api}=setup(overrides);await flow.init()
    expect(await flow.execute()).toBe(false);expect(api.execute).not.toHaveBeenCalled()
  })
  it('refaz a conferência antes da escrita e respeita bloqueio surgido depois da abertura',async()=>{
    const {flow,api}=setup();await flow.init()
    api.closing.mockResolvedValue({competencia:'2025-07',bloqueada:true,status:'CONCLUIDO'})
    expect(await flow.execute()).toBe(false);expect(api.execute).not.toHaveBeenCalled()
  })
  it('consulta apenas para auditor, sem chamadas de execução ou preparação',async()=>{
    const {flow,api}=setup({history:vi.fn(async()=>[result()])},{canExecute:()=>false})
    await flow.init();expect(flow.state.detail.apuracaoId).toBe('ap-1')
    expect(api.program).not.toHaveBeenCalled();expect(api.coverage).not.toHaveBeenCalled()
    expect(await flow.execute()).toBe(false);expect(api.execute).not.toHaveBeenCalled()
    expect(canAccess('AUDITOR','viewCampaignApuration')).toBe(true)
    expect(canAccess('AUDITOR','runCampaignApuration')).toBe(false)
    expect(canAccess('ANALISTA_NEGOCIOS','viewCampaignApuration')).toBe(false)
    expect(canAccess('ANALISTA_CODIGO','runCampaignApuration')).toBe(false)
    expect(canAccess('GERENTE_VENDAS','runCampaignApuration')).toBe(true)
  })
  it('não repete POST após falha sem resposta e restaura acompanhamento por usuário',async()=>{
    const {flow,api,storage,notify}=setup({execute:vi.fn(async()=>{throw new Error('timeout')})})
    await flow.init();expect(await flow.execute()).toBe(false)
    expect(flow.state.uncertain).toBeTruthy();expect(notify).not.toHaveBeenCalled()
    await flow.loadHistory();flow.acknowledge()
    expect(flow.state.uncertain).toBeTruthy()
    expect(await flow.execute()).toBe(false);expect(api.execute).toHaveBeenCalledTimes(1)
    const resumed=setup({}, {storage}).flow;await resumed.init()
    expect(resumed.state.uncertain).toBeTruthy()
    const otherUser=setup({}, {storage,userId:11}).flow;await otherUser.init();expect(otherUser.state.uncertain).toBe(null)
    api.history.mockResolvedValue([result({executadoEm:new Date(Date.now()+10000).toISOString()})])
    api.detail.mockResolvedValue(result({executadoEm:new Date(Date.now()+10000).toISOString()}))
    await flow.loadHistory();await flow.select('ap-1');expect(flow.canResolveUncertain.value).toBe(true)
    flow.acknowledge();expect(flow.state.uncertain).toBe(null)
  })
  it('mantém o resultado anterior e não mostra sucesso em operação rejeitada',async()=>{
    const {flow,api,notify}=setup({history:vi.fn(async()=>[result()]),execute:vi.fn(async()=>{throw {response:{status:422,data:{message:'Há pendências na campanha.'}}}})})
    await flow.init();await flow.execute()
    expect(flow.state.detail.apuracaoId).toBe('ap-1');expect(flow.state.error).toContain('Há pendências')
    expect(flow.state.uncertain).toBe(null);expect(notify).not.toHaveBeenCalled()
    expect(api.execute).toHaveBeenCalledTimes(1)
  })
  it('resposta inválida após POST é inconclusiva, não aceita totais inventados ou de outra campanha',async()=>{
    expect(()=>validateApuration(result({campanhaId:8}),7)).toThrow()
    expect(()=>validateApuration(result({valorTotalComissao:null}),7)).toThrow()
    expect(()=>validateApuration(result({totalCalculados:4}),7)).toThrow()
    const {flow,notify}=setup({execute:vi.fn(async()=>result({competencia:'2025-08'}))})
    await flow.init();expect(await flow.execute()).toBe(false)
    expect(flow.state.uncertain).toBeTruthy();expect(flow.state.detail).toBe(null);expect(notify).not.toHaveBeenCalled()
  })
  it('descarta detalhes antigos que chegam depois de uma troca de seleção',async()=>{
    let resolve
    const {flow}=setup({detail:vi.fn(async(_,id)=>id==='ap-old'?new Promise(r=>{resolve=r}):result({apuracaoId:id}))})
    await flow.init()
    const old=flow.select('ap-old');await flow.select('ap-new');resolve(result({apuracaoId:'ap-old'}));await old
    expect(flow.state.detail.apuracaoId).toBe('ap-new')
  })
  it('impede cliques duplicados durante a gravação',async()=>{
    let resolve
    const {flow,api}=setup({execute:vi.fn(()=>new Promise(r=>{resolve=r}))})
    await flow.init();const pending=flow.execute()
    await vi.waitFor(()=>expect(api.execute).toHaveBeenCalledTimes(1))
    expect(await flow.execute()).toBe(false)
    resolve(result());await pending
  })
  it('usa somente operações de apuração existentes e exportação do resultado selecionado',async()=>{
    const http={get:vi.fn(async()=>({data:[]})),post:vi.fn(async()=>({data:result()}))},api=createCampaignApurationService(http)
    await api.history(7);await api.detail(7,'ap-1');await api.execute(7,1,{competencia:'2025-07'});await api.exportCsv(7,'ap-1')
    expect(http.post).toHaveBeenCalledWith('/campanhas/7/calcular-definitivo',{competencia:'2025-07'},expect.objectContaining({params:{versaoNumero:1},timeout:900000}))
    expect(http.get).toHaveBeenCalledWith('/campanhas/7/apuracoes/ap-1/exportar',expect.objectContaining({params:{tipo:'COMPLETO'},responseType:'blob'}))
    expect(http.get).toHaveBeenCalledWith('/campanhas/7/apuracoes',expect.any(Object))
  })
})
