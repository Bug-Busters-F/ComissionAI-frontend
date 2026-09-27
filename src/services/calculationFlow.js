import { normalizeCompetence } from './competenceUtils'

export const CALCULATION_OPERATION = Object.freeze({
  NORMAL: 'CALCULO',
  RECALCULO: 'RECALCULO'
})

export const SALES_QUERY_STATE = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
})

export function isCalculationReady({ competencia, consultaVendas, vendasEncontradas, historicoConsultando = false, historicoComErro = false, calculando }) {
  return Boolean(
    normalizeCompetence(competencia) &&
    consultaVendas === SALES_QUERY_STATE.SUCCESS &&
    Number(vendasEncontradas) > 0 &&
    !historicoConsultando &&
    !historicoComErro &&
    !calculando
  )
}

export function hasPreviousCalculation({ resultadoSessao, totalHistorico }) {
  return Boolean(resultadoSessao) || Number(totalHistorico) > 0
}

export function normalizeCalculationOperation(operation) {
  return operation === CALCULATION_OPERATION.RECALCULO
    ? CALCULATION_OPERATION.RECALCULO
    : CALCULATION_OPERATION.NORMAL
}

export function operationToRecalculate(operation) {
  return normalizeCalculationOperation(operation) === CALCULATION_OPERATION.RECALCULO
}
