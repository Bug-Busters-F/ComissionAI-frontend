import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignProgramReview from './CampaignProgramReview.vue'
import CampaignPythonBudget from './CampaignPythonBudget.vue'
import { programFixture } from '@/services/campaignLifecycleTestFixtures'

describe('Python review and budget screens', () => {
  it('shows the executable source, declared premises, status and server reviewer', async () => {
    const html = await renderToString(createSSRApp(CampaignProgramReview, { model: {current:programFixture(42,{aprovadoPor:'Revisor real'}),history:[],changed:false},editable:true }))
    expect(html).toContain('def calcular_comissao'); expect(html).toContain('Taxa fixa'); expect(html).toContain('Revisor real'); expect(html).toContain('Aprovado para execução')
  })
  it('provides consultation without approval buttons for other profiles', async () => {
    const html = await renderToString(createSSRApp(CampaignProgramReview, {model:{current:programFixture(),history:[]},editable:false}))
    expect(html).not.toContain('Aprovar este programa'); expect(html).toContain('readonly'); expect(html).toContain('Copiar código')
  })
  it('shows all four scenarios, independent alternatives and explicit lack of solution', async () => {
    const scenario = {comissaoProjetada:'50',enquadramento:{dentroDoOrcamento:false,excedenteOrcamento:'10'}}
    const html = await renderToString(createSSRApp(CampaignPythonBudget, {campaign:{propostas:[{serverId:101}]},persistence:{orcamento:'40',orcamentoConfirmado:true},simulation:{result:{executadoViaPython:true,versaoProgramaPython:2,cenario80:scenario,cenario100:scenario,cenario120:scenario,cenario150:scenario,analise:{orcamento:'40',calibracoes:[{cenario:'100%',status:'ENQUADRADA',custoProjetadoOriginal:'50',custoProjetadoRecalculado:'40',folga:'0',alteracoes:[{regraId:101,campo:'taxa',antes:'0.035',depois:'0.03'}]},{cenario:'150%',status:'SEM_SOLUCAO_VIAVEL',motivo:'Piso acima do orçamento'}]}}},editable:true,approved:true}))
    for (const key of ['80','100','120','150']) expect(html).toContain('Cenário '+key+'%')
    expect(html).toContain('3,5%'); expect(html).toContain('3%'); expect(html).toContain('Sem solução viável'); expect(html).toContain('Revisar e aplicar alternativa')
  })
})
