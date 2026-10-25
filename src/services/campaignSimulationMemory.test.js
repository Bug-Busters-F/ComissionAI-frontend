import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Memory from '../components/campaigns/CampaignSimulationMemory.vue'
import Simulation from '../components/common/CampaignSimulationStep.vue'
import { simulationSaleRow, simulationViewModel } from './campaignPersistedSimulation'
import { simulationMemory } from './campaignSimulationMemory'
import { userFacingText, isHiddenRuleNotice } from './userFacingText'
import { campaignFixture } from './campaignLifecycleTestFixtures'
import { validateCampaignProposalSet } from './campaignProposalValidation'
import { createPending } from './campaignProposalModel'

const result = { competencia: '2025-07', diasInclusivos: 31, fatorProjecao: '1.033333' }
function sale(overrides = {}) {
  return { id: 'sale-id', matricula: '001234', dataVenda: '2025-07-15', codLoja: 16, codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR LOJA', valorVendaOriginal: '1000.00', taxaBaseContratual: '0.025', valorComissaoBase: '25.00', deltaComissao100: '25.00', valida: true, impedimentos: [],
    cenario100: { origemTaxa: 'REGRA_PROPOSTA', regraNome: 'Regra loja 16', atendeFaixaValor: true, taxaAplicada: '0.035', valorBonusPercentual: '5.00', valorBonusFixo: '10.00', valorComissao: '50.00' },
    memoriaCalculo: 'Taxa consultada em tb_basecomiss. Resultado persistido pelo backend.', ...overrides }
}
describe('fontes da simulação e linguagem da interface', () => {
  it('uses the saved sale and rule values without attributing a document or manual origin that was not returned', async () => {
    const row = simulationSaleRow(sale())
    const memory = simulationMemory(row, result)
    expect(memory).toMatchObject({ saleSource: 'Vendas da competência selecionada', baseSource: 'Taxa contratual de referência desta competência', appliedSource: 'Regra da campanha', rule: 'Regra loja 16', bonusPercentAmount: '5.00', bonusFixedAmount: '10.00', date: '2025-07-15' })
    const html = await renderToString(createSSRApp(Memory, { row, simulation: result }))
    expect(html).toContain('De onde vêm os valores'); expect(html).toContain('Como a comissão é formada')
    expect(html).toContain('Regra loja 16'); expect(html).toContain('50,00'); expect(html).toContain('5,00'); expect(html).toContain('10,00')
    expect(html).toContain('histórico da competência'); expect(html).toContain('1.033333')
    expect(html).not.toMatch(/tb_basecomiss|backend|persistido|sale-id/)
    expect(html).not.toContain('Edição manual'); expect(html).not.toContain('.xlsx')
  })
  it('distinguishes the contractual rate retained when the proposed value range is not met', () => {
    const raw = sale({ cenario100: { origemTaxa: 'BASE_COMISS', regraNome: 'Fallback Taxa Base Contratual', atendeFaixaValor: false, taxaAplicada: '0.025', valorComissao: '25.00' } })
    expect(simulationMemory(simulationSaleRow(raw), result)).toMatchObject({ appliedSource: 'Taxa contratual mantida', rule: 'Taxa contratual', eligibility: 'A condição de valor da regra não foi atendida' })
  })
  it('shows absence of source evidence instead of inventing it for old or incomplete responses', () => {
    expect(simulationMemory({ valorVenda: 1000 }, {})).toMatchObject({ saleSource: 'Origem não detalhada nesta simulação', baseSource: 'Referência contratual não informada', appliedSource: 'Origem da taxa não informada', factor: null, scenarios: [] })
  })
  it('keeps the per-sale sensitivity scenarios exactly as returned, including range changes and bonuses', () => {
    const raw = sale({ cenario80: { valorVenda: '800', taxaAplicada: '0.025', valorComissao: '20', origemTaxa: 'BASE_COMISS', mudouFaixaEmRelacaoA100: true } })
    expect(simulationMemory(simulationSaleRow(raw), result).scenarios[1]).toMatchObject({ key: '80', value: '800', rate: 2.5, commission: '20', changedRange: true })
  })
  it('only hides unmapped-text notices; blockers remain visible and stored evidence is preserved', () => {
    const campaign = campaignFixture(); campaign.propostas = campaign.propostas.slice(0, 1)
    const aviso = createPending({ codigo: 'TRECHO_NAO_MAPEADO', mensagem: 'Trecho do pedido que não virou regra: sem bônus.', severidade: 'AVISO' })
    campaign.pendenciasCampanha = [aviso]
    campaign.propostas[0].pendenciasRemotas = [aviso]
    expect(validateCampaignProposalSet(campaign).pending).toEqual([])
    expect(campaign.pendenciasCampanha).toHaveLength(1)
    campaign.pendenciasCampanha[0].severidade = 'IMPEDITIVO'
    expect(validateCampaignProposalSet(campaign).blockers.length).toBeGreaterThan(0)
    expect(isHiddenRuleNotice({ codigo: 'ANTIGA', severidade: 'AVISO', mensagem: 'Trecho não usado para regra: sem limite.' })).toBe(true)
  })
  it('removes internal names from presentation without changing originals or suppressing the business reason', () => {
    const original = 'Não há taxa em tb_basecomiss para cod_marca=10. O backend preservou os dados no banco de dados.'
    expect(userFacingText(original)).not.toMatch(/tb_|backend|banco de dados|cod_marca/)
    expect(userFacingText(original)).toContain('Marca=10')
    expect(original).toContain('tb_basecomiss')
    expect(userFacingText('JDBC SQLState 12345: relation tb_sales missing')).toContain('Não foi possível concluir')
  })
  it('renders accepted simulation as text and never offers another acceptance button', async () => {
    const scenario = { totalVendas: '1000', totalComissaoBase: '25', totalComissaoProposta: '35', deltaComissao: '10', deltaPercentual: '40', comissaoProjetada: '36.17', deltaProjetado: '10.33', qtdVendasComMudancaFaixa: 0 }
    const simulation = { selectedCompetencia: '2025-07', accepted: true, invalidationReasons: [], status: 'CONCLUIDA', progress: 100, result: simulationViewModel({ ...result, vendas: [sale()], totalVendasRecortadas: 1, cenario100: scenario, cenario80: scenario, cenario120: scenario, cenario150: scenario }) }
    const app = createSSRApp(Simulation, { simulation, form: { dataInicio: '2025-07-01', dataFim: '2025-07-31' } })
    app.component('RouterLink', { template: '<a><slot /></a>' })
    const html = await renderToString(app)
    expect(html).toContain('Simulação aceita')
    expect(html).not.toContain('accept-simulation-btn')
    expect(html).not.toContain('Simulação aceita — Ir para revisão')
  })
})
