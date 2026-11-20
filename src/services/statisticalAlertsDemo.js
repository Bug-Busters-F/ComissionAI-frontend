import { GRUPO_SEM_VENDAS, METODO_LEAVE_ONE_OUT, TIPO_ALERTA } from './statisticalAlertsLogic'

/**
 * Modo demonstração de anomalias (FRONT-6). Desligado por padrão; habilite com VITE_ANOMALIES_DEMO=true.
 * Os dados seguem fielmente o contrato de AlertaEstatisticoResponse do backend.
 */
export const isAnomaliesDemoEnabled = import.meta.env?.VITE_ANOMALIES_DEMO === 'true'

export const DEMO_LOT_SALES_ID = 'demo-lote-vendas'
export const DEMO_LOT_HR_ID = 'demo-lote-rh'

function isValidCompetence(comp) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(comp || ''))
}

/**
 * Lotes de preparação efetivados de exemplo (formato LotePreparacaoResponseDTO).
 *
 * @param {string} competencia AAAA-MM
 * @param {Date} [now]
 */
export function buildDemoLots(competencia, now = new Date()) {
  if (!isValidCompetence(competencia)) return []
  const efetivadoEm = new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
  return [
    { id: DEMO_LOT_SALES_ID, tipoBase: 'SALES', competencia, status: 'EFETIVADO', nomeArquivo: `vendas_${competencia}_exemplo.xlsx`, efetivadoEm },
    { id: DEMO_LOT_HR_ID, tipoBase: 'HR', competencia, status: 'EFETIVADO', nomeArquivo: `rh_${competencia}_exemplo.xlsx`, efetivadoEm }
  ]
}

/**
 * Alertas de exemplo na competência informada, cobrindo todos os cenários do contrato:
 * outlier acima, estorno abaixo (score sempre absoluto), desvio zero (Z = 3 sentinela),
 * SEM_VENDAS_PARA_RH (dia 1 da competência, grupo SEM_VENDAS_ASSOCIADAS) e AMOSTRA_INSUFICIENTE.
 *
 * @param {string} competencia AAAA-MM
 * @param {Date} [now]
 */
export function buildDemoAlerts(competencia, now = new Date()) {
  if (!isValidCompetence(competencia)) return []
  const recente = new Date(now.getTime() - 3 * 3600 * 1000).toISOString()
  const antigo = new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString()
  const base = { metodo: METODO_LEAVE_ONE_OUT, versaoBases: 'demo', substituidoEm: null, substituidoPorId: null }
  const grupo = (loja, cargo, marca) => `${competencia}|loja=${loja}|cargo=${cargo}|marca=${marca}`

  return [
    {
      ...base, id: 'demo-alerta-acima', lotePreparacaoId: DEMO_LOT_SALES_ID, vendaId: 'demo-venda-1',
      tipo: TIPO_ALERTA.OUTLIER_VENDA, dataReferencia: `${competencia}-14`, matricula: '1001',
      grupoComparavel: grupo(14, 10, 100), tamanhoAmostra: 12,
      valorObservado: 48500, mediaGrupo: 12350, desvioPadrao: 2100, score: 17.214286, geradoEm: recente
    },
    {
      ...base, id: 'demo-alerta-estorno', lotePreparacaoId: DEMO_LOT_SALES_ID, vendaId: 'demo-venda-2',
      tipo: TIPO_ALERTA.OUTLIER_VENDA, dataReferencia: `${competencia}-22`, matricula: '1088',
      grupoComparavel: grupo(14, 10, 100), tamanhoAmostra: 12,
      valorObservado: -8900, mediaGrupo: 11500, desvioPadrao: 2400, score: 8.5, geradoEm: recente
    },
    {
      ...base, id: 'demo-alerta-desvio-zero', lotePreparacaoId: DEMO_LOT_SALES_ID, vendaId: 'demo-venda-3',
      tipo: TIPO_ALERTA.OUTLIER_VENDA, dataReferencia: `${competencia}-09`, matricula: '1150',
      grupoComparavel: grupo(7, 10, 300), tamanhoAmostra: 5,
      valorObservado: 9800, mediaGrupo: 4500, desvioPadrao: 0, score: 3, geradoEm: antigo
    },
    {
      ...base, id: 'demo-alerta-sem-vendas', lotePreparacaoId: DEMO_LOT_HR_ID, vendaId: null,
      tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH, dataReferencia: `${competencia}-01`, matricula: '2002',
      grupoComparavel: GRUPO_SEM_VENDAS, tamanhoAmostra: 0,
      valorObservado: null, mediaGrupo: null, desvioPadrao: null, score: null, geradoEm: antigo
    },
    {
      ...base, id: 'demo-alerta-amostra', lotePreparacaoId: DEMO_LOT_SALES_ID, vendaId: 'demo-venda-4',
      tipo: TIPO_ALERTA.AMOSTRA_INSUFICIENTE, dataReferencia: `${competencia}-10`, matricula: '3003',
      grupoComparavel: grupo(2, 30, 200), tamanhoAmostra: 2,
      valorObservado: 15200, mediaGrupo: null, desvioPadrao: null, score: null, geradoEm: antigo
    }
  ]
}

/**
 * Aplica os mesmos filtros do backend (matrícula por igualdade exata, tipo e lote).
 *
 * @param {Array} alerts
 * @param {{ tipo?: string, matricula?: string, lotePreparacaoId?: string }} [filters]
 */
export function filterDemoAlerts(alerts, filters = {}) {
  const matricula = String(filters.matricula || '').trim()
  return (alerts || []).filter(a =>
    (!filters.tipo || a.tipo === filters.tipo) &&
    (!matricula || a.matricula === matricula) &&
    (!filters.lotePreparacaoId || a.lotePreparacaoId === filters.lotePreparacaoId)
  )
}

/**
 * Contadores por tipo respeitando matrícula e lote (mas não o tipo), como countAlertsByType.
 *
 * @param {Array} alerts
 * @param {{ matricula?: string, lotePreparacaoId?: string }} [baseFilters]
 */
export function countDemoAlerts(alerts, baseFilters = {}) {
  const scoped = filterDemoAlerts(alerts, { ...baseFilters, tipo: undefined })
  const by = tipo => scoped.filter(a => a.tipo === tipo).length
  return {
    totalOutliers: by(TIPO_ALERTA.OUTLIER_VENDA),
    totalInconsistencias: by(TIPO_ALERTA.SEM_VENDAS_PARA_RH),
    totalSemAmostra: by(TIPO_ALERTA.AMOSTRA_INSUFICIENTE),
    totalGeral: scoped.length
  }
}

/**
 * Simula ReprocessamentoAlertasResponse para o lote de exemplo.
 *
 * @param {string} loteId
 * @param {Array} alerts
 */
export function simulateDemoReprocess(loteId, alerts) {
  const doLote = (alerts || []).filter(a => a.lotePreparacaoId === loteId)
  return {
    lotePreparacaoId: loteId,
    versaoBases: 'demo',
    alertasGerados: doLote.length,
    alertasSubstituidos: doLote.length,
    semAmostra: doLote.some(a => a.tipo !== TIPO_ALERTA.OUTLIER_VENDA)
  }
}
