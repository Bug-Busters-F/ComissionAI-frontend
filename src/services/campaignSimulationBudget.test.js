import { describe, it, expect } from 'vitest'
import { simulationBudgetStatus as budget } from './campaignSimulationBudget'
describe('orçamento da simulação', () => {
  it('compara o custo total projetado e respeita igualdade no teto', () => {
    expect(budget({cenario100:{comissaoProjetada:'90000.00'}},'90000').exceeded).toBe(false)
    expect(budget({cenario100:{comissaoProjetada:'90000.01'}},'90000')).toMatchObject({exceeded:true,excess:0.01})
  })
  it('prioriza o orçamento registrado no resultado', () => {
    expect(budget({analise:{orcamento:'90000'},cenario100:{comissaoProjetada:'100000'}},'150000')).toMatchObject({exceeded:true,budget:90000,excess:10000})
  })
  it('mantém bloqueios explícitos recebidos mesmo sem números completos', () => {
    expect(budget({cenario100:{enquadramento:{dentroDoOrcamento:false}}}).exceeded).toBe(true)
    expect(budget({cenario100:{statusEnquadramento:'ACIMA_DO_TETO'}}).exceeded).toBe(true)
  })
  it('separa alertas de sensibilidade do bloqueio do cenário 100%', () => {
    const result={orcamentoCampanha:'100',cenario100:{comissaoProjetada:'80'},cenario150:{comissaoProjetada:'120'}}
    expect(budget(result).exceeded).toBe(false)
    expect(budget(result,null,'150')).toMatchObject({exceeded:true,excess:20})
  })
})
