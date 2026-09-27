import { describe, expect, it } from 'vitest'
import {
  CALCULATION_OPERATION,
  SALES_QUERY_STATE,
  hasPreviousCalculation,
  isCalculationReady,
  operationToRecalculate
} from './calculationFlow'

describe('calculationFlow', () => {
  it.each([
    ['competência inválida', { competencia: '2025-13', consultaVendas: SALES_QUERY_STATE.SUCCESS, vendasEncontradas: 10, calculando: false }],
    ['consulta carregando', { competencia: '2025-07', consultaVendas: SALES_QUERY_STATE.LOADING, vendasEncontradas: 10, calculando: false }],
    ['consulta com falha', { competencia: '2025-07', consultaVendas: SALES_QUERY_STATE.ERROR, vendasEncontradas: 10, calculando: false }],
    ['sem vendas', { competencia: '2025-07', consultaVendas: SALES_QUERY_STATE.SUCCESS, vendasEncontradas: 0, calculando: false }],
    ['histórico carregando', { competencia: '2025-07', consultaVendas: SALES_QUERY_STATE.SUCCESS, vendasEncontradas: 10, historicoConsultando: true, calculando: false }],
    ['histórico com falha', { competencia: '2025-07', consultaVendas: SALES_QUERY_STATE.SUCCESS, vendasEncontradas: 10, historicoComErro: true, calculando: false }],
    ['cálculo em andamento', { competencia: '2025-07', consultaVendas: SALES_QUERY_STATE.SUCCESS, vendasEncontradas: 10, calculando: true }]
  ])('bloqueia operações quando há %s', (_scenario, state) => {
    expect(isCalculationReady(state)).toBe(false)
  })

  it('libera operação somente com competência válida e vendas confirmadas', () => {
    expect(isCalculationReady({
      competencia: '07/2025',
      consultaVendas: SALES_QUERY_STATE.SUCCESS,
      vendasEncontradas: 10,
      calculando: false
    })).toBe(true)
  })

  it('repete a operação anterior sem converter o modo em evento de clique', () => {
    expect(operationToRecalculate(CALCULATION_OPERATION.NORMAL)).toBe(false)
    expect(operationToRecalculate(CALCULATION_OPERATION.RECALCULO)).toBe(true)
    expect(operationToRecalculate({ type: 'click' })).toBe(false)
  })

  it('considera histórico ou resultado da sessão para mudar para recálculo', () => {
    expect(hasPreviousCalculation({ resultadoSessao: null, totalHistorico: 0 })).toBe(false)
    expect(hasPreviousCalculation({ resultadoSessao: { totalCalculados: 2 }, totalHistorico: 0 })).toBe(true)
    expect(hasPreviousCalculation({ resultadoSessao: null, totalHistorico: 1 })).toBe(true)
  })
})
