import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, computed, reactive } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { useAccountStore } from '@/stores/accountStore'
import CampaignApurationSection from './CampaignApurationSection.vue'
const mock = vi.hoisted(() => ({state:null}))
vi.mock('@/services/campaignApuration',()=>({createCampaignApuration:()=>({state:mock.state,periods:computed(()=>[{competencia:'2025-07',dataInicio:'2025-07-01',dataFim:'2025-07-31'}]),period:computed(()=>({dataInicio:'2025-07-01',dataFim:'2025-07-31'})),canRun:computed(()=>false),canResolveUncertain:computed(()=>false),init:vi.fn(),dispose:vi.fn()})}))
async function render(role, detail = null) {
 mock.state=reactive({history:[],month:'2025-07',detail,historyLoaded:true})
 const pinia=createPinia(),account=useAccountStore(pinia)
 account.user={id:1,role,permissions:role==='ADMINISTRADOR'?['ACESSO_COMPLETO']:[]}
 return renderToString(createSSRApp(CampaignApurationSection,{campaign:{id:7,versaoVigente:1}}).use(pinia))
}
const detail={apuracaoId:'a',competencia:'2025-07',versaoCampanhaNumero:1,status:'CONCLUIDO',totalVendasProcessadas:2,totalCalculados:1,totalImpedimentos:1,valorTotalVendas:'1000',valorTotalComissao:'35',valorTotalBonus:'2',itens:[{id:1,matricula:'001234',valorVenda:'1000',valorComissao:'35',taxaAplicada:'0.035',origemTaxa:'REGRA_CAMPANHA'}],impedimentos:[]}
describe('Resultados da campanha',()=>{
 it('separa consulta de execução por perfil',async()=>{
  const manager=await render('GERENTE_VENDAS')
  expect(manager).toContain('Apurar competência')
  const auditor=await render('AUDITOR')
  expect(auditor).not.toContain('Apurar competência')
  expect(auditor).toContain('Seu perfil permite consultar os resultados')
  expect(await render('ANALISTA_NEGOCIOS')).not.toContain('Resultados da campanha')
 })
 it('mostra valores reais, memória e ausência de motivos sem inventar comparação contratual',async()=>{
  const html=await render('GERENTE_VENDAS',detail)
  expect(html).toContain('Concluída com impedimentos')
  expect(html).toContain('001234')
  expect(html).toContain('3,5%')
  expect(html).toContain('Regra da campanha')
  expect(html).toContain('não devolveu todos os motivos individuais')
  expect(html).toContain('sem projeção de volume')
  expect(html).toContain('Exportar relatório CSV')
 })
 it('identifica detalhes históricos incompletos e não preenche vendas inexistentes',async()=>{
  const html=await render('AUDITOR',{...detail,itens:[],totalCalculados:10,totalVendasProcessadas:11})
  expect(html).toContain('0 das 10 vendas calculadas')
  expect(html).not.toContain('Ver memória')
 })
})
