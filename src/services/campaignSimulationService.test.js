import { describe, expect, it } from 'vitest'
import {
  buildSimulationOutcome,
  calculateCampaignDuration,
  createSimulationFingerprint,
  evaluateSimulationValidity,
  extractCampaignRules,
  paginateSimulationItems,
  sliceAndValidatePublicLocally
} from './campaignSimulationService'

describe('campaignSimulationService — [FRONT-4], [FRONT-5], [FRONT-6]', () => {
  describe('calculateCampaignDuration (mês comercial de 30 dias)', () => {
    it('calculates inclusive calendar days and exact 30-day factor without premature rounding', () => {
      const twentyDays = calculateCampaignDuration('2026-04-01', '2026-04-20')
      expect(twentyDays.dias).toBe(20)
      expect(twentyDays.mesComercialDias).toBe(30)
      expect(twentyDays.fatorDuracao).toBeCloseTo(20 / 30, 8)
      expect(twentyDays.fatorTexto).toContain('20/30 dias')

      const thirtyDays = calculateCampaignDuration('2026-04-01', '2026-04-30')
      expect(thirtyDays.dias).toBe(30)
      expect(thirtyDays.fatorDuracao).toBe(1)

      const ninetyTwoDays = calculateCampaignDuration('2026-03-01', '2026-05-31')
      expect(ninetyTwoDays.dias).toBe(92)
      expect(ninetyTwoDays.fatorDuracao).toBeCloseTo(92 / 30, 8)
    })
  })

  describe('sliceAndValidatePublicLocally ([FRONT-4])', () => {
    const sampleBases = [
      { id: 1, descrMarca: 'Aurora', descriCargo: 'Vendedor', pctComiss: 3, origem: 'tb_basecomiss (2026-04)', competencia: '2026-04' },
      { id: 2, descrMarca: 'Vértice', descriCargo: 'Consultor', pctComiss: 4, origem: 'tb_basecomiss (2026-04)', competencia: '2026-04' }
    ]

    const sampleSales = [
      { id: 'V-1', competencia: '2026-04', dataVenda: '2026-04-05', matricula: '1001', colaborador: 'Ana', codLoja: 12, descrMarca: 'Aurora', descriCargo: 'Vendedor', valorVenda: 12000, canal: 'LOJA_FISICA' },
      { id: 'V-2', competencia: '2026-04', dataVenda: '2026-04-10', matricula: '1002', colaborador: 'Bruno', codLoja: 18, descrMarca: 'Aurora', descriCargo: 'Vendedor', valorVenda: 18000, canal: 'LOJA_FISICA' },
      { id: 'V-3', competencia: '2026-04', dataVenda: '2026-04-12', matricula: '2001', colaborador: 'Clara', codLoja: 25, descrMarca: 'Vértice', descriCargo: 'Consultor', valorVenda: 9000, canal: 'ONLINE' }
    ]

    it('unions rules with OR, intersects filters within rule with AND, and deduplicates sales by ID', () => {
      const rules = extractCampaignRules({
        regras: [
          { nomeRegra: 'Regra Marca Aurora', descrMarca: 'Aurora', descriCargo: 'Vendedor', taxaPadrao: 0.05 },
          { nomeRegra: 'Regra Loja 12 Específica', descrMarca: 'Aurora', descriCargo: 'Vendedor', codLoja: 12, taxaPadrao: 0.06 }
        ]
      })

      const validation = sliceAndValidatePublicLocally({
        competencia: '2026-04',
        rules,
        sales: sampleSales,
        bases: sampleBases
      })

      expect(validation.canExecute).toBe(true)
      // V-1 matches both rules, V-2 matches rule 1 -> union has 2 unique sales (not 3)
      expect(validation.totalVendasRecortadas).toBe(2)
      expect(validation.overlapWarnings.length).toBeGreaterThan(0)

      // V-1 must resolve to the more specific rule (Marca + Cargo + Loja = 3 filters vs 2 filters)
      const v1 = validation.slicedSales.find((s) => s.saleId === 'V-1')
      expect(v1.winningRule.nomeRegra).toBe('Regra Loja 12 Específica')
      expect(v1.specificityScore).toBe(3)
    })

    it('treats 0 matching sales for the campaign audience as INSUFFICIENT_REFERENCE (not R$ 0,00)', () => {
      const rules = extractCampaignRules({
        descrMarca: 'Marca Inexistente',
        descriCargo: 'Vendedor',
        taxaPercentual: '5'
      })

      const validation = sliceAndValidatePublicLocally({
        competencia: '2026-04',
        rules,
        sales: sampleSales,
        bases: sampleBases
      })

      expect(validation.canExecute).toBe(false)
      expect(validation.totalVendasCompetencia).toBe(3)
      expect(validation.totalVendasRecortadas).toBe(0)
      expect(validation.impediments.some((i) => i.code === 'INSUFFICIENT_REFERENCE')).toBe(true)
    })

    it('blocks execution when tb_basecomiss lacks coverage for a matched sale (MISSING_BASE_COVERAGE)', () => {
      const salesWithoutBase = [
        ...sampleSales,
        { id: 'V-4', competencia: '2026-04', dataVenda: '2026-04-15', matricula: '3001', codLoja: 30, descrMarca: 'Solaris', descriCargo: 'Gerente', valorVenda: 20000 }
      ]
      const rules = extractCampaignRules({
        descrMarca: 'Solaris',
        descriCargo: 'Gerente',
        taxaPercentual: '6'
      })

      const validation = sliceAndValidatePublicLocally({
        competencia: '2026-04',
        rules,
        sales: salesWithoutBase,
        bases: sampleBases
      })

      expect(validation.canExecute).toBe(false)
      expect(validation.missingBases).toEqual([{ marca: 'Solaris', cargo: 'Gerente' }])
      expect(validation.impediments.some((i) => i.code === 'MISSING_BASE_COVERAGE')).toBe(true)
    })
  })

  describe('buildSimulationOutcome ([FRONT-5])', () => {
    it('computes calculation memory, 30-day duration projection, and 80%/120%/150% range-switching scenarios', () => {
      const bases = [
        { id: 1, descrMarca: 'Aurora', descriCargo: 'Vendedor', pctComiss: 3, origem: 'tb_basecomiss (2026-04)', competencia: '2026-04' }
      ]
      const sales = [
        // At 100% (R$ 9.000), below R$ 10.000 threshold -> keeps base rate 3% (R$ 270,00)
        // At 120% (R$ 10.800) and 150% (R$ 13.500), crosses R$ 10.000 threshold -> switches to 6% campaign rate!
        { id: 'V-10', competencia: '2026-04', dataVenda: '2026-04-08', matricula: '1010', colaborador: 'Diego', codLoja: 12, descrMarca: 'Aurora', descriCargo: 'Vendedor', valorVenda: 9000 }
      ]
      const form = {
        titulo: 'Campanha Faixa 10k',
        dataInicio: '2026-04-01',
        dataFim: '2026-04-15', // 15 days -> factor 15/30 = 0.5
        taxaPercentual: '6',
        regras: [
          {
            nomeRegra: 'Acima de 10k ganha 6%',
            descrMarca: 'Aurora',
            descriCargo: 'Vendedor',
            condicoes: [{ campo: 'VALOR_VENDA', operador: 'GTE', valorMinimo: 10000, taxa: 0.06 }]
          }
        ]
      }
      const rules = extractCampaignRules(form)
      const validation = sliceAndValidatePublicLocally({
        competencia: '2026-04',
        rules,
        sales,
        bases
      })

      const outcome = buildSimulationOutcome({
        simulationId: 'sim-test-1',
        competencia: '2026-04',
        form,
        referenceValidation: validation
      })

      expect(outcome.totals.duracaoCampanhaDias).toBe(15)
      expect(outcome.totals.fatorDuracao).toBeCloseTo(0.5, 6)

      // At 100% (R$ 9.000): does not meet >= 10.000 condition -> keeps base 3% = R$ 270,00
      expect(outcome.rows[0].comissaoBase).toBe(270)
      expect(outcome.rows[0].comissaoProposta).toBe(270)
      expect(outcome.rows[0].memoriaCalculo.manteveRegraBase).toBe(true)

      // At 120% (R$ 10.800): meets >= 10.000 condition -> switches to 6% = R$ 648,00 historical, projected * 0.5 = R$ 324,00!
      const scenario120 = outcome.scenarios.find((s) => s.key === '120')
      expect(scenario120.vendasQueMudaramDeFaixa).toBe(1)
      expect(scenario120.historico.comissaoBase).toBe(324) // 10800 * 3%
      expect(scenario120.historico.comissaoProposta).toBe(648) // 10800 * 6%
      expect(scenario120.withProposal).toBe(324) // 648 * (15/30)
      expect(scenario120.withoutProposal).toBe(162) // 324 * (15/30)
      expect(scenario120.impact).toBe(162)
    })

    it('paginates rows while preserving slice-wide totals', () => {
      const items = Array.from({ length: 12 }, (_, idx) => ({ saleId: `V-${idx + 1}` }))
      const page1 = paginateSimulationItems(items, 1, 5)
      const page3 = paginateSimulationItems(items, 3, 5)

      expect(page1.items.length).toBe(5)
      expect(page1.totalItems).toBe(12)
      expect(page1.totalPages).toBe(3)
      expect(page3.items.length).toBe(2)
      expect(page3.startIndex).toBe(11)
      expect(page3.endIndex).toBe(12)
    })
  })

  describe('evaluateSimulationValidity ([FRONT-6] acceptance & invalidation)', () => {
    const baseForm = {
      canal: 'TODOS',
      dataInicio: '2026-04-01',
      dataFim: '2026-04-30',
      taxaPercentual: '5',
      codMarca: '',
      descrMarca: 'Aurora',
      codLoja: '',
      codCargo: '',
      descriCargo: 'Vendedor',
      matricula: '',
      regras: []
    }

    it('keeps acceptance valid when parameters and bases fingerprint are unchanged', () => {
      const fp = createSimulationFingerprint({
        competencia: '2026-04',
        form: baseForm,
        basesFingerprint: 'aurora|vendedor:3'
      })
      const acceptedSimulation = {
        simulationId: 'sim-1',
        competencia: '2026-04',
        fingerprint: fp,
        basesFingerprint: 'aurora|vendedor:3',
        formSnapshot: {
          dataInicio: '2026-04-01',
          dataFim: '2026-04-30',
          canal: 'TODOS',
          taxaPercentual: '5'
        }
      }

      const check = evaluateSimulationValidity({
        acceptedSimulation,
        currentForm: { ...baseForm },
        currentCompetencia: '2026-04',
        currentBasesFingerprint: 'aurora|vendedor:3'
      })
      expect(check.valid).toBe(true)
      expect(check.reasons).toEqual([])
    })

    it('invalidates acceptance when competence, validity dates, rules, or base rates change', () => {
      const fp = createSimulationFingerprint({
        competencia: '2026-04',
        form: baseForm,
        basesFingerprint: 'aurora|vendedor:3'
      })
      const acceptedSimulation = {
        simulationId: 'sim-1',
        competencia: '2026-04',
        fingerprint: fp,
        basesFingerprint: 'aurora|vendedor:3',
        formSnapshot: {
          dataInicio: '2026-04-01',
          dataFim: '2026-04-30',
          canal: 'TODOS',
          taxaPercentual: '5'
        }
      }

      // 1. Competence changed
      const compChanged = evaluateSimulationValidity({
        acceptedSimulation,
        currentForm: baseForm,
        currentCompetencia: '2026-03',
        currentBasesFingerprint: 'aurora|vendedor:3'
      })
      expect(compChanged.valid).toBe(false)
      expect(compChanged.reasons[0]).toContain('competência de referência foi alterada')

      // 2. Validity dates changed
      const datesChanged = evaluateSimulationValidity({
        acceptedSimulation,
        currentForm: { ...baseForm, dataFim: '2026-04-20' },
        currentCompetencia: '2026-04',
        currentBasesFingerprint: 'aurora|vendedor:3'
      })
      expect(datesChanged.valid).toBe(false)
      expect(datesChanged.reasons[0]).toContain('período de vigência')

      // 3. Rule rate changed
      const ruleChanged = evaluateSimulationValidity({
        acceptedSimulation,
        currentForm: { ...baseForm, taxaPercentual: '6' },
        currentCompetencia: '2026-04',
        currentBasesFingerprint: 'aurora|vendedor:3'
      })
      expect(ruleChanged.valid).toBe(false)
      expect(ruleChanged.reasons[0]).toContain('regras, taxas ou filtros')

      // 4. Backend/base comiss changed
      const baseChanged = evaluateSimulationValidity({
        acceptedSimulation,
        currentForm: baseForm,
        currentCompetencia: '2026-04',
        currentBasesFingerprint: 'aurora|vendedor:4.5'
      })
      expect(baseChanged.valid).toBe(false)
      expect(baseChanged.reasons[0]).toContain('base de dados ou cobertura contratual')
    })
  })
})
