import defaultHttp from './api'
import {
  buildAlertQueryParams,
  isNewCase48h,
  isForbiddenError,
  TIPO_ALERTA
} from './statisticalAlertsLogic'

/**
 * Cria o cliente de serviços de alertas estatísticos e detecção de anomalias (FRONT-6).
 *
 * @param {import('axios').AxiosInstance} [http=defaultHttp]
 */
export function createStatisticalAlertsApi(http = defaultHttp) {
  return {
    /**
     * Consulta a lista paginada de alertas estatísticos com filtros aplicados.
     *
     * @param {Object} [filters={}]
     * @returns {Promise<{ content: Array, totalElements: number, totalPages: number, number: number, size: number }>}
     */
    async listAlerts(filters = {}) {
      const params = buildAlertQueryParams(filters)
      const res = await http.get('/alertas-estatisticos', { params })
      return res.data
    },

    /**
     * Obtém contadores agregados por tipo de alerta executando consultas ultraleves com size=1.
     * Respeita os filtros ativos de competência, matrícula e lote da consulta.
     *
     * @param {Object} [baseFilters={}]
     * @returns {Promise<{ totalOutliers: number, totalInconsistencias: number, totalSemAmostra: number, totalGeral: number }>}
     */
    async countAlertsByType(baseFilters = {}) {
      const cleanFilters = { ...baseFilters }
      delete cleanFilters.tipo
      delete cleanFilters.page
      delete cleanFilters.size

      const [resOutliers, resInconsistencias, resSemAmostra, resGeral] = await Promise.all([
        this.listAlerts({ ...cleanFilters, tipo: TIPO_ALERTA.OUTLIER_VENDA, size: 1, page: 0 }),
        this.listAlerts({ ...cleanFilters, tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH, size: 1, page: 0 }),
        this.listAlerts({ ...cleanFilters, tipo: TIPO_ALERTA.AMOSTRA_INSUFICIENTE, size: 1, page: 0 }),
        this.listAlerts({ ...cleanFilters, size: 1, page: 0 })
      ])

      const totalOutliers = resOutliers?.totalElements ?? 0
      const totalInconsistencias = resInconsistencias?.totalElements ?? 0
      const totalSemAmostra = resSemAmostra?.totalElements ?? 0
      const totalGeral = resGeral?.totalElements ?? (totalOutliers + totalInconsistencias + totalSemAmostra)

      return {
        totalOutliers,
        totalInconsistencias,
        totalSemAmostra,
        totalGeral
      }
    },

    /**
     * Verifica se existem novos alertas estatísticos gerados nas últimas 48 horas.
     * Executa consulta otimizada ordenada por geradoEm desc com size=1 e verifica o primeiro registro.
     *
     * @param {string} [competencia]
     * @returns {Promise<{ hasNewCases48h: boolean, latestAlert: Object|null }>}
     */
    async checkNewCases48h(competencia) {
      const params = { size: 1, page: 0, sort: 'geradoEm,desc' }
      if (competencia) params.competencia = competencia

      const res = await this.listAlerts(params)
      const latestAlert = res?.content?.[0] || null
      const hasNewCases48h = latestAlert ? isNewCase48h(latestAlert.geradoEm) : false

      return {
        hasNewCases48h,
        latestAlert
      }
    },

    /**
     * Solicita o reprocessamento de anomalias para um lote de preparação efetivado.
     * Conforme SoD e SecurityConfig.java, restrito a ADMINISTRADOR e GERENTE_VENDAS; o lote precisa estar EFETIVADO.
     * Dispara POST para /api/v1/alertas-estatisticos/reprocessar com { lotePreparacaoId } no corpo.
     *
     * @param {string} loteId
     * @returns {Promise<{ lotePreparacaoId: string, versaoBases: string, alertasGerados: number, alertasSubstituidos: number, semAmostra: boolean }>}
     */
    async reprocessLote(loteId) {
      if (!loteId) throw new Error('Identificador do lote de preparação é obrigatório.')
      const res = await http.post('/alertas-estatisticos/reprocessar', {
        lotePreparacaoId: loteId
      })
      return res.data
    }
  }
}

/** Tipos de base cujos lotes efetivados geram alertas estatísticos no backend. */
export const ALERT_LOT_BASE_TYPES = Object.freeze(['SALES', 'HR'])

/**
 * Busca os lotes de preparação EFETIVADO da campanha na competência, usados como filtro e alvo do reprocessamento.
 * GET /campanhas/{id}/preparacao-bases é restrito a ADMIN, GERENTE e NEGOCIOS no SecurityConfig:
 * quando o perfil não tem acesso a chamada nem é feita, e um 403 inesperado vira lista vazia (restricted = true).
 *
 * @param {{ listBatches: Function }} preparationService
 * @param {{ campanhaId: number|string, competencia?: string, canViewLots?: boolean }} options
 * @returns {Promise<{ lots: Array, restricted: boolean, error: unknown }>}
 */
export async function fetchEffectivePreparationLots(preparationService, { campanhaId, competencia, canViewLots = true } = {}) {
  if (!campanhaId || !competencia) return { lots: [], restricted: false, error: null }
  if (!canViewLots) return { lots: [], restricted: true, error: null }
  try {
    // Consulta por tipoBase: só lotes HR e SALES geram alertas (AlertaEstatisticoService.analisar) e, além disso,
    // o back responde 500 quando tipoBase é omitido (LotePreparacaoRepository: UPPER(:tipoBase) com nulo vira bytea no PostgreSQL).
    const results = await Promise.all(
      ALERT_LOT_BASE_TYPES.map(tipoBase => preparationService.listBatches(campanhaId, { tipoBase, status: 'EFETIVADO', competencia }))
    )
    const lots = results.flatMap(r => (Array.isArray(r) ? r : []))
    return { lots, restricted: false, error: null }
  } catch (error) {
    if (isForbiddenError(error)) return { lots: [], restricted: true, error: null }
    return { lots: [], restricted: false, error }
  }
}

export default createStatisticalAlertsApi()
