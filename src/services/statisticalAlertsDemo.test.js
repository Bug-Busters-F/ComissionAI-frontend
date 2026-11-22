import { describe, it, expect } from 'vitest'
import {
  isAnomaliesDemoEnabled,
  buildDemoAlerts,
  buildDemoLots,
  filterDemoAlerts,
  countDemoAlerts,
  simulateDemoReprocess,
  DEMO_LOT_SALES_ID,
  DEMO_LOT_HR_ID
} from './statisticalAlertsDemo'
import {
  TIPO_ALERTA,
  GRUPO_SEM_VENDAS,
  METODO_LEAVE_ONE_OUT,
  extractAlertCompetence,
  buildLotOptions,
  describeReprocessResult
} from './statisticalAlertsLogic'

const NOW = new Date('2025-09-10T12:00:00Z')

describe('statisticalAlertsDemo — dados de exemplo fiéis ao contrato (FRONT-6)', () => {
  it('fica desligado por padrão (VITE_ANOMALIES_DEMO ausente)', () => {
    expect(isAnomaliesDemoEnabled).toBe(false)
  })

  it('gera alertas sempre na competência selecionada', () => {
    const alerts = buildDemoAlerts('2025-11', NOW)
    expect(alerts.length).toBe(5)
    expect(alerts.every(a => extractAlertCompetence(a) === '2025-11')).toBe(true)
    expect(buildDemoAlerts('', NOW)).toEqual([])
    expect(buildDemoAlerts('2025-13', NOW)).toEqual([])
  })

  it('respeita o contrato: score absoluto, método único e SEM_VENDAS no formato do back', () => {
    const alerts = buildDemoAlerts('2025-08', NOW)
    expect(alerts.every(a => a.metodo === METODO_LEAVE_ONE_OUT)).toBe(true)
    expect(alerts.filter(a => a.score != null).every(a => a.score >= 3)).toBe(true)

    const semVendas = alerts.find(a => a.tipo === TIPO_ALERTA.SEM_VENDAS_PARA_RH)
    expect(semVendas.dataReferencia).toBe('2025-08-01')
    expect(semVendas.grupoComparavel).toBe(GRUPO_SEM_VENDAS)
    expect(semVendas.tamanhoAmostra).toBe(0)
    expect(semVendas.lotePreparacaoId).toBe(DEMO_LOT_HR_ID)

    // Z coerente com média e desvio informados (Leave-One-Out)
    const acima = alerts.find(a => a.id === 'demo-alerta-acima')
    expect(Math.abs((acima.valorObservado - acima.mediaGrupo) / acima.desvioPadrao)).toBeCloseTo(acima.score, 4)
    const estorno = alerts.find(a => a.id === 'demo-alerta-estorno')
    expect(estorno.valorObservado).toBeLessThan(0)
    expect(Math.abs((estorno.valorObservado - estorno.mediaGrupo) / estorno.desvioPadrao)).toBeCloseTo(estorno.score, 4)
    expect(alerts.some(a => a.desvioPadrao === 0)).toBe(true)
  })

  it('gera lotes EFETIVADO compatíveis com o seletor', () => {
    const options = buildLotOptions(buildDemoLots('2025-08', NOW))
    expect(options.map(o => o.id).sort()).toEqual([DEMO_LOT_HR_ID, DEMO_LOT_SALES_ID].sort())
    expect(buildDemoLots('', NOW)).toEqual([])
  })

  it('filtra como o backend: matrícula exata, tipo e lote', () => {
    const alerts = buildDemoAlerts('2025-08', NOW)
    expect(filterDemoAlerts(alerts, { matricula: '1001' }).length).toBe(1)
    expect(filterDemoAlerts(alerts, { matricula: '100' }).length).toBe(0)
    expect(filterDemoAlerts(alerts, { tipo: TIPO_ALERTA.OUTLIER_VENDA }).length).toBe(3)
    expect(filterDemoAlerts(alerts, { lotePreparacaoId: DEMO_LOT_HR_ID }).length).toBe(1)
  })

  it('conta por tipo respeitando lote e matrícula, mas ignorando o tipo selecionado', () => {
    const alerts = buildDemoAlerts('2025-08', NOW)
    expect(countDemoAlerts(alerts)).toEqual({ totalOutliers: 3, totalInconsistencias: 1, totalSemAmostra: 1, totalGeral: 5 })
    expect(countDemoAlerts(alerts, { lotePreparacaoId: DEMO_LOT_SALES_ID, tipo: TIPO_ALERTA.OUTLIER_VENDA }))
      .toEqual({ totalOutliers: 3, totalInconsistencias: 0, totalSemAmostra: 1, totalGeral: 4 })
  })

  it('simula ReprocessamentoAlertasResponse aceito pelo feedback real', () => {
    const alerts = buildDemoAlerts('2025-08', NOW)
    const result = simulateDemoReprocess(DEMO_LOT_SALES_ID, alerts)
    expect(result).toEqual({ lotePreparacaoId: DEMO_LOT_SALES_ID, versaoBases: 'demo', alertasGerados: 4, alertasSubstituidos: 4, semAmostra: true })
    expect(describeReprocessResult(result).tone).toBe('success')
  })
})
